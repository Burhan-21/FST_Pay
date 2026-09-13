export type ThemeMode = 'light' | 'dark' | 'amoled';

export interface User {
  id: string;
  email: string;
  fullName: string;
  phone?: string;
  dateOfBirth?: string;
  avatarUrl?: string;
  role: 'USER' | 'ADMIN' | 'PARENT';
  isActive: boolean;
  createdAt: string;
  parentalControlEnabled?: boolean;
  parentalMaxTxnAmount?: number;
  parentalDailyLimit?: number;
  parentalWeeklyLimit?: number;
  parentalMonthlyLimit?: number;
  parentalRestrictedCategories?: string;
  parentalPin?: string;
  parentName?: string;
  parentEmail?: string;
  parentPhone?: string;
  parentDob?: string;
  parentGender?: string;
  parentAge?: number;
}

export interface Wallet {
  id: string;
  userId: string;
  balance: number;
  currency: string;
  isActive: boolean;
  createdAt: string;
}

export interface VirtualCard {
  id: string;
  userId: string;
  cardNumber: string;
  cardHolder: string;
  expiryMonth: number;
  expiryYear: number;
  cardType: string;
  status: 'ACTIVE' | 'FROZEN' | 'EXPIRED';
  spendingLimit?: number;
  dailyLimit?: number;
  isOneTime: boolean;
  merchantLock?: string[];
  cardDesign?: string;
  createdAt: string;
}

export type SettlementStatus = 'PENDING' | 'SETTLED' | 'COMPLETED' | 'FAILED' | 'DISPUTED';

export interface MerchantSettlementWebhookPayload {
  transactionId?: string;
  referenceId: string;
  merchantId: string;
  settlementAmount: number;
  currency: string;
  status: SettlementStatus;
  settledAt?: string;
  settlementNote?: string;
}

export interface Transaction {
  id: string;
  walletId: string;
  cardId?: string;
  type: 'CREDIT' | 'DEBIT';
  category: string;
  amount: number;
  balanceAfter: number;
  description?: string;
  merchant?: string;
  referenceId: string;
  status: SettlementStatus | string;
  createdAt: string;
  originalAmount?: number;
  originalCurrency?: string;
  fxRate?: number;
  fxFee?: number;
}

export interface FxQuote {
  sourceAmount: number;
  sourceCurrency: string;
  targetCurrency: string;
  exchangeRate: number;
  convertedAmount: number;
  feePercentage: number;
  feeAmount: number;
  totalAmount: number;
  expiresInSeconds: number;
}

export interface RewardPoints {
  id: string;
  userId: string;
  points: number;
  streakDays: number;
  lastStreakAt?: string;
}

export interface RewardHistory {
  id: string;
  userId: string;
  pointsChange: number;
  reason: string;
  createdAt: string;
}

export interface AiSession {
  id: string;
  userId: string;
  prompt: string;
  response: string;
  tokensUsed?: number;
  createdAt: string;
}

export interface SpendingByCategory {
  category: string;
  total: number;
  percentage: number;
  count: number;
}

export interface MonthlyAnalytics {
  month: string;
  totalIncome: number;
  totalExpenses: number;
  savings: number;
  topCategory: string;
}

export interface FinancialScore {
  score: number;          // 0-100
  grade: string;          // A, B, C, D, F
  savingsRate: number;
  budgetAdherence: number;
  streakDays: number;
}

export interface Analytics {
  totalDebit: number;
  totalCredit: number;
  netSavings: number;
  spendingByCategory: SpendingByCategory[];
  spendByCategory?: Record<string, number>;
  topMerchants: Array<{ merchant: string; amount: number }>;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  timestamp: string;
}

export interface PagedResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface TokenResponse {
  accessToken?: string;
  refreshToken?: string;
  expiresIn?: number;
  requiresOtp?: boolean;
  user?: User;
}

export interface CardDesign {
  bg: string;
  mascot: string;
  customPic?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
  recaptchaToken?: string;
}

export interface RegisterFormData {
  fullName: string;
  email: string;
  password: string;
  dateOfBirth?: string;
  recaptchaToken?: string;
}

export interface OtpVerification {
  email: string;
  otp: string;
}

export interface StatsResponse {
  totalUsers: number;
  totalBalances: number;
}

