import LegalPageLayout from './LegalPageLayout';

export default function CookiePolicy() {
  return (
    <LegalPageLayout
      title="Cookie Policy"
      subtitle="How FST Pay uses cookies, local storage, and client-side tokens to provide a secure and responsive experience."
      lastUpdated="October 4, 2026"
    >
      <section className="space-y-3">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">1. Overview</h2>
        <p>
          This Cookie Policy explains how <strong>[LEGAL ENTITY NAME]</strong> (&ldquo;FST Pay&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;) utilizes cookies, web storage (localStorage, sessionStorage), and similar technologies when you visit our website and applications.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">2. Technologies We Use</h2>
        <p>We categorize our browser storage mechanisms into three distinct groups:</p>

        <div className="space-y-4 not-prose my-4">
          <div className="p-4 rounded-2xl bg-white dark:bg-surface-900 border border-slate-200 dark:border-surface-800">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-slate-900 dark:text-white">Strictly Necessary / Essential</h3>
              <span className="badge-primary text-[10px]">Always Active</span>
            </div>
            <p className="text-xs text-slate-600 dark:text-surface-300">
              Required for the fundamental security and functionality of the application. These include cryptographically signed JSON Web Tokens (JWT) for authentication, anti-forgery tokens, and reCAPTCHA challenge verification to protect against automated bots.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-surface-900 border border-slate-200 dark:border-surface-800">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-slate-900 dark:text-white">Functional & Preferences</h3>
              <span className="text-xs text-slate-500 dark:text-surface-400">User Choice</span>
            </div>
            <p className="text-xs text-slate-600 dark:text-surface-300">
              Used to remember your display preferences, such as your chosen theme mode (Light, Dark, or AMOLED Black), collapsed sidebar states, and currency display settings.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-surface-900 border border-slate-200 dark:border-surface-800">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-slate-900 dark:text-white">Performance & Diagnostics</h3>
              <span className="text-xs text-slate-500 dark:text-surface-400">Telemetry</span>
            </div>
            <p className="text-xs text-slate-600 dark:text-surface-300">
              Measures application response latencies, server error rates, and API call health. No third-party behavioral advertising or cross-site tracking cookies are deployed on the FST Pay platform.
            </p>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">3. Third-Party Services</h2>
        <p>
          Certain third-party service providers (such as Google reCAPTCHA for bot defense) may set identifiers strictly necessary to deliver their security challenges. We do not sell, rent, or trade cookie or telemetry data with commercial ad networks.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">4. Managing Your Preferences</h2>
        <p>
          Most modern web browsers allow you to manage or block cookies through browser settings. Note that disabling strictly necessary storage (such as localStorage for authentication tokens) will prevent you from logging in and utilizing your FST Pay wallet.
        </p>
      </section>

      <section className="space-y-3 p-5 rounded-2xl bg-slate-100 dark:bg-surface-900 border border-slate-200 dark:border-surface-800 not-prose">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2">5. Inquiries</h2>
        <p className="text-xs text-slate-600 dark:text-surface-300">
          If you have questions about our use of cookies or client-side storage, contact us at{' '}
          <a href="mailto:[GRIEVANCE EMAIL]" className="text-primary-600 dark:text-primary-400 hover:underline">[GRIEVANCE EMAIL]</a>.
        </p>
      </section>
    </LegalPageLayout>
  );
}
