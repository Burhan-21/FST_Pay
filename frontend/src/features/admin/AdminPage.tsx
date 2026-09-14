import { useState, useEffect } from 'react';
import { 
  Users, 
  CreditCard, 
  Wallet, 
  ArrowLeftRight, 
  ShieldAlert, 
  CheckCircle, 
  XCircle, 
  Search, 
  Loader2,
  Activity,
  Cpu,
  ExternalLink,
  RefreshCw,
  Zap,
  Globe,
  ShieldCheck,
  Database,
  Sparkles,
  BarChart3,
  Repeat,
  RotateCcw,
  Trash2,
  Layers,
  Radio,
} from 'lucide-react';
import api from '../../api/axios';
import { adminWebhooksApi } from '../../api/endpoints';
import PageTransition from '../../components/ui/PageTransition';
import GlassCard from '../../components/ui/GlassCard';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import StatCard from '../../components/ui/StatCard';
import type { ObservabilityMetrics, WebhookDlqEntry, CircuitBreakerStatus } from '../../types';

interface AdminStats {
  totalUsers: number;
  activeCards: number;
  totalWalletBalance: number;
  totalTransactions: number;
  totalVolume: number;
}

interface User {
  id: string;
  fullName: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: string;
}

interface AdminTransaction {
  id: string;
  amount: number;
  type: string;
  category: string;
  merchant: string;
  description: string;
  status: string;
  createdAt: string;
}

