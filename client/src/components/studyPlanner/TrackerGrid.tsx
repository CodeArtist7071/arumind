import { Pen, Trash, Star, Zap, Infinity, Search, Filter, Plus, Flame, X, CheckSquare } from "lucide-react";
import { useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import WeeklyProgress from "./WeeklyProgress";
import { supabase } from "../../utils/supabase";
import { useSelector } from "react-redux";
import type { RootState } from "../../store";
import MasterySelector from "./MasterySelector";
import { useParams } from "react-router";
import WeeklyPieChart from "./WeeklyPieChart";

type Priority = 'HIGH' | 'MEDIUM' | 'LOW';
type Category = 'theory' | 'mcq' | 'revision' | 'mock';

export interface Habit {
  id: string;
  name: string;
  priority: Priority;
  category: Category;
  start_time?: string;
  end_time?: string;
  is_mastery?: boolean;
  chapter_id?: string;
}

type FormValues = {
  habit: string;
  priority: Priority;
  category: Category;
  start_time: string;
  end_time: string;
};

interface TrackerGridProps {
  initialHabits?: Habit[];
  initialProgress?: Record<string, boolean[]>;
  onToggle: (id: string, index: number) => void;
  onRefresh: () => void;
  isLoading?: boolean;
}

export default function TrackerGrid({ 
  initialHabits = [], 
  initialProgress = {}, 
  onToggle,
  onRefresh,
  isLoading = false
}: TrackerGridProps) {
  const { eid: examId } = useParams();
  const { user } = useSelector((state: RootState) => state.user);
  const days = Array.from({ length: 30 }, (_, i) => i + 1);
  const { register, handleSubmit, reset, setValue } = useForm<FormValues>({
    defaultValues: {
      priority: 'MEDIUM',
      category: 'theory'
    }
  });

  const [editingHabitId, setEditingHabitId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showSelector, setShowSelector] = useState(false);

  async function onSubmit(data: FormValues) {
    const name = data.habit.trim();
    if (!name) {
      alert("Please enter a task name.");
      return;
    }
    if (!user?.id) {
       alert("Please log in to add tasks.");
       return;
    }

    try {
      if (editingHabitId) {
        const habit = initialHabits.find(h => h.id === editingHabitId);
        if (!habit) return;

        const table = habit.is_mastery ? 'user_mastery' : 'study_habits';
        const { error } = await supabase.from(table).update({
          name: habit.is_mastery ? undefined : name,
          priority: data.priority,
          category: data.category,
          start_time: data.start_time || null,
          end_time: data.end_time || null
        }).eq('id', editingHabitId);

        if (error) throw error;
        setEditingHabitId(null);
      } else {
        const { error } = await supabase.from('study_habits').insert({
          user_id: user.id,
          name,
          priority: data.priority,
          category: data.category,
          start_time: data.start_time || null,
          end_time: data.end_time || null,
          progress: Array(30).fill(false)
        });

        if (error) throw error;
      }
      reset();
      onRefresh(); // Refresh parent data
    } catch (err: any) {
      console.error("Task submission error:", err);
      alert(`Error adding task: ${err.message || "Unknown error"}`);
    }
  }

  async function deleteHabit(id: string) {
    const habit = initialHabits.find(h => h.id === id);
    if (!habit) return;

    try {
      const table = habit.is_mastery ? 'user_mastery' : 'study_habits';
      const { error } = await supabase.from(table).delete().eq('id', id);

      if (error) throw error;
      onRefresh();
    } catch (err: any) {
      alert(`Error deleting task: ${err.message}`);
    }
  }

  async function handleAddMastery(chapter: any) {
    if (!user?.id) return;
    try {
      const { error } = await supabase.from('user_mastery').insert({
        user_id: user.id,
        chapter_id: chapter.id,
        priority: 'MEDIUM',
        progress: Array(30).fill(false)
      });

      if (error) throw error;
      setShowSelector(false);
      onRefresh();
    } catch (err: any) {
      alert(`Error adding mastery: ${err.message}`);
    }
  }

  function editHabit(habit: Habit) {
    setEditingHabitId(habit.id);
    setValue("habit", habit.name);
    setValue("priority", habit.priority);
    setValue("category", habit.category);
    setValue("start_time", habit.start_time || "");
    setValue("end_time", habit.end_time || "");
    window.scrollTo({ top: 300, behavior: 'smooth' });
  }

  const filteredHabits = initialHabits.filter(h => 
    h.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  function calculateDetailedProgress() {
    const weeks = [
      { completed: 0, total: 0 },
      { completed: 0, total: 0 },
      { completed: 0, total: 0 },
      { completed: 0, total: 0 },
    ];
    let monthlyCompleted = 0;
    let monthlyTotal = initialHabits.length * 30;

    initialHabits.forEach((habit) => {
      initialProgress[habit.id]?.forEach((done, i) => {
        const weekIdx = Math.floor(i / 7);
        if (weekIdx < 4) {
          weeks[weekIdx].total++;
          if (done) {
            weeks[weekIdx].completed++;
            monthlyCompleted++;
          }
        }
      });
    });

    return { weeks, monthlyCompleted, monthlyTotal };
  }

  const { weeks: weekDetails, monthlyCompleted, monthlyTotal } = calculateDetailedProgress();
  const weekPercents = weekDetails.map(w => w.total === 0 ? 0 : Math.round((w.completed / w.total) * 100));

  const categoryDistribution = useMemo(() => {
    const counts: Record<string, number> = { theory: 0, mcq: 0, revision: 0, mock: 0 };
    initialHabits.forEach(h => {
      const cat = (h.is_mastery ? 'theory' : h.category).toLowerCase();
      if (counts[cat] !== undefined) counts[cat]++;
    });
    return Object.entries(counts).map(([name, value]) => ({ name: name.toUpperCase(), value }));
  }, [initialHabits]);

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-20 flex flex-col items-center justify-center gap-4">
         <div className="size-10 border-4 border-[#1a57db] border-t-transparent rounded-full animate-spin" />
         <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Building your Mastery Grid...</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden flex flex-col">
      {/* Search & Add Header */}
      <div className="p-8 border-b border-slate-100 dark:border-slate-800 space-y-6">
        <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="size-12 bg-linear-to-br from-[#1a57db] to-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
              <Infinity size={24} />
            </div>
            <div>
              <h3 className="text-2xl font-extrabold">30-Day Mastery Grid</h3>
              <p className="text-sm text-slate-400 font-bold">Consistency is the key to OPSC success</p>
            </div>
          </div>
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
               <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
               <input 
                type="text" 
                placeholder="Search habits..."
                className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-xs outline-none focus:ring-2 ring-blue-500/30 transition-all font-medium"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
               />
            </div>
            <button 
              onClick={() => setShowSelector(true)}
              className="px-4 py-3 bg-emerald-500 text-white rounded-xl text-xs font-black uppercase tracking-tight flex items-center gap-2 shadow-lg shadow-emerald-500/20 hover:scale-105 transition-all group"
            >
              <CheckSquare size={14} className="group-hover:rotate-12 transition-transform" />
              Add Mastery
            </button>
          </div>
        </div>

        <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-4xl border border-slate-100 dark:border-slate-800">
           <p className="text-xs font-medium uppercase text-slate-400 tracking-widest mb-4 ml-1 flex items-center gap-2">
              <Plus size={12} />
              Quick Task Planner
           </p>
           <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 flex flex-col md:flex-row gap-2">
                <input
                  {...register("habit")}
                  placeholder="Task Name (e.g. Solve PYQs, Revise Odisha GK)"
                  className="flex-3 px-5 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm focus:ring-2 ring-[#1a57db]/30 outline-none font-medium transition-all"
                />
                <div className="flex-1 flex gap-2">
                  <div className="flex-1 group">
                    <label className="text-xs font-black uppercase text-slate-400 mb-1 ml-1 block">Start</label>
                    <input 
                      type="time" 
                      {...register("start_time")}
                      className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:ring-2 ring-blue-500/20"
                    />
                  </div>
                  <div className="flex-1 group">
                    <label className="text-xs font-black uppercase text-slate-400 mb-1 ml-1 block">End</label>
                    <input 
                      type="time" 
                      {...register("end_time")}
                      className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:ring-2 ring-blue-500/20"
                    />
                  </div>
                </div>
                <button 
                  type="submit"
                  className="hidden md:flex px-6 py-3 bg-[#1a57db] text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-blue-500/20 hover:scale-[1.02] active:scale-95 transition-all items-center justify-center gap-2"
                >
                  {editingHabitId ? <Pen size={14} /> : <Plus size={16} />}
                  {editingHabitId ? "Update" : "Add Task"}
                </button>
              </div>
              
              <div className="flex gap-2 shrink-0">
                <select 
                  {...register("priority")} 
                  className="w-28 px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md text-xs font-bold uppercase tracking-tight outline-none focus:ring-2 ring-blue-500/20"
                >
                  <option value="HIGH">🔥 High</option>
                  <option value="MEDIUM">⚡ Med</option>
                  <option value="LOW">💤 Low</option>
                </select>
                <select 
                  {...register("category")} 
                  className="w-32 px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md text-xs font-bold uppercase tracking-tight outline-none focus:ring-2 ring-blue-500/20"
                >
                  <option value="theory">Theory</option>
                  <option value="revision">Revision</option>
                  <option value="mcq">MCQ</option>
                  <option value="mock">Mock</option>
                </select>
              </div>

              <button 
                type="submit"
                className="md:hidden w-full px-6 py-4 bg-[#1a57db] text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-lg shadow-blue-500/20"
              >
                {editingHabitId ? "Update Task" : "Add Task"}
              </button>
           </form>
        </div>
      </div>

      {/* TABLE */}
      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
              <th className="sticky left-0 z-20 bg-slate-50 dark:bg-slate-800 px-8 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 min-w-[300px]">
                Habit / Mastery Goal
              </th>
              {days.map((day) => (
                <th key={day} className="px-3 py-4 text-center text-[10px] font-black tracking-tighter text-slate-400 min-w-[45px]">
                  DAY {" "}{day}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
            {filteredHabits.map((habit) => (
              <tr key={habit.id} className="group hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                <td className="sticky left-0 z-10 bg-white dark:bg-slate-900 px-8 py-5 border-r border-slate-50 dark:border-slate-800 group-hover:bg-slate-50 dark:group-hover:bg-slate-800 transition-colors">
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-900 dark:text-white text-md line-clamp-1">{habit.name}</span>
                        {(habit.start_time || habit.end_time) && (
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-xs font-bold uppercase text-[#1a57db]/70 tracking-wide bg-blue-50 dark:bg-blue-900/20 px-1.5 py-0.5 rounded-md">
                              {habit.start_time?.slice(0, 5) || "??:??"} — {habit.end_time?.slice(0, 5) || "??:??"}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => editHabit(habit)} className="p-1.5 text-slate-400 hover:text-[#1a57db] hover:bg-white dark:hover:bg-slate-700 rounded-lg shadow-xs transition-all"><Pen size={13} /></button>
                        <button onClick={() => deleteHabit(habit.id)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-white dark:hover:bg-slate-700 rounded-lg shadow-xs transition-all"><Trash size={13} /></button>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-wide ${
                        habit.priority === 'HIGH' ? 'bg-red-50 text-red-600 dark:bg-red-900/30' :
                        habit.priority === 'MEDIUM' ? 'bg-amber-50 text-amber-600 dark:bg-amber-900/30' :
                        'bg-slate-50 text-slate-600 dark:bg-slate-700'
                      }`}>
                        {habit.priority}
                      </span>
                      <span className={`text-[10px] font-bold uppercase ${habit.is_mastery ? 'text-[#1a57db]' : 'text-slate-400'}`}>
                        {habit.is_mastery ? 'MASTERED SYLLABUS' : habit.category}
                      </span>
                    </div>
                  </div>
                </td>
                {days.map((_, i) => (
                  <td key={i} className="text-center p-0">
                    <label className="flex items-center justify-center size-full py-5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={initialProgress[habit.id]?.[i] || false}
                        onChange={() => onToggle(habit.id, i)}
                        className="peer hidden"
                      />
                      <div className={`size-5 rounded-md border-2 transition-all flex items-center justify-center ${
                        initialProgress[habit.id]?.[i] 
                          ? 'bg-[#1a57db] border-[#1a57db] shadow-md shadow-blue-500/20' 
                          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900'
                      }`}>
                         {initialProgress[habit.id]?.[i] && <Flame size={12} fill="white" className="text-white" />}
                      </div>
                    </label>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="p-8 bg-slate-50 dark:bg-slate-800/30 border-t border-slate-100 dark:border-slate-800">
         <div className="grid sm:grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-full">
              <WeeklyProgress 
                weekPercents={weekPercents} 
                weekDetails={weekDetails}
                monthlyCompleted={monthlyCompleted}
                monthlyTotal={monthlyTotal}
                totalHabits={initialHabits.length}
              />
            </div>
            <div className="lg:col-span-4">
              <WeeklyPieChart data={categoryDistribution} />
            </div>
         </div>
      </div>

      {/* Mastery Selector Modal */}
      {showSelector && (
        <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm" onClick={() => setShowSelector(false)} />
          <div className="relative bg-white dark:bg-slate-900 w-full max-w-2xl rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in duration-300">
             <button 
              onClick={() => setShowSelector(false)}
              className="absolute top-6 right-6 p-2 bg-slate-100 dark:bg-slate-800 rounded-full hover:rotate-90 transition-all z-20"
             >
                <X size={16} />
             </button>
             <MasterySelector 
              examId={examId || ""} 
              onAdd={handleAddMastery}
              existingIds={initialHabits.filter(h => h.is_mastery).map(h => h.chapter_id!)}
             />
          </div>
        </div>
      )}
    </div>
  );
}