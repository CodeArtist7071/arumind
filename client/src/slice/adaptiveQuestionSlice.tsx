// slice/adaptiveQuestionSlice.ts
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import {
  getAdaptiveQuestions,
  getUserAbility,
  saveUserAbility,
  computeInitialTheta,
} from "../services/questionService";
import {
  getDifficultyFromTheta,
  getLiveAdjustedDifficulty,
  updateTheta,
  type DifficultyLevel,
  type AbilityScore,
} from "../utils/adaptiveDifficulty";

interface AdaptiveState {
  questions: any[];
  currentIndex: number;
  ability: AbilityScore;
  currentDifficulty: DifficultyLevel;
  seenIds: string[];
  sessionCorrect: number;
  sessionWrong: number;
  loading: boolean;
  error: string | null;
}

const initialState: AdaptiveState = {
  questions: [],
  currentIndex: 0,
  ability: { theta: 0.3, streak: 0, total_seen: 0, total_correct: 0 },
  currentDifficulty: "Easy",
  seenIds: [],
  sessionCorrect: 0,
  sessionWrong: 0,
  loading: false,
  error: null,
};

// ── Thunks ──────────────────────────────────────────────────────────────────

export const initAdaptiveSession = createAsyncThunk(
  "adaptive/init",
  async ({
    userId,
    examId,
    chapterId,
    language = "en",
  }: {
    userId: string;
    examId: string;
    chapterId: string;
    language?: "en" | "od";
  }) => {
    // 1. Load saved ability or compute from history
    let ability = await getUserAbility(userId, chapterId);

    if (!ability) {
      const theta = await computeInitialTheta(userId, chapterId);
      ability = { theta, streak: 0, total_seen: 0, total_correct: 0 };
    }

    const difficulty = getDifficultyFromTheta(ability.theta);

    // 2. Fetch first batch of questions at target difficulty
    const questions = await getAdaptiveQuestions(
      chapterId,
      difficulty,
      [],
      10,       // fetch 10 at a time
      language
    );

    return { ability, difficulty, questions };
  }
);

export const submitAdaptiveAnswer = createAsyncThunk(
  "adaptive/submitAnswer",
  async (
    {
      userId,
      examId,
      chapterId,
      questionId,
      selectedOption,
      correctAnswer,
      difficulty,
      timeSpentSeconds,
      currentAbility,
      seenIds,
      sessionCorrect,
      sessionWrong,
      language,
    }: {
      userId: string;
      examId: string;
      chapterId: string;
      questionId: string;
      selectedOption: string | null;
      correctAnswer: string;
      difficulty: DifficultyLevel;
      timeSpentSeconds: number;
      currentAbility: AbilityScore;
      seenIds: string[];
      sessionCorrect: number;
      sessionWrong: number;
      language: "en" | "od";
    }
  ) => {
    const wasCorrect = selectedOption === correctAnswer;
    const wasSkipped = !selectedOption;

    // Update theta
    const newAbility = updateTheta(
      currentAbility,
      wasCorrect,
      wasSkipped,
      timeSpentSeconds,
      difficulty
    );

    // Persist to Supabase
    await saveUserAbility(userId, examId, chapterId, newAbility);

    // New session counters
    const newSessionCorrect = wasCorrect ? sessionCorrect + 1 : 0;
    const newSessionWrong = !wasCorrect && !wasSkipped ? sessionWrong + 1 : 0;

    // Adjust live difficulty
    const newDifficulty = getLiveAdjustedDifficulty(
      newAbility.theta,
      newSessionCorrect,
      newSessionWrong,
      difficulty
    );

    // Fetch next question at new difficulty
    const nextQuestions = await getAdaptiveQuestions(
      chapterId,
      newDifficulty,
      [...seenIds, questionId],
      5,
      language
    );

    return {
      newAbility,
      newDifficulty,
      nextQuestions,
      wasCorrect,
      newSessionCorrect,
      newSessionWrong,
    };
  }
);

// ── Slice ───────────────────────────────────────────────────────────────────

const adaptiveSlice = createSlice({
  name: "adaptive",
  initialState,
  reducers: {
    resetAdaptive: () => initialState,
  },
  extraReducers: (builder) => {
    builder
      .addCase(initAdaptiveSession.pending, (state) => {
        state.loading = true;
      })
      .addCase(initAdaptiveSession.fulfilled, (state, action) => {
        state.loading = false;
        state.ability = action.payload.ability;
        state.currentDifficulty = action.payload.difficulty;
        state.questions = action.payload.questions;
        state.seenIds = action.payload.questions.map((q: any) => q.id);
        state.currentIndex = 0;
      })
      .addCase(submitAdaptiveAnswer.fulfilled, (state, action) => {
        const {
          newAbility,
          newDifficulty,
          nextQuestions,
          wasCorrect,
          newSessionCorrect,
          newSessionWrong,
        } = action.payload;

        state.ability = newAbility;
        state.currentDifficulty = newDifficulty;
        state.sessionCorrect = newSessionCorrect;
        state.sessionWrong = newSessionWrong;
        state.currentIndex += 1;

        // Append new questions, avoiding dupes
        const existingIds = new Set(state.seenIds);
        const fresh = nextQuestions.filter((q: any) => !existingIds.has(q.id));
        state.questions = [...state.questions, ...fresh];
        state.seenIds = [...state.seenIds, ...fresh.map((q: any) => q.id)];
      });
  },
});

export const { resetAdaptive } = adaptiveSlice.actions;
export default adaptiveSlice.reducer;
