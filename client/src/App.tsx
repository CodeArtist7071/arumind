import "./App.css";
import HomePage from "../src/pages/HomePage";
import { Navigate, Routes } from "react-router";
import { Route } from "react-router";
import { Authlayout } from "./layouts/AuthLayout";
import Login from "./components/Login";
import Register from "./components/Register";
import Results from "./pages/userPanel/Results";
import PerformanceAnalytics from "./pages/userPanel/PerformanceAnalytics";
import StudyPlanner from "./pages/userPanel/StudyPlanner";
import MockTests from "./pages/userPanel/MockTests";
import UserDashboard from "./pages/userPanel/UserDashboard";
import UserPanelLayout from "./layouts/UserPanelLayout";
import supabase from "./utils/supabase";
import { useEffect, useState } from "react";
import { fetchUserProfile } from "./slice/userSlice";
import { useDispatch, useSelector } from "react-redux";
import type { AppDispatch, RootState } from "./store";
import { fetchExams } from "./slice/examSlice";
import Exam from "./components/Exam";
import { UserDashboardLayout } from "./layouts/UserDashboardLayout";
import PracticeTest from "./components/ui/PracticeTest";

function App() {
  const dispatch = useDispatch<AppDispatch>();
  const { user, loading } = useSelector(
    (state: RootState) => state.user ?? null,
  );
  // useEffect(() => {
  //   // 1️⃣ Restore session on page load
  //   supabase.auth.getSession().then(({ data: { session } }) => {
  //     setUser(session?.user ?? null);
  //     setLoading(false);
  //   });

  //   // 2️⃣ Listen for login/logout changes
  //   const { data: subscription } = supabase.auth.onAuthStateChange(
  //     (_event, session) => {
  //       setUser(session?.user ?? null);
  //     }
  //   );

  //   // 3️⃣ Cleanup subscription
  //   return () => {
  //     subscription.subscription.unsubscribe();
  //   };
  // }, []);

  useEffect(() => {
    const initAuth = async () => {
      const { data: listener } = supabase.auth.onAuthStateChange(
        (_event, session) => {
          if (session?.user) {
            dispatch(fetchUserProfile());
          }
        },
      );

      const { data } = await supabase.auth.getSession();

      if (data?.session?.user) {
        dispatch(fetchUserProfile());
      }
      return () => {
        listener.subscription.unsubscribe();
      };
    };

    initAuth();
  }, []);

  console.log("checksss.....", user);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Loading...
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<HomePage />} />

      {/* Public Routes */}
      <Route
        path="/login"
        element={!user ? <Login /> : <Navigate to="/user/dashboard" replace />}
      />
      <Route
        path="/register"
        element={
          !user ? <Register /> : <Navigate to="/user/dashboard" replace />
        }
      />

      {/* Protected Routes */}
      <Route
        path="/user"
        element={user ? <UserPanelLayout /> : <Navigate to="/login" replace />}
      >
        <Route element={<UserDashboardLayout />}>
          <Route path="dashboard" element={<UserDashboard />} />
          <Route path="dashboard/exam/:eid" element={<Exam />} />
          <Route
            path="dashboard/exam/:eid/test/:sid/:cid"
            element={<PracticeTest />}
          />
        </Route>

        <Route path="performance" element={<PerformanceAnalytics />} />
        <Route path="study-planner" element={<StudyPlanner />} />
        <Route path="mock-tests" element={<MockTests />} />
        <Route path="results" element={<Results />} />
      </Route>
    </Routes>
  );
}

export default App;
