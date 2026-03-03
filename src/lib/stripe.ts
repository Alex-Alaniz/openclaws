import Stripe from 'stripe';

let stripeClient: Stripe | null = null;

export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY is not configured');
  if (!stripeClient) stripeClient = new Stripe(key);
  return stripeClient;
}

export type SubscriptionStatus = {
  active: boolean;
  status: 'active' | 'past_due' | 'canceled' | 'none';
  customerId: string | null;
  currentPeriodEnd: Date | null;
};

export async function getSubscriptionStatus(email: string): Promise<SubscriptionStatus> {
  const stripe = getStripe();

  const customers = await stripe.customers.list({ email, limit: 1 });
  if (customers.data.length === 0) {
    return { active: false, status: 'none', customerId: null, currentPeriodEnd: null };
  }

  const customer = customers.data[0];
  const subs = await stripe.subscriptions.list({
    customer: customer.id,
    limit: 1,
    status: 'all',
  });

  if (subs.data.length === 0) {
    return { active: false, status: 'none', customerId: customer.id, currentPeriodEnd: null };
  }

  const sub = subs.data[0];
  const isActive = sub.status === 'active' || sub.status === 'trialing';
  const periodEnd = sub.items.data[0]?.current_period_end;

  return {
    active: isActive,
    status: sub.status === 'active' || sub.status === 'trialing' ? 'active'
      : sub.status === 'past_due' ? 'past_due'
      : sub.status === 'canceled' ? 'canceled'
      : 'none',
    customerId: customer.id,
    currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000) : null,
  };
}
