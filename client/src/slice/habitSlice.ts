import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { supabase } from "../utils/supabase";
import type { habit } from "../types/habit";

interface HabitState {
  tasks: habit[];
  weekDays: any[];
  loading: boolean;
  progress: number;
  error: string | null;
}

const initialState: HabitState = {
  tasks: [],
  weekDays: [],
  loading: false,
  progress: 0,
  error: null,
};

export const fetchDayTasks = createAsyncThunk<
  habit[],
  { programDayId: string; userId: string }
>("habits/fetchDayTasks", async ({ programDayId, userId }) => {
  const { data, error } = await supabase
    .from("day_tasks")
    .select(
      `
        id,
        tasks (
          title,
          xp_reward
        ),
        user_task_progress (
          completed
        )
      `,
    )
    .eq("program_day_id", programDayId);

  if (error) throw error;

  return data.map((item: any) => ({
    id: item.id,
    title: item.tasks?.title ?? "",
    xp_reward: item.tasks?.xp_reward ?? 0,
    completed: item.user_task_progress?.[0]?.completed ?? false,
  }));
});

export const toggleTask = createAsyncThunk(
  "habits/toggleTask",
  async ({
    dayTaskId,
    userId,
    completed,
  }: {
    dayTaskId: string;
    userId: string;
    completed: boolean;
  }) => {
    const { data, error } = await supabase
      .from("user_task_progress")
      .upsert({
        user_id: userId,
        day_task_id: dayTaskId,
        completed: completed,
        completed_at: completed ? new Date() : null,
      })
      .select();

    if (error) throw error;

    return data;
  },
);

const habitSlice = createSlice({
  name: "habits",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchDayTasks.pending, (state) => {
        state.loading = true;
      })

      .addCase(fetchDayTasks.fulfilled, (state, action) => {
        state.loading = false;
        state.tasks = action.payload;
      })

      .addCase(fetchDayTasks.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })
      .addCase(fetchDayProgress.fulfilled, (state, action) => {
        state.progress = action.payload;
      })
      .addCase(fetchWeekTracker.fulfilled, (state, action) => {
        state.weekDays = action.payload;
      });
  },
});

export default habitSlice.reducer;

export const fetchDayProgress = createAsyncThunk<
  number,
  { programDayId: string; userId: string }
>("habits/fetchDayProgress", async ({ programDayId, userId }) => {
  const { data, error } = await supabase
    .from("user_day_progress")
    .select("completion_percentage")
    .eq("user_id", userId)
    .eq("program_day_id", programDayId)
    .single();

  if (error && error.code !== "PGRST116") {
    throw error;
  }

  return data?.completion_percentage ?? 0;
});

export const fetchWeekTracker = createAsyncThunk(
  "habits/fetchWeekTracker",
  async ({
    weekNumber,
    programId,
    userId,
  }: {
    weekNumber: number;
    programId: string;
    userId: string;
  }) => {
    const { data, error } = await supabase
      .from("program_days")
      .select(
        `
        id,
        day_number,
        week_number,
        day_tasks (
          id,
          tasks (
            id,
            title,
            xp_reward
          )
        )
      `,
      )
      .eq("program_id", programId)
      .eq("week_number", weekNumber)
      .order("day_number");

    if (error) throw error;
  console.log("new error",error)
    return data;
  },
);
