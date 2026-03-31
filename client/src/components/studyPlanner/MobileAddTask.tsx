import React, { useEffect, useState, useMemo } from "react";
import { 
  Loader, 
  X, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Tag, 
  Zap, 
  Calendar,
  ChevronLeft,
  ArrowRight
} from "lucide-react";
import { supabase } from "../../utils/supabase";
import { useDispatch, useSelector } from "react-redux";
import type { AppDispatch, RootState } from "../../store";
import { updateUserLocally } from "../../slice/userSlice";
import { useForm, Controller } from "react-hook-form";
import { useGoogleCalendar } from "../../utils/useGoogleCalender";
import { getChaptersByExamID } from "../../services/examService";
import type { Habit } from "./TrackerGrid";

interface MobileAddTaskProps {
  isOpen: boolean;
  onClose: () => void;
  initialHabits: Habit[];
  examId: string;
  title?: string;
  viewMonth: number;
  viewYear: number;
  editingHabitId?: string;
  onRefresh?: () => void;
  initialProgress?: Record<string, boolean[]>;
  onRequestConnection?: () => void;
  initialUseChapter?: boolean;
}

type ToastType = "success" | "error" | "info" | "loading";
interface Toast { type: ToastType; message: string; }

type FormValues = {
  habit: string;
  priority: "HIGH" | "MEDIUM" | "LOW";
  start_time: string;
  end_time: string;
  chapter_id?: string;
  date?: string; 
  is_recurring: boolean;
  syncToCalendar: boolean;
};

// ── Shared Logic (Replicated for Stability) ──────────────────────────────────
const parseRoutineWithAI = async (text: string): Promise<Partial<FormValues>> => {
  const key = import.meta.env.VITE_GEMINI_API_KEY;
  if (!key) throw new Error("No Gemini API key found");
  const res = await fetch(`https://aiplatform.googleapis.com/v1/publishers/google/models/gemini-2.0-flash:generateContent?key=${key}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: `Extract routine details from this text and return ONLY valid JSON.\nText: "${text}"\nShape: {"habit": "name", "priority": "HIGH|MEDIUM|LOW", "start_time": "HH:MM", "end_time": "HH:MM"}` }] }],
      generationConfig: { temperature: 0.1, maxOutputTokens: 150 },
    }),
  });
  if (!res.ok) throw new Error(`Gemini error ${res.status}`);
  const data = await res.json();
  const raw = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
  return JSON.parse(raw.replace(/```json|```/g, "").trim());
};

const PriorityBadge = ({ priority, selected, onSelect }: { priority: "HIGH" | "MEDIUM" | "LOW", selected: boolean, onSelect: () => void }) => {
  const styles = {
    HIGH:   "bg-red-50 text-red-700 border-red-100",
    MEDIUM: "bg-amber-50 text-amber-700 border-amber-100",
    LOW:    "bg-slate-50 text-slate-600 border-slate-100"
  };
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex-1 flex flex-col items-center gap-1 p-3 rounded-2xl border transition-all ${selected ? "ring-2 ring-primary border-primary bg-primary/5" : styles[priority]}`}
    >
      <span className="text-[10px] font-black uppercase tracking-widest">{priority}</span>
    </button>
  );
};

