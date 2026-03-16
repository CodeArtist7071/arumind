import "./App.css";
import HomePage from "../src/pages/HomePage";
import { Navigate, Routes } from "react-router";
import { Route } from "react-router";
import { Authlayout } from "./layouts/AuthLayout";
import Login from "./components/Login";
import Register from "./components/Register";
import Results from "./pages/userPanel/Results";
import ResultsHistory from "./pages/userPanel/ResultsHistory";
import PerformanceAnalytics from "./pages/userPanel/PerformanceAnalytics";
import StudyPlanner from "./pages/userPanel/StudyPlanner";
import MockTests from "./pages/userPanel/MockTests";
import UserDashboard from "./pages/userPanel/UserDashboard";
import UserPanelLayout from "./layouts/UserPanelLayout";
import { supabase } from "./utils/supabase";
import { useEffect, useState } from "react";
import { fetchUserProfile } from "./slice/userSlice";
import { useDispatch, useSelector } from "react-redux";
import type { AppDispatch, RootState } from "./store";
import { fetchExams } from "./slice/examSlice";
import Exam from "./components/Exam";
import { UserDashboardLayout } from "./layouts/UserDashboardLayout";
import PracticeTest from "./components/ui/PracticeTest";
import ConfirmOAuthPage from "./components/ConfirmOAuth";
import Profile from "./pages/Profile";
import AdminPanelLayout from "./layouts/AdminPanelLayout";
import UserManagement from "./pages/adminPanel/UserManagement";
import NotificationsSystem, {
  atalhoTheme,
  setUpNotifications,
  useNotifications,
  wyboTheme,
} from "reapop";
import ExamGoalSelection from "./pages/ExamSelection";
import { UserStudyPlanner } from "./layouts/UserStudyPlanner";
import { ExamsPlanning } from "./pages/userPanel/ExamsPlanning";
import { ExamsList } from "./pages/ExamsList";

function App() {
  const dispatch = useDispatch<AppDispatch>();
  const { notifications, dismissNotification } = useNotifications();
  const { user, loading } = useSelector(
    (state: RootState) => state.user ?? null,
  );
  setUpNotifications({
    defaultProps: {
      position: "top-right",
      dismissible: true,
    },
  });
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
      setUpNotifications({
        defaultProps: {
          position: "top-right",
          dismissible: true,
          dismissAfter: 1,
        },
      });
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

  // console.log("checksss.....", user);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Loading...
      </div>
    );
  }

  return (
    <>
      <NotificationsSystem
        notifications={notifications}
        dismissNotification={(id) => dismissNotification(id)}
        theme={wyboTheme}
      />
      <Routes>
        <Route path="/" element={<HomePage />} />

        {/* Public Routes */}
        <Route
          path="/login"
          element={
            !user ? <Login /> : <Navigate to="/user/dashboard" replace />
          }
        />
        <Route
          path="/register"
          element={
            !user ? <Register /> : <Navigate to="/user/dashboard" replace />
          }
        />
        <Route path="admin" element={<AdminPanelLayout />}>
          <Route path="users" element={<UserManagement />} />
        </Route>
        <Route path="admin/login" element={<Login />} />
        <Route path="/select-exam-goals" element={<ExamGoalSelection />} />
        {/* Protected Routes */}
        <Route
          path="/user"
          element={
            user ? (
              <>
                {" "}
                <UserPanelLayout />
              </>
            ) : (
              <Navigate to="/login" replace />
            )
          }
        >
          <Route element={<UserDashboardLayout />}>
            <Route path="select-exam-goals" element={<ExamGoalSelection />} />
            <Route path="dashboard" element={<UserDashboard />} />
            <Route path="dashboard/exam-lists" element={<ExamsList />} />
            <Route path="dashboard/exam/:eid" element={<Exam />} />
            <Route
              path="dashboard/exam/:eid/test/:sid/:cid"
              element={<PracticeTest />}
            />
          </Route>
          <Route element={<UserStudyPlanner />}>
            <Route path="plan-study/:eid" element={<StudyPlanner />} />
          </Route>
          <Route path="profile" element={<Profile />} />
          <Route path="performance" element={<PerformanceAnalytics />} />
          <Route path="plan-exams" element={<ExamsPlanning />} />

          <Route path="mock-tests" element={<MockTests />} />
          <Route path="confirm-oauth" element={<ConfirmOAuthPage />} />
          <Route path="results" element={<ResultsHistory />} />
          <Route path="results/:attemptId" element={<Results />} />
        </Route>
      </Routes>
    </>
  );
}

export default App;
