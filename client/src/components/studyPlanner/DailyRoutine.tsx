import React from 'react';
import { Sun, Moon, Clock, CheckCircle2, Circle, Sparkles } from 'lucide-react';

interface Habit {
  id: string;
  name: string;
  start_time?: string;
  end_time?: string;
  priority: string;
}

interface DailyRoutineProps {
  habits?: Habit[];
  onRefresh?: () => void;
}

export default function DailyRoutine({ habits = [], onRefresh }: DailyRoutineProps) {
  // Sort habits by start time for a better routine view
  const sortedHabits = [...habits].sort((a, b) => {
    if (!a.start_time) return 1;
    if (!b.start_time) return -1;
    return a.start_time.localeCompare(b.start_time);
  });

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl p-8 border border-slate-200 dark:border-slate-800 shadow-xl space-y-8 relative overflow-hidden group">
      <div className="absolute -top-7.5 -right-7.5 p-8 opacity-5 group-hover:scale-110 transition-transform">
         <Clock size={100} />
      </div>

      <div className="flex items-center justify-between relative z-10">
        <div>
          <h3 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">Daily Routine</h3>
          <p className="text-md text-slate-400 font-bold mt-1">Today's Study Schedule</p>
        </div>
        <div className="px-3 py-1 bg-emerald-50 dark:bg-emerald-950 text-emerald-600 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
           <Sparkles size={12} />
           Live
        </div>
      </div>

      <div className="space-y-6 h-66.5 overflow-y-auto  relative z-10">
        {sortedHabits.length > 0 ? (
          sortedHabits.map((habit, i) => (
            <div key={habit.id} className="flex items-start gap-4 group/item">
              <div className="flex flex-col items-center">
                <div className={`size-10 rounded-2xl flex items-center justify-center shadow-xs border transition-all ${
                  habit.priority === 'HIGH' ? 'bg-rose-50 border-rose-100 text-rose-500' : 'bg-slate-50 border-slate-100 text-slate-400'
                }`}>
                   {parseInt(habit.start_time?.split(':')[0] || '12') < 18 ? <Sun size={18} /> : <Moon size={18} />}
                </div>
                {i !== sortedHabits.length - 1 && <div className="w-px h-10 bg-slate-300 dark:bg-slate-800 my-1" />}
              </div>
              
              <div className="flex-1 pt-1">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-bold text-slate-900 dark:text-white group-hover/item:text-[#1a57db] transition-colors">{habit.name}</p>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mt-0.5">
                       {habit.start_time || "Anytime"} — {habit.end_time || "Anytime"}
                    </p>
                  </div>
                  <span className={`text-[12px] font-bold px-1.5 py-0.5 rounded-md uppercase tracking-wide ${
                    habit.priority === 'HIGH' ? 'bg-rose-100 text-rose-600' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {habit.priority}
                  </span>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="py-10 text-center space-y-3">
             <div className="size-16 bg-slate-50 dark:bg-slate-800 rounded-4xl flex items-center justify-center mx-auto text-slate-300">
                <Clock size={32} />
             </div>
             <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">No tasks scheduled yet</p>
             <button 
              onClick={onRefresh}
              className="text-[10px] font-black text-[#1a57db] uppercase hover:underline"
             >
                Add some to get started
             </button>
          </div>
        )}
      </div>

      <div className="pt-4 border-t border-slate-100 dark:border-slate-800 relative z-10">
        <p className="text-[10px] text-slate-400 font-medium italic">
          "Your schedule is your roadmap to OPSC success. Stick to the timings!"
        </p>
      </div>
    </div>
  );
}
