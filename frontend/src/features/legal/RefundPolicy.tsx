import LegalPageLayout from './LegalPageLayout';

export default function RefundPolicy() {
  return (
    <LegalPageLayout
      title="Refund & Cancellation Policy"
      subtitle="Terms regarding wallet balance reversals, failed recharge settlements, and merchant transaction disputes."
      lastUpdated="October 4, 2026"
    >
      <section className="space-y-3">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">1. Scope of Policy</h2>
        <p>
          This Refund and Dispute Policy governs all transactions processed through the <strong>[LEGAL ENTITY NAME]</strong> (&ldquo;FST Pay&rdquo;) platform, including wallet additions, virtual card spends, bill payments, and mobile recharges.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">2. Wallet Top-Up Failures & Auto-Reversals</h2>
        <p>
          When you initiate a top-up via UPI, Debit Card, or Net Banking and funds are debited from your bank account without reflecting in your FST Pay wallet:
        </p>
        <ul className="list-disc pl-6 space-y-1.5">
          <li>
            <strong>Automated Settlement:</strong> The banking switch usually reconciles the transaction within <strong>24 to 48 business hours</strong>. If the transaction cannot be credited to your wallet, the payment gateway automatically initiates a reversal back to the source bank account.
          </li>
          <li>
            <strong>Bank Processing Time:</strong> Depending on your issuing bank, the reversed amount typically reflects within <strong>3 to 5 business days</strong> from reconciliation.
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">3. Bill Payments & Mobile Recharges</h2>
        <p>
          For utility bill settlements and mobile/DTH recharges handled through our Bills & Recharge Hub:
        </p>
        <ul className="list-disc pl-6 space-y-1.5">
          <li>
            <strong>Successful Transactions:</strong> Once the utility provider or telecom operator confirms recharge receipt, payments are final and cannot be cancelled or reversed.
          </li>
          <li>
            <strong>Failed Bill Payments:</strong> If the telecom operator or biller rejects the transaction due to technical failure or account mismatch, your FST Pay wallet will be automatically credited with a full refund within <strong>2 hours</strong>.
          </li>
          <li>
            <strong>Pending Confirmations:</strong> In cases where operator confirmation is delayed, status will remain &ldquo;PENDING&rdquo; for up to 24 hours while automated polling attempts verification. If unverified after 24 hours, the funds are automatically returned to your wallet balance.
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">4. Peer-to-Peer (P2P) Transfers</h2>
        <p>
          Transfers made between FST Pay users (such as Teen to Teen or Parent allowance distributions) are executed instantaneously. Once completed, a peer transfer cannot be cancelled by the platform. In cases of erroneous recipient entry, please contact support immediately to request mediation.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">5. Virtual Card Purchases & Merchant Chargebacks</h2>
        <p>
          If an unauthorized charge occurs on your virtual card or a merchant fails to deliver purchased goods/services:
        </p>
        <ul className="list-disc pl-6 space-y-1.5">
          <li>Immediately freeze the affected card via the <strong>Virtual Cards</strong> section.</li>
          <li>Contact the merchant directly to request a merchant refund, which will credit back to your card balance upon settlement.</li>
          <li>If the merchant is unresponsive or suspected of fraud, lodge a dispute ticket with our support desk within 30 days of the transaction timestamp.</li>
        </ul>
      </section>

      <section className="space-y-3 p-5 rounded-2xl bg-slate-100 dark:bg-surface-900 border border-slate-200 dark:border-surface-800 not-prose">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2">6. Raising a Dispute / Contacting Support</h2>
        <p className="text-xs text-slate-600 dark:text-surface-300 mb-2">
          To raise a refund request or report a failed transaction, please include your Transaction ID, date, amount, and registered email address:
        </p>
        <div className="text-xs space-y-1 text-slate-700 dark:text-surface-200">
          <p><strong>Support & Disputes Desk:</strong> <a href="mailto:[GRIEVANCE EMAIL]" className="text-primary-600 dark:text-primary-400 hover:underline">[GRIEVANCE EMAIL]</a></p>
          <p><strong>Entity:</strong> [LEGAL ENTITY NAME]</p>
          <p><strong>Registered Address:</strong> [REGISTERED ADDRESS]</p>
        </div>
      </section>
    </LegalPageLayout>
  );
}
