import { Loader, X, Sparkles, CheckCircle2, AlertCircle, Tag, Calendar, Book, RefreshCw } from "lucide-react";
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
import { type Habit } from "./types";

// Define the context shape received from StudyPlanner
interface PlannerContext {
  viewMonth: number;
  viewYear: number;
  selectedDate: Date;
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
  end_date?: string;
  duration_type: "DAILY" | "WEEKLY" | "MONTHLY" | "CUSTOM";
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
  HIGH: { bg: "bg-red-100", text: "text-red-700", dot: "bg-red-500" },
  MEDIUM: { bg: "bg-amber-100", text: "text-amber-700", dot: "bg-amber-500" },
  LOW: { bg: "bg-surface-container-high", text: "text-slate-600", dot: "bg-slate-400" },
};

export const AddRoutine = () => {
  const { habitId: editingHabitId } = useParams();
  const navigate = useNavigate();
  const context = useOutletContext<PlannerContext>();

  // Use context or defaults if for some reason context is missing (though it shouldn't be)
  const {
    viewMonth,
    viewYear,
    selectedDate,
    initialHabits,
    examId,
    onRefresh,
    onRequestConnection
  } = context || {
    viewMonth: new Date().getMonth() + 1,
    viewYear: new Date().getFullYear(),
    selectedDate: new Date(),
    initialHabits: [],
    examId: "",
    onRefresh: () => { },
    onRequestConnection: () => { },
    initialProgress: {}
  };

  const { user, profile } = useSelector((state: RootState) => state.user || { user: null, profile: null });
  const dispatch = useDispatch<AppDispatch>();
  const { connected, addEvent, editEvent } = useGoogleCalendar();

  const [toast, setToast] = useState<Toast | null>(null);
  const [showWelcome, setShowWelcome] = useState<boolean>(false);

  useEffect(() => {
    // Editing should open directly on the form; the welcome step is only for
    // first-time task creation.
    const hasSeenWelcome = localStorage.getItem("arumind_planner_welcome_seen") === "true";
    setShowWelcome(!editingHabitId && !hasSeenWelcome);
  }, [editingHabitId]);

  const handleProceed = () => {
    localStorage.setItem("arumind_planner_welcome_seen", "true");
    setShowWelcome(false);
  };
  const [aiInput, setAiInput] = useState("");
  const [aiParsing, setAiParsing] = useState(false);
  const [aiFilled, setAiFilled] = useState(false);
  const [computedEndDate, setComputedEndDate] = useState<string>("");
  const [chapters, setChapters] = useState<any[]>([]);
  const [useChapter, setUseChapter] = useState(false);
  const unlockPastDays = false;

  const { reset, register, handleSubmit, setValue, watch, control, formState: { isSubmitting, errors } } = useForm<FormValues>({
    defaultValues: { priority: "MEDIUM", start_time: "09:00", end_time: "10:00", duration_type: "MONTHLY", syncToCalendar: connected },
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

  useEffect(() => {
    // Preserve the day selected in the planner when changing task duration.
    if (durationType === "DAILY" && !editingHabitId) {
      setValue("date", getLocalDateString(selectedDate));
    }
  }, [durationType, editingHabitId, selectedDate, setValue]);

  const showToast = (type: ToastType, message: string, duration = 3000) => {
    setToast({ type, message });
    if (type !== "loading") setTimeout(() => setToast(null), duration);
  };

  useEffect(() => {
    if (!examId || !useChapter) return;
    let isCurrent = true;
    getChaptersByExamID(examId).then((data) => {
      if (isCurrent) setChapters(data || []);
    });
    return () => { isCurrent = false; };
  }, [examId, useChapter]);

  useEffect(() => {
    if (!editingHabitId) return;
    const habit = initialHabits.find((item) => item.id === editingHabitId);
    if (!habit) return;

    const chapterSelected = Boolean(habit.chapter_id);
    setUseChapter(chapterSelected);
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
  }, [editingHabitId, initialHabits, reset, connected, selectedDate]);

  useEffect(() => {
    if (editingHabitId) return;
    setUseChapter(false);
    reset({
      priority: "MEDIUM",
      duration_type: "MONTHLY",
      syncToCalendar: connected,
      date: getLocalDateString(selectedDate),
    });
  }, [editingHabitId, reset, connected, selectedDate]);

  const handleAIParse = async () => {
    if (!aiInput.trim()) { showToast("error", "Please describe your routine first"); return; }
    setAiParsing(true);
    setAiFilled(false);
    showToast("loading", "AI is reading your task...");
    try {
      const result = await parseRoutineWithAI(aiInput);
      if (result.habit) setValue("habit", result.habit);
      if (result.priority) setValue("priority", result.priority as any);
      if (result.start_time) setValue("start_time", result.start_time);
      if (result.end_time) setValue("end_time", result.end_time);
      setAiFilled(true);
      showToast("success", "Fields auto-filled from your description!");
    } catch {
      showToast("error", "AI unavailable — please fill fields manually");
    } finally { setAiParsing(false); }
  };

  async function onSubmit(data: FormValues) {
    let name = data.habit?.trim() || "";
    if (useChapter && data.chapter_id) {
      const ch = chapters.find(c => c.id === data.chapter_id);
      if (ch) name = ch.name;
    }
    if (!user?.id || !name) { showToast("error", "Routine name or chapter is required"); return; }

    showToast("loading", editingHabitId ? "Updating task..." : "Adding task...");

    try {
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

        if (data.date) {
          const newDate = new Date(data.date);
          const newDayIdx = newDate.getDate() - 1;
          const newMonth = newDate.getMonth() + 1;
          const newYear = newDate.getFullYear();
          const newProgress = Array(31).fill(false);
          if (data.duration_type === "DAILY") newProgress[newDayIdx] = true;

          updateData.scheduled_date = newDate.toISOString().split('T')[0];
          if (data.duration_type === "CUSTOM" && data.end_date) {
            updateData.scheduled_end_date = new Date(data.end_date).toISOString().split('T')[0];
          } else {
            updateData.scheduled_end_date = null;
          }
          updateData.month = newMonth;
          updateData.year = newYear;
          updateData.progress = newProgress;
        }

        const { error } = await supabase.from("study_habits").update(updateData).eq("id", editingHabitId);
        if (error) throw error;

        if (connected && data.syncToCalendar) {
          const { data: prof } = await supabase.from("profiles").select("google_calendar_event_ids").eq("id", user.id).single();
          const gcId = prof?.google_calendar_event_ids?.[editingHabitId];
          if (gcId) {
            const execDate = data.duration_type === "DAILY" && data.date ? data.date : new Date().toISOString().split('T')[0];
            const [sh, sm] = data.start_time.split(':').map(Number);
            const [eh, em] = data.end_time.split(':').map(Number);
            const startDT = new Date(execDate); startDT.setHours(sh, sm, 0, 0);
            const endDT = new Date(execDate); endDT.setHours(eh, em, 0, 0);
            await editEvent(gcId, {
              summary: useChapter ? `Chapter: ${name}` : name,
              description: useChapter ? `Scheduled Chapter for ${name}. Odisha Exam Prep.` : `OPSC Study - ${data.priority} priority`,
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
        const scheduledDate = data.date ? new Date(data.date) : new Date();
        const habitData: any = {
          user_id: user.id,
          priority: data.priority,
          start_time: data.start_time,
          end_time: data.end_time,
          progress: Array(31).fill(false),
          month: viewMonth,
          year: viewYear,
          exam_id: examId,
          chapter_id: useChapter ? data.chapter_id : null,
          is_recurring: data.duration_type !== "DAILY",
          duration_type: data.duration_type,
          scheduled_date: scheduledDate.toISOString().split('T')[0]
        };

        if (data.duration_type === "CUSTOM" && data.end_date) {
          habitData.scheduled_end_date = new Date(data.end_date).toISOString().split('T')[0];
        }

        if (!useChapter) habitData.name = name;
        const isTargetMonth = scheduledDate.getMonth() + 1 === viewMonth && scheduledDate.getFullYear() === viewYear;
        if (isTargetMonth && data.duration_type === "DAILY") habitData.progress[scheduledDate.getDate() - 1] = true;

        const { data: newHabit, error } = await supabase.from("study_habits").insert(habitData).select().single();
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
        showToast("success", `"${name}" added to your program!`);
      }
      reset(); setAiInput(""); setAiFilled(false);
      onRefresh();
      navigate(-1);
    } catch (err) { console.error(err); showToast("error", "Something went wrong. Please try again."); }
  }

  if (showWelcome) {
    return (
      <div className="h-full bg-surface flex flex-col overflow-hidden rounded-2xl">
        <div className="h-1 w-full bg-linear-to-r from-green-500 via-emerald-400 to-green-600" />
        
        <div className="flex-1 flex flex-col px-10 pt-12 pb-10 overflow-y-auto">
          <div className="mb-12">
            <h1 className="text-4xl font-black tracking-tighter text-on-surface leading-snug">
              Advance <br />
              <span className="text-primary italic">Edit Task</span>
            </h1>
            <div className="h-1 w-12 bg-primary/20 mt-6 rounded-full" />
            <p className="text-[10px] font-technical uppercase tracking-[0.4em] text-on-surface-variant opacity-40 mt-8">
              Boutique Planner Protocol
            </p>
          </div>

          <div className="space-y-8 flex-1">
            {[
              { icon: <Book size={20} />, title: "Add Custom Duration to your task", desc: "Add (weekly,monthly,custom) duration to your task" },
              { icon: <RefreshCw size={20} />, title: "Automatically Calculate Duration", desc: "Eaasily Set task for weekly,monthly,custom duration" },
              { icon: <Sparkles size={20} />, title: "Add Chapters", desc: "For convenience we have added the chapters based on your relevant exam" },
              { icon: <Calendar size={20} />, title: "Sync with Google Calendar", desc: "Automatic sync with Google Calendar." },
            ].map((feature, i) => (
              <div key={i} className="flex items-start gap-6 group">
                <div className="size-12 rounded-2xl bg-surface-container-high/40 flex items-center justify-center text-primary group-hover:bg-primary/10 transition-colors shrink-0">
                  {feature.icon}
                </div>
                <div>
                  <h3 className="text-xs font-black uppercase tracking-widest text-on-surface mb-1">
                    {feature.title}
                  </h3>
                  <p className="text-[11px] text-on-surface-variant/60 font-medium leading-relaxed">
                    {feature.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-12">
            <button 
              onClick={handleProceed}
              className="w-full py-6 bg-on-surface text-surface rounded-[3rem] font-black uppercase text-[10px] tracking-[0.4em] transition-all hover:bg-primary hover:shadow-xl hover:shadow-primary/20 active:scale-95 flex items-center justify-center gap-3 group"
            >
              Proceed to Workspace <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-surface flex flex-col overflow-hidden rounded-2xl">
      <div className="h-1 w-full bg-linear-to-r from-green-500 via-emerald-400 to-green-600" />

      <div className="sticky top-0 z-20 flex items-center justify-between border-b border-outline-variant/10 bg-surface/95 px-5 py-5 backdrop-blur sm:px-8">
        <div>
          <h2 id="routine-dialog-title" className="text-xl font-semibold tracking-tight text-on-surface leading-none sm:text-2xl">
            {editingHabitId ? "Edit Task" : "Add Task"}
          </h2>
          <p className="mt-2 text-sm text-on-surface-variant">
            {editingHabitId ? "Update task details and schedule." : "Create a study task for your planner."}
          </p>
        </div>
        <button
          onClick={() => navigate(-1)}
          className="size-10 rounded-2xl bg-surface-container-high/40 text-on-surface-variant hover:bg-surface-container-highest hover:text-primary transition-all duration-300 flex items-center justify-center group"
        >
          <X className="size-5" />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-8 pb-10 space-y-6 custom-scrollbar">
        <ToastBanner toast={toast} />

        {/* AI INPUT RITUAL */}
        {/* {!editingHabitId && (
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
        )} */}

        {/* DURATION TOGGLE */}
        <div>
          <label className="text-[10px] font-black uppercase tracking-widest text-primary ml-2 flex flex-wrap mb-1"><Tag size={12} className="mr-2" />Select the Duration of your Task</label>
          <div className="flex bg-surface-container-high p-1 rounded-2xl flex-wrap">
            <button type="button" onClick={() => setValue("duration_type", "DAILY")} className={`flex-1 py-3 px-1 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${durationType === "DAILY" ? "bg-white text-primary shadow-sm" : "text-on-surface-variant opacity-40"}`}>Today</button>
            <button type="button" onClick={() => setValue("duration_type", "WEEKLY")} className={`flex-1 py-3 px-1 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${durationType === "WEEKLY" ? "bg-white text-primary shadow-sm" : "text-on-surface-variant opacity-40"}`}>Weekly</button>
            <button type="button" onClick={() => setValue("duration_type", "MONTHLY")} className={`flex-1 py-3 px-1 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${durationType === "MONTHLY" ? "bg-white text-primary shadow-sm" : "text-on-surface-variant opacity-40"}`}>Monthly</button>
            <button type="button" onClick={() => setValue("duration_type", "CUSTOM")} className={`flex-1 py-3 px-1 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${durationType === "CUSTOM" ? "bg-white text-primary shadow-sm" : "text-on-surface-variant opacity-40"}`}>Custom</button>
          </div>
        </div>



        {/* SOURCE TOGGLE */}
        <div>
          <label className="text-[10px] font-black uppercase tracking-widest text-primary opacity-60 ml-2 flex flex-wrap mb-1"><span className="flex flex-wrap "><Tag size={12} className="mr-2" />{"--Please select Task if you want to add your own task"}<br /> {"---Please select Chapter if you want to add a chapter as routine."}</span></label>
          <div className="flex bg-surface-container-high p-1 rounded-2xl">
            <button type="button" onClick={() => setUseChapter(false)} className={`flex-1 py-3 text-[10px] font-black uppercase tracking-[0.2em] rounded-xl transition-all ${!useChapter ? "bg-white text-primary shadow-sm" : "text-on-surface-variant opacity-40"}`}>Task</button>
            <button type="button" onClick={() => setUseChapter(true)} className={`flex-1 py-3 text-[10px] font-black uppercase tracking-[0.2em] rounded-xl transition-all ${useChapter ? "bg-white text-primary shadow-sm" : "text-on-surface-variant opacity-40"}`}>Chapter</button>
          </div>
        </div>


        {/* NAME / CHAPTER SECTION */}
        <div className="space-y-3">
          <label className="text-[10px] font-black uppercase tracking-widest text-primary opacity-60 ml-2 flex items-center gap-2">
            <Tag size={12} /> {useChapter ? "Chapter Name" : " Task Name"}
          </label>
          {useChapter ? (
            <select {...register("chapter_id", { required: useChapter ? "Chapter is required" : false })} className="w-full bg-surface-container-low px-6 py-5 rounded-4xl text-sm font-bold text-on-surface border-none outline-none focus:ring-2 focus:ring-primary/10 appearance-none shadow-sm">
              <option value="">-- Choose Segment --</option>
              {chapters.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          ) : (
            <input
              {...register("habit", { required: !useChapter ? "Task name is required" : false, minLength: { value: 2, message: "At least 2 characters" } })}
              placeholder="e.g. Quantum Physics Revision..."
              className={`w-full bg-surface-container-low px-6 py-5 rounded-4xl text-sm font-bold text-on-surface border-none outline-none transition-all shadow-sm ${errors.habit ? "ring-2 ring-red-400" : "focus:ring-2 focus:ring-primary/10"}`}
            />
          )}
        </div>

        {/* TIME SELECTION */}
        <div className="grid grid-cols-2 gap-6">
          <Controller name="start_time" control={control} rules={{ required: "Start time is mandatory" }} render={({ field }) => (
            <TimePicker label="Select Time when you will start" value={field.value} onChange={field.onChange} error={errors.start_time?.message} />
          )} />
          <Controller name="end_time" control={control} rules={{ required: "End time is mandatory" }} render={({ field }) => (
            <TimePicker label="Select Time when you will end" value={field.value} onChange={field.onChange} error={errors.end_time?.message} />
          )} />
        </div>

        {/* DATE SELECTION */}
        <div className={`space-y-3 animate-reveal ${durationType === "CUSTOM" ? "col-span-2" : ""}`}>
          <label className="text-[10px] font-black uppercase tracking-widest text-primary opacity-60 ml-2 flex items-center gap-2">
            <Calendar size={12} /> {durationType === "DAILY" ? "Scheduled Date" : "Start Date"}
            {computedEndDate && <span className="ml-auto opacity-40">Auto-calculated End Date</span>}
            {durationType === "CUSTOM" && <span className="ml-auto opacity-40">Set End Date</span>}
          </label>
          <div className="flex items-center gap-3">
            <input
              type="date"
              {...register("date", { required: true })}
              className="w-full bg-surface-container-low px-6 py-5 rounded-4xl text-sm font-technical font-black text-on-surface border-none outline-none focus:ring-2 focus:ring-primary/10 shadow-sm transition-all"
            />
            {computedEndDate && (
              <>
                <div className="text-primary/40 font-black animate-in fade-in zoom-in-50 duration-500">→</div>
                <div
                  className="w-full bg-surface-container-lowest px-6 py-5 rounded-4xl text-sm font-technical font-black text-on-surface-variant/60 border border-outline-variant/10 cursor-not-allowed shadow-inner transition-all flex items-center animate-in fade-in slide-in-from-right-4 duration-500"
                  title="Calculated automatically based on Routine Duration"
                >
                  {computedEndDate}
                </div>
              </>
            )}
            {durationType === "CUSTOM" && (
              <>
                <div className="text-primary/40 font-black animate-in fade-in zoom-in-50 duration-500">→</div>
                <input
                  type="date"
                  {...register("end_date", {
                    required: durationType === "CUSTOM",
                    validate: value => !value || !dateValue || new Date(value) >= new Date(dateValue) || "End Date cannot be before Start Date"
                  })}
                  className={`w-full bg-surface-container-low px-6 py-5 rounded-4xl text-sm font-technical font-black text-on-surface border-none outline-none focus:ring-2 focus:ring-primary/10 shadow-sm transition-all animate-in fade-in slide-in-from-right-4 duration-500 ${errors.end_date ? "ring-2 ring-red-400 focus:ring-red-500" : ""}`}
                />
              </>
            )}
          </div>
          {errors.end_date && <p className="text-red-500 text-[10px] ml-4 animate-in fade-in">{errors.end_date.message}</p>}
        </div>

        {/* PRIORITY SELECTION */}
        {/* <div className="space-y-4">
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
        </div> */}

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

        <div className="sticky bottom-0 -mx-8 border-t border-outline-variant/15 bg-surface/95 px-8 pt-4 pb-2 backdrop-blur">
          <button
            onClick={handleSubmit(onSubmit)}
            disabled={isSubmitting}
            className="min-h-12 w-full rounded-xl bg-primary px-5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary/90 disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <><Loader size={18} className="animate-spin" /> Saving...</>
            ) : (
              <>{editingHabitId ? "Save changes" : "Add task"}</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

// Helper constant for manual ArrowRight icon since it's not imported at top
const ArrowRight = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12h14M12 5l7 7-7 7" />
  </svg>
);