export interface WalletGoal {
  id: string;
  name: string;
  description?: string;
  targetAmount: number;
  currentAmount: number;
  allocatedAmount: number;
  withdrawnAmount: number;
  targetDate: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  icon: string;
  color?: string;
  status: 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  roundUpEnabled?: boolean;
  roundUpNearest?: number;
  roundUpAccumulated?: number;
  completedAt?: string;
  cancelledAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RoundUpRule {
  enabled: boolean;
  goalId?: string;
  goalName?: string;
  roundUpNearest?: number;
  accumulatedAmount: number;
  currentGoalAmount?: number;
  targetGoalAmount?: number;
}

export interface HealthScoreData {
  score: number;
  rating: 'POOR' | 'FAIR' | 'GOOD' | 'EXCELLENT';
  description: string;
  breakdown: {
    savingsRate: number;
    expenseRatio: number;
    budgetAdherence: number;
    streak: number;
    goalsProgress: number;
    consistency: number;
  };
}

export interface ForecastPoint {
  label: string;
  predictedCumulativeSpend: number;
  medianBalance?: number;
  optimisticBalance?: number;
  pessimisticBalance?: number;
}

export interface GoalFeasibility {
  goalId: string;
  goalName: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: string;
  probabilityPercentage: number;
  status: 'ON_TRACK' | 'AT_RISK' | 'CRITICAL';
}

export interface ForecastData {
  points: ForecastPoint[];
  modelUsed: string;
  currentBalance?: number;
  dailyBurnMean?: number;
  dailyBurnStdDev?: number;
  estimatedRunoutDays?: number | null;
  runoutProbability?: number;
  goalFeasibilities?: GoalFeasibility[];
}

export interface BudgetPlanData {
  totalIncome: number;
  totalSpending: number;
  recommendedAllocation: {
    Needs: number;
    Wants: number;
    Savings: number;
  };
  actualAllocation: {
    Needs: number;
    Wants: number;
    Savings: number;
  };
}

export interface RewardsStatus {
  points: number;
  xp: number;
  level: number;
  currentLevelXpBoundary: number;
  nextLevelXpBoundary: number;
  streakDays: number;
  lastStreakAt?: string;
}

export interface BadgeResponse {
  id: string;
  name: string;
  displayName: string;
  description: string;
  icon: string;
  unlocked: boolean;
  unlockedAt?: string;
}

export interface RewardItem {
  id: string;
  title: string;
  description?: string;
  costPoints: number;
  stock: number;
  code: string;
  createdAt: string;
}

export interface RedeemResponse {
  id: string;
  title: string;
  description?: string;
  codeClaimed: string;
  redeemedAt: string;
}

export interface ParentInvitation {
  id: string;
  child: User;
  parentEmail: string;
  token: string;
  status: 'PENDING' | 'ACCEPTED' | 'EXPIRED' | 'CANCELLED';
  relationship: 'MOTHER' | 'FATHER' | 'GUARDIAN' | 'OTHER';
  expiresAt: string;
  createdAt: string;
  updatedAt?: string;
  acceptedAt?: string;
  cancelledAt?: string;
  resentCount: number;
}

export interface ParentChildLink {
  id: string;
  parent: User;
  child: User;
  relationship: string;
  status: 'ACTIVE' | 'REVOKED';
  linkedAt: string;
  revokedAt?: string;
}

export interface TransactionApproval {
  id: string;
  parent?: User;
  child?: User;
  childId?: string;
  childName?: string;
  requestType: 'SPEND' | 'CARD_FREEZE' | 'CARD_UNFREEZE' | 'CARD_GENERATE' | 'GOAL_WITHDRAW' | 'TRANSFER';
  amount?: number;
  category?: string;
  merchant?: string;
  description?: string;
  targetId?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'FAILED';
  parentNote?: string;
  createdAt: string;
  decidedAt?: string;
  biometricVerified?: boolean;
  biometricAuthMethod?: string;
  biometricCredentialId?: string;
  biometricVerifiedAt?: string;
}

export interface WebAuthnCredential {
  id: string;
  credentialId: string;
  algorithm: string;
  deviceName?: string;
  signCount: number;
  createdAt: string;
  lastUsedAt?: string;
}

export interface WebAuthnRegisterOptions {
  challenge: string;
  rp: {
    name: string;
    id: string;
  };
  user: {
    id: string;
    name: string;
    displayName: string;
  };
  pubKeyCredParams: Array<{
    type: string;
    alg: number;
  }>;
  timeout?: number;
  attestation?: string;
  authenticatorSelection?: {
    authenticatorAttachment?: string;
    userVerification?: string;
    requireResidentKey?: boolean;
  };
}

export interface WebAuthnAuthOptions {
  challenge: string;
  timeout?: number;
  rpId?: string;
  allowCredentials?: Array<{
    id: string;
    type: string;
  }>;
  userVerification?: string;
}

export interface SpendSimulationResponse {
  status: 'COMPLETED' | 'PENDING_APPROVAL';
  message: string;
  transaction?: Transaction;
  approval?: TransactionApproval;
}

export interface ParentNotification {
  id: string;
  parent: User;
  child?: User;
  type: 'POCKET_MONEY' | 'APPROVAL_REQUEST' | 'APPROVAL_DECISION' | 'REPORT_GENERATED' | 'SECURITY_ALERT';
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export interface ChildSummary {
  id: string;
  fullName: string;
  email: string;
  isActive: boolean;
  parentalControlEnabled?: boolean;
  parentalMaxTxnAmount?: number;
  parentalDailyLimit?: number;
  parentalWeeklyLimit?: number;
  parentalMonthlyLimit?: number;
  parentalRestrictedCategories?: string;
  createdAt: string;
}

export interface ActivityTimelineEvent {
  timestamp: string;
  type: string;
  title: string;
  description: string;
  childId: string;
  childName: string;
  amount?: number;
}

export interface ParentDashboardData {
  children: ChildSummary[];
  totalChildrenBalance: number;
  totalPocketMoneySentThisMonth: number;
  pendingApprovalsCount: number;
  recentNotifications: ParentNotification[];
  activityTimeline: ActivityTimelineEvent[];
}

export interface ChildDetail {
  id: string;
  fullName: string;
  email: string;
  relationship: string;
  parentalControlEnabled: boolean;
  parentalMaxTxnAmount: number;
  parentalDailyLimit: number;
  parentalWeeklyLimit: number;
  parentalMonthlyLimit: number;
  parentalRestrictedCategories: string;
  walletBalance: number;
  walletCurrency: string;
  virtualCards: VirtualCard[];
  activeGoals: WalletGoal[];
  recentTransactions: Transaction[];
}

export interface SseSettlementUpdatePayload {
  type: 'SETTLEMENT_UPDATE';
  transactionId: string;
  referenceId: string;
  merchantId: string;
  status: SettlementStatus;
  amount: number;
}

export interface SseWalletUpdatePayload {
  type: 'WALLET_UPDATE';
  userId: string;
  amount: number;
  balance: number;
}

export interface SseAiAlertPayload {
  type: 'AI_ALERT';
  anomalyType: string;
  category: string;
  severity: 'ALERT' | 'WARNING' | 'INFO';
  currentAmount: number;
  baselineAmount: number;
  title: string;
  message: string;
  actionableAdvice: string;
  detectedAt: string;
}

export interface AiBudgetAnomaly {
  anomalyType: 'CATEGORY_SPIKE' | 'WANTS_IMBALANCE' | 'GOAL_AT_RISK' | 'BURN_RATE_RISK' | string;
  severity: 'ALERT' | 'WARNING' | 'INFO';
  category: string;
  currentAmount: number;
  baselineAmount: number;
  title: string;
  message: string;
  actionableAdvice: string;
  detectedAt: string;
}

export interface ObservabilityMetrics {
  monteCarloSimulationsSuccess: number;
  monteCarloSimulationsFailed: number;
  monteCarloAvgDurationMs: number;
  roundUpSweepsSuccess: number;
  roundUpSweepsInsufficientFunds: number;
  roundUpTotalAmountInr: number;

  fxQuotesRequested: number;
  fxConversionsExecuted: number;
  fxFeesCollectedInr: number;
  fxCacheHits: number;
  fxCacheMisses: number;
  fxCacheHitRatio: number;

  webhooksReceivedValid: number;
  webhooksReceivedInvalid: number;
  webhooksSettled: number;
  webhooksDuplicates: number;
  webhooksMismatches: number;
  webhooksAvgProcessingDurationMs: number;

  webauthnRegistrationsSuccess: number;
  webauthnRegistrationsFailed: number;
  webauthnVerificationsSuccess: number;
  webauthnVerificationsFailed: number;
  guardianApprovalsApproved: number;
  guardianApprovalsRejected: number;
  guardianApprovalsBiometric: number;
  guardianApprovalsManual: number;

  jvmMemoryUsedMb: number;
  jvmMemoryMaxMb: number;
  systemCpuUsage: number;
  uptimeSeconds: number;
}

export type SseEventPayload = SseSettlementUpdatePayload | SseWalletUpdatePayload | SseAiAlertPayload | { type: string; [key: string]: unknown };
