import Link from 'next/link';

export const metadata = {
  title: 'Terms of Service - OpenClaws',
  description: 'Terms of Service for OpenClaws by BearifiedCo.',
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] px-6 py-16 text-white">
      <div className="mx-auto max-w-3xl">
        <Link href="/" className="mb-10 inline-flex items-center gap-2 text-sm font-medium text-zinc-400 transition-colors hover:text-white">
          <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden="true">
            <path fillRule="evenodd" d="M17 10a.75.75 0 01-.75.75H5.612l4.158 3.96a.75.75 0 11-1.04 1.08l-5.5-5.25a.75.75 0 010-1.08l5.5-5.25a.75.75 0 111.04 1.08L5.612 9.25H16.25A.75.75 0 0117 10z" clipRule="evenodd" />
          </svg>
          Back to Home
        </Link>

        <h1 className="mb-2 text-4xl font-bold tracking-tight">Terms of Service</h1>
        <p className="mb-12 text-sm text-zinc-500">Effective Date: March 3, 2026</p>

        <div className="space-y-10 text-[15px] leading-relaxed text-zinc-400">
          <p>
            These Terms of Service (&quot;Terms&quot;) govern your use of OpenClaws, operated by
            BearifiedCo (&quot;we&quot;, &quot;us&quot;, or &quot;our&quot;). By accessing or using
            OpenClaws, you agree to be bound by these Terms.
          </p>

          <section>
            <h2 className="mb-4 text-xl font-semibold text-white">1. Service Description</h2>
            <p>
              OpenClaws provides managed hosting for the OpenClaw AI assistant. Each subscriber receives a
              dedicated, per-user Fly.io gateway that routes AI requests through their chosen model
              provider. The service includes 1,000+ third-party integrations, persistent memory, and
              multi-channel communication.
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-xl font-semibold text-white">2. Account Terms</h2>
            <ul className="list-disc space-y-2 pl-5">
              <li>You must be at least 18 years old to use OpenClaws.</li>
              <li>One account per person. Shared or team accounts are not permitted at this time.</li>
              <li>You must provide accurate and complete information when creating your account.</li>
              <li>You are responsible for maintaining the security of your account credentials.</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-4 text-xl font-semibold text-white">3. Acceptable Use</h2>
            <p className="mb-3">You agree not to:</p>
            <ul className="list-disc space-y-2 pl-5">
              <li>Use the service for any illegal activity or to violate any applicable laws.</li>
              <li>Abuse, exploit, or misuse AI capabilities in ways that cause harm to others.</li>
              <li>Circumvent, disable, or interfere with rate limits or usage restrictions.</li>
              <li>Attempt to gain unauthorized access to other users&apos; accounts or data.</li>
              <li>Use the service to generate spam, malware, or other harmful content.</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-4 text-xl font-semibold text-white">4. Payment Terms</h2>
            <ul className="list-disc space-y-2 pl-5">
              <li>
                OpenClaws is offered at <span className="text-zinc-300">$29/month</span>, billed monthly
                via Stripe.
              </li>
              <li>You may cancel your subscription at any time from your dashboard.</li>
              <li>
                No refunds are issued for partial months. Upon cancellation, you retain access through the
                end of your current billing period.
              </li>
              <li>Prices are subject to change with 30 days&apos; notice.</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-4 text-xl font-semibold text-white">5. API Key Handling</h2>
            <p>
              You may supply your own API keys for third-party AI providers. These keys are encrypted at
              rest and used solely to route requests on your behalf. OpenClaws is not responsible or
              liable for any charges incurred on your third-party accounts through the use of your
              provided API keys. You are responsible for managing your own API key usage limits and
              spending caps.
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-xl font-semibold text-white">6. Intellectual Property</h2>
            <p>
              OpenClaws and its original content, features, and functionality are owned by BearifiedCo
              and are protected by international copyright, trademark, and other intellectual property
              laws. You retain ownership of all content you create or provide through the service.
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-xl font-semibold text-white">7. Limitation of Liability</h2>
            <p>
              The service is provided &quot;as is&quot; and &quot;as available&quot; without warranties
              of any kind, either express or implied. BearifiedCo shall not be liable for any indirect,
              incidental, special, consequential, or punitive damages resulting from your use of or
              inability to use the service, including but not limited to loss of data, profits, or
              business opportunities.
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-xl font-semibold text-white">8. Termination</h2>
            <ul className="list-disc space-y-2 pl-5">
              <li>Either party may terminate your account at any time.</li>
              <li>
                We may suspend or terminate your access immediately if you violate these Terms.
              </li>
              <li>
                Upon termination, all associated data &mdash; including API keys, usage history, and
                profile information &mdash; will be permanently deleted.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="mb-4 text-xl font-semibold text-white">9. Changes to Terms</h2>
            <p>
              We reserve the right to modify these Terms at any time. Material changes will be
              communicated via email or an in-app notice at least 30 days before they take effect.
              Continued use of the service after changes become effective constitutes acceptance of the
              revised Terms.
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-xl font-semibold text-white">10. Contact</h2>
            <p>
              For questions about these Terms, contact us at{' '}
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
