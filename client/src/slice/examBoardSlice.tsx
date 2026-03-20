import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { getExamBoards } from "../services/examService";


export const fetchBoardExams = createAsyncThunk("exams/fetchAllExamBoard", getExamBoards);

export interface examProps{
created_at:any;
description:string;
full_name:string;
id:string;
is_active:boolean;
name:string;
type:string;
}

interface examState {
  error: string | null;
  loading: boolean;
  examData:any;
}

const initialState: examState = {
  error: null,
  loading: false,
  examData:[],
};

export const examBoardSlice = createSlice({
  name: "examBoard",
  initialState: initialState,
  reducers: {},
  extraReducers(builder) {
    builder
      .addCase(fetchBoardExams.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchBoardExams.fulfilled, (state, action) => {
        state.loading = false;
        state.examData = action.payload;
      })
      .addCase(fetchBoardExams.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export default examBoardSlice.reducer