import { Loader, X, Sparkles, CheckCircle2, AlertCircle, Tag, Calendar, ChevronLeft } from "lucide-react";
import { supabase } from "../../utils/supabase";
import { useDispatch, useSelector } from "react-redux";
import type { AppDispatch, RootState } from "../../store";
import { updateUserLocally } from "../../slice/userSlice";
import { useForm, Controller } from "react-hook-form";
import { useGoogleCalendar } from "../../utils/useGoogleCalender";
import { getChaptersByExamID } from "../../services/examService";
import { useEffect, useState } from "react";
import { TimePicker } from "./TimePicker";
import { getLocalDateString } from "../../utils/getLocaleDateString";
import { parseRoutineWithAI } from "../../utils/parseRoutineWithAI";
import { useNavigate, useParams, useOutletContext } from "react-router";
import type { Habit } from "../../pages/userPanel/StudyPlanner";

// Define the context shape received from StudyPlanner
interface PlannerContext {
  viewMonth: number;
  viewYear: number;
  initialHabits: Habit[];
  examId: string;
  onRefresh: () => void;
  onRequestConnection: () => void;
  initialProgress: Record<string, boolean[]>;
}

type ToastType = "success" | "error" | "info" | "loading";

interface Toast {
  type: ToastType;
  message: string;
}

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

// ── Toast component ────────────────────────────────────────────────────────
const ToastBanner = ({ toast }: { toast: Toast | null }) => {
  if (!toast) return null;

  const styles: Record<ToastType, { bg: string; text: string; border: string; icon: React.ReactNode }> = {
    success: { bg: "bg-green-50", text: "text-green-700", border: "border-green-200", icon: <CheckCircle2 size={14} className="text-green-600 shrink-0" /> },
    error: { bg: "bg-red-50", text: "text-red-700", border: "border-red-200", icon: <AlertCircle size={14} className="text-red-600 shrink-0" /> },
    info: { bg: "bg-primary-container/10", text: "text-primary", border: "border-primary/20", icon: <Sparkles size={14} className="text-primary shrink-0" /> },
    loading: { bg: "bg-surface-container-low", text: "text-on-surface-variant/60", border: "border-on-surface/5", icon: <Loader size={14} className="animate-spin text-on-surface-variant shrink-0" /> },
  };

  const s = styles[toast.type];
  return (
    <div className={`flex items-center gap-2 px-4 py-3 rounded-2xl border text-[10px] font-black uppercase tracking-widest ${s.bg} ${s.text} ${s.border} transition-all duration-300 animate-reveal`}>
      {s.icon}
      <span>{toast.message}</span>
    </div>
  );
};

const priorityMeta = {
  HIGH:   { bg: "bg-red-100",    text: "text-red-700",    dot: "bg-red-500"    },
  MEDIUM: { bg: "bg-amber-100",  text: "text-amber-700",  dot: "bg-amber-500"  },
  LOW:    { bg: "bg-surface-container-high",  text: "text-slate-600",  dot: "bg-slate-400"  },
};

