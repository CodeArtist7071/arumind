import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { getQuestions } from "../services/questionService";

export const fetchQuestion = createAsyncThunk(
  "questions/fetchQuestions",
  async (chapter_id: string, thinkAPI) => {
    try {
      const data = await getQuestions(chapter_id);
      return data;
    } catch (error: any) {
      return thinkAPI.rejectWithValue(error.message);
    }
  },
);
interface QuestionState {
  loading: boolean;
  error: string | null;
  data: any[];
  ids: any[];
}

const initialState: QuestionState = {
  loading: false,
  error: null,
  data: [],
  ids: [],
};

export const questionSlice = createSlice({
  name: "questions",
  initialState,
  reducers: {},
  extraReducers(builder) {
    builder
      .addCase(fetchQuestion.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchQuestion.fulfilled, (state, action) => {
        state.loading = false;
        state.data = action.payload;
      })
      .addCase(fetchQuestion.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export default questionSlice.reducer;
