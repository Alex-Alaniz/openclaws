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

/**
 * Check if an email is on the Pro allowlist (PRO_EMAILS env var).
 * Grants Pro access without requiring a Stripe subscription.
 */
export function isProAllowlisted(email: string): boolean {
  const raw = process.env.PRO_EMAILS?.trim();
  if (!raw) return false;
  const allowlist = raw.split(',').map(e => e.trim().toLowerCase()).filter(Boolean);
  return allowlist.includes(email.trim().toLowerCase());
}

export async function getSubscriptionStatus(email: string): Promise<SubscriptionStatus> {
  // Pro allowlist bypass — grants immediate Pro access without Stripe
  if (isProAllowlisted(email)) {
    return { active: true, status: 'active', customerId: null, currentPeriodEnd: null };
  }

  const stripe = getStripe();

  // Search all customers with this email — duplicates can exist from checkout retries
  const customers = await stripe.customers.list({ email, limit: 10 });
  if (customers.data.length === 0) {
    return { active: false, status: 'none', customerId: null, currentPeriodEnd: null };
  }

  // Find the customer that actually has a subscription (prefer active)
  let bestCustomer = customers.data[0];
  let bestSub: Stripe.Subscription | null = null;

  for (const customer of customers.data) {
    const subs = await stripe.subscriptions.list({
      customer: customer.id,
      limit: 1,
      status: 'all',
    });
    if (subs.data.length > 0) {
      const sub = subs.data[0];
      if (!bestSub || (sub.status === 'active' && bestSub.status !== 'active')) {
        bestCustomer = customer;
        bestSub = sub;
      }
    }
  }

  const customer = bestCustomer;
  if (!bestSub) {
    return { active: false, status: 'none', customerId: customer.id, currentPeriodEnd: null };
  }

  const sub = bestSub;
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