export const AddRoutine = () => {
  const { habitId: editingHabitId } = useParams();
  const navigate = useNavigate();
  const context = useOutletContext<PlannerContext>();
  
  // Use context or defaults if for some reason context is missing (though it shouldn't be)
  const { 
    viewMonth, 
    viewYear, 
    initialHabits, 
    examId, 
    onRefresh, 
    onRequestConnection, 
    initialProgress: incomingProgress 
  } = context || {
    viewMonth: new Date().getMonth() + 1,
    viewYear: new Date().getFullYear(),
    initialHabits: [],
    examId: "",
    onRefresh: () => {},
    onRequestConnection: () => {},
    initialProgress: {}
  };

  const { user, profile } = useSelector((state: RootState) => state.user || { user: null, profile: null });
  const dispatch = useDispatch<AppDispatch>();
  const { connected, addEvent, editEvent } = useGoogleCalendar();

  const [toast, setToast] = useState<Toast | null>(null);
  const [aiInput, setAiInput] = useState("");
  const [aiParsing, setAiParsing] = useState(false);
  const [aiFilled, setAiFilled] = useState(false);

  const { reset, register, handleSubmit, setValue, watch, control, formState: { isSubmitting, errors } } = useForm<FormValues>({
    defaultValues: { priority: "MEDIUM", start_time: "09:00", end_time: "10:00", is_recurring: true, syncToCalendar: connected },
  });

  const priority = watch("priority");
  const isRecurring = watch("is_recurring");
  const dateValue = watch("date");

  const showToast = (type: ToastType, message: string, duration = 3000) => {
    setToast({ type, message });
    if (type !== "loading") setTimeout(() => setToast(null), duration);
  };

  const [chapters, setChapters] = useState<any[]>([]);
  const [useChapter, setUseChapter] = useState(false);
  const unlockPastDays = false;

  useEffect(() => {
    if (examId) {
      getChaptersByExamID(examId).then((data) => { setChapters(data || []); });
    }
  }, [examId]);

  useEffect(() => {
    if (editingHabitId) {
      const h = initialHabits.find(x => x.id === editingHabitId);
      if (h) {
        setValue("habit", h.name);
        setValue("priority", h.priority as any);
        setValue("start_time", h.start_time || "09:00");
        setValue("end_time", h.end_time || "10:00");
        setValue("is_recurring", (h as any).is_recurring !== false);
        if (h.chapter_id) {
          setValue("chapter_id", h.chapter_id);
          setUseChapter(true);
          const prog = incomingProgress?.[h.id];
          if (prog) {
            const dayIdx = prog.findIndex((x: boolean) => x === true);
            if (dayIdx >= 0) {
              const d = new Date(viewYear, viewMonth - 1, dayIdx + 1);
              setValue("date", getLocalDateString(d));
            }
          }
        }
      }
    } else {
      const now = new Date();
      const isCurrentView = now.getMonth() + 1 === viewMonth && now.getFullYear() === viewYear;
      const initialDay = isCurrentView ? now.getDate() : 1;

      reset({ 
        priority: "MEDIUM", 
        is_recurring: true, 
        syncToCalendar: connected,
        date: getLocalDateString(new Date(viewYear, viewMonth - 1, initialDay))
      });
    }
  }, [editingHabitId, initialHabits, reset, setValue, connected, viewYear, viewMonth, incomingProgress]);

  const handleAIParse = async () => {
    if (!aiInput.trim()) { showToast("error", "Please describe your routine first"); return; }
    setAiParsing(true);
    setAiFilled(false);
    showToast("loading", "AI is reading your routine...");
    try {
      const result = await parseRoutineWithAI(aiInput);
      if (result.habit)      setValue("habit",      result.habit);
      if (result.priority)   setValue("priority", result.priority as any);
      if (result.start_time) setValue("start_time", result.start_time);
      if (result.end_time)   setValue("end_time",   result.end_time);
      setAiFilled(true);
      showToast("success", "Fields auto-filled from your description!");
    } catch { showToast("error", "AI unavailable — please fill fields manually");
    } finally { setAiParsing(false); }
  };

  async function onSubmit(data: FormValues) {
    let name = data.habit?.trim() || "";
    if (useChapter && data.chapter_id) {
      const ch = chapters.find(c => c.id === data.chapter_id);
      if (ch) name = ch.name;
    }
    if (!user?.id || !name) { showToast("error", "Routine name or chapter is required"); return; }

    showToast("loading", editingHabitId ? "Updating routine..." : "Adding routine...");

    try {
      if (editingHabitId) {
        const habit = initialHabits.find((h) => h.id === editingHabitId);
        if (!habit) return;
        const table = habit.is_mastery ? "user_mastery" : "study_habits";
        const updateData: any = { priority: data.priority, start_time: data.start_time, end_time: data.end_time, chapter_id: useChapter ? data.chapter_id : null, is_recurring: data.is_recurring };
        if (!habit.is_mastery) updateData.name = name;
        await supabase.from(table).update(updateData).eq("id", editingHabitId);

        if (data.date) {
           const newDate = new Date(data.date);
           const newDayIdx = newDate.getDate() - 1;
           const newMonth = newDate.getMonth() + 1;
           const newYear = newDate.getFullYear();
           const newProgress = Array(31).fill(false);
           if (!data.is_recurring || habit.is_mastery) newProgress[newDayIdx] = true;
           await supabase.from(table).update({ progress: newProgress, month: newMonth, year: newYear }).eq("id", editingHabitId);
        }

        if (connected && data.syncToCalendar) {
          const { data: prof } = await supabase.from("profiles").select("google_calendar_event_ids").eq("id", user.id).single();
          const gcId = prof?.google_calendar_event_ids?.[editingHabitId];
          if (gcId) {
            const execDate = (habit.is_mastery || !data.is_recurring) && data.date ? data.date : new Date().toISOString().split('T')[0];
            const [sh, sm] = data.start_time.split(':').map(Number);
            const [eh, em] = data.end_time.split(':').map(Number);
            const startDT = new Date(execDate); startDT.setHours(sh, sm, 0, 0);
            const endDT = new Date(execDate); endDT.setHours(eh, em, 0, 0);
            await editEvent(gcId, {
              summary: habit.is_mastery ? `Test: ${name}` : name,
              description: habit.is_mastery ? `Scheduled Test for ${name}. Odisha Exam Prep.` : `OPSC Study - ${data.priority} priority`,
              start: { dateTime: startDT.toISOString(), timeZone: "Asia/Kolkata" },
              end: { dateTime: endDT.toISOString(), timeZone: "Asia/Kolkata" },
            });
            showToast("info", "Google Calendar event updated too!");
          }
        }
        showToast("success", `"${name}" updated successfully!`);
      } else {
        if (!profile?.planner_start_date) {
          await supabase.from("profiles").update({ planner_start_date: new Date().toISOString() }).eq("id", user.id);
          dispatch(updateUserLocally({ planner_start_date: new Date().toISOString() }));
        }
        const habitData: any = { user_id: user.id, priority: data.priority, start_time: data.start_time, end_time: data.end_time, progress: Array(31).fill(false), month: viewMonth, year: viewYear, exam_id: examId, chapter_id: useChapter ? data.chapter_id : null, is_recurring: data.is_recurring };
        if (!useChapter) habitData.name = name;
        const scheduledDate = data.date ? new Date(data.date) : new Date();
        const isTargetMonth = scheduledDate.getMonth() + 1 === viewMonth && scheduledDate.getFullYear() === viewYear;
        if (isTargetMonth) habitData.progress[scheduledDate.getDate() - 1] = true;

        const table = useChapter ? "user_mastery" : "study_habits";
        const { data: newHabit, error } = await supabase.from(table).insert(habitData).select().single();
        if (error) throw error;

        if (connected && data.syncToCalendar && newHabit) {
           const [sh, sm] = data.start_time.split(':').map(Number);
           const [eh, em] = data.end_time.split(':').map(Number);
           const todayStr = new Date().toISOString().split('T')[0];
           const startDT = new Date(todayStr); startDT.setHours(sh, sm, 0, 0);
           const endDT = new Date(todayStr); endDT.setHours(eh, em, 0, 0);
           const event = await addEvent({ summary: name, description: `OPSC Study - ${data.priority} priority`, start: { dateTime: startDT.toISOString(), timeZone: "Asia/Kolkata" }, end: { dateTime: endDT.toISOString(), timeZone: "Asia/Kolkata" } });
           if (event?.id) {
             const newIds = { ...profile?.google_calendar_event_ids, [newHabit.id]: event.id };
             await supabase.from("profiles").update({ google_calendar_event_ids: newIds }).eq("id", user.id);
             dispatch(updateUserLocally({ google_calendar_event_ids: newIds }));
           }
        }
        showToast("success", `"${name}" added to your routine!`);
      }
      reset(); setAiInput(""); setAiFilled(false);
      setTimeout(() => { 
        onRefresh(); 
        navigate(-1); 
      }, 1200);
    } catch (err) { console.error(err); showToast("error", "Something went wrong. Please try again."); }
  }

  return (
    <div className="h-full bg-surface shadow-ambient-lg border-l border-on-surface/5 flex flex-col animate-reveal-right overflow-hidden rounded-[2.5rem]">
      <div className="h-1 w-full bg-linear-to-r from-green-500 via-emerald-400 to-green-600" />
      
      <div className="flex items-center justify-between px-8 pt-6 pb-6">
        <div>
          <h2 className="text-2xl font-black tracking-tighter text-on-surface leading-none">
            {editingHabitId ? "Refine Routine" : "Manifest Ritual"}
          </h2>
          <p className="text-[9px] font-technical uppercase tracking-[0.3em] text-on-surface-variant opacity-40 mt-2">
            {editingHabitId ? "Optimize Patterns" : "Design Persistence"}
          </p>
        </div>
        <button 
          onClick={() => navigate(-1)} 
          className="size-10 rounded-2xl bg-surface-container-high/40 text-on-surface-variant hover:bg-surface-container-highest hover:text-primary transition-all duration-300 flex items-center justify-center group"
        >
          <ChevronLeft className="size-5 group-hover:-translate-x-1 transition-transform" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-8 pb-10 space-y-6 custom-scrollbar scroll-smooth">
        <ToastBanner toast={toast} />

        {/* AI INPUT RITUAL */}
        {!editingHabitId && (
          <div className="bg-surface-container-low border border-on-surface/5 rounded-[2.5rem] p-6 space-y-4 shadow-inner">
            <div className="flex items-center gap-3">
              <div className="size-8 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                <Sparkles size={16} />
              </div>
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">AI Natural Language Sync</span>
              {aiFilled && <span className="ml-auto text-[9px] font-black uppercase tracking-widest text-green-600 flex items-center gap-2 animate-reveal"><CheckCircle2 size={12} /> Sync Complete</span>}
            </div>
            <div className="flex gap-3">
              <input 
                value={aiInput} 
                onChange={(e) => setAiInput(e.target.value)} 
                onKeyDown={(e) => e.key === "Enter" && handleAIParse()} 
                placeholder="e.g. History revision from 2pm to 4pm..." 
                className="flex-1 bg-surface-container-high/50 border-none px-5 py-4 rounded-2xl text-sm font-medium text-on-surface placeholder:text-on-surface-variant/40 outline-none focus:ring-2 focus:ring-primary/20 transition-all" 
              />
              <button 
                type="button" 
                onClick={handleAIParse} 
                disabled={aiParsing} 
                className="size-14 bg-primary text-white rounded-2xl flex items-center justify-center hover:scale-105 active:scale-95 disabled:opacity-50 transition-all shadow-lg shadow-primary/20"
              >
                {aiParsing ? <Loader size={20} className="animate-spin" /> : <ArrowRight size={20} />}
              </button>
            </div>
          </div>
        )}

        {/* RECURRENCE TOGGLE */}
        {!editingHabitId && (
          <div className="flex bg-surface-container-high p-1 rounded-2xl">
            <button type="button" onClick={() => setValue("is_recurring", true)} className={`flex-1 py-3 text-[10px] font-black uppercase tracking-[0.2em] rounded-xl transition-all ${isRecurring ? "bg-white text-primary shadow-sm" : "text-on-surface-variant opacity-40"}`}>Recurring Habit</button>
            <button type="button" onClick={() => setValue("is_recurring", false)} className={`flex-1 py-3 text-[10px] font-black uppercase tracking-[0.2em] rounded-xl transition-all ${!isRecurring ? "bg-white text-primary shadow-sm" : "text-on-surface-variant opacity-40"}`}>One-off Event</button>
          </div>
        )}

        {/* SOURCE TOGGLE */}
        {!editingHabitId && (
          <div className="flex bg-surface-container-high p-1 rounded-2xl">
            <button type="button" onClick={() => setUseChapter(false)} className={`flex-1 py-3 text-[10px] font-black uppercase tracking-[0.2em] rounded-xl transition-all ${!useChapter ? "bg-white text-primary shadow-sm" : "text-on-surface-variant opacity-40"}`}>Manual Ritual</button>
            <button type="button" onClick={() => setUseChapter(true)} className={`flex-1 py-3 text-[10px] font-black uppercase tracking-[0.2em] rounded-xl transition-all ${useChapter ? "bg-white text-primary shadow-sm" : "text-on-surface-variant opacity-40"}`}>Syllabus Sync</button>
          </div>
        )}

        {/* NAME / CHAPTER SECTION */}
        <div className="space-y-3">
          <label className="text-[10px] font-black uppercase tracking-widest text-primary opacity-60 ml-2 flex items-center gap-2">
            <Tag size={12} /> {useChapter ? "Chapter Manifestation" : "Ritual Identifier"}
          </label>
          {useChapter ? (
            <select {...register("chapter_id", { required: useChapter ? "Chapter is required" : false })} className="w-full bg-surface-container-low px-6 py-5 rounded-4xl text-sm font-bold text-on-surface border-none outline-none focus:ring-2 focus:ring-primary/10 appearance-none shadow-sm">
              <option value="">-- Choose Segment --</option>
              {chapters.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          ) : (
            <input 
              {...register("habit", { required: !useChapter ? "Ritual name is required" : false, minLength: { value: 2, message: "At least 2 characters" } })} 
              placeholder="e.g. Quantum Physics Revision..." 
              className={`w-full bg-surface-container-low px-6 py-5 rounded-4xl text-sm font-bold text-on-surface border-none outline-none transition-all shadow-sm ${errors.habit ? "ring-2 ring-red-400" : "focus:ring-2 focus:ring-primary/10"}`} 
            />
          )}
        </div>

        {/* TIME SELECTION */}
        <div className="grid grid-cols-2 gap-6">
          <Controller name="start_time" control={control} rules={{ required: "Start time is mandatory" }} render={({ field }) => (
            <TimePicker label="Ascension" value={field.value} onChange={field.onChange} error={errors.start_time?.message} />
          )} />
          <Controller name="end_time" control={control} rules={{ required: "End time is mandatory" }} render={({ field }) => (
            <TimePicker label="Closure" value={field.value} onChange={field.onChange} error={errors.end_time?.message} />
          )} />
        </div>

        {/* DATE SELECTION */}
        {(useChapter || !isRecurring || (editingHabitId && initialHabits.find(h => h.id === editingHabitId)?.is_mastery)) && (
          <div className="space-y-3 animate-reveal">
            <label className="text-[10px] font-black uppercase tracking-widest text-primary opacity-60 ml-2 flex items-center gap-2">
              <Calendar size={12} /> Temporal Alignment
            </label>
            <input 
              type="date" 
              {...register("date")} 
              disabled={!isRecurring && !unlockPastDays && dateValue !== new Date().toISOString().split('T')[0]} 
              className="w-full bg-surface-container-low px-6 py-5 rounded-4xl text-sm font-technical font-black text-on-surface border-none outline-none focus:ring-2 focus:ring-primary/10 disabled:opacity-40 shadow-sm" 
            />
          </div>
        )}

        {/* PRIORITY SELECTION */}
        <div className="space-y-4">
           <label className="text-[10px] font-black uppercase tracking-widest text-primary opacity-60 ml-2">Priority Magnitude</label>
           <div className="grid grid-cols-3 gap-3">
             {(["HIGH", "MEDIUM", "LOW"] as const).map((p) => {
               const m = priorityMeta[p];
               const isSelected = priority === p;
               return (
                 <label key={p} className={`flex flex-col items-center justify-center gap-2 py-5 rounded-[2.5rem] border-2 cursor-pointer transition-all duration-500 overflow-hidden relative group ${isSelected ? `${m.bg} ${m.text} border-primary` : "bg-surface-container-low text-on-surface-variant/40 border-transparent hover:bg-surface-container-high"}`}>
                   <input type="radio" value={p} {...register("priority", { required: true })} className="hidden" />
                   <div className={`size-3 rounded-full ${isSelected ? m.dot : "bg-on-surface-variant/20 group-hover:bg-primary/20"}`} />
                   <span className="text-[9px] font-technical font-black uppercase tracking-widest">{p}</span>
                 </label>
               );
             })}
           </div>
        </div>

        {/* GOOGLE CALENDAR SYNC */}
        <div className="p-8 bg-linear-to-br from-surface-container-low to-surface rounded-[3rem] border border-on-surface/5 flex items-center justify-between shadow-inner">
           <div className="flex items-center gap-5">
             <div className={`size-14 rounded-2xl flex items-center justify-center transition-all ${connected ? 'bg-primary/10 text-primary shadow-sm' : 'bg-surface-container-high text-on-surface-variant/40'}`}>
               <Calendar size={24} />
             </div>
             <div>
                <p className="text-xs font-black text-on-surface tracking-widest uppercase">Calendar Sync</p>
                <p className="text-[9px] text-on-surface-variant font-medium mt-1 font-technical uppercase tracking-widest leading-loose">
                  {connected ? "Manifested in your Cloud" : "Authentication Pending"}
                </p>
             </div>
           </div>
           {connected ? (
               <label className="relative inline-flex items-center cursor-pointer group">
                  <input type="checkbox" {...register("syncToCalendar")} className="sr-only peer" />
                  <div className="w-16 h-8 rounded-full transition-all bg-surface-container-highest peer-checked:bg-primary after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:after:translate-x-8 shadow-inner"></div>
               </label>
           ) : (
               <button 
                 type="button"
                 onClick={() => onRequestConnection && onRequestConnection()} 
                 className="px-6 py-3 bg-surface-container-highest rounded-full text-[9px] font-technical font-black uppercase tracking-widest text-primary hover:bg-primary hover:text-white transition-all"
               >
                 Link
               </button>
           )}
        </div>

        <button 
          onClick={handleSubmit(onSubmit)} 
          disabled={isSubmitting} 
          className="w-full py-6 bg-linear-to-r from-green-600 to-emerald-500 hover:from-green-700 hover:to-emerald-600 disabled:opacity-60 text-white rounded-[3rem] font-black uppercase text-xs tracking-[0.3em] transition-all shadow-xl shadow-green-500/20 active:scale-95 flex items-center justify-center gap-3"
        >
          {isSubmitting ? (
            <><Loader size={18} className="animate-spin" /> Manifesting...</>
          ) : (
            <>{editingHabitId ? "Update Ritual" : "Open Ritual"} <Sparkles size={16} /></>
          )}
        </button>
      </div>
    </div>
  );
};

// Helper constant for manual ArrowRight icon since it's not imported at top
const ArrowRight = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12h14M12 5l7 7-7 7"/>
  </svg>
);
