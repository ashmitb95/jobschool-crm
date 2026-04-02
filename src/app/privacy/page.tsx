export const metadata = {
  title: "Privacy Policy | LeadLynx",
};

export default function PrivacyPolicyPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="mb-8 text-3xl font-bold">Privacy Policy</h1>
      <p className="mb-4 text-sm text-muted-foreground">
        Last updated: March 24, 2026
      </p>

      <section className="space-y-6 text-sm leading-relaxed">
        <div>
          <h2 className="mb-2 text-lg font-semibold">1. Introduction</h2>
          <p>
            LeadLynx (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;) is
            committed to protecting your privacy. This Privacy Policy explains
            how we collect, use, disclose, and safeguard your information when
            you visit our website or use our services.
          </p>
        </div>

        <div>
          <h2 className="mb-2 text-lg font-semibold">
            2. Information We Collect
          </h2>
          <p>We may collect the following types of information:</p>
          <ul className="ml-6 mt-2 list-disc space-y-1">
            <li>
              <strong>Personal Information:</strong> Name, email address, phone
              number, and other contact details you provide.
            </li>
            <li>
              <strong>Usage Data:</strong> Information about how you interact
              with our website, including pages visited, time spent, and
              referring URLs.
            </li>
            <li>
              <strong>Device Information:</strong> Browser type, operating
              system, IP address, and device identifiers.
            </li>
            <li>
              <strong>Cookies and Tracking Technologies:</strong> We use cookies,
              pixels, and similar technologies to enhance your experience and
              gather analytics.
            </li>
          </ul>
        </div>

        <div>
          <h2 className="mb-2 text-lg font-semibold">
            3. How We Use Your Information
          </h2>
          <ul className="ml-6 list-disc space-y-1">
            <li>To provide and maintain our services.</li>
            <li>To communicate with you, including sending updates and promotional materials.</li>
            <li>To improve our website and services.</li>
            <li>To comply with legal obligations.</li>
            <li>To run advertising campaigns, including on platforms such as Facebook and Instagram (Meta).</li>
          </ul>
        </div>

        <div>
          <h2 className="mb-2 text-lg font-semibold">
            4. Sharing Your Information
          </h2>
          <p>
            We do not sell your personal information. We may share information
            with:
          </p>
          <ul className="ml-6 mt-2 list-disc space-y-1">
            <li>Service providers who assist in operating our website and services.</li>
            <li>Advertising partners (e.g., Meta/Facebook) for targeted advertising and analytics.</li>
            <li>Legal authorities when required by law.</li>
          </ul>
        </div>

        <div>
          <h2 className="mb-2 text-lg font-semibold">
            5. Facebook &amp; Meta Technologies
          </h2>
          <p>
            We may use Meta (Facebook) pixels, SDKs, and APIs to measure the
            effectiveness of our advertising, deliver targeted ads, and build
            custom audiences. Data shared with Meta is governed by{" "}
            <a
              href="https://www.facebook.com/privacy/policy/"
              className="underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              Meta&apos;s Privacy Policy
            </a>
            . You can manage your ad preferences in your Facebook settings.
          </p>
        </div>

        <div>
          <h2 className="mb-2 text-lg font-semibold">6. Data Retention</h2>
          <p>
            We retain your personal information only for as long as necessary to
            fulfill the purposes described in this policy, or as required by
            law.
          </p>
        </div>

        <div>
          <h2 className="mb-2 text-lg font-semibold">7. Your Rights</h2>
          <p>Depending on your jurisdiction, you may have the right to:</p>
          <ul className="ml-6 mt-2 list-disc space-y-1">
            <li>Access, correct, or delete your personal data.</li>
            <li>Opt out of marketing communications.</li>
            <li>Restrict or object to processing of your data.</li>
            <li>Request data portability.</li>
          </ul>
        </div>

        <div>
          <h2 className="mb-2 text-lg font-semibold">8. Security</h2>
          <p>
            We implement reasonable security measures to protect your
            information. However, no method of transmission over the Internet is
            100% secure.
          </p>
        </div>

        <div>
          <h2 className="mb-2 text-lg font-semibold">
            9. Changes to This Policy
          </h2>
          <p>
            We may update this Privacy Policy from time to time. Changes will be
            posted on this page with an updated revision date.
          </p>
        </div>

        <div>
          <h2 className="mb-2 text-lg font-semibold">10. Contact Us</h2>
          <p>
            If you have questions about this Privacy Policy, please contact us
            at{" "}
            <a href="mailto:privacy@leadlynx.io" className="underline">
              privacy@leadlynx.io
            </a>
            .
          </p>
        </div>
      </section>
    </div>
  );
}
