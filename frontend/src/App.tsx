import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import ProtectedRoute from './components/layout/ProtectedRoute';
import AppLayout from './components/layout/AppLayout';

// Eagerly loaded core features (Instant load for main paths)
import Login from './features/auth/Login';
import Register from './features/auth/Register';
import Dashboard from './features/dashboard/Dashboard';
import WalletPage from './features/wallet/WalletPage';

// Lazy loaded feature routes
const CardsPage = lazy(() => import('./features/cards/CardsPage'));
const TransactionsPage = lazy(() => import('./features/transactions/TransactionsPage'));
const RewardsPage = lazy(() => import('./features/rewards/RewardsPage'));
const AnalyticsPage = lazy(() => import('./features/analytics/AnalyticsPage'));
const AiCoachPage = lazy(() => import('./features/ai-coach/AiCoachPage'));
const GoalsPage = lazy(() => import('./features/goals/GoalsPage'));
const SettingsPage = lazy(() => import('./features/settings/SettingsPage'));
const AdminPage = lazy(() => import('./features/admin/AdminPage'));

// Parent features
const AcceptInvitation = lazy(() => import('./features/parent/AcceptInvitation'));
const ParentDashboard = lazy(() => import('./features/parent/ParentDashboard'));
const ChildOverview = lazy(() => import('./features/parent/ChildOverview'));
const ApprovalQueue = lazy(() => import('./features/parent/ApprovalQueue'));

// Legal & common features
const PrivacyPolicy = lazy(() => import('./features/legal/PrivacyPolicy'));
const TermsOfService = lazy(() => import('./features/legal/TermsOfService'));
const CookiePolicy = lazy(() => import('./features/legal/CookiePolicy'));
const RefundPolicy = lazy(() => import('./features/legal/RefundPolicy'));
const NotFoundPage = lazy(() => import('./features/common/NotFoundPage'));

// Skeleton fallbacks
import { 
  CardSkeleton, 
  TransactionSkeleton, 
  RewardsSkeleton, 
  SettingsSkeleton, 
  AdminSkeleton, 
  ParentSkeleton, 
  AnalyticsSkeleton 
} from './components/skeletons/PageSkeletons';

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            
            <Route element={
              <Suspense fallback={<ParentSkeleton />}>
                <AcceptInvitation />
              </Suspense>
            } path="/accept-invitation" />

            {/* Protected routes */}
            <Route element={<ProtectedRoute />}>
              <Route element={<AppLayout />}>
                {/* Core instant pages */}
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/wallet" element={<WalletPage />} />

                {/* Finance lazy group */}
                <Route element={
                  <Suspense fallback={<CardSkeleton />}>
                    <Outlet />
                  </Suspense>
                }>
                  <Route path="/cards" element={<CardsPage />} />
                </Route>

                <Route element={
                  <Suspense fallback={<TransactionSkeleton />}>
                    <Outlet />
                  </Suspense>
                }>
                  <Route path="/transactions" element={<TransactionsPage />} />
                </Route>

                <Route element={
                  <Suspense fallback={<RewardsSkeleton />}>
                    <Outlet />
                  </Suspense>
                }>
                  <Route path="/rewards" element={<RewardsPage />} />
                  <Route path="/goals" element={<GoalsPage />} />
                </Route>

                {/* Insights lazy group */}
                <Route element={
                  <Suspense fallback={<AnalyticsSkeleton />}>
                    <Outlet />
                  </Suspense>
                }>
                  <Route path="/analytics" element={<AnalyticsPage />} />
                </Route>

                <Route element={
                  <Suspense fallback={
                    <div className="space-y-6">
                      <div className="h-8 bg-surface-800 rounded w-1/4 animate-pulse" />
                      <div className="h-64 bg-surface-800 rounded-xl animate-pulse" />
                    </div>
                  }>
                    <Outlet />
                  </Suspense>
                }>
                  <Route path="/ai-coach" element={<AiCoachPage />} />
                </Route>

                {/* Settings lazy group */}
                <Route element={
                  <Suspense fallback={<SettingsSkeleton />}>
                    <Outlet />
                  </Suspense>
                }>
                  <Route path="/settings" element={<SettingsPage />} />
                </Route>
              </Route>
            </Route>

            {/* Parent-only routes */}
            <Route element={<ProtectedRoute requiredRole="PARENT" />}>
              <Route element={<AppLayout />}>
                <Route element={
                  <Suspense fallback={<ParentSkeleton />}>
                    <Outlet />
                  </Suspense>
                }>
                  <Route path="/parent/dashboard" element={<ParentDashboard />} />
                  <Route path="/parent/child/:childId" element={<ChildOverview />} />
                  <Route path="/parent/approvals" element={<ApprovalQueue />} />
                </Route>
              </Route>
            </Route>

            {/* Admin routes */}
            <Route element={<ProtectedRoute requiredRole="ADMIN" />}>
              <Route element={<AppLayout />}>
                <Route element={
                  <Suspense fallback={<AdminSkeleton />}>
                    <Outlet />
                  </Suspense>
                }>
                  <Route path="/admin" element={<AdminPage />} />
                </Route>
              </Route>
            </Route>

            {/* Legal public routes */}
            <Route path="/privacy" element={
              <Suspense fallback={<div className="min-h-screen bg-[#F7FAFF] dark:bg-surface-950" />}>
                <PrivacyPolicy />
              </Suspense>
            } />
            <Route path="/terms" element={
              <Suspense fallback={<div className="min-h-screen bg-[#F7FAFF] dark:bg-surface-950" />}>
                <TermsOfService />
              </Suspense>
            } />
            <Route path="/cookies" element={
              <Suspense fallback={<div className="min-h-screen bg-[#F7FAFF] dark:bg-surface-950" />}>
                <CookiePolicy />
              </Suspense>
            } />
            <Route path="/refund" element={
              <Suspense fallback={<div className="min-h-screen bg-[#F7FAFF] dark:bg-surface-950" />}>
                <RefundPolicy />
              </Suspense>
            } />

            {/* Default redirect & 404 handler */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={
              <Suspense fallback={<div className="min-h-screen bg-[#F7FAFF] dark:bg-surface-950" />}>
                <NotFoundPage />
              </Suspense>
            } />
          </Routes>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
