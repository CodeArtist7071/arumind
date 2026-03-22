import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { getUserProfile } from "../services/userServices";


interface UserState {
    user : any | null;
    profile : any | null;
    loading : boolean;
    error :string | null;
}

const initialState: UserState ={
    user:null,
    profile:null,
    loading:false,
    error:null
}

export const fetchUserProfile = createAsyncThunk("user/fetchUserProfile", getUserProfile)

export const userSlice = createSlice({
    name:"user",
    initialState,
    reducers:{
        clearUser:(state)=> {
            state.user = null;
            state.profile = null;
            state.error = null;
        },
        updateUserLocally:(state, action) => {
            if (state.profile) {
                state.profile = { ...state.profile, ...action.payload };
            }
        }
    },
    extraReducers(builder) {
        builder.addCase(fetchUserProfile.pending,(state)=>{
            state.loading = true;
            state.error = null;
        }).addCase(fetchUserProfile.fulfilled,(state,action)=>{
            state.loading = false;
            state.user = action.payload.user;
            state.profile = action.payload.profile;
        }).addCase(fetchUserProfile.rejected,(state,action)=>{
            state.loading = false;
            state.error = action.payload as string;
        })
    },
})

export const {clearUser, updateUserLocally} = userSlice.actions;
export default userSlice.reducer;