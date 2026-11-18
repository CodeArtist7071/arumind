import React, { useState, useEffect, useMemo, Suspense } from "react";
import { Header } from "../../components/Header";
import TrackerGrid from "../../components/studyPlanner/TrackerGrid";
import DailyRoutine from "../../components/studyPlanner/DailyRoutine";
import FocusTimer from "../../components/studyPlanner/FocusTimer";
import GrowthMetrics from "../../components/studyPlanner/GrowthMetrics";
import GoogleCalendarModal from "../../components/studyPlanner/GoogleCalendarModal";
import { MobileStudyPlanner } from "../../components/studyPlanner/MobileStudyPlanner";
import { MobileAddTask } from "../../components/studyPlanner/MobileAddTask";
import { ExamTicker } from "../../components/ui/ExamTicker";
import { PlannerMilestones } from "../../components/studyPlanner/PlannerMilestones";
import { AlertPopup } from "../../components/ui/AlertPopup";
import { useNavigate, useParams, useOutlet, Outlet } from "react-router";

import { type Habit, type Chapter } from "../../components/studyPlanner/types";
import { useDispatch, useSelector } from "react-redux";
import type { AppDispatch, RootState } from "../../store";
import { useGoogleCalendar } from "../../utils/useGoogleCalender";

// Modular Imports
import { useStudyPlanner } from "../../components/studyPlanner/hooks/useStudyPlanner";
import { usePlannerStats } from "../../components/studyPlanner/hooks/usePlannerStats";
import { StudyGraph } from "../../components/studyPlanner/StudyGraph";

const now = new Date();
const currentMonthIdx = now.getMonth();
const currentYear = now.getFullYear();
const currentMonth = currentMonthIdx + 1;

