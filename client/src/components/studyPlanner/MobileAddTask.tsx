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
import { type Habit } from "./types";


interface MobileAddTaskProps {
  isOpen: boolean;
  onClose: () => void;
  initialHabits: Habit[];
  examId: string;
  title?: string;
  viewMonth: number;
  viewYear: number;
  selectedDate: Date;
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
  end_date?: string;
  duration_type: "DAILY" | "WEEKLY" | "MONTHLY" | "CUSTOM";
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
    HIGH: "bg-red-50 text-red-700 border-red-100",
    MEDIUM: "bg-amber-50 text-amber-700 border-amber-100",
    LOW: "bg-slate-50 text-slate-600 border-slate-100"
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
  selectedDate,
  editingHabitId,
  title,
  onRefresh,
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
  const [computedEndDate, setComputedEndDate] = useState<string>("");

  // Animation Lifecycle
  const [shouldRender, setShouldRender] = useState(isOpen);
  const [isAnimatingOut, setIsAnimatingOut] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      setIsAnimatingOut(false);
    } else if (shouldRender) {
      setIsAnimatingOut(true);
      const timer = setTimeout(() => {
        setShouldRender(false);
        setIsAnimatingOut(false);
      }, 220);
      return () => clearTimeout(timer);
    }
  }, [isOpen, shouldRender]);

  const { reset, register, handleSubmit, setValue, watch, control, formState: { isSubmitting, errors } } = useForm<FormValues>({
    defaultValues: { priority: "MEDIUM", start_time: "09:00", end_time: "10:00", duration_type: "MONTHLY", syncToCalendar: connected },
    shouldUnregister: true
  });

  const priority = watch("priority");
  const durationType = watch("duration_type");
  const dateValue = watch("date");

  useEffect(() => {
    if (!dateValue) return;
    const start = new Date(dateValue);

    if (durationType === "DAILY") {
      setComputedEndDate("");
    } else if (durationType === "WEEKLY") {
      const end = new Date(start);
      end.setDate(end.getDate() + 6);
      setComputedEndDate(getLocalDateString(end));
    } else if (durationType === "MONTHLY") {
      const end = new Date(start);
      end.setMonth(end.getMonth() + 1);
      end.setDate(end.getDate() - 1);
      setComputedEndDate(getLocalDateString(end));
    } else if (durationType === "CUSTOM") {
      setComputedEndDate("");
    }
  }, [dateValue, durationType]);

  // Mobile Debug: Watch errors
  useEffect(() => {
    if (Object.keys(errors).length > 0) {
      console.warn("⚠️ [MobileAddTask] Form Validation Errors:", errors);
    }
  }, [errors]);

  useEffect(() => {
    if (durationType === "DAILY" && !editingHabitId) {
      setValue("date", getLocalDateString(selectedDate));
    }
  }, [durationType, editingHabitId, selectedDate, setValue]);

  useEffect(() => {
    if (!examId || !isOpen || !useChapter) return;
    let isCurrent = true;
    getChaptersByExamID(examId).then((data) => {
      if (isCurrent) setChapters(data || []);
    });
    return () => { isCurrent = false; };
  }, [examId, isOpen, useChapter]);

  useEffect(() => {
    if (!isOpen || !editingHabitId) return;
    const habit = initialHabits.find((item) => item.id === editingHabitId);
    if (!habit) return;

    setUseChapter(Boolean(habit.chapter_id));
    reset({
      habit: habit.name,
      priority: habit.priority,
      start_time: habit.start_time || "09:00",
      end_time: habit.end_time || "10:00",
      duration_type: habit.duration_type || (habit.is_recurring === false ? "DAILY" : "MONTHLY"),
      date: habit.scheduled_date || getLocalDateString(selectedDate),
      end_date: habit.scheduled_end_date || "",
      chapter_id: habit.chapter_id || "",
      syncToCalendar: connected,
    });
  }, [editingHabitId, isOpen, initialHabits, reset, connected, selectedDate]);

  useEffect(() => {
    if (!isOpen || editingHabitId) return;
      console.log("🔍 [MobileAddTask] Adding New Study Session, Mode:", initialUseChapter ? "Mastery" : "Routine", "ExamID:", examId);
      setToast({ type: "loading", message: "Syncing Schedule..." });
      reset({
        priority: "MEDIUM",
        duration_type: "MONTHLY",
        syncToCalendar: connected,
        date: getLocalDateString(selectedDate),
      });
      setUseChapter(initialUseChapter || false);
  }, [editingHabitId, isOpen, reset, connected, selectedDate, initialUseChapter, examId]);

  const onSubmit = async (data: FormValues) => {
    console.log("🚀 [MobileAddTask] Form Submitted Successfully:", data);
    setToast({ type: "loading", message: "Syncing Schedule..." });

    // Safety check for examId
    const finalExamId = examId === "add" ? undefined : examId;
    let name = data.habit?.trim() || "";
    if (useChapter && data.chapter_id) {
      const ch = chapters.find(c => c.id === data.chapter_id);
      if (ch) name = ch.name;
      else name = "Syllabus Mastery Quest"; // Fallback if chapter not found in local state
    }

    if (!user?.id) {
      console.error("❌ [MobileAddTask] Missing User ID");
      setToast({ type: "error", message: "Validating session..." });
      return;
    }

    if (!name && !useChapter) {
      console.error("❌ [MobileAddTask] Missing Routine Name");
      setToast({ type: "error", message: "Session name is required" });
      return;
    }

    try {
      // 1. New Ritual Initialization Sync (Matches AddRoutine logic)
      if (!editingHabitId && !profile?.planner_start_date) {
        console.log("🌱 [MobileAddTask] Initializing first planner start date...");
        const startDate = new Date().toISOString();
        const { error: profErr } = await supabase.from("profiles").update({ planner_start_date: startDate }).eq("id", user.id);
        if (profErr) console.error("❌ [MobileAddTask] Profile update error:", profErr);
        dispatch(updateUserLocally({ planner_start_date: startDate }));
      }

      if (editingHabitId && !editingHabitId.startsWith("demo-")) {
        const updateData: any = {
          priority: data.priority,
          start_time: data.start_time,
          end_time: data.end_time,
          chapter_id: useChapter ? data.chapter_id : null,
          is_recurring: data.duration_type !== "DAILY",
          duration_type: data.duration_type
        };
        if (!useChapter) updateData.name = name;
        await supabase.from("study_habits").update(updateData).eq("id", editingHabitId);

        if (data.date) {
          const newDate = new Date(data.date);
          await supabase.from("study_habits").update({
            scheduled_date: newDate.toISOString().split('T')[0],
            month: String(newDate.getMonth() + 1),
            year: String(newDate.getFullYear()),
            progress: Array(31).fill(false).map((_, i) => i === newDate.getDate() - 1 && data.duration_type === "DAILY")
          }).eq("id", editingHabitId);
        }
      } else {
        const scheduledDate = data.date ? new Date(data.date) : new Date();
        const habitData: any = {
          user_id: user.id,
          priority: data.priority,
          start_time: data.start_time,
          end_time: data.end_time,
          progress: Array(31).fill(false),
          month: String(viewMonth),
          year: String(viewYear),
          exam_id: examId,
          chapter_id: useChapter ? data.chapter_id : null,
          is_recurring: data.duration_type !== "DAILY",
          duration_type: data.duration_type,
          scheduled_date: scheduledDate.toISOString().split('T')[0]
        };

        if (!useChapter) habitData.name = name;
        if (scheduledDate.getMonth() + 1 === viewMonth && scheduledDate.getFullYear() === viewYear) {
          habitData.progress[scheduledDate.getDate() - 1] = data.duration_type === "DAILY";
        }

        const { error } = await supabase.from("study_habits").insert(habitData);
        if (error) throw error;
      }
      console.log("✅ [MobileAddTask] Manifestation Successful");
      setToast({ type: "success", message: "Schedule updated!" });
      onRefresh?.();
      setTimeout(onClose, 250);
    } catch (e: any) {
      console.error("❌ [MobileAddTask] Manifestation Failed:", e);
      setToast({ type: "error", message: e.message || "System error. Try again." });
    }
  };

  if (!shouldRender) return null;

  return (
    <div className="fixed inset-0 z-100 flex items-end justify-center">
      {/* Backdrop with lush fade */}
      <div 
        className={`absolute inset-0 bg-on-surface/20 transition-opacity duration-200 ${isAnimatingOut ? "animate-out fade-out" : "animate-in fade-in"}`} 
        onClick={onClose} 
      />

      {/* Action Sheet Container with buttery slide */}
      <div className={`relative w-full max-h-[92vh] bg-surface rounded-t-[3rem] shadow-ambient-2xl flex min-h-0 flex-col overflow-hidden border-t border-on-surface/5 transition-transform duration-200 ease-out ${isAnimatingOut ? "translate-y-full" : "translate-y-0"}`}>
        
        {/* Drag Handle Ritual */}
        <div className="pt-4 pb-2 shrink-0" onClick={onClose}>
          <div className="w-12 h-1.5 bg-on-surface/10 rounded-full mx-auto" />
        </div>

        {/* ── Mobile Header ────────────────────────────────────────────────── */}
        <header className="px-6 pt-2 pb-4 flex items-center justify-between sticky top-0 bg-surface z-10">
          <button onClick={onClose} className="size-10 rounded-full bg-on-surface/5 flex items-center justify-center active:scale-95 transition-transform">
            <X className="size-5" />
          </button>
          <span className="text-sm font-black uppercase tracking-[0.3em] text-primary">{editingHabitId ? "Edit task" : "Add task"}</span>
          <div className="w-10" /> {/* Spacer for symmetry */}
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain custom-scrollbar-hide pb-32">
          {toast && (
            <div className="sticky top-2 mx-4 z-50 animate-in fade-in slide-in-from-top-2">
              <div className={`p-4 rounded-3xl border flex items-center gap-3 shadow-lg ${toast.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' :
                  toast.type === 'loading' ? 'bg-primary/5 border-primary/20 text-primary' :
                    'bg-red-50 border-red-200 text-red-800'
                }`}>
                {toast.type === 'loading' ? <Loader className="animate-spin" size={16} /> : <Zap size={16} />}
                <span className="text-xs font-bold">{toast.message}</span>
                <button onClick={() => setToast(null)} className="ml-auto opacity-40"><X size={14} /></button>
              </div>
            </div>
          )}

          <main className="space-y-5 px-3">
            <div className="space-y-2 mt-6">
              <h2 className="text-xl font-black tracking-tighter text-on-surface leading-none">
                {editingHabitId ? "Edit Task" : "Add Task"}
              </h2>
              <p className="text-xs font-medium text-on-surface-variant opacity-70">
                {editingHabitId ? "Update the task details and schedule." : useChapter ? "Scheduling your test." : "Set up your study routine."}
              </p>
            </div>

            {/* ── Manual Manifest Form ─────────────────────────────────────────── */}
            <form
              onSubmit={handleSubmit(
                onSubmit,
                (err) => {
                  console.error("❌ [MobileAddTask] Validation Errors:", err);
                  const firstErr = Object.values(err)[0];
                  if (firstErr) setToast({ type: "error", message: String(firstErr.message || "Please fill all required fields") });
                }
              )}
              className="space-y-4"
            >
              <div className="flex bg-surface-container-low p-1.5 rounded-2xl flex-wrap">
                <button type="button" onClick={() => setValue("duration_type", "DAILY")} className={`flex-1 py-2 px-1 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${durationType === "DAILY" ? "bg-surface text-primary shadow-ambient" : "text-on-surface-variant opacity-40"}`}>Today</button>
                <button type="button" onClick={() => setValue("duration_type", "WEEKLY")} className={`flex-1 py-2 px-1 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${durationType === "WEEKLY" ? "bg-surface text-primary shadow-ambient" : "text-on-surface-variant opacity-40"}`}>Weekly</button>
                <button type="button" onClick={() => setValue("duration_type", "MONTHLY")} className={`flex-1 py-2 px-1 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${durationType === "MONTHLY" ? "bg-surface text-primary shadow-ambient" : "text-on-surface-variant opacity-40"}`}>Monthly</button>
                <button type="button" onClick={() => setValue("duration_type", "CUSTOM")} className={`flex-1 py-2 px-1 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${durationType === "CUSTOM" ? "bg-surface text-primary shadow-ambient" : "text-on-surface-variant opacity-40"}`}>Custom</button>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-on-surface opacity-40 ml-1">Task Type</label>
                <div className="flex bg-surface-container-low p-1.5 rounded-2xl">
                  <button type="button" onClick={() => setUseChapter(false)} className={`flex-1 py-2 text-[10px] font-black uppercase rounded-xl transition-all ${!useChapter ? "bg-surface text-primary shadow-ambient" : "text-on-surface-variant opacity-40"}`}>Manual Session</button>
                  <button type="button" onClick={() => setUseChapter(true)} className={`flex-1 py-2 text-[10px] font-black uppercase rounded-xl transition-all ${useChapter ? "bg-surface text-primary shadow-ambient" : "text-on-surface-variant opacity-40"}`}>Syllabus Mastery</button>
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-widest text-on-surface opacity-40 ml-1">{useChapter ? "Chapter Selection" : "Session Name"}</label>
                {useChapter ? (
                  <>
                    <select
                      {...register("chapter_id", { required: "Please select a chapter" })}
                      className={`w-full py-3 px-6 bg-surface-container-low rounded-3xl text-sm font-bold border-none outline-none focus:ring-2 ring-primary/20 appearance-none ${errors.chapter_id ? "ring-2 ring-red-400" : ""}`}
                    >
                      <option value="">Choose your quest...</option>
                      {chapters.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    {errors.chapter_id && <p className="text-red-500 text-[10px] ml-4 animate-in fade-in">{errors.chapter_id.message}</p>}
                  </>
                ) : (
                  <>
                    <input
                      {...register("habit", { required: "Routine name is required" })}
                      placeholder="e.g. History Review"
                      className={`w-full py-3 px-6 bg-surface-container-low rounded-3xl text-sm font-bold border-none outline-none focus:ring-2 ring-primary/20 ${errors.habit ? "ring-2 ring-red-400" : ""}`}
                    />
                    {errors.habit && <p className="text-red-500 text-[10px] ml-4 animate-in fade-in">{errors.habit.message}</p>}
                  </>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-on-surface opacity-40 ml-1 flex items-center justify-between">
                  <span>{durationType === "DAILY" ? "Scheduled Date" : "Start Date"}</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="date"
                    {...register("date", { required: "Date is required" })}
                    className={`w-full py-3 px-4 bg-surface-container-low rounded-3xl text-sm font-bold border-none outline-none focus:ring-2 ring-primary/20 transition-all ${errors.date ? "ring-2 ring-red-400" : ""}`}
                  />
                  {computedEndDate && (
                    <div className="w-full bg-surface-container-lowest px-4 py-3 rounded-3xl text-sm font-technical font-black text-on-surface-variant/60 border border-outline-variant/10 shadow-inner flex items-center animate-in fade-in slide-in-from-right-4 duration-500">
                      {computedEndDate}
                    </div>
                  )}
                  {durationType === "CUSTOM" && (
                     <input
                        type="date"
                        {...register("end_date", {
                          required: durationType === "CUSTOM",
                          validate: value => !value || !dateValue || new Date(value) >= new Date(dateValue) || "End Date cannot be before Start Date"
                        })}
                        className={`w-full py-3 px-4 bg-surface-container-low rounded-3xl text-sm font-bold border-none outline-none focus:ring-2 ring-primary/20 transition-all animate-in fade-in slide-in-from-right-4 duration-500 ${errors.end_date ? "ring-2 ring-red-400 focus:ring-red-500" : ""}`}
                      />
                  )}
                </div>
                {errors.date && <p className="text-red-500 text-[10px] ml-4 animate-in fade-in">{errors.date.message}</p>}
                {errors.end_date && <p className="text-red-500 text-[10px] ml-4 animate-in fade-in">{errors.end_date.message}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-on-surface opacity-40 ml-1">Start Time</label>
                  <input type="time" {...register("start_time")} className="w-full py-3 px-6 bg-surface-container-low rounded-3xl text-sm font-bold border-none outline-none focus:ring-2 ring-primary/20" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-on-surface opacity-40 ml-1">End Time</label>
                  <input type="time" {...register("end_time")} className="w-full py-3 px-6 bg-surface-container-low rounded-3xl text-sm font-bold border-none outline-none focus:ring-2 ring-primary/20" />
                </div>
              </div>

              <div className="space-y-4">
                <label className="text-[10px] font-black uppercase tracking-widest text-on-surface opacity-40 ml-1">Priority Level</label>
                <div className="flex gap-3">
                  {(["HIGH", "MEDIUM", "LOW"] as const).map(p => (
                    <PriorityBadge key={p} priority={p} selected={priority === p} onSelect={() => setValue("priority", p)} />
                  ))}
                </div>
              </div>

              {connected && (
                <div className={`p-6 rounded-[2.5rem] flex items-center justify-between border transition-all ${watch("syncToCalendar") ? "bg-primary/5 border-primary/20" : "bg-surface-container-low border-transparent"}`}>
                  <div className="flex items-center gap-3">
                    <Calendar className={`size-5 ${watch("syncToCalendar") ? "text-primary" : "text-on-surface-variant opacity-40"}`} />
                    <div>
                      <p className="text-xs font-black">Google Sync</p>
                      <p className="text-[10px] font-medium opacity-40">Persistence mapping</p>
                    </div>
                  </div>
                  <input type="checkbox" {...register("syncToCalendar")} className="size-5 accent-primary" />
                </div>
              )}
            </form>
          </main>
        </div>

        <footer className="shrink-0 p-6 bg-surface border-t border-outline-variant/10 z-50">
          <button
            type="button"
            onClick={() => {
              handleSubmit(onSubmit, (err) => {
                const firstErr: any = Object.values(err)[0];
                const msg = firstErr?.message || "Please fill all required fields";
                setToast({ type: "error", message: msg });
              })();
            }}
            className="w-full min-h-12 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary/90 active:scale-[0.99] flex items-center justify-center gap-2"
          >
            {isSubmitting ? <Loader className="animate-spin" size={18} /> : (editingHabitId ? "Save changes" : "Add task")}
          </button>
        </footer>
      </div>
    </div>
  );
};
