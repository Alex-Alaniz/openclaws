import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';

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
      console.log('Stripe webhook checkout.session.completed:', event.data.object);
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    console.error('Stripe webhook signature verification failed:', error);
    return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 400 });
  }
}