export default function StudyPlannerPage() {
  const navigate = useNavigate();
  const outlet = useOutlet();
  const { eid: examId } = useParams();
  const { user, profile } = useSelector((state: RootState) => state.user);
  const { connected, addEvent, editEvent } = useGoogleCalendar();

  // Custom Hooks for logic separation
  const {
    habits,
    progress,
    loading,
    viewMonth,
    viewYear,
    selectedDate,
    isSettingUp,
    hasPrevMonthTasks,
    setSelectedDate,
    setIsSettingUp,
    fetchData,
    handleToggle,
    handleCopyPreviousMonth,
    handleMonthChange,
    setHabits,
    manifestDemo
  } = useStudyPlanner(user, examId, profile);

  const {
    stats,
    consistency,
    momentum,
    hoursOfStudy,
    weeklyForecast
  } = usePlannerStats(habits, progress);

  const [autoOpenAddModal, setAutoOpenAddModal] = useState(false);
  const [isGooglePopupOpen, setIsGooglePopupOpen] = useState(false);
  const [isMilestoneDrawerOpen, setIsMilestoneDrawerOpen] = useState(false);
  const [addMode, setAddMode] = useState<"routine" | "test">("routine");
  const [editingHabitId, setEditingHabitId] = useState<string | null>(null);
  const [isAddExpanded, setIsAddExpanded] = useState(false);
  const [reminderTest, setReminderTest] = useState<Habit | null>(null);
  const [isAddMasteryOpen, setIsAddMasteryOpen] = useState(false);

  const { examData } = useSelector((state: RootState) => state.exams);
  
  const targetedExams = useMemo(() => {
    if (!examData || !profile?.target_exams) return [];
    return examData.filter((el) => profile.target_exams.includes(el.id));
  }, [examData, profile?.target_exams]);

  // Keep the first target visibly selected while the planner route is resolving
  // its default exam (and after the targeted exam list loads).
  const defaultExamId = targetedExams[0]?.id || "";
  const selectedTickerExamId = targetedExams.some((exam) => exam.id === examId)
    ? examId!
    : defaultExamId;

  const monthName = useMemo(() => {
    return new Date(viewYear, viewMonth - 1).toLocaleString("default", { month: "long" });
  }, [viewMonth, viewYear]);

  // Keep the route, ticker highlight, and task query on the same targeted exam.
  useEffect(() => {
    if (defaultExamId && examId !== defaultExamId && !targetedExams.some((exam) => exam.id === examId)) {
      navigate(`/user/plan-study/${defaultExamId}`, { replace: true });
    }
  }, [defaultExamId, examId, targetedExams, navigate]);

  const handleSyncTaskToCalendar = async (habit: Habit, silent = false) => {
    if (!connected) {
      if (!silent) setIsGooglePopupOpen(true);
      return;
    }
    try {
      const today = new Date().toISOString().split("T")[0];
      const startDateTime = new Date(`${today}T${habit.start_time || "09:00"}:00`);
      let endDateTime = habit.end_time ? new Date(`${today}T${habit.end_time}:00`) : new Date(startDateTime.getTime() + 60 * 60000);

      const existingEventId = profile?.google_calendar_event_ids?.[habit.id];
      const eventData = {
        summary: habit.name,
        description: `Study Planner Task - Priority: ${habit.priority}. Odisha Exam Prep.`,
        colorId: habit.priority === "HIGH" ? "11" : "1",
        start: { dateTime: startDateTime.toISOString(), timeZone: "Asia/Kolkata" },
        end: { dateTime: endDateTime.toISOString(), timeZone: "Asia/Kolkata" },
        reminders: { useDefault: false, overrides: [{ method: "popup" as const, minutes: 30 }] },
      };

      if (existingEventId) {
        try { await editEvent(existingEventId, eventData); }
        catch (e) { console.warn("Edit failed", e); }
      } else {
        await addEvent(eventData);
      }
      if (!silent) alert(`"${habit.name}" synced to your Google Calendar!`);
    } catch (e: any) {
      if (!silent) alert(`Sync failed: ${e.message || "Unknown error"}`);
    }
  };

  const handleSyncAllTasks = async () => {
    if (!connected) return setIsGooglePopupOpen(true);
    for (const habit of habits) await handleSyncTaskToCalendar(habit, true);
    alert("All tasks for today have been synced to your Google Calendar!");
  };

  const onShowMastery = () => {
    navigate(`/user/plan-study/${examId || "default"}/mastery`);
  };

  const onAddHabit = (mode: "routine" | "test") => {
    setAddMode(mode);
    navigate(`/user/plan-study/${examId || "default"}/add`);
  };

  const onAddMobileHabit = (mode: "routine" | "test") => {
    setAddMode(mode);
    setAutoOpenAddModal(true);
  };

  const trackerHabits = useMemo(() => habits.filter((h) => !h.is_mastery), [habits]);

  const masteryOnly = useMemo(() => {
    return habits
      .filter((h) => !!h.is_mastery)
      .map((h) => {
        const prog = progress[h.id] || [];
        const dayIdx = prog.findIndex((v) => v);
        return { ...h, scheduledDay: dayIdx + 1 };
      })
      .filter((h) => h.scheduledDay > 0)
      .sort((a, b) => a.scheduledDay - b.scheduledDay);
  }, [habits, progress]);

  return (
    <div className="text-on-surface transition-colors duration-500">
      <GoogleCalendarModal isOpen={isGooglePopupOpen} onClose={() => setIsGooglePopupOpen(false)} />
      
      <AlertPopup 
        isOpen={!!reminderTest} 
        onClose={() => setReminderTest(null)}
        title="Study Reminder"
        message={`It's time for "${reminderTest?.name}". Complete this session to achieve your exam goals.`}
      >
        <div className="flex gap-4 w-full justify-end mt-4">
          <button 
            onClick={() => setReminderTest(null)}
            className="px-6 py-2 rounded-full text-[10px] font-technical font-black uppercase tracking-widest text-slate-400 hover:bg-slate-50 transition-all text-right"
          >
            Acknowledge
          </button>
          <button 
            onClick={() => {/* test logic */}}
            className="px-6 py-2 bg-primary text-white rounded-full text-[10px] font-technical font-black uppercase tracking-widest shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all text-right"
          >
            Initiate Session
          </button>
        </div>
      </AlertPopup>

      <main className="mx-auto pb-20 min-h-screen">
        <div className="block lg:hidden">
          <MobileAddTask
            isOpen={autoOpenAddModal}
            onClose={() => { setAutoOpenAddModal(false); setEditingHabitId(null); }}
            editingHabitId={editingHabitId || undefined}
            title={editingHabitId ? "Update Routine" : (addMode === "test" ? "Schedule Test" : "Add New Routine")}
            initialHabits={habits}
            initialProgress={progress}
            examId={examId || ""}
            viewMonth={viewMonth}
            viewYear={viewYear}
            selectedDate={selectedDate}
            onRefresh={fetchData}
            onRequestConnection={() => setIsGooglePopupOpen(true)}
            initialUseChapter={addMode === "test"}
          />
        </div>

        <div className="block lg:hidden animate-reveal">
          <MobileStudyPlanner
            habits={habits}
            progress={progress}
            onToggle={handleToggle}
            viewMonth={viewMonth}
            viewYear={viewYear}
            selectedDate={selectedDate || new Date()}
            onSelectDate={setSelectedDate}
            onMonthChange={handleMonthChange}
            stats={stats}
            onAddHabit={onAddMobileHabit}
            onEditHabit={(h) => { setEditingHabitId(h.id); setAddMode(h.is_mastery ? "test" : "routine"); setAutoOpenAddModal(true); }}
            onSync={handleSyncTaskToCalendar}
            onSyncAll={handleSyncAllTasks}
            isSettingUp={isSettingUp}
            hasPrevMonthTasks={hasPrevMonthTasks}
            onCopyPrevious={handleCopyPreviousMonth}
            onStartFresh={() => setIsSettingUp(false)}
            manifestDemo={manifestDemo}
            masteryOnly={masteryOnly}
          />
        </div>

        {/* DESKTOP ZONE */}
        <div className="hidden lg:block relative min-h-screen will-change-contents">
          <section className={`transition-opacity duration-200 ${outlet ? "opacity-40 pointer-events-none" : "opacity-100"}`}>
            <div className="flex items-center justify-between">
              <div className="px-2 mb-8">
                {/*<h3 className="text-[11px] font-technical font-black uppercase tracking-[0.4em] text-on-surface-variant opacity-60">Monthly Performance Grid</h3>*/}
                <p className="text-sm font-bold text-on-surface mt-2 tracking-tight">Your study routines and recurring tasks.</p>
              </div>
              <ExamTicker targetedExams={targetedExams} selectedExam={selectedTickerExamId} setSelectedExam={(id) => navigate(`/user/plan-study/${id}`)} />              
            </div>
           
            <div className="bg-surface-container-low rounded-[3rem] overflow-hidden border border-outline-variant/5 shadow-ambient-lg">
              <TrackerGrid
                initialHabits={trackerHabits}
                initialProgress={progress}
                onToggle={handleToggle}
                onRefresh={fetchData}
                isLoading={loading}
                viewMonth={viewMonth}
                viewYear={viewYear}
                selectedDate={selectedDate}
                onSelectDate={setSelectedDate}
                onMonthChange={handleMonthChange}
                isSettingUp={isSettingUp}
                initialUseChapter={addMode === "test"}
                isPastMonth={viewYear < now.getFullYear() || (viewYear === now.getFullYear() && viewMonth < now.getMonth() + 1)}
                hasPrevMonthTasks={hasPrevMonthTasks}
                onCopyPrevious={handleCopyPreviousMonth}
                onStartFresh={() => setIsSettingUp(false)}
                autoOpenAddModal={autoOpenAddModal}
                onModalOpenHandled={() => setAutoOpenAddModal(false)}
                editingHabitId={editingHabitId}
                setEditingHabitId={setEditingHabitId}
                onShowAddTask={() => { setAddMode("routine"); navigate("add"); }}
                onShowMastery={onShowMastery}
                manifestDemo={manifestDemo}
                setShowSelector={setIsAddMasteryOpen}
                setHabits={setHabits}
              />
            </div>
          </section>
        </div>

        {/* OVERLAY BACKDROP */}
        <div 
          onClick={() => navigate(-1)}
          className={`fixed inset-0 z-[90] bg-black/20 transition-opacity duration-200 ${outlet ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
        />

        {/* Centered desktop dialog */}
        <div
          onClick={() => navigate(-1)}
          className={`hidden lg:flex fixed inset-0 z-[100] items-center justify-center p-4 transition-opacity duration-200 ${outlet ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="routine-dialog-title"
            onClick={(event) => event.stopPropagation()}
            className={`h-[min(88vh,820px)] w-full max-w-[640px] overflow-hidden rounded-2xl border border-outline-variant/20 bg-surface shadow-2xl transition-transform duration-200 ${outlet ? "translate-y-0 scale-100" : "translate-y-2 scale-[0.98]"}`}
          >
            <Suspense fallback={<div className="flex h-full items-center justify-center bg-surface"><div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>}>
              {outlet && (
                <div className="h-full">
                  <Outlet context={{ viewMonth, viewYear, selectedDate, initialHabits: habits, examId: examId || "", onRefresh: fetchData, onRequestConnection: () => setIsGooglePopupOpen(true), initialProgress: progress }} />
                </div>
              )}
            </Suspense>
          </div>
        </div>

        <div className="hidden lg:grid grid-cols-12 gap-10 mt-20 px-2">
          {/* <div className="col-span-12 xl:col-span-8 space-y-10">
             <DailyRoutine 
               selectedDate={selectedDate || new Date()} 
               habits={habits} 
               onRefresh={fetchData} 
               progress={progress} 
               onToggle={handleToggle} 
             />
             <GrowthMetrics 
               level={stats.level} 
               xp={stats.xpInLevel} 
               totalXp={stats.xp} 
               streak={momentum} 
             />
          </div> */}
          {/* <div className="col-span-12 xl:col-span-4">
            <FocusTimer />
          </div> */}
          <div className="col-span-12">
            <StudyGraph 
              habits={habits}
              progress={progress}
              viewMonth={viewMonth}
              viewYear={viewYear}
            />
          </div>
       
        </div>
      </main>

      <PlannerMilestones
        isMilestoneDrawerOpen={isMilestoneDrawerOpen}
        setIsMilestoneDrawerOpen={setIsMilestoneDrawerOpen}
        isAddExpanded={isAddExpanded}
        setIsAddExpanded={setIsAddExpanded}
        masteryOnly={masteryOnly}
        selectedDate={selectedDate || new Date()}
        setSelectedDate={setSelectedDate}
        onAddHabit={onAddHabit}
        setEditingHabitId={setEditingHabitId}
        setAddMode={setAddMode}
        setAutoOpenAddModal={setAutoOpenAddModal}
        monthName={monthName}
        viewYear={viewYear}
        viewMonth={viewMonth}
      />
    </div>
  );
}
