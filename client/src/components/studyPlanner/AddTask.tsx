import { Loader, X, Sparkles, CheckCircle2, AlertCircle, Clock, Tag, Zap, Calendar } from "lucide-react";
import { supabase } from "../../utils/supabase";
import { useDispatch, useSelector } from "react-redux";
import type { AppDispatch, RootState } from "../../store";
import { updateUserLocally } from "../../slice/userSlice";
import { useForm, Controller } from "react-hook-form";
import { useGoogleCalendar } from "../../utils/useGoogleCalender";
import { getChaptersByExamID } from "../../services/examService";
import { useEffect, useState } from "react";
import type { Habit } from "./TrackerGrid";

interface AddRoutineProps {
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
  date?: string; // Add date field for tests
  syncToCalendar: boolean;
};

// ── AI parser ──────────────────────────────────────────────────────────────
const parseRoutineWithAI = async (text: string): Promise<Partial<FormValues>> => {
  const key = import.meta.env.VITE_GEMINI_API_KEY;
  if (!key) throw new Error("No Gemini API key found");

  const res = await fetch(
    `https://aiplatform.googleapis.com/v1/publishers/google/models/gemini-2.0-flash:generateContent?key=${key}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `Extract routine details from this text and return ONLY valid JSON with no markdown.

Text: "${text}"

Return this exact shape:
{
  "habit": "short routine name as string",
  "priority": "HIGH or MEDIUM or LOW",
  "start_time": "HH:MM in 24h format or empty string",
  "end_time": "HH:MM in 24h format or empty string"
}`,
          }],
        }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 150 },
      }),
    },
  );

  if (!res.ok) throw new Error(`Gemini error ${res.status}`);
  const data = await res.json();
  const raw = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
  return JSON.parse(raw.replace(/```json|```/g, "").trim());
};

// ── Toast component ────────────────────────────────────────────────────────
const ToastBanner = ({ toast }: { toast: Toast | null }) => {
  if (!toast) return null;

  const styles: Record<ToastType, { bg: string; text: string; border: string; icon: React.ReactNode }> = {
    success: {
      bg: "bg-green-50",
      text: "text-green-700",
      border: "border-green-200",
      icon: <CheckCircle2 size={14} className="text-green-600 shrink-0" />,
    },
    error: {
      bg: "bg-red-50",
      text: "text-red-700",
      border: "border-red-200",
      icon: <AlertCircle size={14} className="text-red-600 shrink-0" />,
    },
    info: {
      bg: "bg-blue-50",
      text: "text-blue-700",
      border: "border-blue-200",
      icon: <Zap size={14} className="text-blue-600 shrink-0" />,
    },
    loading: {
      bg: "bg-slate-50",
      text: "text-slate-600",
      border: "border-slate-200",
      icon: <Loader size={14} className="animate-spin text-slate-500 shrink-0" />,
    },
  };

  const s = styles[toast.type];
  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-semibold ${s.bg} ${s.text} ${s.border} transition-all duration-300`}>
      {s.icon}
      <span>{toast.message}</span>
    </div>
  );
};

