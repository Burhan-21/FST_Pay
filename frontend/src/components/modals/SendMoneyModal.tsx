import { useState, useMemo, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
  X, ArrowLeft, Search, User, CheckCircle2, AlertCircle, Loader2,
  ArrowRight, ShieldCheck, Share2, Download, ReceiptText, AtSign,
  Plus, Trash2
} from 'lucide-react';
import { transactionApi, contactsApi } from '../../api/endpoints';
import { formatCurrency } from '../../utils/helpers';
import { shareOrDownloadReceiptJpg, downloadReceiptJpg } from '../../utils/receiptGenerator';
import type { Transaction, UserContact } from '../../types';

interface SendMoneyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  currentBalance: number;
  recentTransactions?: Transaction[];
  initialRecipient?: string;
  initialAmount?: string;
}

export default function SendMoneyModal({
  isOpen,
  onClose,
  onSuccess,
  currentBalance,
  recentTransactions: _recentTransactions = [],
  initialRecipient = '',
  initialAmount = '',
}: SendMoneyModalProps) {
  const [step, setStep] = useState<'recipient' | 'amount' | 'review' | 'success'>('recipient');
  const [tab, setTab] = useState<'contacts' | 'upi' | 'bank'>('contacts');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Recipient details
  const [recipient, setRecipient] = useState(initialRecipient);
  
  // Amount & Note
  const [amount, setAmount] = useState(initialAmount);
  const [note, setNote] = useState('');
  const [category, setCategory] = useState('SHOPPING');
  
  // Contacts state
  const [contacts, setContacts] = useState<UserContact[]>([]);
  const [isLoadingContacts, setIsLoadingContacts] = useState(false);
  const [showAddContact, setShowAddContact] = useState(false);
  const [newContactName, setNewContactName] = useState('');
  const [newContactUpi, setNewContactUpi] = useState('');
  const [newContactPhone, setNewContactPhone] = useState('');
  const [isSavingContact, setIsSavingContact] = useState(false);

  // Bank Transfer Form State
  const [bankAccountHolder, setBankAccountHolder] = useState('');
  const [bankAccountNumber, setBankAccountNumber] = useState('');
  const [bankConfirmAccountNumber, setBankConfirmAccountNumber] = useState('');
  const [bankIfscCode, setBankIfscCode] = useState('');
  const [bankName, setBankName] = useState('');

  // Submission states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [confirmedTxn, setConfirmedTxn] = useState<any>(null);

  const fetchContacts = useCallback(async () => {
    try {
      setIsLoadingContacts(true);
      const res = await contactsApi.getContacts();
      setContacts(res.data.data || []);
    } catch (err) {
      console.error('Failed to load contacts:', err);
    } finally {
      setIsLoadingContacts(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen && tab === 'contacts') {
      fetchContacts();
    }
  }, [isOpen, tab, fetchContacts]);

  const handleAddContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContactName.trim()) {
      setError('Please enter a contact name.');
      return;
    }
    if (!newContactUpi.trim() && !newContactPhone.trim()) {
      setError('Please enter a UPI ID or phone number.');
      return;
    }
    setIsSavingContact(true);
    setError('');
    try {
      await contactsApi.createContact({
        name: newContactName.trim(),
        upiId: newContactUpi.trim() || undefined,
        phone: newContactPhone.trim() || undefined,
      });
      setNewContactName('');
      setNewContactUpi('');
      setNewContactPhone('');
      setShowAddContact(false);
      await fetchContacts();
    } catch (err: unknown) {
      if (axios.isAxiosError<{ message?: string }>(err)) {
        setError(err.response?.data?.message || 'Failed to save contact.');
      } else {
        setError('Failed to save contact.');
      }
    } finally {
      setIsSavingContact(false);
    }
  };

  const handleDeleteContact = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await contactsApi.deleteContact(id);
      await fetchContacts();
    } catch (err) {
      console.error('Failed to delete contact:', err);
    }
  };

  const filteredContacts = useMemo(() => {
    if (!searchQuery.trim()) return contacts;
    const q = searchQuery.toLowerCase();
    return contacts.filter((c) =>
      c.name.toLowerCase().includes(q) ||
      (c.upiId && c.upiId.toLowerCase().includes(q)) ||
      (c.phone && c.phone.includes(q))
    );
  }, [contacts, searchQuery]);

  if (!isOpen) return null;

  const handleSelectRecipient = (name: string) => {
    setRecipient(name);
    setStep('amount');
    setError('');
  };

  const handleCustomUpiSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      setError('Please enter a valid recipient name or UPI ID.');
      return;
    }
    handleSelectRecipient(searchQuery.trim());
  };

  const handleBankTransferSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const cleanHolder = bankAccountHolder.trim();
    const cleanAcc = bankAccountNumber.trim();
    const cleanConfirm = bankConfirmAccountNumber.trim();
    const cleanIfsc = bankIfscCode.trim().toUpperCase();
    const cleanBank = bankName.trim() || 'Bank Transfer';
    const num = parseFloat(amount);

    if (!cleanHolder) {
      setError('Please enter the account holder name.');
      return;
    }
    if (!cleanAcc || cleanAcc.length < 8) {
      setError('Please enter a valid bank account number (min 8 digits).');
      return;
    }
    if (cleanAcc !== cleanConfirm) {
      setError('Account numbers do not match. Please verify.');
      return;
    }
    const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
    if (!ifscRegex.test(cleanIfsc)) {
      setError('Please enter a valid 11-character IFSC code (e.g. SBIN0001234, HDFC0000456).');
      return;
    }
    if (isNaN(num) || num <= 0) {
      setError('Please enter a transfer amount greater than 0.');
      return;
    }
    if (num > currentBalance) {
      setError(`Insufficient balance. You have ${formatCurrency(currentBalance)} available.`);
      return;
    }

    setRecipient(`${cleanHolder} (${cleanBank} - ••••${cleanAcc.slice(-4)})`);
    setCategory('BILLS');
    setStep('review');
  };

  const handleAmountContinue = (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseFloat(amount);
    if (isNaN(num) || num <= 0) {
      setError('Please enter an amount greater than 0.');
      return;
    }
    if (num > currentBalance) {
      setError(`Insufficient balance. You have ${formatCurrency(currentBalance)} available.`);
      return;
    }
    setError('');
    setStep('review');
  };

  const handleConfirmPayment = async () => {
    setIsSubmitting(true);
    setError('');
    try {
      const res = await transactionApi.simulateSpend({
        amount: parseFloat(amount),
        category,
        merchant: recipient,
        description: note.trim() || `Payment to ${recipient}`,
        currency: 'INR',
      });
      setConfirmedTxn(res.data?.data || null);
      setStep('success');
      onSuccess();
    } catch (err: unknown) {
      if (axios.isAxiosError<{ message?: string }>(err)) {
        setError(err.response?.data?.message || 'Transaction failed. Please try again.');
      } else {
        setError('Network error occurred during payment processing.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleShareReceipt = async () => {
    const txId = confirmedTxn?.id || `TXN-${Date.now()}`;
    await shareOrDownloadReceiptJpg({
      transactionId: txId,
      amount: parseFloat(amount),
      recipientName: recipient,
      recipientDetail: note || 'Direct Transfer',
      paymentMethod: tab === 'bank' ? 'IMPS Bank Wire' : 'Instant Wallet / UPI',
      note: note || undefined,
      date: new Date(),
      status: 'SUCCESS',
    });
  };

  const handleDownloadReceipt = () => {
    const txId = confirmedTxn?.id || `TXN-${Date.now()}`;
    downloadReceiptJpg({
      transactionId: txId,
      amount: parseFloat(amount),
      recipientName: recipient,
      recipientDetail: note || 'Direct Transfer',
      paymentMethod: tab === 'bank' ? 'IMPS Bank Wire' : 'Instant Wallet / UPI',
      note: note || undefined,
      date: new Date(),
      status: 'SUCCESS',
    });
  };

  const handleClose = () => {
    setStep('recipient');
    setRecipient('');
    setAmount('');
    setNote('');
    setError('');
    setConfirmedTxn(null);
    setShowAddContact(false);
    setNewContactName('');
    setNewContactUpi('');
    setNewContactPhone('');
    setBankAccountHolder('');
    setBankAccountNumber('');
    setBankConfirmAccountNumber('');
    setBankIfscCode('');
    setBankName('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md bg-white dark:bg-surface-900 rounded-3xl shadow-2xl border border-slate-100 dark:border-surface-800 overflow-hidden">
        
        {/* Step 1: Select Recipient */}
        {step === 'recipient' && (
          <div>
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-surface-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Send Money</h3>
              <button onClick={handleClose} className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-surface-800">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Search Bar */}
              <form onSubmit={handleCustomUpiSubmit} className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search name, UPI ID or mobile"
                  className="w-full pl-11 pr-20 py-3 text-sm font-medium text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-surface-400 bg-slate-50 dark:bg-surface-800/80 rounded-2xl border border-slate-200 dark:border-surface-700 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 caret-primary-600"
                />
                {searchQuery.trim() && (
                  <button
                    type="submit"
                    className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-xl bg-primary-500 text-white text-xs font-semibold hover:bg-primary-600 transition-colors"
                  >
                    Pay
                  </button>
                )}
              </form>

              {/* Tabs */}
              <div className="flex p-1 bg-slate-100 dark:bg-surface-800 rounded-2xl">
                {[
                  { id: 'contacts', label: 'Contacts' },
                  { id: 'upi', label: 'UPI ID' },
                  { id: 'bank', label: 'Bank Transfer' },
                ].map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setTab(t.id as any)}
                    className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-all ${
                      tab === t.id
                        ? 'bg-white dark:bg-surface-700 text-primary-600 dark:text-white shadow-sm'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {/* Recipient list or empty state */}
              {tab === 'contacts' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-xs font-bold text-slate-700 dark:text-surface-300 uppercase tracking-wider">
                      Saved Contacts ({contacts.length})
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowAddContact(!showAddContact)}
                      className="inline-flex items-center gap-1 text-xs font-bold text-primary-600 dark:text-primary-400 hover:text-primary-700"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{showAddContact ? 'Close' : 'Add Contact'}</span>
                    </button>
                  </div>

                  {/* Inline Add Contact Form */}
                  {showAddContact && (
                    <form onSubmit={handleAddContact} className="p-3.5 rounded-2xl bg-slate-50 dark:bg-surface-800 border border-slate-200 dark:border-surface-700 space-y-3 animate-fade-in">
                      <p className="text-xs font-bold text-slate-800 dark:text-white">Add New Contact</p>
                      <input
                        type="text"
                        placeholder="Contact Full Name *"
                        value={newContactName}
                        onChange={(e) => setNewContactName(e.target.value)}
                        required
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-surface-600 bg-white dark:bg-surface-700 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-primary-500"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          placeholder="UPI ID (e.g. name@upi)"
                          value={newContactUpi}
                          onChange={(e) => setNewContactUpi(e.target.value)}
                          className="px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-surface-600 bg-white dark:bg-surface-700 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-primary-500"
                        />
                        <input
                          type="tel"
                          placeholder="Phone Number"
                          value={newContactPhone}
                          onChange={(e) => setNewContactPhone(e.target.value)}
                          className="px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-surface-600 bg-white dark:bg-surface-700 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-primary-500"
                        />
                      </div>
                      <div className="flex justify-end gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setShowAddContact(false)}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-500 hover:text-slate-800"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={isSavingContact}
                          className="px-3.5 py-1.5 rounded-lg bg-primary-500 hover:bg-primary-600 text-white text-xs font-bold shadow-xs flex items-center gap-1.5"
                        >
                          {isSavingContact && <Loader2 className="w-3 h-3 animate-spin" />}
                          <span>Save Contact</span>
                        </button>
                      </div>
                    </form>
                  )}

                  {isLoadingContacts ? (
                    <div className="py-8 flex flex-col items-center justify-center">
                      <Loader2 className="w-6 h-6 text-primary-500 animate-spin mb-2" />
                      <p className="text-xs text-slate-400">Loading contacts...</p>
                    </div>
                  ) : filteredContacts.length > 0 ? (
                    <div className="space-y-1 max-h-56 overflow-y-auto pr-1">
                      {filteredContacts.map((c) => (
                        <div
                          key={c.id}
                          onClick={() => handleSelectRecipient(c.upiId || c.phone || c.name)}
                          className="w-full p-2.5 rounded-2xl flex items-center justify-between hover:bg-slate-50 dark:hover:bg-surface-800 transition-colors cursor-pointer group"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-full bg-primary-50 text-primary-600 dark:bg-primary-950/30 flex items-center justify-center font-bold text-sm shrink-0">
                              {c.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{c.name}</p>
                              <p className="text-[11px] text-slate-400 truncate">
                                {c.upiId || c.phone || 'Saved Contact'}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={(e) => handleDeleteContact(c.id, e)}
                              className="p-1.5 text-slate-300 hover:text-rose-500 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-colors"
                              title="Delete Contact"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                            <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-primary-500 transition-colors" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-8 text-center px-4 space-y-2">
                      <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-surface-800 text-slate-400 mx-auto flex items-center justify-center">
                        <User className="w-6 h-6" />
                      </div>
                      <p className="text-xs font-semibold text-slate-700 dark:text-surface-300">No saved contacts yet</p>
                      <p className="text-[11px] text-slate-400">
                        Add friends and frequent accounts for easy 1-tap transfers.
                      </p>
                      <button
                        type="button"
                        onClick={() => setShowAddContact(true)}
                        className="inline-flex items-center gap-1 text-xs font-bold text-primary-600 hover:underline pt-1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Your First Contact</span>
                      </button>
                    </div>
                  )}
                </div>
              )}

              {tab === 'upi' && (
                <div className="py-6 px-2 space-y-3">
                  <div className="relative">
                    <AtSign className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="e.g. rahul@oksbi or 9876543210@paytm"
                      className="w-full pl-11 pr-4 py-3 text-sm font-medium text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-surface-400 bg-slate-50 dark:bg-surface-800 rounded-2xl border border-slate-200 dark:border-surface-700 focus:outline-none focus:ring-2 focus:ring-primary-500/20 caret-primary-600"
                    />
                  </div>
                  <button
                    onClick={handleCustomUpiSubmit}
                    disabled={!searchQuery.trim()}
                    className="w-full py-3 rounded-2xl bg-primary-500 hover:bg-primary-600 text-white font-semibold text-xs disabled:opacity-50 transition-colors"
                  >
                    Verify & Proceed
                  </button>
                </div>
              )}

              {tab === 'bank' && (
                <form onSubmit={handleBankTransferSubmit} className="space-y-3 pt-1">
                  <div>
                    <label className="input-label text-slate-700 dark:text-surface-300 font-medium text-xs mb-1 block">
                      Account Holder Name *
                    </label>
                    <input
                      type="text"
                      value={bankAccountHolder}
                      onChange={(e) => setBankAccountHolder(e.target.value)}
                      placeholder="Enter beneficiary full name"
                      required
                      className="w-full px-3.5 py-2 text-xs font-medium rounded-xl border border-slate-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="input-label text-slate-700 dark:text-surface-300 font-medium text-xs mb-1 block">
                        Account Number *
                      </label>
                      <input
                        type="text"
                        value={bankAccountNumber}
                        onChange={(e) => setBankAccountNumber(e.target.value.replace(/\D/g, ''))}
                        placeholder="Account Number"
                        required
                        className="w-full px-3 py-2 text-xs font-medium rounded-xl border border-slate-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                      />
                    </div>
                    <div>
                      <label className="input-label text-slate-700 dark:text-surface-300 font-medium text-xs mb-1 block">
                        Confirm Number *
                      </label>
                      <input
                        type="text"
                        value={bankConfirmAccountNumber}
                        onChange={(e) => setBankConfirmAccountNumber(e.target.value.replace(/\D/g, ''))}
                        placeholder="Re-enter Number"
                        required
                        className="w-full px-3 py-2 text-xs font-medium rounded-xl border border-slate-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="input-label text-slate-700 dark:text-surface-300 font-medium text-xs mb-1 block">
                        IFSC Code *
                      </label>
                      <input
                        type="text"
                        value={bankIfscCode}
                        onChange={(e) => setBankIfscCode(e.target.value.toUpperCase())}
                        placeholder="e.g. SBIN0001234"
                        maxLength={11}
                        required
                        className="w-full px-3 py-2 text-xs font-medium uppercase font-mono rounded-xl border border-slate-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                      />
                    </div>
                    <div>
                      <label className="input-label text-slate-700 dark:text-surface-300 font-medium text-xs mb-1 block">
                        Bank Name
                      </label>
                      <input
                        type="text"
                        value={bankName}
                        onChange={(e) => setBankName(e.target.value)}
                        placeholder="e.g. HDFC Bank"
                        className="w-full px-3 py-2 text-xs font-medium rounded-xl border border-slate-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="input-label text-slate-700 dark:text-surface-300 font-medium text-xs mb-0 block">
                        Amount (₹) *
                      </label>
                      <span className="text-[11px] text-slate-400">Available: {formatCurrency(currentBalance)}</span>
                    </div>
                    <input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0.00"
                      step="any"
                      min="1"
                      required
                      className="w-full px-3.5 py-2 text-sm font-bold rounded-xl border border-slate-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                    />
                  </div>

                  <div>
                    <input
                      type="text"
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="Payment Note (optional)"
                      className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 rounded-xl bg-primary-500 hover:bg-primary-600 text-white font-semibold text-xs transition-colors shadow-md shadow-primary-500/20 flex items-center justify-center gap-1.5"
                  >
                    <span>Proceed to Review</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </form>
              )}

              {/* Bottom promo tag */}
              <div className="p-3 rounded-2xl bg-primary-50/50 dark:bg-primary-950/20 border border-primary-100 dark:border-primary-900/30 flex items-center justify-between text-xs text-primary-700 dark:text-primary-300">
                <span className="font-semibold">Split Bills, Not Vibes</span>
                <span className="text-[11px] text-primary-500">Zero transfer fees</span>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Enter Amount */}
        {step === 'amount' && (
          <div>
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-surface-800">
              <button onClick={() => setStep('recipient')} className="p-1 rounded-lg text-slate-400 hover:text-slate-600">
                <ArrowLeft className="w-5 h-5" />
              </button>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Enter Amount</h3>
              <button onClick={handleClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAmountContinue} className="p-6 space-y-5">
              {/* Recipient Card */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-surface-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary-500 text-white flex items-center justify-center font-bold">
                    {recipient.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Paying to</p>
                    <p className="text-sm font-bold text-slate-900 dark:text-white">{recipient}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setStep('recipient')}
                  className="text-xs font-semibold text-primary-500 hover:underline"
                >
                  Change
                </button>
              </div>

              {error && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-600 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Amount Input */}
              <div>
                <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
                  <span className="font-semibold uppercase tracking-wider">Amount</span>
                  <span>Available: {formatCurrency(currentBalance)}</span>
                </div>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-3xl font-bold text-slate-400">₹</span>
                  <input
                    type="number"
                    step="any"
                    min="1"
                    value={amount}
                    onChange={(e) => {
                      setAmount(e.target.value);
                      setError('');
                    }}
                    placeholder="0.00"
                    autoFocus
                    className="w-full pl-12 pr-4 py-3.5 text-3xl font-bold text-slate-900 dark:text-white bg-slate-50 dark:bg-surface-800 rounded-2xl border border-slate-200 dark:border-surface-700 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                  />
                </div>
              </div>

              {/* Category selector */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                  Category
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {['SHOPPING', 'FOOD', 'BILLS', 'ENTERTAINMENT'].map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setCategory(c)}
                      className={`py-2 px-1 text-[11px] font-semibold rounded-xl border transition-all ${
                        category === c
                          ? 'border-primary-500 bg-primary-50 dark:bg-primary-950/20 text-primary-600'
                          : 'border-slate-200 dark:border-surface-700 text-slate-600 dark:text-surface-400'
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              {/* Note */}
              <div>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Add a note (optional)"
                  className="w-full px-4 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-surface-400 bg-slate-50 dark:bg-surface-800 rounded-xl border border-slate-200 dark:border-surface-700 focus:outline-none focus:ring-1 focus:ring-primary-500 caret-primary-600"
                />
              </div>

              <button
                type="submit"
                disabled={!amount || parseFloat(amount) <= 0 || parseFloat(amount) > currentBalance}
                className="w-full py-3.5 px-4 rounded-2xl bg-primary-500 hover:bg-primary-600 text-white font-semibold text-sm shadow-lg shadow-primary-500/25 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
              >
                Continue
              </button>
            </form>
          </div>
        )}

        {/* Step 3: Review & Confirm */}
        {step === 'review' && (
          <div>
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-surface-800">
              <button onClick={() => setStep('amount')} className="p-1 rounded-lg text-slate-400 hover:text-slate-600">
                <ArrowLeft className="w-5 h-5" />
              </button>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Review & Confirm</h3>
              <button onClick={handleClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {error && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-600 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Amount Display */}
              <div className="text-center py-4 space-y-1">
                <p className="text-xs text-slate-400">Total Transfer Amount</p>
                <h2 className="text-4xl font-extrabold text-slate-900 dark:text-white">
                  {formatCurrency(parseFloat(amount))}
                </h2>
                <p className="text-xs font-medium text-slate-500">To {recipient}</p>
              </div>

              {/* Breakdown Card */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-surface-800 space-y-2.5 text-xs">
                <div className="flex justify-between text-slate-500">
                  <span>Transfer Amount</span>
                  <span className="font-semibold text-slate-900 dark:text-white">{formatCurrency(parseFloat(amount))}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Processing Fee</span>
                  <span className="font-semibold text-emerald-500">FREE</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Category</span>
                  <span className="font-semibold text-slate-900 dark:text-white">{category}</span>
                </div>
                <div className="pt-2 border-t border-slate-200 dark:border-surface-700 flex justify-between font-bold text-slate-900 dark:text-white">
                  <span>Total Debit</span>
                  <span>{formatCurrency(parseFloat(amount))}</span>
                </div>
              </div>

              {/* Payment source */}
              <div className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-surface-700 text-xs text-slate-600 dark:text-surface-300">
                <ShieldCheck className="w-4 h-4 text-primary-500" />
                <span>Protected by FST Pay 256-bit instant settlement</span>
              </div>

              <button
                type="button"
                onClick={handleConfirmPayment}
                disabled={isSubmitting}
                className="w-full py-3.5 px-4 rounded-2xl bg-primary-500 hover:bg-primary-600 text-white font-semibold text-sm shadow-lg shadow-primary-500/25 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Processing Payment...
                  </>
                ) : (
                  `Pay ${formatCurrency(parseFloat(amount))}`
                )}
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Payment Successful (Matching Phone 3 Mockup) */}
        {step === 'success' && (
          <div className="p-8 text-center space-y-6">
            {/* Green Checkmark */}
            <div className="w-20 h-20 rounded-full bg-emerald-50 text-emerald-500 mx-auto flex items-center justify-center shadow-xl shadow-emerald-500/20">
              <CheckCircle2 className="w-12 h-12" />
            </div>

            {/* Success Message */}
            <div className="space-y-1">
              <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">Payment Successful!</h3>
              <p className="text-3xl font-extrabold text-slate-900 dark:text-white pt-2">
                {formatCurrency(parseFloat(amount))}
              </p>
              <p className="text-xs text-slate-500 dark:text-surface-400">
                Paid to <strong className="text-slate-800 dark:text-surface-200">{recipient}</strong>
              </p>
            </div>

            {/* Quote Card */}
            <div className="p-3.5 rounded-2xl bg-primary-50/60 dark:bg-primary-950/30 border border-primary-100 dark:border-primary-900/40 text-xs text-primary-700 dark:text-primary-300 italic font-medium">
              &ldquo;Small payments. Big possibilities.&rdquo;
            </div>

            {/* Action Buttons: Share, Download, Details */}
            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 dark:border-surface-800">
              <button
                type="button"
                onClick={handleShareReceipt}
                className="p-2.5 rounded-xl text-slate-600 dark:text-surface-300 hover:bg-slate-50 dark:hover:bg-surface-800 text-xs flex flex-col items-center gap-1 font-medium transition-colors"
              >
                <Share2 className="w-4 h-4 text-primary-500" />
                <span>Share Receipt</span>
              </button>
              <button
                type="button"
                onClick={handleDownloadReceipt}
                className="p-2.5 rounded-xl text-slate-600 dark:text-surface-300 hover:bg-slate-50 dark:hover:bg-surface-800 text-xs flex flex-col items-center gap-1 font-medium transition-colors"
              >
                <Download className="w-4 h-4 text-primary-500" />
                <span>Download JPG</span>
              </button>
              <button
                type="button"
                onClick={handleClose}
                className="p-2.5 rounded-xl text-slate-600 dark:text-surface-300 hover:bg-slate-50 dark:hover:bg-surface-800 text-xs flex flex-col items-center gap-1 font-medium transition-colors"
              >
                <ReceiptText className="w-4 h-4 text-primary-500" />
                <span>Close</span>
              </button>
            </div>

            {/* Done Button */}
            <button
              onClick={handleClose}
              className="w-full py-3.5 rounded-2xl bg-primary-500 hover:bg-primary-600 text-white font-bold text-sm shadow-lg shadow-primary-500/25 transition-all"
            >
              Done
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
