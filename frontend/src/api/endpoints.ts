import api from './axios';
import type { ScheduledAllowance, CreateAllowanceRequest, UpdateAllowanceRequest } from '../types';

// ── Auth ──
export const authApi = {
  register: (data: { fullName: string; email: string; password: string; dateOfBirth?: string; recaptchaToken?: string }) =>
    api.post('/auth/register', data),

  login: (data: { email: string; password: string; recaptchaToken?: string }) =>
    api.post('/auth/login', data),

  verifyOtp: (data: { email: string; otp: string }) =>
    api.post('/auth/verify-otp', data),

  refreshToken: (refreshToken: string) =>
    api.post('/auth/refresh', { refreshToken }),

  logout: () => api.post('/auth/logout'),

  getStats: () => api.get('/auth/stats'),
};

// ── User ──
export const userApi = {
  getProfile: () => api.get('/users/me'),
  updateProfile: (data: { fullName?: string; phone?: string; dateOfBirth?: string }) =>
    api.put('/users/me', data),
  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    api.put('/users/me/password', data),
};

// ── Wallet ──
export const walletApi = {
  getWallet: () => api.get('/wallet'),
  topUp: (data: { amount: number; method: string }) =>
    api.post('/wallet/topup', data),
  getHistory: (params?: { page?: number; size?: number }) =>
    api.get('/wallet/history', { params }),
};

// ── Cards ──
export const cardApi = {
  generateCard: (data?: { spendingLimit?: number; dailyLimit?: number; isOneTime?: boolean; merchantLock?: string[]; cardDesign?: string }) =>
    api.post('/cards', data),
  getCards: () => api.get('/cards'),
  getCard: (id: string) => api.get(`/cards/${id}`),
  freezeCard: (id: string) => api.post(`/cards/${id}/freeze`),
  unfreezeCard: (id: string) => api.post(`/cards/${id}/unfreeze`),
  setLimits: (id: string, data: { spendingLimit?: number; dailyLimit?: number }) =>
    api.put(`/cards/${id}/limit`, data),
  updateDesign: (id: string, data: { cardDesign: string }) =>
    api.put(`/cards/${id}/design`, data),
  deleteCard: (id: string) => api.delete(`/cards/${id}`),
};

// ── Transactions ──
export const transactionApi = {
  getTransactions: (params?: { page?: number; size?: number; category?: string; type?: string }) =>
    api.get('/transactions', { params }),
  getTransaction: (id: string) => api.get(`/transactions/${id}`),
  simulateSpend: (data: { amount: number; category: string; merchant: string; description?: string; currency?: string }) =>
    api.post('/transactions/simulate', data),
  exportTransactions: (format: 'csv' | 'pdf') =>
    api.get('/transactions/export', { params: { format }, responseType: 'blob' }),
};

// ── FX & Multi-Currency ──
export const fxApi = {
  getCurrencies: () => api.get('/fx/currencies'),
  getRates: (base?: string) => api.get('/fx/rates', { params: { base } }),
  getQuote: (amount: number, from: string, to?: string) =>
    api.get('/fx/quote', { params: { amount, from, to: to || 'INR' } }),
};

// ── Analytics ──
export const analyticsApi = {
  getAnalytics: (days?: number) =>
    api.get('/analytics', { params: { days } }),
};

// ── AI Coach ──
export const aiApi = {
  chat: (message: string) =>
    api.post('/ai-coach/chat', { message }),
  getHealthScore: () => api.get('/ai-coach/health-score'),
  getTips: () => api.get('/ai-coach/tips'),
  getForecast: () => api.get('/ai-coach/forecast'),
  getBudgetPlan: () => api.get('/ai-coach/budget'),
  getAlerts: () => api.get('/ai-coach/alerts'),
  runScan: () => api.post('/ai-coach/scan'),
};

// ── Goals ──
export const goalsApi = {
  getGoals: () => api.get('/goals'),
  createGoal: (data: { name: string; description?: string; targetAmount: number; targetDate: string; priority?: string; icon?: string; color?: string }) =>
    api.post('/goals', data),
  updateGoal: (id: string, data: Partial<{ name: string; description: string; targetAmount: number; targetDate: string; priority: string; icon: string; color: string; status: string }>) =>
    api.patch(`/goals/${id}`, data),
  deleteGoal: (id: string) => api.delete(`/goals/${id}`),
  allocateFunds: (id: string, amount: number) => api.post(`/goals/${id}/allocate`, { amount }),
  withdrawFunds: (id: string, amount: number) => api.post(`/goals/${id}/withdraw`, { amount }),
  getRoundUp: () => api.get('/goals/roundup'),
  disableRoundUp: () => api.delete('/goals/roundup'),
  setRoundUp: (id: string, nearest: number = 10) => api.put(`/goals/${id}/roundup`, null, { params: { nearest } }),
};

// ── Rewards ──
export const rewardsApi = {
  getStatus: () => api.get('/rewards/status'),
  getBadges: () => api.get('/rewards/badges'),
  getCatalog: () => api.get('/rewards/catalog'),
  getRedemptions: () => api.get('/rewards/redemptions'),
  redeemItem: (itemId: string) => api.post(`/rewards/redeem/${itemId}`),
  claimStreak: () => api.post('/rewards/streak'),
};

