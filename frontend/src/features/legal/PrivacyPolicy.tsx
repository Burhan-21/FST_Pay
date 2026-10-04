import LegalPageLayout from './LegalPageLayout';

export default function PrivacyPolicy() {
  return (
    <LegalPageLayout
      title="Privacy Policy"
      subtitle="How FST Pay collects, processes, protects, and handles personal and financial data."
      lastUpdated="October 4, 2026"
    >
      <section className="space-y-3">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">1. Introduction & Scope</h2>
        <p>
          This Privacy Policy explains how <strong>[LEGAL ENTITY NAME]</strong> (&ldquo;FST Pay&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;, or &ldquo;our&rdquo;) collects, uses, stores, and discloses personal information when you access or use the FST Pay digital wallet and card platform, mobile applications, and web services.
        </p>
        <p>
          We are committed to respecting your privacy and adhering to applicable data protection legislation, including the Digital Personal Data Protection Act (DPDP Act) and applicable Reserve Bank of India (RBI) guidelines for prepaid payment instruments and payment system operators.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">2. Minors & Parental Consent Architecture</h2>
        <p>
          FST Pay provides financial literacy and digital payment tools designed for adolescents and families. The legal framework governing users under 18 years of age is structured as follows:
        </p>
        <ul className="list-disc pl-6 space-y-1.5">
          <li>
            <strong>Verifiable Parental Consent:</strong> Accounts created for individuals under 18 (&ldquo;Teen Users&rdquo;) require linkage to a verified Parent or Legal Guardian account. Parental invitation and verification are completed via secure email invitation or parent-side registration.
          </li>
          <li>
            <strong>Parental Oversight & Control:</strong> Parents have access to transaction histories, real-time approval queues for purchases exceeding designated limits, category restrictions, and wallet funding controls.
          </li>
          <li>
            <strong>Legal Review Notice:</strong> The technical architecture provides parental consent controls and authorization safeguards. Prior to commercial public launch, this parental consent mechanism must be reviewed and certified by qualified legal counsel in accordance with applicable regional age-of-majority laws.
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">3. Information We Collect</h2>
        <p>We collect information you provide directly, as well as data generated automatically during platform use:</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 not-prose my-4">
          <div className="p-4 rounded-2xl bg-white dark:bg-surface-900 border border-slate-200 dark:border-surface-800">
            <h3 className="font-semibold text-slate-900 dark:text-white mb-2">Directly Provided Data</h3>
            <ul className="text-xs space-y-1 text-slate-600 dark:text-surface-300 list-disc pl-4">
              <li>Full legal name and date of birth</li>
              <li>Email address and verified mobile number</li>
              <li>Government ID / KYC documents (where legally mandated)</li>
              <li>Parent/guardian contact information</li>
            </ul>
          </div>
          <div className="p-4 rounded-2xl bg-white dark:bg-surface-900 border border-slate-200 dark:border-surface-800">
            <h3 className="font-semibold text-slate-900 dark:text-white mb-2">Transaction & System Telemetry</h3>
            <ul className="text-xs space-y-1 text-slate-600 dark:text-surface-300 list-disc pl-4">
              <li>Transaction timestamps, amounts, and merchant categories</li>
              <li>Virtual prepaid card usage telemetry</li>
              <li>IP addresses, browser type, and device telemetry for fraud prevention</li>
              <li>Security audit logs (login attempts, 2FA events)</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">4. How We Use Information</h2>
        <p>Collected data is processed for the following legitimate purposes:</p>
        <ul className="list-disc pl-6 space-y-1.5">
          <li>Facilitating wallet top-ups, peer-to-peer transfers, virtual card generation, and bill settlements.</li>
          <li>Enforcing parent-set spending limits, category restrictions, and approval workflows.</li>
          <li>Preventing fraud, unauthorized account access, money laundering, and malicious activity.</li>
          <li>Delivering optional AI financial coach insights tailored strictly to user-consented transaction history.</li>
          <li>Complying with statutory reporting, accounting, and anti-money laundering (AML/PMLA) obligations.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">5. Data Retention & Erasure (Your Rights)</h2>
        <p>
          Under applicable data protection principles, you possess the right to access, rectify, and request erasure of your personal data:
        </p>
        <ul className="list-disc pl-6 space-y-1.5">
          <li>
            <strong>Right to Access & Portability:</strong> You can download and review your account records and transaction history from your account Settings.
          </li>
          <li>
            <strong>Right to Erasure (Account Deletion):</strong> You may request full account deletion through the Privacy tab in Settings or by submitting a written notice to our Grievance Officer.
          </li>
          <li>
            <strong>Statutory Retention Exception:</strong> Please note that financial transaction ledgers, audit logs, and KYC compliance records must be retained for the minimum statutory periods required by banking regulations (e.g., PMLA / RBI audit rules) even after account closure.
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">6. Security Measures</h2>
        <p>
          We employ defense-in-depth security including TLS 1.3 encryption in transit, AES-256 encryption for sensitive records, BCrypt password hashing, WebAuthn biometric passkey authentication, time-based one-time password (TOTP) two-factor authentication, and IP-based rate limiting.
        </p>
      </section>

      <section className="space-y-3 p-5 rounded-2xl bg-slate-100 dark:bg-surface-900 border border-slate-200 dark:border-surface-800 not-prose">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2">7. Grievance Officer & Inquiries</h2>
        <p className="text-xs text-slate-600 dark:text-surface-300 mb-3">
          For any questions, privacy grievances, or statutory data erasure requests, please contact our designated Grievance Officer:
        </p>
        <div className="text-xs space-y-1 text-slate-700 dark:text-surface-200">
          <p><strong>Officer Name:</strong> [GRIEVANCE OFFICER NAME]</p>
          <p><strong>Entity:</strong> [LEGAL ENTITY NAME]</p>
          <p><strong>Email:</strong> <a href="mailto:[GRIEVANCE EMAIL]" className="text-primary-600 dark:text-primary-400 hover:underline">[GRIEVANCE EMAIL]</a></p>
          <p><strong>Postal Address:</strong> [GRIEVANCE ADDRESS]</p>
        </div>
      </section>
    </LegalPageLayout>
  );
}
