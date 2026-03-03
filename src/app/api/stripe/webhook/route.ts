import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { upsertInstance, updateInstanceStatus } from '@/lib/supabase';
import { provisionGateway } from '@/lib/fly';

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

export async function POST(req: Request) {
  if (!stripeSecretKey || !webhookSecret) {
    return NextResponse.json({ error: 'Missing Stripe webhook configuration' }, { status: 500 });
  }

  const stripe = new Stripe(stripeSecretKey);
  const signature = (await headers()).get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 });
  }

  const payload = await req.text();

  try {
    const event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);

    if (event.type === 'checkout.session.completed') {
      const checkoutSession = event.data.object as Stripe.Checkout.Session;
      const userEmail =
        checkoutSession.customer_email ??
        checkoutSession.metadata?.userEmail ??
        null;

      if (userEmail) {
        try {
          await upsertInstance({
            user_id: userEmail.toLowerCase(),
            user_email: userEmail.toLowerCase(),
            status: 'provisioning',
          });

          // Fire-and-forget — never block the webhook response
          provisionGateway({
            userId: userEmail.toLowerCase(),
            userEmail: userEmail.toLowerCase(),
          })
            .then(async (result) => {
              await updateInstanceStatus(userEmail.toLowerCase(), 'running', {
                fly_app_name: result.appName,
                fly_machine_id: result.machineId,
                fly_volume_id: result.volumeId,
                gateway_url: result.gatewayUrl,
                gateway_token: result.gatewayToken,
                setup_password: result.setupPassword,
              });
            })
            .catch(async (err) => {
              console.error('Gateway provisioning failed:', err);
              await updateInstanceStatus(userEmail.toLowerCase(), 'error', {
                error_message: err instanceof Error ? err.message : 'Provisioning failed',
              }).catch(() => {});
            });
        } catch (err) {
          console.error('Failed to initiate provisioning:', err);
        }
      }

      console.log('Stripe webhook checkout.session.completed:', checkoutSession.id);
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    console.error('Stripe webhook signature verification failed:', error);
    return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 400 });
  }
}
