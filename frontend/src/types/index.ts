export type ThemeMode = 'light' | 'dark' | 'amoled';

export interface User {
  id: string;
  email: string;
  fullName: string;
  phone?: string;
  dateOfBirth?: string;
  avatarUrl?: string;
  role: 'USER' | 'ADMIN';
  isActive: boolean;
  createdAt: string;
  parentalControlEnabled?: boolean;
  parentalMaxTxnAmount?: number;
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
  status: string;
  createdAt: string;
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