// ── Reports ──
export const reportsApi = {
  requestMonthlyReport: () => api.post('/reports/monthly/request'),
};

// ── Parental ──
export const parentalApi = {
  getInvitation: (token: string) =>
    api.get(`/parental/invitation/${token}`),
  acceptInvitation: (data: { token: string; fullName: string; passwordHash?: string; password?: string; phone?: string; dateOfBirth: string; gender?: string; idType?: string; idNumber?: string }) =>
    api.post('/parental/accept-invitation', data),
  inviteParent: (data: { parentEmail: string; relationship: string }) =>
    api.post('/parental/teen/invite-parent', data),
  getInvitationStatus: () =>
    api.get('/parental/teen/invitation-status'),
  cancelInvitation: (id: string) =>
    api.delete(`/parental/teen/invitation/${id}`),
  requestApproval: (data: { requestType: string; amount?: number; category?: string; merchant?: string; description: string; targetId?: string }) =>
    api.post('/parental/teen/request-approval', data),
  getTeenApprovalHistory: () =>
    api.get('/parental/teen/approvals'),
  getDashboard: () =>
    api.get('/parental/dashboard'),
  getChildDetails: (childId: string) =>
    api.get(`/parental/children/${childId}`),
  sendPocketMoney: (data: { childId: string; amount: number; description?: string }) =>
    api.post('/parental/pocket-money', {
      childId: data.childId,
      amount: data.amount,
      note: data.description
    }),
  getAllowances: () =>
    api.get<{ data: ScheduledAllowance[] }>('/parental/allowances'),
  createAllowance: (data: CreateAllowanceRequest) =>
    api.post<{ data: ScheduledAllowance }>('/parental/allowances', data),
  updateAllowance: (id: string, data: UpdateAllowanceRequest) =>
    api.put<{ data: ScheduledAllowance }>(`/parental/allowances/${id}`, data),
  deleteAllowance: (id: string) =>
    api.delete<{ data: null }>(`/parental/allowances/${id}`),
  triggerAllowance: (id: string) =>
    api.post<{ data: ScheduledAllowance }>(`/parental/allowances/${id}/trigger`),
  setSpendingLimits: (childId: string, data: { parentalControlEnabled?: boolean; parentalMaxTxnAmount?: number; parentalDailyLimit?: number; parentalWeeklyLimit?: number; parentalMonthlyLimit?: number; parentalRestrictedCategories?: string }) =>
    api.put(`/parental/children/${childId}/limits`, data),
  getPendingApprovals: () =>
    api.get('/parental/approvals'),
  getParentApprovalHistory: () =>
    api.get('/parental/approvals/history'),
  decideApproval: (id: string, data: {
    decision: 'APPROVED' | 'REJECTED';
    parentNote?: string;
    biometricCredentialId?: string;
    clientDataJSON?: string;
    authenticatorData?: string;
    signature?: string;
  }) =>
    api.put(`/parental/approvals/${id}`, {
      approved: data.decision === 'APPROVED',
      note: data.parentNote,
      biometricCredentialId: data.biometricCredentialId,
      clientDataJSON: data.clientDataJSON,
      authenticatorData: data.authenticatorData,
      signature: data.signature,
    }),
  unlinkChild: (childId: string) =>
    api.delete(`/parental/children/${childId}/unlink`),
  getNotifications: () =>
    api.get('/parental/notifications'),
  markNotificationsAsRead: () =>
    api.put('/parental/notifications/read'),
  freezeChildCard: (childId: string, cardId: string) =>
    api.post(`/parental/children/${childId}/freeze-card/${cardId}`),
  unfreezeChildCard: (childId: string, cardId: string) =>
    api.post(`/parental/children/${childId}/unfreeze-card/${cardId}`),
};

// ── WebAuthn / Biometrics ──
export const webauthnApi = {
  getRegisterOptions: () =>
    api.get('/parental/webauthn/register/options'),
  verifyRegistration: (data: {
    credentialId: string;
    publicKey: string;
    rawId?: string;
    clientDataJSON?: string;
    attestationObject?: string;
    deviceName?: string;
    algorithm?: string;
  }) =>
    api.post('/parental/webauthn/register/verify', data),
  getCredentials: () =>
    api.get('/parental/webauthn/credentials'),
  deleteCredential: (id: string) =>
    api.delete(`/parental/webauthn/credentials/${id}`),
  getApprovalChallenge: (approvalId: string) =>
    api.get(`/parental/webauthn/approvals/${approvalId}/challenge`),
};

// ── Admin ──
export const adminApi = {
  getStats: () => api.get('/admin/stats'),
  getUsers: (params?: { page?: number; size?: number }) => api.get('/admin/users', { params }),
  toggleActive: (id: string) => api.post(`/admin/users/${id}/toggle-active`),
  getTransactions: (params?: { page?: number; size?: number }) => api.get('/admin/transactions', { params }),
  getObservability: () => api.get('/admin/observability'),
};
