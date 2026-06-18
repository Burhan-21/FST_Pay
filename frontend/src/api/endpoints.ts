import api from './axios';

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
  simulateSpend: (data: { amount: number; category: string; merchant: string; description?: string }) =>
    api.post('/transactions/simulate', data),
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
};

// ── Rewards ──
export const rewardsApi = {
  getRewards: () => api.get('/rewards'),
  getHistory: () => api.get('/rewards/history'),
  claimStreak: () => api.post('/rewards/claim-streak'),
};
