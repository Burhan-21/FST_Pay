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
} from 'lucide-react';
import api from '../../api/axios';

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
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'users' | 'transactions'>('users');
  const [actioningUserId, setActioningUserId] = useState<string | null>(null);

  useEffect(() => {
    fetchAdminData();
  }, []);

  const fetchAdminData = async () => {
    try {
      setIsLoading(true);
      const [statsRes, usersRes, txsRes] = await Promise.all([
        api.get('/admin/stats'),
        api.get('/admin/users?size=50'),
        api.get('/admin/transactions?size=50')
      ]);
      setStats(statsRes.data.data);
      setUsers(usersRes.data.data.content);
      setTransactions(txsRes.data.data.content);
    } catch (error) {
      console.error('Error fetching admin data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleActive = async (userId: string) => {
    try {
      setActioningUserId(userId);
      await api.post(`/admin/users/${userId}/toggle-active`);
      // Update local state
      setUsers(users.map(u => u.id === userId ? { ...u, isActive: !u.isActive } : u));
    } catch (error) {
      console.error('Error toggling active status:', error);
    } finally {
      setActioningUserId(null);
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
          <div className="glass-card p-6 flex items-center gap-4 page-section">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center">
              <Users className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-surface-400 font-medium">Total Users</p>
              <h3 className="text-2xl font-bold text-white mt-1">{stats.totalUsers}</h3>
            </div>
          </div>

          <div className="glass-card p-6 flex items-center gap-4 page-section">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent-500 to-teal-600 flex items-center justify-center">
              <CreditCard className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-surface-400 font-medium">Active Virtual Cards</p>
              <h3 className="text-2xl font-bold text-white mt-1">{stats.activeCards}</h3>
            </div>
          </div>

          <div className="glass-card p-6 flex items-center gap-4 page-section">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
              <Wallet className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-surface-400 font-medium">System Balances</p>
              <h3 className="text-2xl font-bold text-white mt-1">
                ₹{stats.totalWalletBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </h3>
            </div>
          </div>

          <div className="glass-card p-6 flex items-center gap-4 page-section">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
              <ArrowLeftRight className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-surface-400 font-medium">Total Volume</p>
              <h3 className="text-2xl font-bold text-white mt-1">
                ₹{stats.totalVolume.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </h3>
            </div>
          </div>
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
        </div>

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
      </div>

      {/* Lists */}
      <div className="glass-card overflow-hidden page-section">
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
                        <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                          user.role === 'ADMIN' ? 'bg-accent-500/20 text-accent-400' : 'bg-surface-800 text-surface-400'
                        }`}>
                          {user.role}
                        </span>
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
                        <button
                          onClick={() => handleToggleActive(user.id)}
                          disabled={actioningUserId === user.id || user.role === 'ADMIN'}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all duration-200 ${
                            user.role === 'ADMIN'
                              ? 'border-transparent text-surface-600 cursor-not-allowed'
                              : user.isActive
                                ? 'border-danger-500/20 text-danger-400 hover:bg-danger-500/10'
                                : 'border-success-500/20 text-success-400 hover:bg-success-500/10'
                          }`}
                        >
                          {actioningUserId === user.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin mx-auto" />
                          ) : user.isActive ? (
                            'Suspend'
                          ) : (
                            'Activate'
                          )}
                        </button>
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
        ) : (
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
                        <span className="bg-surface-800 text-surface-300 px-2.5 py-0.5 rounded-full text-xs">
                          {tx.category}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                          tx.type === 'CREDIT' ? 'bg-success-500/20 text-success-400' : 'bg-danger-500/20 text-danger-400'
                        }`}>
                          {tx.type}
                        </span>
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
        )}
      </div>
    </div>
  );
}