export default function AdminPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [transactions, setTransactions] = useState<AdminTransaction[]>([]);
  const [observability, setObservability] = useState<ObservabilityMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshingObs, setIsRefreshingObs] = useState(false);
  const [autoRefreshObs, setAutoRefreshObs] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'users' | 'transactions' | 'observability' | 'dlq'>('users');
  const [actioningUserId, setActioningUserId] = useState<string | null>(null);

  // Webhooks DLQ & Circuit Breaker state
  const [circuitBreaker, setCircuitBreaker] = useState<CircuitBreakerStatus | null>(null);
  const [dlqEntries, setDlqEntries] = useState<WebhookDlqEntry[]>([]);
  const [dlqFilter, setDlqFilter] = useState<string>('ALL');
  const [isDlqLoading, setIsDlqLoading] = useState(false);
  const [dlqActionId, setDlqActionId] = useState<string | null>(null);
  const [isReplayingAll, setIsReplayingAll] = useState(false);
  const [isResettingCb, setIsResettingCb] = useState(false);

  const fetchAdminData = async () => {
    try {
      setIsLoading(true);
      const [statsRes, usersRes, txsRes, obsRes] = await Promise.all([
        api.get('/admin/stats'),
        api.get('/admin/users?size=50'),
        api.get('/admin/transactions?size=50'),
        api.get('/admin/observability')
      ]);
      setStats(statsRes.data.data);
      setUsers(usersRes.data.data.content);
      setTransactions(txsRes.data.data.content);
      setObservability(obsRes.data.data);
    } catch (error) {
      console.error('Error fetching admin data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshObservability = async () => {
    try {
      setIsRefreshingObs(true);
      const res = await api.get('/admin/observability');
      setObservability(res.data.data);
    } catch (error) {
      console.error('Error refreshing observability metrics:', error);
    } finally {
      setIsRefreshingObs(false);
    }
  };

  useEffect(() => {
    if (activeTab !== 'observability' || !autoRefreshObs) return;
    const interval = setInterval(() => {
      refreshObservability();
    }, 5000);
    return () => clearInterval(interval);
  }, [activeTab, autoRefreshObs]);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- data-fetching effect: async setState after await is architecturally correct
  useEffect(() => { fetchAdminData(); }, []);

  const handleToggleActive = async (userId: string) => {
    try {
      setActioningUserId(userId);
      await api.post(`/admin/users/${userId}/toggle-active`);
      setUsers(users.map(u => u.id === userId ? { ...u, isActive: !u.isActive } : u));
    } catch (error) {
      console.error('Error toggling active status:', error);
    } finally {
      setActioningUserId(null);
    }
  };

  const fetchDlqData = async () => {
    try {
      setIsDlqLoading(true);
      const [cbRes, dlqRes] = await Promise.all([
        adminWebhooksApi.getCircuitBreaker(),
        adminWebhooksApi.getDlq({
          status: dlqFilter === 'ALL' ? undefined : dlqFilter,
          size: 50,
        }),
      ]);
      setCircuitBreaker(cbRes.data.data);
      setDlqEntries(dlqRes.data.data.content || []);
    } catch (error) {
      console.error('Error fetching DLQ and Circuit Breaker data:', error);
    } finally {
      setIsDlqLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'dlq') {
      fetchDlqData();
    }
  }, [activeTab, dlqFilter]);

  const handleReplay = async (id: string) => {
    try {
      setDlqActionId(id);
      await adminWebhooksApi.replay(id);
      await fetchDlqData();
    } catch (error) {
      console.error('Error replaying webhook:', error);
    } finally {
      setDlqActionId(null);
    }
  };

  const handleReplayAll = async () => {
    try {
      setIsReplayingAll(true);
      await adminWebhooksApi.replayAll();
      await fetchDlqData();
    } catch (error) {
      console.error('Error replaying all dead letters:', error);
    } finally {
      setIsReplayingAll(false);
    }
  };

  const handleDiscard = async (id: string) => {
    try {
      setDlqActionId(id);
      await adminWebhooksApi.discard(id);
      await fetchDlqData();
    } catch (error) {
      console.error('Error discarding DLQ record:', error);
    } finally {
      setDlqActionId(null);
    }
  };

  const handleResetCircuitBreaker = async () => {
    try {
      setIsResettingCb(true);
      await adminWebhooksApi.resetCircuitBreaker();
      await fetchDlqData();
    } catch (error) {
      console.error('Error resetting circuit breaker:', error);
    } finally {
      setIsResettingCb(false);
    }
  };

  const filteredUsers = users.filter(u => 
    u.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredTransactions = transactions.filter(t => 
    (t.merchant ?? '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (t.description ?? '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading && !stats) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
      </div>
    );
  }

  return (
    <PageTransition>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl lg:text-3xl font-display font-bold text-white flex items-center gap-3">
            <ShieldAlert className="w-8 h-8 text-accent-500" />
            Admin Control Center
          </h1>
          <p className="text-surface-400 mt-1">Manage users, view statistics, and monitor system transactions.</p>
        </div>

        {/* Stats Grid */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label="Total Users"
              value={stats.totalUsers}
              icon={Users}
              iconColor="text-primary-400"
            />
            <StatCard
              label="Active Virtual Cards"
              value={stats.activeCards}
              icon={CreditCard}
              iconColor="text-accent-400"
            />
            <StatCard
              label="System Balances"
              value={`₹${stats.totalWalletBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
              icon={Wallet}
              iconColor="text-emerald-400"
            />
            <StatCard
              label="Total Volume"
              value={`₹${stats.totalVolume.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
              icon={ArrowLeftRight}
              iconColor="text-amber-400"
            />
          </div>
        )}

        {/* Tabs & Search */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-surface-700/50 pb-2">
          <div className="flex gap-2">
            <button
              onClick={() => { setActiveTab('users'); setSearchQuery(''); }}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 ${
                activeTab === 'users' 
                  ? 'bg-primary-600/20 text-primary-400 border border-primary-500/30' 
                  : 'text-surface-400 hover:text-white hover:bg-surface-800'
              }`}
            >
              User Management
            </button>
            <button
              onClick={() => { setActiveTab('transactions'); setSearchQuery(''); }}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 ${
                activeTab === 'transactions' 
                  ? 'bg-primary-600/20 text-primary-400 border border-primary-500/30' 
                  : 'text-surface-400 hover:text-white hover:bg-surface-800'
              }`}
            >
              Transaction Logs
            </button>
            <button
              onClick={() => { setActiveTab('observability'); setSearchQuery(''); }}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 flex items-center gap-1.5 ${
                activeTab === 'observability' 
                  ? 'bg-primary-600/20 text-primary-400 border border-primary-500/30' 
                  : 'text-surface-400 hover:text-white hover:bg-surface-800'
              }`}
            >
              <Activity className="w-4 h-4 text-emerald-400" />
              Live Observability
            </button>
            <button
              onClick={() => { setActiveTab('dlq'); setSearchQuery(''); }}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 flex items-center gap-1.5 ${
                activeTab === 'dlq' 
                  ? 'bg-primary-600/20 text-primary-400 border border-primary-500/30' 
                  : 'text-surface-400 hover:text-white hover:bg-surface-800'
              }`}
            >
              <Layers className="w-4 h-4 text-rose-400" />
              Webhooks & DLQ
              {circuitBreaker?.state === 'OPEN' && (
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping ml-1" />
              )}
            </button>
          </div>

          {activeTab === 'observability' ? (
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-xs text-surface-400 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={autoRefreshObs}
                  onChange={(e) => setAutoRefreshObs(e.target.checked)}
                  className="rounded border-surface-700 bg-surface-900 text-primary-600 focus:ring-primary-500"
                />
                Auto-refresh (5s)
              </label>
              <Button
                size="sm"
                variant="secondary"
                onClick={refreshObservability}
                disabled={isRefreshingObs}
                className="flex items-center gap-1.5 text-xs py-1.5 px-3"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingObs ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          ) : activeTab === 'dlq' ? (
            <div className="flex items-center gap-3">
              <Button
                size="sm"
                variant="secondary"
                onClick={fetchDlqData}
                disabled={isDlqLoading}
                className="flex items-center gap-1.5 text-xs py-1.5 px-3"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isDlqLoading ? 'animate-spin' : ''}`} />
                Refresh DLQ
              </Button>
            </div>
          ) : (
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500" />
              <input
                type="text"
                placeholder={`Search ${activeTab}...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input-field pl-10 text-sm w-full"
              />
            </div>
          )}
        </div>

        {/* Lists */}
        <GlassCard padding="none" className="overflow-hidden page-section">
          {activeTab === 'users' ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-surface-700/50 bg-surface-900/50 text-surface-400 text-xs font-semibold uppercase tracking-wider">
                    <th className="px-6 py-4">Name</th>
                    <th className="px-6 py-4">Email</th>
                    <th className="px-6 py-4">Role</th>
                    <th className="px-6 py-4">Registered On</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-800 text-sm text-surface-300">
                  {filteredUsers.length > 0 ? (
                    filteredUsers.map((user) => (
                      <tr key={user.id} className="hover:bg-surface-900/30 transition-colors">
                        <td className="px-6 py-4 font-medium text-white">{user.fullName}</td>
                        <td className="px-6 py-4 font-mono text-xs">{user.email}</td>
                        <td className="px-6 py-4">
                          <Badge variant={user.role === 'ADMIN' ? 'accent' : 'neutral'}>
                            {user.role}
                          </Badge>
                        </td>
                        <td className="px-6 py-4">
                          {new Date(user.createdAt).toLocaleString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: true
                          })}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${
                            user.isActive ? 'bg-success-500/10 text-success-400' : 'bg-danger-500/10 text-danger-400'
                          }`}>
                            {user.isActive ? (
                              <>
                                <CheckCircle className="w-3.5 h-3.5" />
                                Active
                              </>
                            ) : (
                              <>
                                <XCircle className="w-3.5 h-3.5" />
                                Suspended
                              </>
                            )}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Button
                            onClick={() => handleToggleActive(user.id)}
                            disabled={actioningUserId === user.id || user.role === 'ADMIN'}
                            variant={user.isActive ? 'ghost' : 'secondary'}
                            size="sm"
                            className={
                              user.role === 'ADMIN'
                                ? 'opacity-50 cursor-not-allowed'
                                : user.isActive
                                  ? 'text-danger-400 border border-danger-500/10 hover:bg-danger-500/10'
                                  : 'text-success-400 border border-success-500/10 hover:bg-success-500/10'
                            }
                          >
                            {actioningUserId === user.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin mx-auto" />
                            ) : user.isActive ? (
                              'Suspend'
                            ) : (
                              'Activate'
                            )}
                          </Button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-surface-500">
                        No users found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          ) : activeTab === 'transactions' ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-surface-700/50 bg-surface-900/50 text-surface-400 text-xs font-semibold uppercase tracking-wider">
                    <th className="px-6 py-4">Date</th>
                    <th className="px-6 py-4">Merchant / Desc</th>
                    <th className="px-6 py-4">Category</th>
                    <th className="px-6 py-4">Type</th>
                    <th className="px-6 py-4">Amount</th>
                    <th className="px-6 py-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-800 text-sm text-surface-300">
                  {filteredTransactions.length > 0 ? (
                    filteredTransactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-surface-900/30 transition-colors">
                        <td className="px-6 py-4">
                          {new Date(tx.createdAt).toLocaleString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: true
                          })}
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-medium text-white">{tx.merchant}</div>
                          <div className="text-xs text-surface-400">{tx.description}</div>
                        </td>
                        <td className="px-6 py-4">
                          <Badge variant="neutral">
                            {tx.category}
                          </Badge>
                        </td>
                        <td className="px-6 py-4">
                          <Badge variant={tx.type === 'CREDIT' ? 'accent' : 'danger'}>
                            {tx.type}
                          </Badge>
                        </td>
                        <td className={`px-6 py-4 font-bold ${
                          tx.type === 'CREDIT' ? 'text-success-400' : 'text-white'
                        }`}>
                          {tx.type === 'CREDIT' ? '+' : '-'}₹{tx.amount.toFixed(2)}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                            tx.status === 'COMPLETED' ? 'bg-success-500/10 text-success-400' : 'bg-danger-500/10 text-danger-400'
                          }`}>
                            {tx.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-surface-500">
                        No transactions found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          ) : activeTab === 'observability' ? (
            <div className="p-6 space-y-6">
              {/* Observability Endpoint / Header Banner */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-xl bg-surface-900/60 border border-surface-700/60">
                <div className="flex items-center gap-3">
                  <div className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-white flex items-center gap-2">
                      Micrometer Prometheus Metrics Active
                      <Badge variant="accent">Scrape Interval: 5s</Badge>
                    </div>
                    <div className="text-xs text-surface-400 mt-0.5">
                      Target: <code className="text-primary-300">/actuator/prometheus</code> &bull; Grafana Dashboard UID: <code className="text-primary-300">fstpay-enterprise-obs</code>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <a
                    href="/actuator/prometheus"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-surface-800 hover:bg-surface-700 text-surface-200 border border-surface-600 transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-primary-400" />
                    Raw Prometheus Feed
                  </a>
                  <a
                    href="http://localhost:3001"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-primary-600 hover:bg-primary-500 text-white shadow-sm transition-colors"
                  >
                    <BarChart3 className="w-3.5 h-3.5" />
                    Open in Grafana (:3001)
                  </a>
                </div>
              </div>

              {/* 4 Pillars of Telemetry */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 1. AI Financial Coach & Monte Carlo Cashflow */}
                <div className="p-5 rounded-xl bg-surface-900/40 border border-surface-700/50 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-purple-400" />
                      AI Coach & Monte Carlo Simulation
                    </h3>
                    <Badge variant="neutral">Algorithm: M=200 D=30</Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-lg bg-surface-800/60 border border-surface-700/30">
                      <div className="text-xs text-surface-400">Simulation Status</div>
                      <div className="text-lg font-bold text-emerald-400 mt-1">
                        {observability?.monteCarloSimulationsSuccess ?? 0}
                        <span className="text-xs font-normal text-surface-400 ml-1">ok</span>
                        {(observability?.monteCarloSimulationsFailed ?? 0) > 0 && (
                          <span className="text-xs font-normal text-rose-400 ml-2">/ {observability?.monteCarloSimulationsFailed} err</span>
                        )}
                      </div>
                    </div>
                    <div className="p-3 rounded-lg bg-surface-800/60 border border-surface-700/30">
                      <div className="text-xs text-surface-400">Avg Simulation Latency</div>
                      <div className="text-lg font-bold text-white mt-1">
                        {observability?.monteCarloAvgDurationMs ?? 0}
                        <span className="text-xs font-normal text-surface-400 ml-1">ms</span>
                      </div>
                    </div>
                    <div className="p-3 rounded-lg bg-surface-800/60 border border-surface-700/30">
                      <div className="text-xs text-surface-400">Round-Up Sweeps</div>
                      <div className="text-lg font-bold text-primary-400 mt-1">
                        {observability?.roundUpSweepsSuccess ?? 0}
                        <span className="text-xs font-normal text-surface-400 ml-1">swept</span>
                      </div>
                    </div>
                    <div className="p-3 rounded-lg bg-surface-800/60 border border-surface-700/30">
                      <div className="text-xs text-surface-400">Micro-Savings Volume</div>
                      <div className="text-lg font-bold text-amber-400 mt-1">
                        ₹{(observability?.roundUpTotalAmountInr ?? 0).toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. FX Multi-Currency Engine */}
                <div className="p-5 rounded-xl bg-surface-900/40 border border-surface-700/50 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Globe className="w-4 h-4 text-blue-400" />
                      Multi-Currency & FX Engine
                    </h3>
                    <Badge variant="accent">Cache TTL: 15m</Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-lg bg-surface-800/60 border border-surface-700/30">
                      <div className="text-xs text-surface-400">Conversions Executed</div>
                      <div className="text-lg font-bold text-white mt-1">
                        {observability?.fxConversionsExecuted ?? 0}
                        <span className="text-xs font-normal text-surface-400 ml-1">
                          ({observability?.fxQuotesRequested ?? 0} quotes)
                        </span>
                      </div>
                    </div>
                    <div className="p-3 rounded-lg bg-surface-800/60 border border-surface-700/30">
                      <div className="text-xs text-surface-400">Platform FX Revenue</div>
                      <div className="text-lg font-bold text-emerald-400 mt-1">
                        ₹{(observability?.fxFeesCollectedInr ?? 0).toFixed(2)}
                      </div>
                    </div>
                    <div className="p-3 rounded-lg bg-surface-800/60 border border-surface-700/30">
                      <div className="text-xs text-surface-400">Redis Cache Hit Ratio</div>
                      <div className="text-lg font-bold text-cyan-400 mt-1">
                        {(observability?.fxCacheHitRatio ?? 100).toFixed(1)}%
                      </div>
                    </div>
                    <div className="p-3 rounded-lg bg-surface-800/60 border border-surface-700/30">
                      <div className="text-xs text-surface-400">Cache Hits / Misses</div>
                      <div className="text-lg font-bold text-white mt-1">
                        {observability?.fxCacheHits ?? 0}
                        <span className="text-xs font-normal text-surface-400 ml-1">hits</span>
                        <span className="text-xs font-normal text-surface-500 ml-2">/ {observability?.fxCacheMisses ?? 0} miss</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3. Merchant Settlements & Webhooks */}
                <div className="p-5 rounded-xl bg-surface-900/40 border border-surface-700/50 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Zap className="w-4 h-4 text-amber-400" />
                      Settlement Webhooks & Gateway Callbacks
                    </h3>
                    <Badge variant="neutral">HMAC-SHA256 Protected</Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-lg bg-surface-800/60 border border-surface-700/30">
                      <div className="text-xs text-surface-400">Webhooks Received</div>
                      <div className="text-lg font-bold text-emerald-400 mt-1">
                        {observability?.webhooksReceivedValid ?? 0}
                        <span className="text-xs font-normal text-surface-400 ml-1">valid</span>
                        {(observability?.webhooksReceivedInvalid ?? 0) > 0 && (
                          <span className="text-xs font-normal text-rose-400 ml-2">/ {observability?.webhooksReceivedInvalid} dropped</span>
                        )}
                      </div>
                    </div>
                    <div className="p-3 rounded-lg bg-surface-800/60 border border-surface-700/30">
                      <div className="text-xs text-surface-400">Settled Transactions</div>
                      <div className="text-lg font-bold text-white mt-1">
                        {observability?.webhooksSettled ?? 0}
                        <span className="text-xs font-normal text-surface-400 ml-1">settled</span>
                      </div>
                    </div>
                    <div className="p-3 rounded-lg bg-surface-800/60 border border-surface-700/30">
                      <div className="text-xs text-surface-400">Idempotency Duplicates</div>
                      <div className="text-lg font-bold text-surface-300 mt-1">
                        {observability?.webhooksDuplicates ?? 0}
                        <span className="text-xs font-normal text-surface-400 ml-1">ignored</span>
                      </div>
                    </div>
                    <div className="p-3 rounded-lg bg-surface-800/60 border border-surface-700/30">
                      <div className="text-xs text-surface-400">Avg Settlement Latency</div>
                      <div className="text-lg font-bold text-white mt-1">
                        {observability?.webhooksAvgProcessingDurationMs ?? 0}
                        <span className="text-xs font-normal text-surface-400 ml-1">ms</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 4. Biometric WebAuthn & Parental Approvals */}
                <div className="p-5 rounded-xl bg-surface-900/40 border border-surface-700/50 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      WebAuthn Passkeys & Co-Signing
                    </h3>
                    <Badge variant="accent">FIDO2 / W3C L3</Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-lg bg-surface-800/60 border border-surface-700/30">
                      <div className="text-xs text-surface-400">Passkey Registrations</div>
                      <div className="text-lg font-bold text-emerald-400 mt-1">
                        {observability?.webauthnRegistrationsSuccess ?? 0}
                        <span className="text-xs font-normal text-surface-400 ml-1">enrolled</span>
                      </div>
                    </div>
                    <div className="p-3 rounded-lg bg-surface-800/60 border border-surface-700/30">
                      <div className="text-xs text-surface-400">Biometric Assertions</div>
                      <div className="text-lg font-bold text-primary-400 mt-1">
                        {observability?.webauthnVerificationsSuccess ?? 0}
                        <span className="text-xs font-normal text-surface-400 ml-1">verified</span>
                      </div>
                    </div>
                    <div className="p-3 rounded-lg bg-surface-800/60 border border-surface-700/30">
                      <div className="text-xs text-surface-400">Guardian Approvals</div>
                      <div className="text-lg font-bold text-white mt-1">
                        {observability?.guardianApprovalsApproved ?? 0}
                        <span className="text-xs font-normal text-emerald-400 ml-1">approved</span>
                        <span className="text-xs font-normal text-rose-400 ml-2">/ {observability?.guardianApprovalsRejected ?? 0} rej</span>
                      </div>
                    </div>
                    <div className="p-3 rounded-lg bg-surface-800/60 border border-surface-700/30">
                      <div className="text-xs text-surface-400">Biometric vs Manual</div>
                      <div className="text-lg font-bold text-purple-400 mt-1">
                        {observability?.guardianApprovalsBiometric ?? 0}
                        <span className="text-xs font-normal text-surface-400 ml-1">biometric</span>
                        <span className="text-xs font-normal text-surface-500 ml-2">/ {observability?.guardianApprovalsManual ?? 0} pin</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 5. Scheduled Allowance Sweeps & Goal Milestones */}
                <div className="p-5 rounded-xl bg-surface-900/40 border border-surface-700/50 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Repeat className="w-4 h-4 text-purple-400" />
                      Scheduled Allowance Sweeps & Milestones
                    </h3>
                    <Badge variant="accent">Automated Ledger Cron</Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-lg bg-surface-800/60 border border-surface-700/30">
                      <div className="text-xs text-surface-400">Allowance Sweeps Executed</div>
                      <div className="text-lg font-bold text-emerald-400 mt-1">
                        {observability?.allowanceSweepsSuccess ?? 0}
                        <span className="text-xs font-normal text-surface-400 ml-1">swept</span>
                        {(observability?.allowanceSweepsInsufficientFunds ?? 0) > 0 && (
                          <span className="text-xs font-normal text-amber-400 ml-2">/ {observability?.allowanceSweepsInsufficientFunds} low bal</span>
                        )}
                      </div>
                    </div>
                    <div className="p-3 rounded-lg bg-surface-800/60 border border-surface-700/30">
                      <div className="text-xs text-surface-400">Allowance Swept Volume</div>
                      <div className="text-lg font-bold text-white mt-1">
                        ₹{(observability?.allowanceTotalAmountInr ?? 0).toFixed(2)}
                      </div>
                    </div>
                    <div className="p-3 rounded-lg bg-surface-800/60 border border-surface-700/30">
                      <div className="text-xs text-surface-400">Goal Milestones Achieved</div>
                      <div className="text-lg font-bold text-amber-300 mt-1">
                        {observability?.goalMilestonesReached ?? 0}
                        <span className="text-xs font-normal text-surface-400 ml-1">tiers unlocked</span>
                      </div>
                    </div>
                    <div className="p-3 rounded-lg bg-surface-800/60 border border-surface-700/30">
                      <div className="text-xs text-surface-400">Sweep Error Faults</div>
                      <div className="text-lg font-bold text-white mt-1">
                        {observability?.allowanceSweepsError ?? 0}
                        <span className="text-xs font-normal text-surface-400 ml-1">failures</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 5. System & JVM Runtime Telemetry */}
              <div className="p-5 rounded-xl bg-surface-900/40 border border-surface-700/50 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-cyan-400" />
                    Host Runtime & JVM Container Metrics
                  </h3>
                  <div className="text-xs text-surface-400 flex items-center gap-1">
                    <Database className="w-3.5 h-3.5 text-surface-400" />
                    Spring Boot Actuator Micrometer
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="p-3 rounded-lg bg-surface-800/60 border border-surface-700/30">
                    <div className="text-xs text-surface-400">JVM Heap Memory</div>
                    <div className="text-base font-bold text-white mt-1">
                      {observability?.jvmMemoryUsedMb ?? 0} MB
                      <span className="text-xs font-normal text-surface-400 ml-1">/ {observability?.jvmMemoryMaxMb ?? 0} MB</span>
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-surface-800/60 border border-surface-700/30">
                    <div className="text-xs text-surface-400">System CPU Usage</div>
                    <div className="text-base font-bold text-amber-400 mt-1">
                      {(observability?.systemCpuUsage ?? 0).toFixed(1)}%
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-surface-800/60 border border-surface-700/30">
                    <div className="text-xs text-surface-400">Application Uptime</div>
                    <div className="text-base font-bold text-emerald-400 mt-1">
                      {Math.floor((observability?.uptimeSeconds ?? 0) / 3600)}h {Math.floor(((observability?.uptimeSeconds ?? 0) % 3600) / 60)}m
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-surface-800/60 border border-surface-700/30">
                    <div className="text-xs text-surface-400">Actuator Health</div>
                    <div className="text-base font-bold text-emerald-400 mt-1 flex items-center gap-1.5">
                      <CheckCircle className="w-4 h-4" />
                      UP (200 OK)
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-6 space-y-6">
              {/* 1. Resilience4j Circuit Breaker Telemetry */}
              <div className="p-5 rounded-xl bg-surface-900/60 border border-surface-700/60 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <Radio className="w-5 h-5 text-rose-400" />
                    <div>
                      <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        Resilience4j Settlement Circuit Breaker
                        <Badge
                          variant={
                            circuitBreaker?.state === 'CLOSED'
                              ? 'primary'
                              : circuitBreaker?.state === 'OPEN'
                              ? 'danger'
                              : 'warning'
                          }
                        >
                          {circuitBreaker?.state ?? 'UNKNOWN'}
                        </Badge>
                      </h3>
                      <p className="text-xs text-surface-400 mt-0.5">
                        Instance: <code className="text-primary-300 font-mono">merchantSettlementCircuitBreaker</code> &bull; Failure Threshold: 50% &bull; Wait in Open: 10s
                      </p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={handleResetCircuitBreaker}
                    disabled={isResettingCb}
                    className="flex items-center gap-1.5 text-xs py-1.5 px-3 self-start sm:self-auto"
                  >
                    <RotateCcw className={`w-3.5 h-3.5 ${isResettingCb ? 'animate-spin' : ''}`} />
                    Reset Circuit
                  </Button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  <div className="p-3 rounded-lg bg-surface-800/60 border border-surface-700/30">
                    <div className="text-xs text-surface-400">Failure Rate</div>
                    <div className={`text-base font-bold mt-1 ${
                      (circuitBreaker?.failureRate ?? 0) >= 50 ? 'text-rose-400' : 'text-emerald-400'
                    }`}>
                      {(circuitBreaker?.failureRate ?? 0).toFixed(1)}%
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-surface-800/60 border border-surface-700/30">
                    <div className="text-xs text-surface-400">Buffered Calls</div>
                    <div className="text-base font-bold text-white mt-1">
                      {circuitBreaker?.numberOfBufferedCalls ?? 0}
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-surface-800/60 border border-surface-700/30">
                    <div className="text-xs text-surface-400">Successful Calls</div>
                    <div className="text-base font-bold text-emerald-400 mt-1">
                      {circuitBreaker?.numberOfSuccessfulCalls ?? 0}
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-surface-800/60 border border-surface-700/30">
                    <div className="text-xs text-surface-400">Failed Calls</div>
                    <div className="text-base font-bold text-rose-400 mt-1">
                      {circuitBreaker?.numberOfFailedCalls ?? 0}
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-surface-800/60 border border-surface-700/30">
                    <div className="text-xs text-surface-400">Tripped / Blocked</div>
                    <div className="text-base font-bold text-amber-400 mt-1">
                      {circuitBreaker?.numberOfNotPermittedCalls ?? 0}
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. DLQ Metrics & Replay-All Control */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-xl bg-surface-900/40 border border-surface-700/50">
                <div className="flex items-center gap-3">
                  <Layers className="w-5 h-5 text-accent-400" />
                  <div>
                    <h3 className="text-sm font-bold text-white">Dead-Letter Queue Operations</h3>
                    <p className="text-xs text-surface-400">
                      Exponential backoff: 15s &rarr; 45s &rarr; 2m &rarr; 10m &rarr; 30m. Retries pause automatically when circuit is OPEN.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={handleReplayAll}
                    disabled={isReplayingAll || dlqEntries.filter(e => e.status === 'DEAD_LETTER').length === 0}
                    className="flex items-center gap-1.5 text-xs py-1.5 px-3"
                  >
                    <RotateCcw className={`w-3.5 h-3.5 ${isReplayingAll ? 'animate-spin' : ''}`} />
                    Replay All Dead Letters ({dlqEntries.filter(e => e.status === 'DEAD_LETTER').length})
                  </Button>
                </div>
              </div>

              {/* 3. DLQ Filter Pills */}
              <div className="flex flex-wrap items-center gap-2">
                {(['ALL', 'PENDING_RETRY', 'DEAD_LETTER', 'RESOLVED', 'DISCARDED'] as const).map((filterVal) => {
                  const count = filterVal === 'ALL'
                    ? dlqEntries.length
                    : dlqEntries.filter(e => e.status === filterVal).length;
                  return (
                    <button
                      key={filterVal}
                      onClick={() => setDlqFilter(filterVal)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        dlqFilter === filterVal
                          ? 'bg-primary-600/30 text-primary-300 border border-primary-500/40'
                          : 'bg-surface-800/60 text-surface-400 hover:text-white hover:bg-surface-800 border border-surface-700/30'
                      }`}
                    >
                      {filterVal.replace('_', ' ')} ({count})
                    </button>
                  );
                })}
              </div>

              {/* 4. DLQ Records Table */}
              <div className="overflow-x-auto rounded-xl border border-surface-700/50">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-surface-700/50 bg-surface-900/70 text-surface-400 text-xs font-semibold uppercase tracking-wider">
                      <th className="px-5 py-3">Status</th>
                      <th className="px-5 py-3">Reference / Event</th>
                      <th className="px-5 py-3">Merchant / Amount</th>
                      <th className="px-5 py-3">Attempts</th>
                      <th className="px-5 py-3">Next / Last Try</th>
                      <th className="px-5 py-3">Error Snippet</th>
                      <th className="px-5 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-800 text-sm text-surface-300">
                    {isDlqLoading ? (
                      <tr>
                        <td colSpan={7} className="text-center py-10 text-surface-400">
                          <Loader2 className="w-6 h-6 text-primary-500 animate-spin mx-auto mb-2" />
                          Loading Dead-Letter Queue records...
                        </td>
                      </tr>
                    ) : dlqEntries.length > 0 ? (
                      dlqEntries.map((entry) => (
                        <tr key={entry.id} className="hover:bg-surface-900/30 transition-colors">
                          <td className="px-5 py-3.5">
                            <Badge
                              variant={
                                entry.status === 'RESOLVED'
                                  ? 'primary'
                                  : entry.status === 'DEAD_LETTER'
                                  ? 'danger'
                                  : entry.status === 'PENDING_RETRY' || entry.status === 'RETRYING'
                                  ? 'warning'
                                  : 'neutral'
                              }
                            >
                              {entry.status}
                            </Badge>
                          </td>
                          <td className="px-5 py-3.5">
                            <div className="font-mono text-xs text-white font-medium">{entry.referenceId}</div>
                            <div className="text-[10px] text-surface-500 mt-0.5">{entry.eventType}</div>
                          </td>
                          <td className="px-5 py-3.5">
                            <div className="text-xs font-medium text-white">{entry.merchantId}</div>
                            <div className="text-xs text-surface-400">₹{entry.settlementAmount.toFixed(2)} {entry.currency}</div>
                          </td>
                          <td className="px-5 py-3.5 font-mono text-xs">
                            <span className={entry.retryCount >= entry.maxRetries ? 'text-rose-400 font-bold' : 'text-surface-300'}>
                              {entry.retryCount}
                            </span>
                            <span className="text-surface-500"> / {entry.maxRetries}</span>
                          </td>
                          <td className="px-5 py-3.5 text-xs">
                            {entry.status === 'PENDING_RETRY' && entry.nextRetryAt ? (
                              <div className="text-amber-300">
                                Next: {new Date(entry.nextRetryAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                              </div>
                            ) : entry.resolvedAt ? (
                              <div className="text-emerald-400">
                                Resolved: {new Date(entry.resolvedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                              </div>
                            ) : entry.lastAttemptAt ? (
                              <div className="text-surface-400">
                                Last: {new Date(entry.lastAttemptAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                              </div>
                            ) : (
                              <span className="text-surface-500">-</span>
                            )}
                          </td>
                          <td className="px-5 py-3.5">
                            <span
                              className="font-mono text-[11px] text-rose-300/90 max-w-[180px] truncate block"
                              title={entry.lastError || ''}
                            >
                              {entry.lastError || '-'}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {(entry.status === 'DEAD_LETTER' || entry.status === 'PENDING_RETRY') && (
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  onClick={() => handleReplay(entry.id)}
                                  disabled={dlqActionId === entry.id}
                                  className="text-xs py-1 px-2 flex items-center gap-1"
                                >
                                  <RotateCcw className={`w-3 h-3 ${dlqActionId === entry.id ? 'animate-spin' : ''}`} />
                                  Replay
                                </Button>
                              )}
                              {entry.status !== 'RESOLVED' && entry.status !== 'DISCARDED' && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleDiscard(entry.id)}
                                  disabled={dlqActionId === entry.id}
                                  className="text-xs py-1 px-2 text-surface-400 hover:text-rose-400 hover:bg-rose-500/10"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7} className="text-center py-8 text-surface-500">
                          No webhook DLQ records found for the selected filter.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </GlassCard>
      </div>
    </PageTransition>
  );
}
