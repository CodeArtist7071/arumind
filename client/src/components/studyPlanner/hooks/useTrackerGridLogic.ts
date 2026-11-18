import { useState, useMemo, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router";
import { useDispatch, useSelector } from "react-redux";
import { useNotifications } from "reapop";
import { supabase } from "../../../utils/supabase";
import type { RootState, AppDispatch } from "../../../store";
import { updateUserLocally } from "../../../slice/userSlice";
import { useGoogleCalendar } from "../../../utils/useGoogleCalender";
import { type Habit } from "../types";
import { getLocalDateString } from "../../../utils/getLocaleDateString";

export const useTrackerGridLogic = (
  initialHabits: Habit[],
  initialProgress: Record<string, boolean[]>,
  viewMonth: number,
  viewYear: number,
  onRefresh: () => void,
  setHabits?: React.Dispatch<React.SetStateAction<Habit[]>>,
  onModalOpenHandled?: () => void,
  onShowAddTask?: () => void,
  setEditingHabitId?: (id: string | null) => void,
  setValue?: any,
  selectedDate?: Date
) => {
  const { eid: examId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const { notify } = useNotifications();
  const { connected, addEvent, editEvent } = useGoogleCalendar();
  const { user, profile } = useSelector((state: RootState) => state.user);

  const now = new Date();
  const currentMonthIdx = now.getMonth();
  const currentYear = now.getFullYear();
  const currentMonth = currentMonthIdx + 1;
  const today = now.getDate();

  const daysInMonth = new Date(viewYear, viewMonth, 0).getDate();
  const rotatedDays = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const [viewMode, setViewMode] = useState<'monthly' | 'weekly'>('monthly');
  const [activeWeek, setActiveWeek] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [unlockPastDays, setUnlockPastDays] = useState(false);
  const [reminderTest, setReminderTest] = useState<any>(null);
  const [lastTriggeredId, setLastTriggeredId] = useState<string | null>(null);
  const [isDuplicating, setIsDuplicating] = useState(false);
  
  // Persistent Dismissal Manifestation via localStorage
  const [dismissedRenewals, setDismissedRenewals] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem("dismissed_renewals");
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch (e) {
      return new Set();
    }
  });

  useEffect(() => {
    localStorage.setItem("dismissed_renewals", JSON.stringify(Array.from(dismissedRenewals)));
  }, [dismissedRenewals]);

  // Sync active week to current date
  useEffect(() => {
    if (viewMonth === currentMonth && viewYear === currentYear) {
      const weekIdx = Math.floor((today - 1) / 7);
      setActiveWeek(Math.min(weekIdx, 4));
    } else {
      setActiveWeek(0);
    }
  }, [viewMonth, viewYear, currentMonth, currentYear, today]);

  const realHabits = useMemo(() => initialHabits.filter(h => !h.isDemo), [initialHabits]);
  
  const filteredHabits = useMemo(() => {
    let list = initialHabits;

    // Search filter
    if (searchTerm) {
      list = list.filter((h) => h.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }

    // Selected Date Filter
    if (selectedDate) {
      const cellDateNormalized = new Date(selectedDate);
      cellDateNormalized.setHours(0, 0, 0, 0);

      const activeHabitNames = new Set(
        initialHabits
          .filter(h => {
             if (!h.scheduled_date) return false;
             const start = new Date(h.scheduled_date);
             start.setHours(0, 0, 0, 0);
             if (cellDateNormalized < start) return false;

             if (h.duration_type === "DAILY") return cellDateNormalized.getTime() === start.getTime();
             if (h.duration_type === "WEEKLY") {
               const end = new Date(start);
               end.setDate(start.getDate() + 6);
               return cellDateNormalized <= end;
             }
             if (h.duration_type === "MONTHLY") return true; 
             return false;
          })
          .map(h => h.name.trim().toLowerCase())
      );

      list = list.filter((habit) => {
        if (!habit.scheduled_date) return true; // fallback
        
        const startDate = new Date(habit.scheduled_date);
        startDate.setHours(0, 0, 0, 0);

        // Include habits that are active today
        let isActiveNow = false;
        if (cellDateNormalized >= startDate) {
           if (habit.duration_type === "DAILY") {
             isActiveNow = cellDateNormalized.getTime() === startDate.getTime();
           } else if (habit.duration_type === "WEEKLY") {
             const endDate = new Date(startDate);
             endDate.setDate(startDate.getDate() + 6);
             isActiveNow = cellDateNormalized <= endDate;
           } else if (habit.duration_type === "MONTHLY") {
             isActiveNow = true;
           } else if (habit.duration_type === "CUSTOM" && habit.scheduled_end_date) {
             const endDate = new Date(habit.scheduled_end_date);
             endDate.setHours(23, 59, 59, 999);
             isActiveNow = cellDateNormalized <= endDate;
           }
        }

        if (isActiveNow) return true;

        // ALSO check if it's an "Expired" ritual suitable for renewal
        const prevDate = new Date(cellDateNormalized);
        prevDate.setDate(prevDate.getDate() - 1);
        prevDate.setHours(0, 0, 0, 0);

        let isExpiredYesterday = false;
        if (habit.duration_type === "DAILY") {
          isExpiredYesterday = prevDate.getTime() === startDate.getTime();
        } else if (habit.duration_type === "WEEKLY") {
          const endDate = new Date(startDate);
          endDate.setDate(startDate.getDate() + 6);
          endDate.setHours(0, 0, 0, 0);
          isExpiredYesterday = prevDate.getTime() === endDate.getTime();
        } else if (habit.duration_type === "CUSTOM" && habit.scheduled_end_date) {
          const endDate = new Date(habit.scheduled_end_date);
          endDate.setHours(0, 0, 0, 0);
          isExpiredYesterday = prevDate.getTime() === endDate.getTime();
        }

        // UNIFIED SUPPRESSION: Only show expired tasks if NO active version exists today AND not dismissed
        if (isExpiredYesterday) {
           return !activeHabitNames.has(habit.name.trim().toLowerCase()) && !dismissedRenewals.has(habit.id);
        }

        return false;
      });
    }

    return list;
  }, [initialHabits, searchTerm, selectedDate, dismissedRenewals]);

  const duplicateHabit = useCallback(async (habit: Habit) => {
    if (!user?.id || !selectedDate || isDuplicating) return;
    setIsDuplicating(true);
    try {
      const table = habit.is_mastery ? "user_mastery" : "study_habits";
      const newProgress = Array(31).fill(false);
      newProgress[selectedDate.getDate() - 1] = true;

      // Smart Temporal Interval Manifestation
      let scheduled_end_date = null;
      if (habit.duration_type === "WEEKLY") {
        const end = new Date(selectedDate);
        end.setDate(end.getDate() + 6);
        scheduled_end_date = end.toISOString().split('T')[0];
      } else if (habit.duration_type === "MONTHLY") {
        const end = new Date(selectedDate);
        end.setMonth(end.getMonth() + 1);
        end.setDate(end.getDate() - 1);
        scheduled_end_date = end.toISOString().split('T')[0];
      }

      const newStartStr = selectedDate.toISOString().split('T')[0];

      // Existence Manifestation Check
      const { data: existing } = await supabase
        .from(table)
        .select("id")
        .eq("user_id", user.id)
        .eq("name", habit.name)
        .eq("scheduled_date", newStartStr)
        .maybeSingle();

      if (existing) {
        setIsDuplicating(false);
        return;
      }

      const newHabitData: any = {
        user_id: user.id,
        name: habit.name,
        priority: habit.priority,
        category: habit.category,
        start_time: habit.start_time,
        end_time: habit.end_time,
        chapter_id: habit.chapter_id,
        is_recurring: habit.is_recurring,
        duration_type: habit.duration_type,
        scheduled_date: newStartStr,
        scheduled_end_date,
        month: selectedDate.getMonth() + 1,
        year: selectedDate.getFullYear(),
        progress: newProgress,
        exam_id: examId,
      };

      const { error } = await supabase.from(table).insert(newHabitData);
      if (error) throw error;
      
      notify({ message: `"${habit.name}" automatically renewed.`, title: "Logic Sync", status: "success" });
      onRefresh();
    } catch (err: any) {
      console.error("Auto-renewal failed:", err);
    } finally {
      setIsDuplicating(false);
    }
  }, [user?.id, selectedDate, isDuplicating, examId, onRefresh, notify]);

  // Automated Manifestation: Auto-Renew recurring rituals detected as expired
  useEffect(() => {
    if (!user?.id || !selectedDate || isDuplicating || initialHabits.length === 0) return;

    const autoRenew = async () => {
      // Find habits that are expired yesterday and should be recurring
      const habitsToRenew = initialHabits.filter(habit => {
         if (habit.isDemo || dismissedRenewals.has(habit.id)) return false;
         if (!habit.is_recurring && habit.duration_type === "DAILY") return false;

         const prevDate = new Date(selectedDate);
         prevDate.setDate(prevDate.getDate() - 1);
         prevDate.setHours(0, 0, 0, 0);

         let isRecentlyExpired = false;
         if (habit.scheduled_date) {
            const startDate = new Date(habit.scheduled_date);
            startDate.setHours(0, 0, 0, 0);

            if (habit.duration_type === "DAILY") {
              if (prevDate.getTime() === startDate.getTime()) isRecentlyExpired = true;
            } else if (habit.duration_type === "WEEKLY") {
              const endDate = new Date(startDate);
              endDate.setDate(startDate.getDate() + 6);
              endDate.setHours(0, 0, 0, 0);
              if (prevDate.getTime() === endDate.getTime()) isRecentlyExpired = true;
            } else if (habit.duration_type === "CUSTOM" && habit.scheduled_end_date) {
              const endDate = new Date(habit.scheduled_end_date);
              endDate.setHours(0, 0, 0, 0);
              if (prevDate.getTime() === endDate.getTime()) isRecentlyExpired = true;
            }
         }

         if (!isRecentlyExpired) return false;

         // Verify NO active manifestation exists TODAY for this ritual name
         const activeHabitNames = new Set(
            initialHabits
              .filter(h => {
                 if (!h.scheduled_date) return false;
                 const start = new Date(h.scheduled_date);
                 start.setHours(0, 0, 0, 0);
                 const todayNorm = new Date(selectedDate);
                 todayNorm.setHours(0, 0, 0, 0);
                 if (todayNorm < start) return false;

                 if (h.duration_type === "DAILY") return todayNorm.getTime() === start.getTime();
                 if (h.duration_type === "WEEKLY") {
                   const end = new Date(start);
                   end.setDate(start.getDate() + 6);
                   return todayNorm <= end;
                 }
                 if (h.duration_type === "MONTHLY") return true; 
                 return false;
              })
              .map(h => h.name.trim().toLowerCase())
         );

         return !activeHabitNames.has(habit.name.trim().toLowerCase());
      });

      if (habitsToRenew.length > 0) {
        // Renewal manifestation ritual
        for (const habit of habitsToRenew) {
          await duplicateHabit(habit);
        }
      }
    };

    autoRenew();
  }, [initialHabits, selectedDate, user?.id, isDuplicating, duplicateHabit, dismissedRenewals]);

  const dismissRenewal = useCallback((habitId: string) => {
    setDismissedRenewals(prev => new Set(prev).add(habitId));
  }, []);

  const renderedDays = useMemo(() => {
    if (viewMode === 'monthly') return rotatedDays;
    const start = activeWeek * 7;
    return activeWeek === 4 ? rotatedDays.slice(28) : rotatedDays.slice(start, start + 7);
  }, [viewMode, activeWeek, rotatedDays]);

  const dailyStats = useMemo(() => {
    return rotatedDays.map((_, dayIdx) => {
      const actualDayIdx = dayIdx;
      let completed = 0;
      realHabits.forEach((h) => {
        if (initialProgress[h.id]?.[actualDayIdx]) completed++;
      });
      const total = realHabits.length || 1;
      const percent = Math.round((completed / total) * 100);
      return { completed, total, percent };
    });
  }, [realHabits, initialProgress, rotatedDays]);

  const overallProgress = useMemo(() => {
    let totalCells = realHabits.length * daysInMonth;
    let completedCells = 0;
    realHabits.forEach((h) => {
      initialProgress[h.id]?.forEach((done) => {
        if (done) completedCells++;
      });
    });
    return totalCells === 0 ? "0.0" : ((completedCells / totalCells) * 100).toFixed(1);
  }, [realHabits, initialProgress, daysInMonth]);

  const dailyPercents = useMemo(() => dailyStats.map(s => s.percent), [dailyStats]);

  const weeklyDone = useMemo(() => {
    return [0, 1, 2, 3, 4].map(weekIdx => {
      if (realHabits.length === 0) return 0;
      const start = weekIdx * 7;
      const end = weekIdx === 4 ? daysInMonth : Math.min(start + 7, daysInMonth);
      const weekLength = end - start;
      if (weekLength <= 0) return 0;

      let totalCells = realHabits.length * weekLength;
      let completedCells = 0;
      realHabits.forEach(h => {
        const p = initialProgress[h.id] || [];
        for (let i = start; i < end; i++) {
          if (p[i]) completedCells++;
        }
      });
      return Math.round((completedCells / totalCells) * 100);
    });
  }, [realHabits, initialProgress, daysInMonth]);

  const dailyHours = useMemo(() => {
    const hours = Array(31).fill(0);
    realHabits.forEach((habit) => {
      if (!habit.start_time || !habit.end_time) return;
      const [sh, sm] = habit.start_time.split(":").map(Number);
      const [eh, em] = habit.end_time.split(":").map(Number);
      const duration = (eh * 60 + em - (sh * 60 + sm)) / 60;
      if (duration <= 0) return;

      const prog = initialProgress[habit.id] || [];
      prog.forEach((done, dayIdx) => {
        if (done) hours[dayIdx] += duration;
      });
    });
    return hours;
  }, [realHabits, initialProgress]);

  const habitsWithStreaks = useMemo(() => {
    return filteredHabits.map((h) => {
      const progressArr = initialProgress[h.id] || [];
      let currentStreak = 0;
      let maxStreak = 0;
      let tempStreak = 0;

      progressArr.forEach((done) => {
        if (done) {
          tempStreak++;
          maxStreak = Math.max(maxStreak, tempStreak);
        } else {
          tempStreak = 0;
        }
      });

      for (let i = progressArr.length - 1; i >= 0; i--) {
        if (progressArr[i]) {
          currentStreak++;
        } else if (currentStreak > 0) {
          break;
        }
      }
      return { ...h, current_streak: currentStreak, max_streak: maxStreak };
    });
  }, [filteredHabits, initialProgress]);

  const handleAddMastery = useCallback(async (chapter: any, date: string, startTime: string, endTime: string, syncToCalendar?: boolean) => {
    if (!user?.id) return;
    try {
      const initialProg = Array(31).fill(false);
      const scheduledDate = new Date(date);
      if (scheduledDate.getMonth() + 1 === viewMonth && scheduledDate.getFullYear() === viewYear) {
        const dayIdx = scheduledDate.getDate() - 1;
        if (dayIdx >= 0 && dayIdx < 31) initialProg[dayIdx] = true;
      }

      const { data: insertedMastery, error: insertError } = await supabase
        .from("user_mastery")
        .insert({
          user_id: user.id,
          chapter_id: chapter.id,
          priority: "MEDIUM",
          start_time: startTime,
          end_time: endTime,
          progress: initialProg,
          month: viewMonth,
          year: viewYear,
          exam_id: examId,
        })
        .select().single();

      if (insertError) throw insertError;

      if (connected && syncToCalendar && insertedMastery) {
        const start = new Date(date);
        const [sh, sm] = startTime.split(':').map(Number);
        start.setHours(sh, sm, 0, 0);
        const end = new Date(date);
        const [eh, em] = endTime.split(':').map(Number);
        end.setHours(eh, em, 0, 0);

        await addEvent({
          summary: `Test: ${chapter.name || "Study Mastery"}`,
          description: `Scheduled Test for ${chapter.name}. Odisha Exam Prep.`,
          colorId: "5",
          start: { dateTime: start.toISOString(), timeZone: "Asia/Kolkata" },
          end: { dateTime: end.toISOString(), timeZone: "Asia/Kolkata" },
        });
      }

      notify({ message: "Test scheduled successfully!", title: "Success", status: "success" });
      onRefresh();
    } catch (err: any) {
      notify({ message: err.message || "Failed to schedule test", title: "Error", status: "error" });
    }
  }, [user?.id, viewMonth, viewYear, examId, connected, addEvent, notify, onRefresh]);

  const editHabit = useCallback((habit: Habit) => {
    onModalOpenHandled?.();
    if (setEditingHabitId) {
      setEditingHabitId(habit.id);
      navigate(`/user/plan-study/${examId || "default"}/edit/${habit.id}`);
    }
    window.scrollTo({ top: 300, behavior: "smooth" });
  }, [onModalOpenHandled, setEditingHabitId, navigate, examId]);

  const handleDelete = useCallback(async (habit: Habit) => {
    if (!window.confirm(`Are you sure you want to delete "${habit.name}"? This action is permanent.`)) return;
    try {
      const table = habit.is_mastery ? "user_mastery" : "study_habits";
      
      // OPTIMISTIC: Manifest Removal Locally
      if (setHabits) {
        setHabits(prev => prev.filter(h => String(h.id) !== String(habit.id)));
      }

      const { error } = await supabase.from(table).delete().eq("id", habit.id);
      if (error) throw error;
      notify({ message: "Task Removed", title: "Success", status: "success" });
      // Removed onRefresh() - Only Re-Fetch on Error Logic below
    } catch (err: any) {
      notify({ message: err.message || "Failed to remove ritual", title: "Error", status: "error" });
      onRefresh(); // Restore state on failure
    }
  }, [notify, onRefresh]);

  const updateHabitData = useCallback(async (id: string, updates: Partial<Habit>) => {
    try {
      const habit = initialHabits.find(h => String(h.id) === String(id));
      if (!habit) return;
      const table = habit.is_mastery ? "user_mastery" : "study_habits";
      
      // Sanitization: Remove calculated fields that don't exist in the DB schema
      const { current_streak, max_streak, ...cleanUpdates } = updates as any;

      // OPTIMISTIC: Synchronize manifestations locally
      if (setHabits) {
        setHabits(prev => prev.map(h => String(h.id) === String(id) ? { ...h, ...cleanUpdates } : h));
      }

      const { error } = await supabase.from(table).update(cleanUpdates).eq("id", id);
      if (error) throw error;
      // Removed onRefresh() 
      notify({ message: "Task Updated Succesfully", status: "success", title: "Task Updated" });
    } catch (err: any) {
      notify({ message: err.message || "Update Failed", title: "Error", status: "error" });
      onRefresh(); // Manifest restoration on failure
    }
  }, [initialHabits, notify, onRefresh]);

  const createHabit = useCallback(async (habitData: Partial<Habit>) => {
    if (!user?.id) return;
    try {
      // `selectedDate` is a local calendar date. Serializing it through
      // toISOString() shifts it to the previous day in time zones ahead of UTC.
      const scheduledDate = selectedDate || new Date();
      const newHabit: any = {
        user_id: user.id,
        name: habitData.name || "New Task",
        priority: habitData.priority || "MEDIUM",
        start_time: habitData.start_time || "09:00",
        end_time: habitData.end_time || "10:00",
        progress: Array(31).fill(false),
        month: scheduledDate.getMonth() + 1,
        year: scheduledDate.getFullYear(),
        exam_id: examId,
        is_recurring: habitData.duration_type !== "DAILY",
        duration_type: habitData.duration_type || "MONTHLY",
        scheduled_date: getLocalDateString(scheduledDate)
      };
      
      const { error } = await supabase.from("study_habits").insert(newHabit);
      if (error) throw error;
      onRefresh();
      notify({ message: "Task created", title: "Success", status: "success" });
    } catch (err: any) {
      notify({ message: err.message || "Creation Failed", title: "Error", status: "error" });
    }
  }, [user?.id, selectedDate, viewMonth, viewYear, examId, onRefresh, notify]);

  return {
    viewMonth, viewYear, monthName: new Date(viewYear, viewMonth - 1).toLocaleString("default", { month: "long" }),
    daysInMonth, today, viewMode, setViewMode, activeWeek, setActiveWeek, 
    searchTerm, setSearchTerm, unlockPastDays, setUnlockPastDays,
    reminderTest, setReminderTest, renderedDays, realHabits, filteredHabits,
    dailyStats, overallProgress, dailyHours, habitsWithStreaks,
    dailyPercents, weeklyDone,
    handleAddMastery, editHabit, handleDelete, updateHabitData, createHabit,
    duplicateHabit, dismissRenewal, dismissedRenewals
  };
};
