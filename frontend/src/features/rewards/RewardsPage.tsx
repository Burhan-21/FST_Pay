import { useState, useEffect } from 'react';
import { Trophy, Flame, Gift, Star, Loader2, Check } from 'lucide-react';
import { rewardsApi } from '../../api/endpoints';
import type { RewardHistory } from '../../types';

const levels = [
  { name: 'Bronze', min: 0, max: 1000, color: 'from-amber-700 to-amber-600' },
  { name: 'Silver', min: 1001, max: 5000, color: 'from-slate-400 to-slate-300' },
  { name: 'Gold', min: 5001, max: 15000, color: 'from-yellow-500 to-yellow-400' },
  { name: 'Platinum', min: 15001, max: 50000, color: 'from-purple-500 to-purple-400' },
];

export default function RewardsPage() {
  const [rewards, setRewards] = useState<{ points: number; streakDays: number; lastStreakAt: string | null } | null>(null);
  const [history, setHistory] = useState<RewardHistory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isClaiming, setIsClaiming] = useState(false);

  const fetchRewardsAndHistory = async () => {
    try {
      setIsLoading(true);
      const [rewardsRes, historyRes] = await Promise.all([
        rewardsApi.getRewards(),
        rewardsApi.getHistory()
      ]);
      setRewards(rewardsRes.data.data);
      setHistory(historyRes.data.data.content || historyRes.data.data || []);
    } catch (err) {
      console.error('Error fetching rewards:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRewardsAndHistory();
  }, []);

  const handleClaimStreak = async () => {
    try {
      setIsClaiming(true);
      const res = await rewardsApi.claimStreak();
      setRewards(res.data.data);
      const historyRes = await rewardsApi.getHistory();
      setHistory(historyRes.data.data.content || historyRes.data.data || []);
      alert('Congratulations! Daily streak claimed successfully! 🎉');
    } catch (err: any) {
      console.error('Failed to claim daily streak:', err);
      alert(err.response?.data?.message || 'Failed to claim daily streak.');
    } finally {
      setIsClaiming(false);
    }
  };

  if (isLoading && !rewards) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-primary-400" />
        <p className="text-surface-400 text-sm">Loading rewards...</p>
      </div>
    );
  }

  const points = rewards?.points ?? 0;
  const streakDays = rewards?.streakDays ?? 0;
  const currentLevel = levels.find((l) => points >= l.min && points <= l.max) || levels[0];
  const progress = ((points - currentLevel.min) / (currentLevel.max - currentLevel.min)) * 100;

  const lastStreakDate = rewards?.lastStreakAt ? new Date(rewards.lastStreakAt) : null;
  const isClaimedToday = lastStreakDate 
    ? lastStreakDate.toDateString() === new Date().toDateString() 
    : false;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-white">Rewards</h1>
        <p className="text-surface-400 mt-1">Earn points for smart financial habits</p>
      </div>

      {/* Points + Level Card */}
      <div className="relative overflow-hidden rounded-2xl p-8 bg-gradient-to-br from-primary-600 via-purple-600 to-accent-600 page-section">
        <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full -translate-y-20 translate-x-20" />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center gap-6">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Trophy className="w-5 h-5 text-warning-300" />
              <span className="text-sm text-white/80">{currentLevel.name} Member</span>
            </div>
            <p className="text-5xl font-display font-bold text-white">{points.toLocaleString()}</p>
            <p className="text-white/60 mt-1">reward points</p>
            <div className="mt-4">
              <div className="flex items-center justify-between text-xs text-white/60 mb-1">
                <span>{currentLevel.name}</span>
                <span>{points.toLocaleString()} / {currentLevel.max.toLocaleString()}</span>
              </div>
              <div className="w-full bg-white/20 rounded-full h-2">
                <div className="bg-white h-2 rounded-full transition-all" style={{ width: `${Math.min(progress, 100)}%` }} />
              </div>
            </div>
          </div>
          <div className="flex flex-col items-center gap-3">
            <div className="text-center p-4 bg-white/10 rounded-2xl backdrop-blur min-w-[120px]">
              <Flame className="w-8 h-8 text-orange-400 mx-auto mb-1" />
              <p className="text-2xl font-bold text-white">{streakDays}</p>
              <p className="text-xs text-white/60">day streak</p>
            </div>
            <button
              onClick={handleClaimStreak}
              disabled={isClaimedToday || isClaiming}
              className={`w-full py-2.5 px-4 rounded-xl font-medium text-xs transition-all flex items-center justify-center gap-2 ${
                isClaimedToday
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'bg-white text-primary-700 hover:bg-white/95'
              }`}
            >
              {isClaiming ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : isClaimedToday ? (
                <>
                  <Check className="w-4 h-4" /> Claimed Today
                </>
              ) : (
                'Claim Daily Streak'
              )}
            </button>
          </div>
        </div>
      </div>

      {/* How to Earn */}
      <div className="glass-card p-6 page-section">
        <h3 className="text-lg font-display font-semibold text-white mb-4">How to Earn Points</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { icon: Flame, label: 'Daily Streak Check-in', points: '+10', color: 'text-orange-400 bg-orange-500/15' },
            { icon: Star, label: 'Monthly savings goal', points: '+100', color: 'text-yellow-400 bg-yellow-500/15' },
            { icon: Gift, label: '30-day streak bonus', points: '+200', color: 'text-purple-400 bg-purple-500/15' },
            { icon: Trophy, label: 'Refer a friend', points: '+500', color: 'text-accent-400 bg-accent-500/15' },
          ].map((item) => (
            <div key={item.label} className="p-4 rounded-xl glass border border-surface-700/30 hover:border-surface-600/50 transition-all">
              <div className={`w-10 h-10 rounded-xl ${item.color.split(' ')[1]} flex items-center justify-center mb-3`}>
                <item.icon className={`w-5 h-5 ${item.color.split(' ')[0]}`} />
              </div>
              <p className="text-sm text-white font-medium">{item.label}</p>
              <p className="text-xs text-accent-400 mt-1">{item.points} pts</p>
            </div>
          ))}
        </div>
      </div>

      {/* History */}
      <div className="glass-card p-6 page-section">
        <h3 className="text-lg font-display font-semibold text-white mb-4">Points History</h3>
        <div className="space-y-3">
          {history.length === 0 ? (
            <p className="text-surface-400 text-sm py-4 text-center">No points earned yet. Claim your daily streak to begin!</p>
          ) : (
            history.map((item) => (
              <div key={item.id} className="flex items-center gap-4 p-3 rounded-xl hover:bg-surface-700/30 transition-colors">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${item.pointsChange > 0 ? 'bg-accent-500/15' : 'bg-danger-500/15'}`}>
                  {item.pointsChange > 0 ? <Star className="w-5 h-5 text-accent-400" /> : <Gift className="w-5 h-5 text-danger-400" />}
                </div>
                <div className="flex-1">
                  <p className="text-sm text-white">{item.reason}</p>
                  <p className="text-xs text-surface-400">{new Date(item.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
                </div>
                <span className={`text-sm font-semibold ${item.pointsChange > 0 ? 'text-accent-400' : 'text-danger-400'}`}>
                  {item.pointsChange > 0 ? '+' : ''}{item.pointsChange} pts
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
