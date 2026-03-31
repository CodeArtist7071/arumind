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
    { name: 'Consistency', icon: <Star className="size-4" />, color: streak >= 7 ? 'text-amber-500' : 'text-slate-400', bg: 'bg-surface-container-low' },
    { name: 'syllabus pro', icon: <Target className="size-4" />, color: totalXp > 1000 ? 'text-primary' : 'text-slate-400', bg: 'bg-surface-container-low' },
    { name: 'exam ready', icon: <Trophy className="size-4" />, color: level > 10 ? 'text-purple-500' : 'text-slate-400', bg: 'bg-surface-container-low' }
  ];

  return (
    <div className="bg-surface-container-low rounded-[2.5rem] p-8 shadow-ambient space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-[11px] font-technical font-black uppercase tracking-[0.4em] text-on-surface-variant opacity-60 mb-2">Growth Lifecycle</h3>
          <p className="text-2xl font-black text-on-surface tracking-tighter transition-all hover:text-primary cursor-default">
             {level > 10 ? 'Elite' : 'Pro'} Aspirant
          </p>
        </div>
        <div className="size-16 rounded-3xl bg-primary flex items-center justify-center text-white text-3xl font-technical font-black shadow-lg shadow-primary/20 transform -rotate-3 hover:rotate-0 transition-transform duration-500">
          {level}
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex justify-between items-end px-1">
          <span className="text-[9px] font-technical font-black text-on-surface-variant uppercase tracking-[0.2em] opacity-40">Mastery XP</span>
          <span className="text-sm font-technical font-black text-primary tracking-widest">
            {xp} <span className="opacity-20">/</span> {nextLevelXP} <span className="text-[10px] opacity-40">XP</span>
          </span>
        </div>
        <div className="w-full h-6 bg-surface-container-high rounded-full overflow-hidden p-1.5 shadow-inner ring-1 ring-black/5">
          <div 
            className="h-full bg-linear-to-r from-primary to-primary-container rounded-full shadow-sm transition-all duration-2000 ease-out relative"
            style={{ width: `${xpPercentage}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white/50 p-6 rounded-4xl flex flex-col gap-4 shadow-ambient hover:scale-105 transition-all duration-500 group">
          <div className="size-12 bg-surface-container-low rounded-2xl flex items-center justify-center text-tertiary shadow-sm group-hover:bg-tertiary group-hover:text-white transition-all duration-500">
            <Zap size={22} fill="currentColor" />
          </div>
          <div>
            <p className="text-3xl font-technical font-black text-on-surface tracking-tighter">{streak}</p>
            <p className="text-[9px] font-technical uppercase font-black text-on-surface-variant tracking-[0.2em] opacity-40">Active Streak</p>
          </div>
        </div>
        
        <div className="bg-white/50 p-6 rounded-4xl flex flex-col gap-4 shadow-ambient hover:scale-105 transition-all duration-500 group">
          <div className="size-12 bg-surface-container-low rounded-2xl flex items-center justify-center text-primary shadow-sm group-hover:bg-primary group-hover:text-white transition-all duration-500">
            <TrendingUp size={22} />
          </div>
          <div>
            <p className="text-3xl font-technical font-black text-on-surface tracking-tighter">+{totalXp}</p>
            <p className="text-[9px] font-technical uppercase font-black text-on-surface-variant tracking-[0.2em] opacity-40">XP Earned</p>
          </div>
        </div>
      </div>

      <div className="space-y-6 pt-4">
        <h4 className="text-[10px] font-technical font-black uppercase tracking-[0.4em] text-on-surface-variant opacity-40 px-1">Progress Milestones</h4>
        <div className="flex flex-wrap gap-3">
          {badges.map((badge) => (
            <div key={badge.name} className={`bg-surface-container-high ${badge.color} px-4 py-2 rounded-2xl flex items-center gap-3 shadow-sm hover:bg-white transition-all duration-300 group cursor-default`}>
              <div className="opacity-60 group-hover:opacity-100 transition-opacity">{badge.icon}</div>
              <span className="text-[9px] font-technical font-black uppercase tracking-widest">{badge.name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
