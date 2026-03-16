import React from 'react';
import { Target, Zap, Trophy, Star, TrendingUp } from 'lucide-react';

interface GrowthMetricsProps {
  level?: number;
  xp?: number;
  totalXp?: number;
  streak?: number;
}

export default function GrowthMetrics({ 
  level = 1, 
  xp = 0, 
  totalXp = 0, 
  streak = 0 
}: GrowthMetricsProps) {
  const nextLevelXP = 500;
  const xpPercentage = (xp / nextLevelXP) * 100;

  const badges = [
    { name: 'Consistency', icon: <Star className="size-4" />, color: streak >= 7 ? 'text-amber-500' : 'text-slate-400', bg: 'bg-slate-50' },
    { name: 'syllabus pro', icon: <Target className="size-4" />, color: totalXp > 1000 ? 'text-blue-500' : 'text-slate-400', bg: 'bg-slate-50' },
    { name: 'exam ready', icon: <Trophy className="size-4" />, color: level > 10 ? 'text-purple-500' : 'text-slate-400', bg: 'bg-slate-50' }
  ];

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl p-8 border border-slate-200 dark:border-slate-800 shadow-xl space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">Growth Level</h3>
          <p className="text-sm text-slate-300 uppercase font-bold tracking-wide mt-1">
             Rank: {level > 10 ? 'Elite Aspirant' : 'Pro Aspirant'}
          </p>
        </div>
        <div className="size-16 rounded-full bg-linear-to-br from-[#1a57db] to-blue-600 flex items-center justify-center text-white text-2xl font-black shadow-lg shadow-blue-500/30">
          {level}
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex justify-between items-end">
          <span className="text-xs font-black text-slate-500 uppercase tracking-widest">Mastery XP</span>
          <span className="text-sm font-black text-[#1a57db]">{xp} / {nextLevelXP} XP</span>
        </div>
        <div className="w-full h-4 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden shadow-inner p-1">
          <div 
            className="h-full bg-linear-to-r from-[#1a57db] to-blue-400 rounded-full shadow-sm transition-all duration-1000 relative"
            style={{ width: `${xpPercentage}%` }}
          >
            <div className="absolute top-0 right-0 h-full w-4 bg-white/20 skew-x-12 animate-pulse" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-orange-50 dark:bg-orange-950/20 p-4 rounded-2xl border border-orange-100 dark:border-orange-900/30 flex items-center gap-4">
          <div className="size-10 bg-white dark:bg-slate-900 rounded-xl flex items-center justify-center text-orange-500 shadow-sm">
            <Zap size={20} fill="currentColor" />
          </div>
          <div>
            <p className="text-xl font-black text-orange-600">{streak} Days</p>
            <p className="text-[9px] uppercase font-bold text-orange-400 tracking-wider">Active Streak</p>
          </div>
        </div>
        
        <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-2xl border border-blue-100 dark:border-blue-900/30 flex items-center gap-4">
          <div className="size-10 bg-white dark:bg-slate-900 rounded-xl flex items-center justify-center text-blue-500 shadow-sm">
            <TrendingUp size={20} />
          </div>
          <div>
            <p className="text-xl font-black text-blue-600">+{totalXp}</p>
            <p className="text-[9px] uppercase font-bold text-blue-400 tracking-wider">Total XP Earned</p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 px-1">Progress Milestones</h4>
        <div className="flex flex-wrap gap-2">
          {badges.map((badge) => (
            <div key={badge.name} className={`${badge.bg} ${badge.color} px-3 py-1.5 rounded-xl border border-current/10 flex items-center gap-2 shadow-xs group cursor-default transition-all`}>
              {badge.icon}
              <span className="text-[10px] font-black uppercase tracking-tight">{badge.name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
