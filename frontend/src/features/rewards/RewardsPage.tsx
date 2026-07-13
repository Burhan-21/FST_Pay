import { useState, useEffect } from 'react';
import { Trophy, Flame, Gift, Check, Lock, Award, Mail, Copy, Sparkles } from 'lucide-react';
import { rewardsApi, reportsApi } from '../../api/endpoints';
import type { RewardsStatus, BadgeResponse, RewardItem, RedeemResponse } from '../../types';
import { PageTransition, Modal, Button } from '../../components/ui';
import { RewardsSkeleton } from '../../components/skeletons/PageSkeletons';

export default function RewardsPage() {
  const [status, setStatus] = useState<RewardsStatus | null>(null);
  const [badges, setBadges] = useState<BadgeResponse[]>([]);
  const [catalog, setCatalog] = useState<RewardItem[]>([]);
  const [redemptions, setRedemptions] = useState<RedeemResponse[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isClaiming, setIsClaiming] = useState(false);
  const [isRedeeming, setIsRedeeming] = useState<string | null>(null);
  const [isRequestingReport, setIsRequestingReport] = useState(false);
  
  // Modal for revealed code
  const [revealedClaim, setRevealedClaim] = useState<RedeemResponse | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);
  const [alertConfig, setAlertConfig] = useState<{ title: string; message: string } | null>(null);

  const fetchAllData = async () => {
    try {
      setIsLoading(true);
      const [statusRes, badgesRes, catalogRes, redemptionsRes] = await Promise.all([
        rewardsApi.getStatus(),
        rewardsApi.getBadges(),
        rewardsApi.getCatalog(),
        rewardsApi.getRedemptions(),
      ]);
      setStatus(statusRes.data);
      setBadges(badgesRes.data);
      setCatalog(catalogRes.data);
      setRedemptions(redemptionsRes.data);
    } catch (err) {
      console.error('Error fetching rewards dashboard data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  const handleClaimStreak = async () => {
    try {
      setIsClaiming(true);
      const res = await rewardsApi.claimStreak();
      setStatus(res.data);
      
      // Refresh badges and redemptions too
      const [badgesRes, redemptionsRes] = await Promise.all([
        rewardsApi.getBadges(),
        rewardsApi.getRedemptions(),
      ]);
      setBadges(badgesRes.data);
      setRedemptions(redemptionsRes.data);
      setAlertConfig({
        title: 'Daily Streak Claimed',
        message: 'Congratulations! Daily streak claimed successfully! 🎉'
      });
    } catch (err: any) {
      console.error('Failed to claim daily streak:', err);
      setAlertConfig({
        title: 'Streak Claim Error',
        message: err.response?.data?.message || 'Failed to claim daily streak.'
      });
    } finally {
      setIsClaiming(false);
    }
  };

  const handleRedeemItem = async (itemId: string) => {
    try {
      setIsRedeeming(itemId);
      const res = await rewardsApi.redeemItem(itemId);
      setRevealedClaim(res.data);
      setCopySuccess(false);

      // Refresh status, catalog and redemptions list
      const [statusRes, catalogRes, redemptionsRes] = await Promise.all([
        rewardsApi.getStatus(),
        rewardsApi.getCatalog(),
        rewardsApi.getRedemptions(),
      ]);
      setStatus(statusRes.data);
      setCatalog(catalogRes.data);
      setRedemptions(redemptionsRes.data);
    } catch (err: any) {
      console.error('Redemption failed:', err);
      setAlertConfig({
        title: 'Redemption Failed',
        message: err.response?.data?.message || 'Failed to redeem reward item.'
      });
    } finally {
      setIsRedeeming(null);
    }
  };

  const handleRequestReport = async () => {
    try {
      setIsRequestingReport(true);
      await reportsApi.requestMonthlyReport();
      setAlertConfig({
        title: 'Report Dispatched',
        message: 'Statement dispatched! Check your email inbox shortly for the PDF report. 📧'
      });
    } catch (err: any) {
      console.error('Failed to request statement email:', err);
      setAlertConfig({
        title: 'Request Failed',
        message: 'Failed to request monthly statement email.'
      });
    } finally {
      setIsRequestingReport(false);
    }
  };

  const handleCopyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('Failed to copy code:', err);
    }
  };

  if (isLoading && !status) {
    return <RewardsSkeleton />;
  }

  const points = status?.points ?? 0;
  const xp = status?.xp ?? 0;
  const level = status?.level ?? 1;
  const streakDays = status?.streakDays ?? 0;
  const currentBoundary = status?.currentLevelXpBoundary ?? 0;
  const nextBoundary = status?.nextLevelXpBoundary ?? 100;
  const progressPercent = Math.max(0, Math.min(100, ((xp - currentBoundary) / (nextBoundary - currentBoundary)) * 100));

  const lastStreakDate = status?.lastStreakAt ? new Date(status.lastStreakAt) : null;
  const isClaimedToday = lastStreakDate 
    ? lastStreakDate.toDateString() === new Date().toDateString() 
    : false;

  return (
    <PageTransition className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-white flex items-center gap-2">
            <Trophy className="w-7 h-7 text-warning-400" /> Rewards & Level Up
          </h1>
          <p className="text-surface-400 mt-1">Sticking to budgets and saving unlocks premium badges & reward gift cards.</p>
        </div>

        <Button
          onClick={handleRequestReport}
          disabled={isRequestingReport}
          variant="secondary"
          size="sm"
          isLoading={isRequestingReport}
          leftIcon={<Mail className="w-4 h-4 text-primary-400" />}
        >
          Email Me Monthly Statement
        </Button>
      </div>

      {/* Gamification Level & XP Progress card */}
      <div className="relative overflow-hidden rounded-2xl p-8 bg-gradient-to-br from-primary-600 via-purple-600 to-accent-600 border border-primary-500/20 shadow-xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-28 translate-x-28 blur-2xl pointer-events-none" />
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
          
          {/* Level Details */}
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2 bg-white/10 px-3 py-1 rounded-full w-max backdrop-blur-sm">
              <Award className="w-4 h-4 text-warning-300" />
              <span className="text-xs text-white font-medium uppercase tracking-wider">Level {level} Club</span>
            </div>
            
            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-display font-extrabold text-white">{points.toLocaleString()}</span>
              <span className="text-white/70 text-sm font-medium">available points</span>
            </div>
            
            <p className="text-white/60 text-xs mt-1">Level up to get free points & unlock higher card design skins.</p>
            
            {/* XP progress bar */}
            <div className="mt-6">
              <div className="flex items-center justify-between text-xs text-white/80 mb-2">
                <span>XP Level {level} Progression</span>
                <span className="font-semibold">{xp.toLocaleString()} / {nextBoundary.toLocaleString()} XP</span>
              </div>
              <div className="w-full bg-black/25 rounded-full h-3 p-[2px]">
                <div 
                  className="bg-gradient-to-r from-warning-300 to-yellow-300 h-full rounded-full transition-all duration-500 ease-out" 
                  style={{ width: `${progressPercent}%` }} 
                />
              </div>
            </div>
          </div>

          {/* Daily Streak Card */}
          <div className="flex flex-col sm:flex-row items-center gap-4 bg-black/15 p-5 rounded-2xl border border-white/5 backdrop-blur-md min-w-[280px]">
            <div className="flex-1 text-center sm:text-left">
              <div className="flex items-center gap-2 justify-center sm:justify-start">
                <Flame className="w-5 h-5 text-orange-400" />
                <span className="text-white font-semibold text-sm">Daily Streak</span>
              </div>
              <p className="text-3xl font-display font-extrabold text-white mt-1">{streakDays} Days</p>
              <p className="text-xs text-white/50">Check in daily for higher points multiplier!</p>
            </div>
            
            <Button
              onClick={handleClaimStreak}
              disabled={isClaimedToday || isClaiming}
              isLoading={isClaiming}
              variant={isClaimedToday ? 'secondary' : 'primary'}
              size="sm"
              leftIcon={isClaimedToday ? <Check className="w-4 h-4" /> : <Sparkles className="w-3.5 h-3.5" />}
            >
              {isClaimedToday ? 'Claimed Today' : 'Claim +25 XP'}
            </Button>
          </div>
        </div>
      </div>

      {/* Badges showcase rack */}
      <div className="glass-card p-6 border border-surface-800/80 shadow-md">
        <h3 className="text-lg font-display font-semibold text-white mb-1 flex items-center gap-2">
          <Award className="w-5 h-5 text-purple-400" /> Badge Rack
        </h3>
        <p className="text-surface-400 text-xs mb-5">Earn 150 points for each badge unlocked.</p>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
          {badges.map((badge) => (
            <div 
              key={badge.id} 
              className={`relative overflow-hidden p-5 rounded-2xl border text-center transition-all duration-300 ${
                badge.unlocked 
                  ? 'bg-surface-800/40 border-primary-500/30 shadow-md hover:border-primary-500/50' 
                  : 'bg-surface-900/40 border-surface-800/80 grayscale opacity-50'
              }`}
            >
              {/* Lock icon if locked */}
              {!badge.unlocked && (
                <div className="absolute top-2 right-2 p-1 bg-surface-900 rounded-full border border-surface-800">
                  <Lock className="w-3 h-3 text-surface-500" />
                </div>
              )}
              
              <span className="text-4xl block mb-2">{badge.icon || '🏆'}</span>
              <h4 className="text-sm font-semibold text-white">{badge.displayName}</h4>
              <p className="text-surface-400 text-xxs mt-1 min-h-[30px] leading-tight">{badge.description}</p>
              
              {badge.unlocked ? (
                <div className="mt-3 text-xxs font-bold text-emerald-400 bg-emerald-500/10 py-1 px-2 rounded-full inline-block">
                  Unlocked
                </div>
              ) : (
                <div className="mt-3 text-xxs font-bold text-surface-500 bg-surface-800 py-1 px-2 rounded-full inline-block">
                  Locked
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Vouchers Catalog Shop */}
      <div className="glass-card p-6 border border-surface-800/80 shadow-md">
        <h3 className="text-lg font-display font-semibold text-white mb-1 flex items-center gap-2">
          <Gift className="w-5 h-5 text-accent-400" /> Rewards Shop
        </h3>
        <p className="text-surface-400 text-xs mb-5">Redeem your accumulated points for real-world coupons and card themes.</p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {catalog.map((item) => {
            const canAfford = points >= item.costPoints;
            const isOutOfStock = item.stock <= 0;
            const isRedeemingThis = isRedeeming === item.id;

            return (
              <div 
                key={item.id} 
                className="flex flex-col justify-between p-5 rounded-2xl bg-surface-800/20 border border-surface-800/80 hover:border-surface-700 transition-all hover:shadow-lg"
              >
                <div>
                  <div className="w-12 h-12 bg-accent-500/10 text-accent-400 rounded-xl flex items-center justify-center mb-3">
                    <Gift className="w-6 h-6" />
                  </div>
                  <h4 className="font-semibold text-white text-sm">{item.title}</h4>
                  <p className="text-surface-400 text-xs mt-1 leading-normal">{item.description}</p>
                  
                  <div className="flex items-center gap-1.5 mt-3">
                    <span className="text-xs text-surface-400">Stock:</span>
                    <span className={`text-xs font-semibold ${isOutOfStock ? 'text-danger-400' : 'text-emerald-400'}`}>
                      {isOutOfStock ? 'Out of Stock' : `${item.stock} left`}
                    </span>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-surface-800/60">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs text-surface-400 font-medium">Cost</span>
                    <span className="text-sm font-bold text-accent-400">{item.costPoints.toLocaleString()} pts</span>
                  </div>

                  <Button
                    onClick={() => handleRedeemItem(item.id)}
                    disabled={!canAfford || isOutOfStock || isRedeemingThis}
                    isLoading={isRedeemingThis}
                    variant={!canAfford || isOutOfStock ? 'secondary' : 'primary'}
                    fullWidth
                    size="sm"
                  >
                    {isOutOfStock ? 'Sold Out' : !canAfford ? 'Need More Points' : 'Redeem Voucher'}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Redeemed coupon codes history */}
      {redemptions.length > 0 && (
        <div className="glass-card p-6 border border-surface-800/80 shadow-md">
          <h3 className="text-lg font-display font-semibold text-white mb-4 flex items-center gap-2">
            <Check className="w-5 h-5 text-emerald-400" /> Redeemed Codes & Inventory
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-surface-800 text-surface-400 text-xs font-semibold">
                  <th className="py-3 px-4">Item</th>
                  <th className="py-3 px-4">Claim Code</th>
                  <th className="py-3 px-4">Redeemed At</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {redemptions.map((red) => (
                  <tr key={red.id} className="border-b border-surface-800/60 hover:bg-surface-800/10 text-white">
                    <td className="py-3 px-4 font-semibold text-xs">{red.title}</td>
                    <td className="py-3 px-4 font-mono text-xs text-accent-400 bg-black/10 px-2 py-1 rounded w-max select-all">
                      {red.codeClaimed}
                    </td>
                    <td className="py-3 px-4 text-xs text-surface-400">
                      {new Date(red.redeemedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleCopyCode(red.codeClaimed)}
                        className="p-1.5 hover:bg-surface-700/50 text-surface-400 hover:text-white rounded-lg transition-colors inline-flex items-center gap-1 text-xxs font-semibold"
                      >
                        <Copy className="w-3.5 h-3.5" /> Copy Code
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Revealed Code Modal Popup */}
      <Modal isOpen={!!revealedClaim} onClose={() => setRevealedClaim(null)} title="Redemption Successful!">
        {revealedClaim && (
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-gradient-to-br from-accent-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg mx-auto">
              <Sparkles className="w-8 h-8 text-white" />
            </div>

            <p className="text-surface-400 text-xs">Your points have been converted into a voucher code.</p>

            <div className="p-5 bg-black/25 border border-surface-800 rounded-2xl">
              <p className="text-xxs text-surface-500 uppercase tracking-widest font-semibold">Voucher Name</p>
              <h4 className="text-sm font-bold text-white mt-0.5">{revealedClaim.title}</h4>

              <div className="mt-4 p-3.5 bg-accent-500/10 border border-accent-500/20 rounded-xl flex items-center justify-between gap-3">
                <span className="font-mono text-sm font-bold text-accent-400 select-all truncate">
                  {revealedClaim.codeClaimed}
                </span>

                <Button
                  onClick={() => handleCopyCode(revealedClaim.codeClaimed)}
                  variant="primary"
                  size="sm"
                  leftIcon={copySuccess ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                >
                  {copySuccess ? 'Copied' : 'Copy'}
                </Button>
              </div>
            </div>

            <p className="text-xxs text-surface-500 leading-normal">
              Copy this code and redeem it on the merchant site. You can also view this code anytime in the Redeemed Codes section at the bottom of the page.
            </p>

            <Button onClick={() => setRevealedClaim(null)} variant="secondary" fullWidth>
              Awesome, Got It!
            </Button>
          </div>
        )}
      </Modal>

      {/* CUSTOM ALERT MODAL */}
      <Modal
        isOpen={alertConfig !== null}
        onClose={() => setAlertConfig(null)}
        title={alertConfig?.title}
      >
        <div className="space-y-4" aria-live="polite">
          <p className="text-sm text-surface-200">{alertConfig?.message}</p>
          <div className="flex justify-end pt-2">
            <Button onClick={() => setAlertConfig(null)} variant="primary" size="sm">
              Dismiss
            </Button>
          </div>
        </div>
      </Modal>
    </PageTransition>
  );
}