const getLocalDateString = (d: Date) => {
  const year = d.getFullYear();
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const day = d.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const MobileAddTask: React.FC<MobileAddTaskProps> = ({
  isOpen,
  onClose,
  initialHabits,
  viewMonth,
  examId,
  viewYear,
  editingHabitId,
  title,
  onRefresh,
  initialProgress: incomingProgress,
  onRequestConnection,
  initialUseChapter,
}) => {
  const { user, profile } = useSelector((state: RootState) => state.user || { user: null, profile: null });
  const dispatch = useDispatch<AppDispatch>();
  const { connected, addEvent, editEvent } = useGoogleCalendar();

  const [toast, setToast] = useState<Toast | null>(null);
  const [aiInput, setAiInput] = useState("");
  const [aiParsing, setAiParsing] = useState(false);
  const [chapters, setChapters] = useState<any[]>([]);
  const [useChapter, setUseChapter] = useState(false);

  const { reset, register, handleSubmit, setValue, watch, control, formState: { isSubmitting, errors } } = useForm<FormValues>({
    defaultValues: { priority: "MEDIUM", start_time: "09:00", end_time: "10:00", is_recurring: true, syncToCalendar: connected },
  });

  const priority = watch("priority");
  const isRecurring = watch("is_recurring");

  useEffect(() => {
    if (examId && isOpen) {
      getChaptersByExamID(examId).then((data) => setChapters(data || []));
    }
  }, [examId, isOpen]);

  useEffect(() => {
    if (editingHabitId && isOpen) {
      const h = initialHabits.find(x => x.id === editingHabitId);
      if (h) {
        setValue("habit", h.name);
        setValue("priority", h.priority as any);
        setValue("start_time", h.start_time || "09:00");
        setValue("end_time", h.end_time || "10:00");
        setValue("is_recurring", (h as any).is_recurring !== false);
        if (h.chapter_id) { setUseChapter(true); setValue("chapter_id", h.chapter_id); }
      }
    } else if (isOpen) {
      const now = new Date();
      const isCurrentView = now.getMonth() + 1 === viewMonth && now.getFullYear() === viewYear;
      const initialDay = isCurrentView ? now.getDate() : 1;

      reset({ 
        priority: "MEDIUM", 
        is_recurring: true, 
        syncToCalendar: connected,
        date: getLocalDateString(new Date(viewYear, viewMonth - 1, initialDay))
      });
      setUseChapter(initialUseChapter || false);
    }
  }, [editingHabitId, isOpen, initialHabits, reset, setValue, connected, viewYear, viewMonth, initialUseChapter]);

  const onSubmit = async (data: FormValues) => {
    let name = data.habit?.trim() || "";
    if (useChapter && data.chapter_id) {
       const ch = chapters.find(c => c.id === data.chapter_id);
       if (ch) name = ch.name;
    }
    if (!user?.id || !name) { setToast({ type: "error", message: "Name or Chapter is required" }); return; }

    setToast({ type: "loading", message: "Updating Mother Nature..." });
    try {
      if (editingHabitId) {
        const habit = initialHabits.find(h => h.id === editingHabitId);
        if (!habit) return;
        const table = habit.is_mastery ? "user_mastery" : "study_habits";
        await supabase.from(table).update({ 
          name: habit.is_mastery ? undefined : name, 
          priority: data.priority, 
          start_time: data.start_time, 
          end_time: data.end_time,
          chapter_id: useChapter ? data.chapter_id : null,
          is_recurring: data.is_recurring,
        }).eq("id", editingHabitId);
      } else {
        const table = useChapter ? "user_mastery" : "study_habits";
        const habitData: any = { 
          user_id: user.id, priority: data.priority, start_time: data.start_time, end_time: data.end_time, 
          category: "theory", progress: Array(31).fill(false), month: viewMonth, year: viewYear, exam_id: examId,
          chapter_id: useChapter ? data.chapter_id : null, is_recurring: data.is_recurring,
        };
        if (!useChapter) habitData.name = name;
        const scheduledDate = data.date ? new Date(data.date) : new Date();
        if (scheduledDate.getMonth() + 1 === viewMonth) habitData.progress[scheduledDate.getDate() - 1] = true;
        await supabase.from(table).insert(habitData);
      }
      setToast({ type: "success", message: "Momentum manifested!" });
      setTimeout(() => { onClose(); onRefresh?.(); }, 1200);
    } catch (e) {
      setToast({ type: "error", message: "Botanical glitch. Try again." });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-100 bg-surface flex flex-col animate-in slide-in-from-bottom duration-500 ease-botanical overflow-y-auto">
      {/* ── Mobile Header ────────────────────────────────────────────────── */}
      <header className="px-6 pt-10 pb-6 flex items-center justify-between sticky top-0 bg-surface/80 backdrop-blur-3xl z-10">
        <button onClick={onClose} className="size-10 rounded-full bg-on-surface/5 flex items-center justify-center">
          <ChevronLeft className="size-5" />
        </button>
        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Add Ritual</span>
        <div className="size-10" />
      </header>

      <main className="px-6 pb-20 space-y-10">
        <div className="space-y-2">
          <h2 className="text-4xl font-black tracking-tighter text-on-surface leading-none">
            {editingHabitId ? "Refine Momentum" : "Manifest Ritual"}
          </h2>
          <p className="text-sm font-medium text-on-surface-variant opacity-60">
            {useChapter ? "Scheduling from syllabus mastery." : "Your daily botanical routines."}
          </p>
        </div>

        {toast && (
          <div className={`p-4 rounded-3xl border flex items-center gap-3 animate-in fade-in slide-in-from-top-2 ${
            toast.type === 'success' ? 'bg-green-50 border-green-100 text-green-800' : 'bg-red-50 border-red-100 text-red-800'
          }`}>
            {toast.type === 'loading' ? <Loader className="animate-spin" size={16} /> : <Zap size={16} />}
            <span className="text-xs font-bold">{toast.message}</span>
          </div>
        )}

        {/* ── AI Action Center ─────────────────────────────────────────────── */}
        <section className="bg-primary/5 rounded-[2.5rem] p-6 border border-primary/10 space-y-4">
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-primary" />
            <span className="text-[10px] font-black uppercase tracking-widest text-primary">AI Natural Language</span>
          </div>
          <div className="flex flex-col gap-3">
            <textarea 
              value={aiInput}
              onChange={(e) => setAiInput(e.target.value)}
              placeholder="e.g. Wake up at 6am, solve physics questions at 12pm..."
              className="w-full h-24 bg-surface rounded-3xl p-4 text-sm font-medium border-none outline-none focus:ring-2 ring-primary/20 transition-all placeholder:opacity-30"
            />
            <button 
              onClick={async () => {
                setAiParsing(true);
                try {
                  const res = await parseRoutineWithAI(aiInput);
                  if (res.habit) setValue("habit", res.habit);
                  if (res.priority) setValue("priority", res.priority as any);
                  if (res.start_time) setValue("start_time", res.start_time);
                  if (res.end_time) setValue("end_time", res.end_time);
                  setToast({ type: "success", message: "AI filled the fields!" });
                } catch (e) {
                   setToast({ type: "error", message: "AI failed to parse." });
                } finally { setAiParsing(false); }
              }}
              disabled={aiParsing || !aiInput.trim()}
              className="w-full py-4 bg-primary text-white rounded-2xl font-black uppercase text-xs tracking-widest flex items-center justify-center gap-2"
            >
              {aiParsing ? <Loader className="animate-spin" size={14} /> : <Sparkles size={14} />}
              Manifest AI Parse
            </button>
          </div>
        </section>

        {/* ── Manual Manifest Form ─────────────────────────────────────────── */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          <div className="flex bg-surface-container-low p-1.5 rounded-2xl">
            <button type="button" onClick={() => setValue("is_recurring", true)} className={`flex-1 py-3 text-[10px] font-black uppercase rounded-xl transition-all ${isRecurring ? "bg-surface text-primary shadow-ambient" : "text-on-surface-variant opacity-40"}`}>Recurring</button>
            <button type="button" onClick={() => setValue("is_recurring", false)} className={`flex-1 py-3 text-[10px] font-black uppercase rounded-xl transition-all ${!isRecurring ? "bg-surface text-primary shadow-ambient" : "text-on-surface-variant opacity-40"}`}>Today Only</button>
          </div>

          <div className="space-y-3">
             <label className="text-[10px] font-black uppercase tracking-widest text-on-surface opacity-40 ml-1">Manifest Type</label>
             <div className="flex bg-surface-container-low p-1.5 rounded-2xl">
               <button type="button" onClick={() => setUseChapter(false)} className={`flex-1 py-3 text-[10px] font-black uppercase rounded-xl transition-all ${!useChapter ? "bg-surface text-primary shadow-ambient" : "text-on-surface-variant opacity-40"}`}>Manual Ritual</button>
               <button type="button" onClick={() => setUseChapter(true)} className={`flex-1 py-3 text-[10px] font-black uppercase rounded-xl transition-all ${useChapter ? "bg-surface text-primary shadow-ambient" : "text-on-surface-variant opacity-40"}`}>Syllabus Mastery</button>
             </div>
          </div>

          <div className="space-y-3">
            <label className="text-[10px] font-black uppercase tracking-widest text-on-surface opacity-40 ml-1">{useChapter ? "Chapter Selection" : "Ritual Name"}</label>
            {useChapter ? (
              <select {...register("chapter_id", { required: useChapter })} className="w-full py-5 px-6 bg-surface-container-low rounded-3xl text-sm font-black border-none outline-none focus:ring-2 ring-primary/20 appearance-none">
                <option value="">Choose your quest...</option>
                {chapters.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            ) : (
              <input {...register("habit", { required: !useChapter })} placeholder="e.g. Botanical Review" className="w-full py-5 px-6 bg-surface-container-low rounded-3xl text-sm font-bold border-none outline-none focus:ring-2 ring-primary/20" />
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div className="space-y-3">
               <label className="text-[10px] font-black uppercase tracking-widest text-on-surface opacity-40 ml-1">Start Ritual</label>
               <input type="time" {...register("start_time")} className="w-full py-5 px-6 bg-surface-container-low rounded-3xl text-sm font-bold border-none outline-none focus:ring-2 ring-primary/20" />
             </div>
             <div className="space-y-3">
               <label className="text-[10px] font-black uppercase tracking-widest text-on-surface opacity-40 ml-1">End Ritual</label>
               <input type="time" {...register("end_time")} className="w-full py-5 px-6 bg-surface-container-low rounded-3xl text-sm font-bold border-none outline-none focus:ring-2 ring-primary/20" />
             </div>
          </div>

          <div className="space-y-4">
             <label className="text-[10px] font-black uppercase tracking-widest text-on-surface opacity-40 ml-1">Priority Hierarchy</label>
             <div className="flex gap-3">
               {(["HIGH", "MEDIUM", "LOW"] as const).map(p => (
                 <PriorityBadge key={p} priority={p} selected={priority === p} onSelect={() => setValue("priority", p)} />
               ))}
             </div>
          </div>

          {connected && (
            <div className={`p-6 rounded-[2.5rem] flex items-center justify-between border transition-all ${watch("syncToCalendar") ? "bg-primary/5 border-primary/20" : "bg-surface-container-low border-transparent"}`}>
              <div className="flex items-center gap-3">
                <Calendar className={`size-5 ${watch("syncToCalendar") ? "text-primary" : "text-on-surface-variant opactiy-40"}`} />
                <div>
                   <p className="text-xs font-black">Google Sync</p>
                   <p className="text-[10px] font-medium opacity-40">Persistence mapping</p>
                </div>
              </div>
              <input type="checkbox" {...register("syncToCalendar")} className="size-6 rounded-lg text-primary focus:ring-primary/20 border-outline-variant" />
            </div>
          )}

          <button 
            type="submit" 
            disabled={isSubmitting}
            className="w-full py-6 bg-primary text-white rounded-4xl font-black uppercase text-sm tracking-[0.2em] shadow-ambient-lg shadow-primary/20 flex items-center justify-center gap-3 transition-all active:scale-95"
          >
            {isSubmitting ? <Loader className="animate-spin" /> : <ArrowRight size={18} />}
            Manifest Ritual
          </button>
        </form>
      </main>
    </div>
  );
};
