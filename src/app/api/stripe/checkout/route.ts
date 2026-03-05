import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import * as Sentry from '@sentry/nextjs';
import { authOptions } from '@/lib/auth';
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit';

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const email = session.user.email.trim().toLowerCase();
  const rl = await rateLimit(`${email}:/api/stripe/checkout`, 5, 60_000);
  if (!rl.success) return rateLimitResponse(rl);

  const secretKey = process.env.STRIPE_SECRET_KEY;
  const priceId = process.env.STRIPE_PRICE_ID;
  const appUrl = process.env.NEXTAUTH_URL;

  if (!secretKey || !priceId || !appUrl) {
    return NextResponse.json({ error: 'Missing Stripe configuration' }, { status: 500 });
  }

  const stripe = new Stripe(secretKey);

  try {
    // Look up existing customer by email, or create one
    const existing = await stripe.customers.list({
      email: session.user.email,
      limit: 1,
    });
    const customer =
      existing.data.length > 0
        ? existing.data[0]
        : await stripe.customers.create({
            email: session.user.email,
            metadata: { app: 'openclaws' },
          });

    const checkoutSession = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      customer: customer.id,
      allow_promotion_codes: true,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      metadata: {
        app: 'openclaws',
        userEmail: session.user.email,
      },
      success_url: `${appUrl}/dashboard/settings?upgraded=true`,
      cancel_url: `${appUrl}/dashboard/settings?cancelled=true`,
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (error) {
    Sentry.captureException(error);
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 });
  }
}
