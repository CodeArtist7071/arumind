import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { getFilteredQuestions, getQuestions, getQuestionsByIds } from "../services/questionService";

export const fetchQuestion = createAsyncThunk(
  "questions/fetchQuestions",
  async (chapter_id: string, thinkAPI) => {
    try {
      const data = await getQuestions(chapter_id);
      console.log("fetching questions.....",data);
      return data;
    } catch (error: any) {
      return thinkAPI.rejectWithValue(error.message);
    }
  },
);

export const fetchFilteredQuestion = createAsyncThunk("questions/fetchFilteredQuestions",
  async(user_id:string,thinkAPI)=>{
    
    try {
      const data = await getFilteredQuestions(user_id);
      return data;
    } catch (error: any) {
      return thinkAPI.rejectWithValue(error.message);
    }
  }
)

export const fetchQuestionsByIds = createAsyncThunk(
  "questions/fetchQuestionsByIds",
  async (ids: string[], thinkAPI) => {
    try {
      const data = await getQuestionsByIds(ids);
      return data;
    } catch (error: any) {
      return thinkAPI.rejectWithValue(error.message);
    }
  }
);


interface QuestionState {
  loading: boolean;
  error: string | null;
  data: any[];
  ids: any[];
  questionLoading:boolean;
  questionError:string | null;
  filteredQuestionData:any[] | any | {},
}

const initialState: QuestionState = {
  loading: false,
  questionLoading:false,
  questionError:null,
  error: null,
  filteredQuestionData:[],
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
      }).addCase(fetchFilteredQuestion.pending, (state) => {
        state.questionLoading = true;
        state.questionError = null;
      })
      .addCase(fetchFilteredQuestion.fulfilled, (state, action) => {
        state.questionLoading = false;
        state.filteredQuestionData = action.payload;
      })
      .addCase(fetchFilteredQuestion.rejected, (state, action) => {
        state.questionLoading = false;
        state.questionError = action.payload as string;
      })
      .addCase(fetchQuestionsByIds.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchQuestionsByIds.fulfilled, (state, action) => {
        state.loading = false;
        state.data = action.payload;
      })
      .addCase(fetchQuestionsByIds.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export default questionSlice.reducer;
