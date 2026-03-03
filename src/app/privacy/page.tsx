import Link from 'next/link';

export const metadata = {
  title: 'Privacy Policy - OpenClaws',
  description: 'Privacy Policy for OpenClaws by BearifiedCo.',
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] px-6 py-16 text-white">
      <div className="mx-auto max-w-3xl">
        <Link href="/" className="mb-10 inline-flex items-center gap-2 text-sm font-medium text-zinc-400 transition-colors hover:text-white">
          <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden="true">
            <path fillRule="evenodd" d="M17 10a.75.75 0 01-.75.75H5.612l4.158 3.96a.75.75 0 11-1.04 1.08l-5.5-5.25a.75.75 0 010-1.08l5.5-5.25a.75.75 0 111.04 1.08L5.612 9.25H16.25A.75.75 0 0117 10z" clipRule="evenodd" />
          </svg>
          Back to Home
        </Link>

        <h1 className="mb-2 text-4xl font-bold tracking-tight">Privacy Policy</h1>
        <p className="mb-12 text-sm text-zinc-500">Effective Date: March 3, 2026</p>

        <div className="space-y-10 text-[15px] leading-relaxed text-zinc-400">
          <p>
            BearifiedCo (&quot;we&quot;, &quot;us&quot;, or &quot;our&quot;) operates OpenClaws at{' '}
            <span className="text-zinc-300">openclaws.biz</span>. This Privacy Policy describes how we
            collect, use, and protect your information when you use our service.
          </p>

          <section>
            <h2 className="mb-4 text-xl font-semibold text-white">1. Information We Collect</h2>
            <ul className="list-disc space-y-2 pl-5">
              <li>
                <span className="text-zinc-300">Account information</span> &mdash; When you sign in via
                Google or Twitter OAuth, we receive your name, email address, and profile image.
              </li>
              <li>
                <span className="text-zinc-300">Usage data</span> &mdash; We collect anonymized analytics
                on feature usage, page views, and session duration to improve the service.
              </li>
              <li>
                <span className="text-zinc-300">AI provider API keys</span> &mdash; If you supply API keys
                for third-party AI providers (e.g., OpenAI, Anthropic, Google), those keys are stored
                encrypted and used solely to route requests on your behalf.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="mb-4 text-xl font-semibold text-white">2. How We Use Your Data</h2>
            <ul className="list-disc space-y-2 pl-5">
              <li>
                <span className="text-zinc-300">Service operation</span> &mdash; To authenticate you,
                provision your AI gateway, and execute requests against your connected integrations.
              </li>
              <li>
                <span className="text-zinc-300">Analytics</span> &mdash; To understand usage patterns and
                improve product quality.
              </li>
              <li>
                <span className="text-zinc-300">Security</span> &mdash; To detect abuse, prevent
                unauthorized access, and maintain service integrity.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="mb-4 text-xl font-semibold text-white">3. Data Storage &amp; Security</h2>
            <p>
              All sensitive data, including API keys, is encrypted at rest using{' '}
              <span className="text-zinc-300">pgcrypto</span> within our Supabase PostgreSQL database.
              Compute infrastructure is hosted on{' '}
              <span className="text-zinc-300">Fly.io</span> with per-user isolated gateways. We use
              industry-standard TLS encryption for all data in transit.
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-xl font-semibold text-white">4. Third-Party Services</h2>
            <p className="mb-3">We use the following third-party services in operating OpenClaws:</p>
            <ul className="list-disc space-y-2 pl-5">
              <li><span className="text-zinc-300">Stripe</span> &mdash; Payment processing</li>
              <li><span className="text-zinc-300">Google &amp; Twitter</span> &mdash; OAuth authentication</li>
              <li><span className="text-zinc-300">Fly.io</span> &mdash; Compute and gateway infrastructure</li>
              <li><span className="text-zinc-300">Sentry</span> &mdash; Error tracking and monitoring</li>
              <li><span className="text-zinc-300">PostHog</span> &mdash; Product analytics</li>
            </ul>
            <p className="mt-3">
              Each third-party service operates under its own privacy policy. We encourage you to review
              those policies independently.
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-xl font-semibold text-white">5. Data Retention &amp; Deletion</h2>
            <ul className="list-disc space-y-2 pl-5">
              <li>You can delete your stored API keys at any time from your dashboard settings.</li>
              <li>
                Requesting account deletion will permanently remove all associated data, including API
                keys, usage history, and profile information.
              </li>
              <li>
                We retain anonymized, aggregated analytics data that cannot be linked back to individual
                users.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="mb-4 text-xl font-semibold text-white">6. Contact</h2>
            <p>
              For questions about this Privacy Policy or your data, contact us at{' '}
              <a href="mailto:support@openclaws.biz" className="text-zinc-300 underline underline-offset-2 transition-colors hover:text-white">
                support@openclaws.biz
              </a>.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
