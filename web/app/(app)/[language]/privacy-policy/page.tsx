import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy – Delvo",
  description: "Delvo privacy policy",
};

export default function PrivacyPolicyPage() {
  const lastUpdated = "May 21, 2025";

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="text-3xl font-bold mb-2">Privacy Policy</h1>
        <p className="text-sm text-muted-foreground mb-10">Last updated: {lastUpdated}</p>

        <Section title="1. Introduction">
          <p>
            Delvo (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;) provides an AI-powered personal assistant
            application available on web and mobile. This Privacy Policy explains how we collect,
            use, and protect your information when you use our services.
          </p>
          <p>
            By using Delvo, you agree to the collection and use of information in accordance with
            this policy.
          </p>
        </Section>

        <Section title="2. Information We Collect">
          <p>We collect the following types of information:</p>
          <ul>
            <li>
              <strong>Account information:</strong> Your name and email address when you register.
            </li>
            <li>
              <strong>Google account data:</strong> When you connect Google Calendar, we request
              access to your Google email address and calendar events (read and write). We store
              only the OAuth tokens needed to operate the integration on your behalf.
            </li>
            <li>
              <strong>Usage data:</strong> Messages you send to the Delvo AI assistant, tasks,
              events, meetings, and notes you create within the app.
            </li>
            <li>
              <strong>Technical data:</strong> Standard server logs (IP address, browser or device
              type, timestamps) for security and debugging purposes.
            </li>
          </ul>
        </Section>

        <Section title="3. How We Use Your Information">
          <p>We use the information collected to:</p>
          <ul>
            <li>Provide, operate, and improve the Delvo service.</li>
            <li>
              Sync and manage your Google Calendar events when you explicitly request it through
              the app.
            </li>
            <li>Authenticate your identity and maintain your session securely.</li>
            <li>Respond to your queries via the AI assistant.</li>
            <li>Detect and prevent fraud, abuse, or security incidents.</li>
          </ul>
          <p>We do not sell, rent, or share your personal data with third parties for marketing purposes.</p>
        </Section>

        <Section title="4. Google API Services">
          <p>
            Delvo uses Google OAuth 2.0 to connect your Google Calendar. Our use and transfer of
            information received from Google APIs adheres to the{" "}
            <a
              href="https://developers.google.com/terms/api-services-user-data-policy"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-4"
            >
              Google API Services User Data Policy
            </a>
            , including the Limited Use requirements.
          </p>
          <p>Specifically:</p>
          <ul>
            <li>
              We only request the minimum Google Calendar scopes necessary to show and manage your
              events within Delvo.
            </li>
            <li>
              We do not use Google user data to serve advertising or for any purpose unrelated to
              providing the Delvo service.
            </li>
            <li>
              You can revoke Delvo&apos;s access to your Google account at any time from your{" "}
              <a
                href="https://myaccount.google.com/permissions"
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-4"
              >
                Google Account permissions page
              </a>
              .
            </li>
          </ul>
        </Section>

        <Section title="5. Data Retention">
          <p>
            We retain your account data for as long as your account is active. Google OAuth tokens
            are stored encrypted and are refreshed automatically. You may delete your account and
            all associated data by contacting us at the address below.
          </p>
        </Section>

        <Section title="6. Data Security">
          <p>
            We use industry-standard measures to protect your data, including encrypted storage of
            credentials and tokens, HTTPS for all communications, and access controls limiting who
            can access production data. No method of transmission over the internet is 100% secure,
            and we cannot guarantee absolute security.
          </p>
        </Section>

        <Section title="7. Your Rights">
          <p>
            Depending on your location, you may have the right to access, correct, or delete the
            personal data we hold about you. To exercise any of these rights, contact us at the
            email below and we will respond within 30 days.
          </p>
        </Section>

        <Section title="8. Children's Privacy">
          <p>
            Delvo is not intended for children under 13. We do not knowingly collect personal
            information from children. If you believe a child has provided us with personal data,
            please contact us so we can delete it.
          </p>
        </Section>

        <Section title="9. Changes to This Policy">
          <p>
            We may update this Privacy Policy from time to time. When we do, we will update the
            &quot;Last updated&quot; date at the top of this page. Continued use of Delvo after
            changes constitutes acceptance of the new policy.
          </p>
        </Section>

        <Section title="10. Contact">
          <p>
            If you have any questions about this Privacy Policy, please contact us at:
          </p>
          <p>
            <strong>Email:</strong>{" "}
            <a href="mailto:gonzaloromerobernal05@gmail.com" className="underline underline-offset-4">
              gonzaloromerobernal05@gmail.com
            </a>
          </p>
          <p>
            <strong>App:</strong> Delvo —{" "}
            <a href="https://delvo.gromber05.dev" className="underline underline-offset-4">
              delvo.gromber05.dev
            </a>
          </p>
        </Section>
      </div>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="text-xl font-semibold mb-3">{title}</h2>
      <div className="space-y-3 text-sm leading-relaxed text-muted-foreground [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1 [&_a]:text-foreground">
        {children}
      </div>
    </section>
  );
}
