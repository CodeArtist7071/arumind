import { configureStore } from "@reduxjs/toolkit";
import userReducer from "./slice/userSlice";
import examReducer from "./slice/examSlice";
import examSubjectReducer from "./slice/examSubjectSlice";
import chapterReducer from "./slice/chapterSlice";
import questionReducer from "./slice/questionSlice";
import habitReducer from "./slice/habitSlice";
import examBoardReducer from "./slice/examBoardSlice";
import adaptiveReducer from "./slice/adaptiveQuestionSlice";
import uiReducer from "./slice/uiSlice";

export const store = configureStore({
  reducer: {
    user: userReducer,
    exams: examReducer,
    examSubject: examSubjectReducer,
    chapters: chapterReducer,
    questions: questionReducer,
    habits: habitReducer,
    examBoards: examBoardReducer,
    adaptive: adaptiveReducer,
    ui: uiReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
