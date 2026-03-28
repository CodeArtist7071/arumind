import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

interface UIState {
  isEyeProtectionActive: boolean;
  blueLightShield: boolean;
  // Test Session Global State
  isTestActive: boolean;
  testTimeLeft: number | null;
  testLanguage: "en" | "od";
  testTitle: string;
  triggerSubmit: boolean;
}

const initialState: UIState = {
  isEyeProtectionActive: localStorage.getItem("eye-protection") === "active",
  blueLightShield: localStorage.getItem("blue-light-shield") === "active",
  isTestActive: false,
  testTimeLeft: null,
  testLanguage: "en",
  testTitle: "",
  triggerSubmit: false,
};

const uiSlice = createSlice({
  name: "ui",
  initialState,
  reducers: {
    toggleEyeProtection: (state) => {
      state.isEyeProtectionActive = !state.isEyeProtectionActive;
      localStorage.setItem("eye-protection", state.isEyeProtectionActive ? "active" : "inactive");
    },
    setEyeProtection: (state, action: PayloadAction<boolean>) => {
      state.isEyeProtectionActive = action.payload;
      localStorage.setItem("eye-protection", action.payload ? "active" : "inactive");
    },
    toggleBlueLightShield: (state) => {
      state.blueLightShield = !state.blueLightShield;
      localStorage.setItem("blue-light-shield", state.blueLightShield ? "active" : "inactive");
    },
    setBlueLightShield: (state, action: PayloadAction<boolean>) => {
      state.blueLightShield = action.payload;
      localStorage.setItem("blue-light-shield", action.payload ? "active" : "inactive");
    },
    // Test Session Actions
    startTestSession: (state, action: PayloadAction<{ title: string; language: "en" | "od" }>) => {
      state.isTestActive = true;
      state.testTitle = action.payload.title;
      state.testLanguage = action.payload.language;
      state.triggerSubmit = false;
    },
    updateTestTime: (state, action: PayloadAction<number | null>) => {
      state.testTimeLeft = action.payload;
    },
    setTestLanguage: (state, action: PayloadAction<"en" | "od">) => {
      state.testLanguage = action.payload;
    },
    triggerTestSubmit: (state) => {
      state.triggerSubmit = true;
    },
    clearTestSession: (state) => {
      state.isTestActive = false;
      state.testTimeLeft = null;
      state.triggerSubmit = false;
    },
  },
});

export const { 
  toggleEyeProtection, 
  setEyeProtection, 
  toggleBlueLightShield, 
  setBlueLightShield,
  startTestSession,
  updateTestTime,
  setTestLanguage,
  triggerTestSubmit,
  clearTestSession
} = uiSlice.actions;
export default uiSlice.reducer;
