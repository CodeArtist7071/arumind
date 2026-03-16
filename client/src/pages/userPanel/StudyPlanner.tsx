import React, { useState, useEffect, useMemo } from 'react';
import { Header } from "../../components/Header";
import TrackerGrid from "../../components/studyPlanner/TrackerGrid";
import DailyRoutine from "../../components/studyPlanner/DailyRoutine";
import FocusTimer from "../../components/studyPlanner/FocusTimer";
import GrowthMetrics from "../../components/studyPlanner/GrowthMetrics";
import { GraduationCap, Sparkles, LayoutDashboard, Calendar, Settings } from 'lucide-react';
import { useNavigate, useParams } from 'react-router';
import { supabase } from "../../utils/supabase";
import { useSelector } from "react-redux";
import type { RootState } from "../../store";

export interface Habit {
  id: string;
  name: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  category: 'theory' | 'mcq' | 'revision' | 'mock';
  start_time?: string;
  end_time?: string;
  is_mastery?: boolean;
  chapter_id?: string;
}

export default function StudyPlannerPage() {
  const navigate = useNavigate();
  const { eid: examId } = useParams();
  const { user } = useSelector((state: RootState) => state.user);
  
  const [habits, setHabits] = useState<Habit[]>([]);
  const [progress, setProgress] = useState<Record<string, boolean[]>>({});
  const [loading, setLoading] = useState(true);

  // Fetch from Supabase
  const fetchData = async () => {
    if (!user?.id) return;
    try {
      setLoading(true);
      const [habitsRes, masteryRes] = await Promise.all([
        supabase.from('study_habits').select('*').eq('user_id', user.id),
        supabase.from('user_mastery').select('*, chapters(name)').eq('user_id', user.id)
      ]);

      const allHabits: Habit[] = [];
      const allProgress: Record<string, boolean[]> = {};

      (habitsRes.data || []).forEach(h => {
        allHabits.push({ id: h.id, name: h.name, priority: h.priority, category: h.category, start_time: h.start_time, end_time: h.end_time });
        allProgress[h.id] = h.progress || Array(30).fill(false);
      });

      (masteryRes.data || []).forEach(m => {
        allHabits.push({ 
          id: m.id, 
          name: m.chapters?.name || "Unknown Chapter", 
          priority: m.priority as any, 
          category: 'theory', 
          start_time: m.start_time,
          end_time: m.end_time,
          is_mastery: true,
          chapter_id: m.chapter_id 
        });
        allProgress[m.id] = m.progress || Array(30).fill(false);
      });

      setHabits(allHabits);
      setProgress(allProgress);
    } catch (err) {
      console.error("Error fetching study data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user?.id]);

  // Handle progress updates from children
  const handleToggle = async (id: string, index: number) => {
    const habit = habits.find(h => h.id === id);
    if (!habit || !user?.id) return;

    const newProg = [...(progress[id] || Array(30).fill(false))];
    newProg[index] = !newProg[index];

    setProgress(prev => ({ ...prev, [id]: newProg }));

    const table = habit.is_mastery ? 'user_mastery' : 'study_habits';
    await supabase.from(table).update({ progress: newProg }).eq('id', id);
  };

  const handleRefresh = () => fetchData();

  // Growth Metrics Logic
  const stats = useMemo(() => {
    let totalCompleted = 0;
    Object.values(progress).forEach(p => {
      totalCompleted += p.filter(v => v).length;
    });

    // Calculate Streak
    let currentStreak = 0;
    // For 30 days, check from the last index backwards
    for (let day = 29; day >= 0; day--) {
      const anyDone = Object.values(progress).some(p => p[day]);
      if (anyDone) {
        currentStreak++;
      } else if (currentStreak > 0) {
        break; // streak broken
      }
    }

    const xp = totalCompleted * 10;
    const level = Math.floor(xp / 500) + 1;
    const xpInLevel = xp % 500;

    return { totalCompleted, currentStreak, xp, level, xpInLevel };
  }, [progress]);

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950 font-['Inter'] text-slate-900 dark:text-slate-100">
      <Header />

      <main className="max-w-[1600px] mx-auto p-4 md:p-8 space-y-10 pb-20">
        
        {/* Hero Section */}
        <header className="flex sm:flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white dark:bg-slate-900 p-8 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 -mt-10 -mr-10 size-40 bg-blue-500/5 rounded-full blur-3xl group-hover:bg-blue-500/10 transition-colors" />
          
          <div className="space-y-2 relative z-10">
            <div className="flex items-center gap-3">
              <div className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-[#1a57db] rounded-full text-sm font-bold uppercase flex items-center gap-2">
                <Sparkles size={12} />
                Beta Preview
              </div>
              <span className="text-slate-400 text-md font-semibold uppercase">{user?.name || "Student"}'s Academy</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-slate-900 dark:text-white">
              Academic <span className="text-[#1a57db]">Planner</span>
            </h1>
            <p className="text-md text-slate-500 font-medium max-w-xl">
              Design your routine, track your mastery streaks, and maintain deep focus for your upcoming OPSC exams.
            </p>
          </div>

          <div className="flex items-center gap-3 relative z-10">
            <button 
              onClick={() => navigate('/user/dashboard')}
              className="px-6 py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl text-md font-bold flex items-center gap-2 transition-all"
            >
              <LayoutDashboard size={18} />
              Dashboard
            </button>
            <button className="px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl hover:scale-110 transition-all shadow-xs">
              <Settings size={20} className="text-slate-400" />
            </button>
          </div>
        </header>

        <div className="grid sm:grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left Column: Routine & Metrics (4/12) */}
          <section className="lg:col-span-4 space-y-8">
            <GrowthMetrics 
              level={stats.level}
              xp={stats.xpInLevel}
              totalXp={stats.xp}
              streak={stats.currentStreak}
            />
            
          </section>
         <section className=' lg:col-span-8'>
         <DailyRoutine habits={habits} onRefresh={handleRefresh} />
         </section>
          {/* Center Column: Mastery Tracker (8/12) */}
          <section className="lg:col-span-12 space-y-8">
            <div className="flex flex-col md:flex-row gap-8">
               <div className="flex-1">
                  <TrackerGrid 
                    initialHabits={habits} 
                    initialProgress={progress} 
                    onToggle={handleToggle}
                    onRefresh={handleRefresh}
                    isLoading={loading}
                  />
               </div>
               <div className="w-full md:w-80 shrink-0">
                  <FocusTimer />
                  
                  {/* Quick Reminders Box */}
                  <div className="mt-8 bg-linear-to-br from-indigo-500 to-blue-600 p-8 rounded-[2.5rem] text-white shadow-xl shadow-blue-500/20 relative overflow-hidden group">
                    <div className="absolute bottom-0 right-0 -mb-4 -mr-4 p-4 opacity-10 group-hover:scale-110 transition-transform">
                        <GraduationCap size={120} />
                    </div>
                    <div className="space-y-4 relative z-10">
                        <h4 className="text-lg font-black tracking-tight flex items-center gap-2">
                             <Calendar size={20} />
                             Exam Countdown
                        </h4>
                        <div className="space-y-2">
                            <div className="flex justify-between text-xs font-bold text-white/70 uppercase">
                                <span>OPSC Prelims</span>
                                <span>42 Days Left</span>
                            </div>
                            <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                                <div className="h-full bg-white w-2/3 rounded-full" />
                            </div>
                        </div>
                        <p className="text-[10px] text-blue-100 font-bold leading-relaxed">
                            "Success is the sum of small efforts, repeated day in and day out."
                        </p>
                    </div>
                  </div>
               </div>
            </div>
          </section>

        </div>
      </main>
    </div>
  );
}