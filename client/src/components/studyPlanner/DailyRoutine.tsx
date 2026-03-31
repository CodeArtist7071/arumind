import React from 'react';
import { Sun, Moon, Clock, CheckCircle2, Circle, Sparkles, Calendar } from 'lucide-react';

interface Habit {
  id: string;
  name: string;
  start_time?: string;
  end_time?: string;
  priority: string;
  is_mastery?: boolean;
  is_recurring?: boolean;
}

interface DailyRoutineProps {
  habits?: Habit[];
  onRefresh?: () => void;
  onSync?: (habit: Habit) => void;
  onSyncAll?: () => void;
  selectedDate?: Date;
  progress?: Record<string, boolean[]>;
}

export default function DailyRoutine({ habits = [], progress = {}, selectedDate = new Date(), onRefresh, onSync, onSyncAll }: DailyRoutineProps) {
  // 1. Determine which day we are looking at
  const dayIdx = selectedDate.getDate() - 1;
  const isToday = selectedDate.toDateString() === new Date().toDateString();

  // 2. Filter habits that are either:
  //    - Generic routines (recurring for the month)
  //    - One-off tasks/tests scheduled for THIS specific date
  const relevantHabits = habits.filter(h => {
    const prog = progress[h.id];
    if (!prog) return false;

    // If it's a mastery test or a one-off task, it's strictly scheduled for a specific day
    if (h.is_mastery || h.is_recurring === false) {
       return prog[dayIdx] === true;
    }

    // For recurring routines, show them every day
    return true; 
  });

  // Sort by start time
  const sortedHabits = [...relevantHabits].sort((a, b) => {
    if (!a.start_time) return 1;
    if (!b.start_time) return -1;
    return a.start_time.localeCompare(b.start_time);
  });

  return (
    <div className="bg-surface-container-low rounded-[2.5rem] p-8 shadow-ambient space-y-8 relative overflow-hidden group min-h-[500px]">
      <div className="absolute -top-10 -right-10 p-10 opacity-[0.02] group-hover:scale-110 transition-transform duration-3000 pointer-events-none">
         <Clock size={200} />
      </div>

      <div className="flex items-center justify-between relative z-10 px-1">
        <div>
          <h3 className="text-[11px] font-technical font-black uppercase tracking-[0.4em] text-on-surface-variant opacity-60 mb-2">Daily Cycle</h3>
          <p className="text-2xl font-black text-on-surface tracking-tighter">
            {isToday ? "Today's Rituals" : `${selectedDate.toLocaleDateString('default', { month: 'short', day: 'numeric' })} Rituals`}
          </p>
        </div>
        <div className="flex items-center gap-4">
          {(onSyncAll || onSync) && sortedHabits.length > 0 && (
            <button
              onClick={() => {
                if (onSyncAll) {
                  onSyncAll();
                } else {
                  sortedHabits.forEach((h) => onSync?.(h));
                }
              }}
              className="px-4 py-2 bg-white text-primary rounded-full text-[10px] font-technical font-black uppercase tracking-[0.2em] flex items-center gap-2 hover:bg-primary hover:text-white transition-all duration-500 shadow-sm shadow-primary/5"
              title="Add all to Google Calendar"
            >
              <Calendar size={12} />
              Sync All
            </button>
          )}
          <div className="px-4 py-2 bg-primary/10 text-primary rounded-full text-[10px] font-technical font-black uppercase tracking-[0.3em] flex items-center gap-2 animate-pulse">
            <Sparkles size={12} fill="currentColor" />
            Live
          </div>
        </div>
      </div>

      <div className="space-y-4 h-[320px] overflow-y-auto relative z-10 custom-scrollbar pr-2">
        {sortedHabits.length > 0 ? (
          sortedHabits.map((habit, i) => (
            <div key={habit.id} className="flex items-start gap-6 group/item relative">
              <div className="flex flex-col items-center pt-1.5">
                <div className={`size-12 rounded-2xl flex items-center justify-center shadow-sm transition-all duration-500 ${
                  habit.priority === 'HIGH' ? 'bg-tertiary/10 text-tertiary' : 'bg-surface-container-high text-on-surface-variant/40'
                } group-hover/item:scale-110 group-hover/item:shadow-md`}>
                   {parseInt(habit.start_time?.split(':')[0] || '12') < 18 ? <Sun size={20} /> : <Moon size={20} />}
                </div>
                {i !== sortedHabits.length - 1 && <div className="w-px h-12 bg-on-surface/5 my-2 opacity-50" />}
              </div>
              
              <div className="flex-1 transition-all duration-500 group-hover/item:translate-x-1">
                <div className="flex justify-between items-start bg-white/30 p-5 rounded-4xl hover:bg-white/80 transition-all duration-500 group-hover/item:shadow-ambient">
                  <div>
                    <p className="text-lg font-black text-on-surface tracking-tight group-hover/item:text-primary transition-colors leading-tight mb-1">{habit.name}</p>
                    <div className="flex items-center gap-2 opacity-40">
                      <Clock size={10} className="text-on-surface-variant" />
                      <p className="text-[10px] font-technical uppercase tracking-[0.2em] text-on-surface-variant">
                         {habit.start_time || "Anytime"} <span className="opacity-30 mx-1">—</span> {habit.end_time || "Anytime"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {onSync && (
                      <button
                        onClick={() => onSync(habit)}
                        className="size-10 flex items-center justify-center text-on-surface-variant/30 hover:text-primary hover:bg-primary/5 rounded-full transition-all duration-500"
                        title="Sync to Google Calendar"
                      >
                        <Calendar size={16} />
                      </button>
                    )}
                    <span className={`text-[10px] font-technical font-black px-3 py-1.5 rounded-full uppercase tracking-[0.2em] ${
                      habit.priority === 'HIGH' ? 'bg-tertiary/10 text-tertiary' : 'bg-surface-container-high text-on-surface-variant opacity-40'
                    }`}>
                      {habit.priority}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="py-20 text-center space-y-6">
             <div className="size-20 bg-surface-container-high rounded-[2.5rem] flex items-center justify-center mx-auto text-on-surface-variant opacity-10 rotate-12 group-hover:rotate-0 transition-transform duration-1000">
                <Clock size={40} />
             </div>
             <div>
               <p className="text-[10px] font-technical font-black text-on-surface-variant uppercase tracking-[0.4em] opacity-30 mb-4">No tasks manifested</p>
               <button 
                onClick={onRefresh}
                className="px-6 py-3 bg-primary text-white rounded-full text-[10px] font-technical font-black uppercase tracking-[0.3em] shadow-lg shadow-primary/20 hover:scale-105 transition-all"
               >
                  Generate Path +
               </button>
             </div>
          </div>
        )}
      </div>

      <div className="pt-6 border-t border-on-surface/5 relative z-10 px-1">
        <p className="text-[10px] font-technical font-black uppercase tracking-[0.2em] text-on-surface-variant opacity-30 italic leading-relaxed">
          "Your schedule is your roadmap to OPSC success. Stick to the timings!"
        </p>
      </div>
    </div>
  );
}
