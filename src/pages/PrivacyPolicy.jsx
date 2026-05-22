export default function PrivacyPolicy() {
  return (
    <div className="max-w-3xl mx-auto p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">Privacy Policy</h1>
        <p className="text-muted-foreground text-sm">Last updated: May 22, 2026</p>
      </div>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">1. Introduction</h2>
        <p className="text-sm leading-relaxed text-foreground/80">
          Vintrix Market Inventory System ("we", "our", or "the application") is a private inventory management tool. This Privacy Policy explains how we collect, use, and protect your data when you use our application, including when you connect your Google account via OAuth 2.0.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">2. Data We Collect</h2>
        <ul className="text-sm leading-relaxed text-foreground/80 space-y-2 list-disc list-inside">
          <li><strong>Google Account Information:</strong> When you connect your Google account, we receive your email address and an OAuth access token.</li>
          <li><strong>Google Sheets Data:</strong> We access only the specific Google Sheets spreadsheet you designate — to append sales records on your behalf.</li>
          <li><strong>Inventory & Sales Data:</strong> Product details, pricing, and sales records that you manually enter into the application.</li>
          <li><strong>Authentication Data:</strong> Your email address used to log in to the application.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">3. How We Use Your Data</h2>
        <ul className="text-sm leading-relaxed text-foreground/80 space-y-2 list-disc list-inside">
          <li>To authenticate you and provide access to your personal inventory data.</li>
          <li>To write sales records to your designated Google Sheets spreadsheet (only when you explicitly enable this feature).</li>
          <li>To generate product listings and descriptions using AI assistance.</li>
          <li>We do <strong>not</strong> sell, share, or transfer your data to third parties.</li>
          <li>We do <strong>not</strong> use your data for advertising purposes.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">4. Google API Scopes Used</h2>
        <p className="text-sm leading-relaxed text-foreground/80">
          This application requests the following Google OAuth scope:
        </p>
        <ul className="text-sm leading-relaxed text-foreground/80 space-y-1 list-disc list-inside">
          <li>
            <code className="bg-muted px-1 rounded text-xs">https://www.googleapis.com/auth/spreadsheets</code> —
            Used to read and write data to the Google Sheets spreadsheet you specify, solely for the purpose of logging your sales records.
          </li>
        </ul>
        <p className="text-sm leading-relaxed text-foreground/80 mt-2">
          Our use of Google APIs adheres to the{" "}
          <a
            href="https://developers.google.com/terms/api-services-user-data-policy"
            target="_blank"
            rel="noreferrer"
            className="text-emerald-600 underline hover:text-emerald-700"
          >
            Google API Services User Data Policy
          </a>
          , including the Limited Use requirements.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">5. Data Storage & Security</h2>
        <ul className="text-sm leading-relaxed text-foreground/80 space-y-2 list-disc list-inside">
          <li>OAuth access tokens are stored securely in our database and used solely to write data to your designated spreadsheet.</li>
          <li>Tokens are never shared with third parties and are used exclusively on your behalf.</li>
          <li>You can revoke access at any time by disconnecting your Google account within the application settings or via your <a href="https://myaccount.google.com/permissions" target="_blank" rel="noreferrer" className="text-emerald-600 underline hover:text-emerald-700">Google Account permissions page</a>.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">6. Data Retention</h2>
        <p className="text-sm leading-relaxed text-foreground/80">
          Your data is retained as long as your account is active. OAuth tokens are deleted immediately upon disconnecting your Google account. You may request deletion of all your data by contacting us.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">7. Your Rights</h2>
        <ul className="text-sm leading-relaxed text-foreground/80 space-y-2 list-disc list-inside">
          <li>You may disconnect your Google account at any time within the application.</li>
          <li>You may request access to, correction of, or deletion of your personal data.</li>
          <li>You may withdraw consent for any data processing at any time.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">8. Third-Party Services</h2>
        <p className="text-sm leading-relaxed text-foreground/80">
          This application integrates with the following third-party services, each governed by their own privacy policies:
        </p>
        <ul className="text-sm leading-relaxed text-foreground/80 space-y-1 list-disc list-inside">
          <li><a href="https://policies.google.com/privacy" target="_blank" rel="noreferrer" className="text-emerald-600 underline">Google LLC</a> — Google Sheets API</li>
          <li>Allegro — marketplace integration</li>
          <li>Shopify — e-commerce integration</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">9. Contact</h2>
        <p className="text-sm leading-relaxed text-foreground/80">
          If you have any questions about this Privacy Policy or wish to exercise your data rights, please contact the application administrator.
        </p>
      </section>
    </div>
  );
}