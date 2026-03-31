import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { getExams } from "../services/examService";


export const fetchExams = createAsyncThunk("exams/fetchAllExams", getExams);

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
  examData: examProps[];
}

const initialState: examState = {
  error: null,
  loading: false,
  examData:[],
};

export const examSlice = createSlice({
  name: "exams",
  initialState: initialState,
  reducers: {},
  extraReducers(builder) {
    builder
      .addCase(fetchExams.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchExams.fulfilled, (state, action) => {
        state.loading = false;
        state.examData = action.payload;
      })
      .addCase(fetchExams.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export default examSlice.reducer
