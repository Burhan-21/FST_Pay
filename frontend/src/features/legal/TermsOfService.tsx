import LegalPageLayout from './LegalPageLayout';

export default function TermsOfService() {
  return (
    <LegalPageLayout
      title="Terms of Service"
      subtitle="The contractual terms and rules governing use of the FST Pay platform, prepaid wallets, and virtual cards."
      lastUpdated="October 4, 2026"
    >
      <section className="space-y-3">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">1. Acceptance of Terms</h2>
        <p>
          These Terms of Service (&ldquo;Terms&rdquo;) constitute a legally binding agreement between you and <strong>[LEGAL ENTITY NAME]</strong> (&ldquo;FST Pay&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;, or &ldquo;our&rdquo;). By accessing the website, registering an account, generating a virtual card, or utilizing our wallet services, you agree to comply with and be bound by these Terms.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">2. Eligibility & Teen Accounts</h2>
        <p>
          You must be at least 18 years of age to register as a Parent / Primary Account Holder.
        </p>
        <p>
          Users between the ages of 13 and 17 (&ldquo;Teen Users&rdquo;) may only register and use the platform under the verifiable supervision and linked authorization of a Parent or Legal Guardian. Parents assume primary responsibility for all transactions executed, card spending limits set, and approvals granted for their linked Teen accounts.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">3. Wallet & Virtual Card Terms</h2>
        <ul className="list-disc pl-6 space-y-1.5">
          <li>
            <strong>Non-Interest Bearing Prepaid Instrument:</strong> FST Pay wallet balances represent digital prepaid funds and do not accrue interest, dividends, or investment yield.
          </li>
          <li>
            <strong>Virtual Cards:</strong> Cards issued via the platform are prepaid instruments tied to your available wallet balance or allocated spending limits. Card credentials (PAN, CVV, Expiration) must be safeguarded.
          </li>
          <li>
            <strong>Top-Up & Payment Limits:</strong> Wallet top-ups and transactions are subject to system limits, parental rules, and statutory regulatory ceilings.
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">4. Prohibited Uses</h2>
        <p>You agree not to use FST Pay for any of the following activities:</p>
        <ul className="list-disc pl-6 space-y-1.5">
          <li>Unlawful gambling, betting, lotteries, or wagering activities.</li>
          <li>Purchases of age-restricted goods (tobacco, alcohol, adult entertainment) by or for minors.</li>
          <li>Cryptocurrency transactions, unregulated money transmission, or foreign exchange speculation.</li>
          <li>Fraud, identity theft, money laundering, or structuring transactions to evade AML reporting.</li>
          <li>Reverse engineering, scraping, or launching automated attacks against the FST Pay APIs.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">5. Intellectual Property & AI Money Coach</h2>
        <p>
          All trademarks, software designs, and user interface elements are the exclusive property of <strong>[LEGAL ENTITY NAME]</strong>.
        </p>
        <p>
          The AI Money Coach feature generates educational insights based on automated analysis of spending history. It does not provide certified financial, tax, or legal investment advice. Users must exercise independent judgment before making substantial financial decisions.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">6. Termination & Account Suspension</h2>
        <p>
          We reserve the right to suspend or terminate access to any account without prior notice if we detect suspicious transactions, AML/KYC non-compliance, breach of these Terms, or unauthorized access attempts.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">7. Limitation of Liability</h2>
        <p>
          To the maximum extent permitted by applicable law, <strong>[LEGAL ENTITY NAME]</strong> and its banking partners shall not be liable for indirect, incidental, punitive, or consequential damages resulting from third-party merchant disputes, network outages, or unauthorized access due to compromised user credentials.
        </p>
      </section>

      <section className="space-y-3 p-5 rounded-2xl bg-slate-100 dark:bg-surface-900 border border-slate-200 dark:border-surface-800 not-prose">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2">8. Contact Information</h2>
        <p className="text-xs text-slate-600 dark:text-surface-300">
          For legal notices, complaints, or inquiries regarding these Terms, please reach out to:
        </p>
        <div className="text-xs space-y-1 text-slate-700 dark:text-surface-200 mt-2">
          <p><strong>Entity Name:</strong> [LEGAL ENTITY NAME]</p>
          <p><strong>Registered Address:</strong> [REGISTERED ADDRESS]</p>
          <p><strong>Support & Legal Email:</strong> <a href="mailto:[GRIEVANCE EMAIL]" className="text-primary-600 dark:text-primary-400 hover:underline">[GRIEVANCE EMAIL]</a></p>
        </div>
      </section>
    </LegalPageLayout>
  );
}