// ── Friendly Time Picker ────────────────────────────────────────────────────
const FriendlyTimePicker = ({ 
  label, 
  value, 
  onChange, 
  error 
}: { 
  label: string; 
  value: string; 
  onChange: (val: string) => void; 
  error?: string;
}) => {
  // value is "HH:MM" (24h)
  const [h24, m] = (value || "09:00").split(":");
  let hNum = parseInt(h24);
  const ampm = hNum >= 12 ? "PM" : "AM";
  const h12 = hNum % 12 || 12;

  const handleHChange = (newH12: string) => {
    let nh = parseInt(newH12);
    if (ampm === "PM" && nh < 12) nh += 12;
    if (ampm === "AM" && nh === 12) nh = 0;
    onChange(`${nh.toString().padStart(2, "0")}:${m}`);
  };

  const handleMChange = (newM: string) => {
    onChange(`${h24}:${newM.padStart(2, "0")}`);
  };

  const handleAMPMChange = (newAMPM: string) => {
    if (newAMPM === ampm) return;
    let nh = hNum;
    if (newAMPM === "PM" && hNum < 12) nh += 12;
    if (newAMPM === "AM" && hNum >= 12) nh -= 12;
    onChange(`${nh.toString().padStart(2, "0")}:${m}`);
  };

  const hours = Array.from({ length: 12 }, (_, i) => (i + 1).toString());
  const minutes = Array.from({ length: 12 }, (_, i) => (i * 5).toString().padStart(2, "0"));

  return (
    <div className="space-y-1.5 flex-1">
      <label className="text-[10px] font-black uppercase text-green-700 flex items-center gap-1.5">
        <Clock size={10} /> {label}
      </label>
      <div className={`flex items-center gap-1 p-1 bg-slate-50 border rounded-xl transition-all ${error ? "border-red-300 ring-2 ring-red-50" : "border-slate-200 focus-within:ring-2 focus-within:ring-green-100 focus-within:border-green-300"}`}>
        {/* Hour selection */}
        <select 
          value={h12.toString()} 
          onChange={(e) => handleHChange(e.target.value)}
          className="bg-transparent text-sm font-bold text-slate-700 outline-none px-1 py-1 cursor-pointer"
        >
          {hours.map(h => <option key={h} value={h}>{h}</option>)}
        </select>
        <span className="text-slate-400 font-bold">:</span>
        {/* Minute selection */}
        <select 
          value={m} 
          onChange={(e) => handleMChange(e.target.value)}
          className="bg-transparent text-sm font-bold text-slate-700 outline-none px-1 py-1 cursor-pointer"
        >
          {/* Include all minutes 0-59 but highlight 5m increments? No, user requested friendly, let's offer 5m increments or full. Let's do 1m increments but list 0, 5, 10 etc first? 
              Actually, full 0-59 is better for specific routines. */}
          {Array.from({length: 60}, (_, i) => i.toString().padStart(2, "0")).map(min => (
             <option key={min} value={min}>{min}</option>
          ))}
        </select>

        {/* AM/PM Toggle */}
        <div className="flex ml-auto bg-white border border-slate-100 rounded-lg p-0.5 shadow-sm">
          {["AM", "PM"].map(type => (
            <button
              key={type}
              type="button"
              onClick={() => handleAMPMChange(type)}
              className={`px-2 py-1 rounded-md text-[9px] font-black transition-all ${ampm === type ? "bg-green-600 text-white shadow-sm" : "text-slate-400 hover:text-slate-600"}`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>
      {error && <p className="text-[9px] font-bold text-red-500 pl-1">{error}</p>}
    </div>
  );
};

// ── Priority badge ──────────────────────────────────────────────────────────
const priorityMeta = {
  HIGH:   { bg: "bg-red-100",    text: "text-red-700",    dot: "bg-red-500"    },
  MEDIUM: { bg: "bg-amber-100",  text: "text-amber-700",  dot: "bg-amber-500"  },
  LOW:    { bg: "bg-slate-100",  text: "text-slate-600",  dot: "bg-slate-400"  },
};

export const AddRoutine = ({
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
}: AddRoutineProps) => {
  const { user, profile } = useSelector((state: RootState) => state.user ?? null);
  const dispatch = useDispatch<AppDispatch>();
  const { connected, addEvent, editEvent } = useGoogleCalendar();

  const [toast, setToast] = useState<Toast | null>(null);
  const [aiInput, setAiInput] = useState("");
  const [aiParsing, setAiParsing] = useState(false);
  const [aiFilled, setAiFilled] = useState(false);
  const [watchedPriority, setWatchedPriority] = useState<"HIGH" | "MEDIUM" | "LOW">("MEDIUM");

  const {
    reset,
    register,
    handleSubmit,
    setValue,
    watch,
    control,
    formState: { isSubmitting, errors },
  } = useForm<FormValues>({
    defaultValues: { priority: "MEDIUM", start_time: "09:00", end_time: "10:00", syncToCalendar: connected },
  });

  const startTime = watch("start_time");
  const endTime = watch("end_time");
  const habitVal = watch("habit");

  const format12h = (timeStr: string) => {
    if (!timeStr) return "";
    const [h, m] = timeStr.split(":").map(Number);
    const ampm = h >= 12 ? "PM" : "AM";
    const hour12 = h % 12 || 12;
    return `${hour12}:${m.toString().padStart(2, "0")} ${ampm}`;
  };
  const priority = watch("priority");

  const showToast = (type: ToastType, message: string, duration = 3000) => {
    setToast({ type, message });
    if (type !== "loading") setTimeout(() => setToast(null), duration);
  };

  const [chapters, setChapters] = useState<any[]>([]);
  const [useChapter, setUseChapter] = useState(false);

  useEffect(() => {
    if (examId && isOpen) {
      console.log("Fetching chapters for examId:", examId);
      getChaptersByExamID(examId).then((data) => {
        console.log("Chapters fetched:", data);
        setChapters(data || []);
      });
    }
  }, [examId, isOpen]);

  useEffect(() => {
    if (editingHabitId && isOpen) {
      const h = initialHabits.find(x => x.id === editingHabitId);
      if (h) {
        setValue("habit", h.name);
        setValue("priority", h.priority);
        setValue("start_time", h.start_time || "");
        setValue("end_time", h.end_time || "");
        if (h.chapter_id) {
          setValue("chapter_id", h.chapter_id);
          setUseChapter(true);
          // For mastery tests, find the scheduled date
          const prog = incomingProgress?.[h.id];
          if (prog) {
            const dayIdx = prog.findIndex((x: boolean) => x === true);
            if (dayIdx >= 0) {
              const d = new Date(viewYear, viewMonth - 1, dayIdx + 1);
              setValue("date", d.toISOString().split('T')[0]);
            }
          }
        }
      }
    } else {
      reset({ priority: "MEDIUM", syncToCalendar: connected });
      setUseChapter(false);
    }
  }, [editingHabitId, isOpen, initialHabits, reset, setValue, connected]);

  // ── AI parse handler ───────────────────────────────────────────────────
  const handleAIParse = async () => {
    if (!aiInput.trim()) {
      showToast("error", "Please describe your routine first");
      return;
    }
    setAiParsing(true);
    setAiFilled(false);
    showToast("loading", "AI is reading your routine...");
    try {
      const result = await parseRoutineWithAI(aiInput);
      if (result.habit)      setValue("habit",      result.habit);
      if (result.priority)   { setValue("priority", result.priority); setWatchedPriority(result.priority); }
      if (result.start_time) setValue("start_time", result.start_time);
      if (result.end_time)   setValue("end_time",   result.end_time);
      setAiFilled(true);
      showToast("success", "Fields auto-filled from your description!");
    } catch {
      showToast("error", "AI unavailable — please fill fields manually");
    } finally {
      setAiParsing(false);
    }
  };

  // ── Submit ─────────────────────────────────────────────────────────────
  async function onSubmit(data: FormValues) {
    let name = data.habit?.trim() || "";
    if (useChapter && data.chapter_id) {
      const ch = chapters.find(c => c.id === data.chapter_id);
      if (ch) name = ch.name;
    }

    if (!user?.id || !name) {
      showToast("error", "Routine name or chapter is required");
      return;
    }

    showToast("loading", editingHabitId ? "Updating routine..." : "Adding routine...");

    try {
      if (editingHabitId) {
        const habit = initialHabits.find((h) => h.id === editingHabitId);
        if (!habit) return;
        const table = habit.is_mastery ? "user_mastery" : "study_habits";
        
        const updateData: any = {
          priority: data.priority,
          start_time: data.start_time,
          end_time: data.end_time,
          chapter_id: useChapter ? data.chapter_id : null,
        };
        if (!habit.is_mastery) updateData.name = name;

        await supabase
          .from(table)
          .update(updateData)
          .eq("id", editingHabitId);

        // If date was updated for a test, we need to update the progress bitmask
        if (habit.is_mastery && data.date) {
           const newDate = new Date(data.date);
           const newDayIdx = newDate.getDate() - 1;
           const newMonth = newDate.getMonth() + 1;
           const newYear = newDate.getFullYear();
           
           const newProgress = Array(31).fill(false);
           newProgress[newDayIdx] = true;

           await supabase
            .from("user_mastery")
            .update({ 
               progress: newProgress,
               month: newMonth,
               year: newYear
            })
            .eq("id", editingHabitId);
        }

        if (connected && data.syncToCalendar) {
          const { data: prof } = await supabase
            .from("profiles")
            .select("google_calendar_event_ids")
            .eq("id", user.id)
            .single();
          const gcId = prof?.google_calendar_event_ids?.[editingHabitId];
          if (gcId) {
            // Reconstruct start/end Date objects for GC
            const execDate = habit.is_mastery && data.date ? data.date : new Date().toISOString().split('T')[0];
            const [sh, sm] = data.start_time.split(':').map(Number);
            const [eh, em] = data.end_time.split(':').map(Number);
            
            const startDT = new Date(execDate);
            startDT.setHours(sh, sm, 0, 0);
            const endDT = new Date(execDate);
            endDT.setHours(eh, em, 0, 0);

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
          await supabase
            .from("profiles")
            .update({ planner_start_date: new Date().toISOString() })
            .eq("id", user.id);
          dispatch(updateUserLocally({ planner_start_date: new Date().toISOString() }));
        }

        const habitData: any = {
          user_id: user.id,
          name,
          priority: data.priority,
          start_time: data.start_time,
          end_time: data.end_time,
          category: "theory",
          progress: Array(31).fill(false),
          month: viewMonth,
          year: viewYear,
          exam_id: examId,
          chapter_id: useChapter ? data.chapter_id : null,
        };

        const todayDate = new Date();
        const isThisMonth = todayDate.getMonth() + 1 === viewMonth && todayDate.getFullYear() === viewYear;
        if (isThisMonth) {
          habitData.progress[todayDate.getDate() - 1] = true;
        }

        const { data: newHabit, error } = await supabase.from("study_habits").insert(habitData).select().single();
        if (error) throw error;

        if (connected && data.syncToCalendar && newHabit) {
           const [sh, sm] = data.start_time.split(':').map(Number);
           const [eh, em] = data.end_time.split(':').map(Number);
           const todayStr = new Date().toISOString().split('T')[0];
           
           const startDT = new Date(todayStr);
           startDT.setHours(sh, sm, 0, 0);
           const endDT = new Date(todayStr);
           endDT.setHours(eh, em, 0, 0);

           const event = await addEvent({
             summary: name,
             description: `OPSC Study - ${data.priority} priority`,
             start: { dateTime: startDT.toISOString(), timeZone: "Asia/Kolkata" },
             end: { dateTime: endDT.toISOString(), timeZone: "Asia/Kolkata" },
           });

           if (event?.id) {
             const newIds = { ...profile?.google_calendar_event_ids, [newHabit.id]: event.id };
             await supabase.from("profiles").update({ google_calendar_event_ids: newIds }).eq("id", user.id);
             dispatch(updateUserLocally({ google_calendar_event_ids: newIds }));
           }
        }

        showToast("success", `"${name}" added to your routine!`);
      }

      reset();
      setAiInput("");
      setAiFilled(false);
      setTimeout(() => {
        onClose();
        if (onRefresh) onRefresh();
      }, 1200);
    } catch (err) {
      console.error(err);
      showToast("error", "Something went wrong. Please try again.");
    }
  }

  if (!isOpen) return null;

  const pm = priorityMeta[priority || "MEDIUM"];

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-60 p-4">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl relative overflow-hidden">

        {/* top accent bar */}
        <div className="h-1 w-full bg-gradient-to-r from-green-500 via-emerald-400 to-green-600" />

        {/* header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-3">
          <div>
            <p className="text-lg font-black text-green-800">
              {title || (editingHabitId ? "Update Routine" : "Add New Routine")}
            </p>
            <p className="text-xs text-slate-400 font-medium mt-0.5">
              {editingHabitId
                ? "Modify your existing routine details below"
                : "Describe it naturally or fill in the fields"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-6 pb-6 space-y-4">

          {/* toast */}
          <ToastBanner toast={toast} />

          {/* AI smart input */}
          {!editingHabitId && (
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Sparkles size={13} className="text-green-600" />
                <span className="text-[10px] font-black uppercase tracking-widest text-green-700">
                  AI Smart Fill
                </span>
                {aiFilled && (
                  <span className="ml-auto text-[10px] font-bold text-green-600 flex items-center gap-1">
                    <CheckCircle2 size={11} /> Filled
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                <input
                  value={aiInput}
                  onChange={(e) => setAiInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAIParse()}
                  placeholder="e.g. Wake up at 9am, Study from 10 to 12..."
                  className="flex-1 px-3 py-2.5 rounded-lg border border-green-200 bg-white text-sm text-slate-700 outline-none focus:ring-2 focus:ring-green-300 placeholder:text-slate-400"
                />
                <button
                  type="button"
                  onClick={handleAIParse}
                  disabled={aiParsing}
                  className="px-4 py-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white rounded-lg text-xs font-black uppercase flex items-center gap-1.5 transition-colors"
                >
                  {aiParsing
                    ? <Loader size={13} className="animate-spin" />
                    : <Sparkles size={13} />}
                  {aiParsing ? "..." : "Fill"}
                </button>
              </div>
              <p className="text-[10px] text-green-600 font-medium">
                Press Enter or click Fill — AI will auto-populate all fields below
              </p>
            </div>
          )}
          {/* Routine Mode Toggle */}
          {!editingHabitId && (
            <div className="flex bg-slate-100 p-1 rounded-lg">
              <button
                type="button"
                onClick={() => setUseChapter(false)}
                className={`flex-1 py-1.5 text-[10px] font-black uppercase rounded-md transition-all ${!useChapter ? "bg-white text-green-700 shadow-sm" : "text-slate-400"}`}
              >
                Manual Entry
              </button>
              <button
                type="button"
                onClick={() => setUseChapter(true)}
                className={`flex-1 py-1.5 text-[10px] font-black uppercase rounded-md transition-all ${useChapter ? "bg-white text-green-700 shadow-sm" : "text-slate-400"}`}
              >
                From Syllabus
              </button>
            </div>
          )}

          {/* task name or chapter selector */}
          <div>
            <label className="text-[10px] font-black uppercase text-green-700 mb-1.5 flex items-center gap-1.5">
              <Tag size={10} /> {useChapter ? "Select Chapter" : "Routine Name"}
            </label>
            {useChapter ? (
              <select
                {...register("chapter_id", { required: useChapter ? "Chapter is required" : false })}
                className="w-full px-4 py-3 rounded-lg border border-slate-200 text-sm text-green-800 outline-none focus:ring-2 focus:ring-green-200 appearance-none bg-white"
              >
                <option value="">-- Choose Chapter --</option>
                {chapters.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            ) : (
              <input
                {...register("habit", {
                  required: !useChapter ? "Routine name is required" : false,
                  minLength: { value: 2, message: "At least 2 characters" },
                  maxLength: { value: 60, message: "Max 60 characters" },
                })}
                placeholder="e.g. Revise Indian History..."
                className={`w-full px-4 py-3 rounded-lg border text-sm text-green-800 outline-none transition-all
                  ${errors.habit
                    ? "border-red-400 bg-red-50 focus:ring-2 focus:ring-red-200"
                    : aiFilled
                    ? "border-green-400 bg-green-50 focus:ring-2 focus:ring-green-200"
                    : "border-slate-200 focus:ring-2 focus:ring-green-200"
                  }`}
              />
            )}
            {(errors.habit || errors.chapter_id) && (
              <p className="text-red-500 text-[11px] mt-1 flex items-center gap-1">
                <AlertCircle size={11} /> {errors.habit?.message || errors.chapter_id?.message}
              </p>
            )}
          </div>

          {/* time fields */}
          <div className="flex gap-4">
            <Controller
              name="start_time"
              control={control}
              rules={{ required: "Start time is mandatory" }}
              render={({ field }) => (
                <FriendlyTimePicker
                  label="Start Time"
                  value={field.value}
                  onChange={field.onChange}
                  error={errors.start_time?.message}
                />
              )}
            />
            <Controller
              name="end_time"
              control={control}
              rules={{ 
                required: "End time is mandatory",
                validate: (v) => {
                  if (!v || !startTime) return true;
                  return v > startTime || "End must be after start";
                }
              }}
              render={({ field }) => (
                <FriendlyTimePicker
                  label="End Time"
                  value={field.value}
                  onChange={field.onChange}
                  error={errors.end_time?.message}
                />
              )}
            />
          </div>

          {/* Date selection only for Tests / Mastery */}
          {(useChapter || (editingHabitId && initialHabits.find(h => h.id === editingHabitId)?.is_mastery)) && (
            <div className="space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-300">
              <label className="text-[10px] font-black uppercase text-green-700 flex items-center gap-1.5 ml-1">
                <Calendar size={10} /> Scheduled Date
              </label>
              <input
                type="date"
                {...register("date")}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-green-100 focus:border-green-300 transition-all"
              />
            </div>
          )}

          {/* duration hint */}
          {startTime && endTime && !errors.start_time && !errors.end_time && (
            <p className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1 -mt-1">
              <CheckCircle2 size={11} />
              {(() => {
                const [sh, sm] = startTime.split(":").map(Number);
                const [eh, em] = endTime.split(":").map(Number);
                const mins = (eh * 60 + em) - (sh * 60 + sm);
                if (mins <= 0) return "Invalid range";
                const h = Math.floor(mins / 60);
                const m = mins % 60;
                return `Duration: ${h > 0 ? `${h}h ` : ""}${m > 0 ? `${m}m` : ""}`;
              })()}
            </p>
          )}

          {/* priority */}
          <div>
            <label className="text-[10px] font-black uppercase text-green-700 mb-1.5 block">
              Priority
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(["HIGH", "MEDIUM", "LOW"] as const).map((p) => {
                const m = priorityMeta[p];
                const isSelected = priority === p;
                return (
                  <label
                    key={p}
                    className={`flex items-center justify-center gap-1.5 py-2.5 rounded-lg border-2 cursor-pointer transition-all text-xs font-black uppercase
                      ${isSelected
                        ? `${m.bg} ${m.text} border-current`
                        : "bg-slate-50 text-slate-400 border-slate-200 hover:border-slate-300"
                      }`}
                  >
                    <input
                      type="radio"
                      value={p}
                      {...register("priority", { required: true })}
                      className="hidden"
                    />
                    <span className={`w-2 h-2 rounded-full ${isSelected ? m.dot : "bg-slate-300"}`} />
                    {p}
                  </label>
                );
              })}
            </div>
          </div>

          {/* Sync Toggle */}
          <div className="flex items-center justify-between p-4 bg-blue-50/50 rounded-2xl border border-blue-100/50">
             <div className="flex items-center gap-2.5">
               <div className={`p-2 rounded-lg ${connected ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-400'}`}>
                 <Calendar size={16} />
               </div>
               <div>
                  <p className="text-xs font-black text-slate-700">Google Calendar Sync</p>
                  <p className="text-[10px] text-slate-500 font-medium">
                    {connected ? "Enabled for this routine" : "Connect calendar to enable"}
                  </p>
               </div>
             </div>
             <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  {...register("syncToCalendar")} 
                  disabled={!connected}
                  className="sr-only peer" 
                />
                <div className={`w-11 h-6 rounded-full peer transition-all
                  ${!connected ? 'bg-slate-200 cursor-not-allowed' : 'bg-slate-200 peer-checked:bg-green-600'}
                  after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all 
                  ${connected ? 'peer-checked:after:translate-x-full' : ''}`}>
                </div>
             </label>
          </div>

          {/* submit */}
          <button
            onClick={handleSubmit(onSubmit)}
            disabled={isSubmitting}
            className="w-full py-3.5 bg-green-700 hover:bg-green-800 disabled:opacity-60 text-white rounded-xl font-black uppercase text-sm tracking-wide flex items-center justify-center gap-2 transition-all shadow-lg shadow-green-700/20 mt-2"
          >
            {isSubmitting
              ? <><Loader size={15} className="animate-spin" /> {editingHabitId ? "Updating..." : "Adding..."}</>
              : <>{editingHabitId ? "Update Routine" : "Add Routine"}</>
            }
          </button>
        </div>
      </div>
    </div>
  );
};