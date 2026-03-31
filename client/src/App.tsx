import "./App.css";
import React, { Suspense, lazy, useEffect, useState } from "react";
import { Navigate, createBrowserRouter, createRoutesFromElements, RouterProvider } from "react-router";
import { Route } from "react-router";
import { Authlayout } from "./layouts/AuthLayout";
import { supabase } from "./utils/supabase";
import { fetchUserProfile } from "./slice/userSlice";
import { useDispatch, useSelector } from "react-redux";
import type { AppDispatch, RootState } from "./store";
import { fetchExams } from "./slice/examSlice";
import { SplashScreen } from "./components/ui/SplashScreen";
import NotificationsSystem, { wyboTheme, useNotifications, setUpNotifications } from "reapop";
import ScrollToTop from "./components/ScrollToTop";

// --- PERFORMANCE: DYNAMIC MANIFESTATIONS (CODE SPLITTING) ---
const HomePage = lazy(() => import("./pages/HomePage"));
const Login = lazy(() => import("./components/Login"));
const Register = lazy(() => import("./components/Register"));
const Results = lazy(() => import("./pages/userPanel/Results"));
const ResultsHistory = lazy(() => import("./pages/userPanel/ResultsHistory"));
const PerformanceAnalytics = lazy(() => import("./pages/userPanel/PerformanceAnalytics"));
const StudyPlanner = lazy(() => import("./pages/userPanel/StudyPlanner"));
const MockTests = lazy(() => import("./pages/userPanel/MockTests"));
const UserDashboard = lazy(() => import("./pages/userPanel/UserDashboard"));
const UserPanelLayout = lazy(() => import("./layouts/UserPanelLayout"));
const Exam = lazy(() => import("./components/Exam"));
const UserDashboardLayout = lazy(() => import("./layouts/UserDashboardLayout").then(m => ({ default: m.UserDashboardLayout })));
const PracticeTest = lazy(() => import("./components/ui/PracticeTest"));
const MockTest = lazy(() => import("./components/ui/MockTest"));
const ConfirmOAuthPage = lazy(() => import("./components/ConfirmOAuth"));
const Profile = lazy(() => import("./pages/Profile"));
const AdminPanelLayout = lazy(() => import("./layouts/AdminPanelLayout"));
const AdminDashboard = lazy(() => import("./pages/adminPanel/AdminDashboard"));
const UserManagement = lazy(() => import("./pages/adminPanel/UserManagement"));
const ExamsManagement = lazy(() => import("./pages/adminPanel/ExamsManagement"));
const SubjectsManagement = lazy(() => import("./pages/adminPanel/SubjectsManagement"));
const ChaptersManagement = lazy(() => import("./pages/adminPanel/ChaptersManagement"));
const QuestionsManagement = lazy(() => import("./pages/adminPanel/QuestionsManagement"));
const FeaturesManagement = lazy(() => import("./pages/adminPanel/FeaturesManagement"));
const CurriculumLattice = lazy(() => import("./pages/adminPanel/CurriculumLattice"));
const ExamBoardsManagement = lazy(() => import("./pages/adminPanel/ExamBoardsManagement"));
const ExamGoalSelection = lazy(() => import("./pages/ExamSelection"));
const UserStudyPlanner = lazy(() => import("./layouts/UserStudyPlanner").then(m => ({ default: m.UserStudyPlanner })));
const ExamsPlanning = lazy(() => import("./pages/userPanel/ExamsPlanning").then(m => ({ default: m.ExamsPlanning })));
const ExamsList = lazy(() => import("./pages/ExamsList").then(m => ({ default: m.ExamsList })));
const ResultSelection = lazy(() => import("./pages/resultpage/ResultSelection"));
const AdminGuard = lazy(() => import("./components/AdminGuard").then(m => ({ default: m.AdminGuard })));
const MockTestPreferencePage = lazy(() => import("./pages/userPanel/MockTestPreferencePage"));




function App() {
  const dispatch = useDispatch<AppDispatch>();
  const { notifications, dismissNotification } = useNotifications();
  // Safe destructuring of userSlice state manifestation
  const { user, loading: userLoading } = useSelector((state: RootState) => state.user ?? { user: null, loading: false });
  const [isInitializing, setIsInitializing] = useState(true);

  setUpNotifications({
    defaultProps: {
      position: "top-right",
      dismissible: true,
      dismissAfter: 1,
    },
  });

  useEffect(() => {
    let subscription: any = null;

    const initAuth = async () => {
      // 1. Identify existing session carefully
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        // Only fetch if session exists, avoid double-dispatch
        await dispatch(fetchUserProfile());
      }

      // 2. Listen for future auth manifestations
      const { data } = supabase.auth.onAuthStateChange(
        (event, session) => {
          if (event === 'SIGNED_IN' && session?.user) {
             dispatch(fetchUserProfile());
          }
        }
      );
      subscription = data.subscription;

      // Finalize initialization manifest
      setIsInitializing(false);
    };

    initAuth();

    return () => {
      if (subscription) subscription.unsubscribe();
    };
  }, [dispatch]);

  const router = createBrowserRouter(
    createRoutesFromElements(
      <>
        <Route path="/" element={<HomePage />} />
        <Route element={<Authlayout />}>
          <Route
            path="/login"
            element={!user ? <Login /> : <Navigate to="/user/dashboard" replace />}
          />
          <Route
            path="/register"
            element={!user ? <Register /> : <Navigate to="/user/dashboard" replace />}
          />
        </Route>

        {/* --- ADMIN MANIFESTATION --- */}
        <Route path="admin" element={<AdminGuard />}>
          <Route element={<AdminPanelLayout />}>
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="lattice" element={<CurriculumLattice />} />
            <Route path="boards" element={<ExamBoardsManagement />} />
            <Route path="users" element={<UserManagement />} />
            <Route path="features" element={<FeaturesManagement />} />
            <Route path="exams" element={<ExamsManagement />} />
            <Route path="subjects" element={<SubjectsManagement />} />
            <Route path="chapters" element={<ChaptersManagement />} />
            <Route path="questions" element={<QuestionsManagement />} />
          </Route>
        </Route>
        
        <Route path="/select-exam-goals" element={<ExamGoalSelection />} />
        
        <Route
          path="/user"
          element={user ? <UserPanelLayout /> : <Navigate to="/login" replace />}
        >
          <Route element={<UserDashboardLayout />}>
            <Route path="select-exam-goals" element={<ExamGoalSelection />} />
            <Route path="dashboard" element={<UserDashboard />} />
            <Route path="dashboard/exam-lists" element={<ExamsList />} />
            <Route path="dashboard/exam/:eid" element={<Exam />} />
            <Route path="dashboard/exam/:eid/test/:sid/:cid" element={<PracticeTest />} />
          </Route>
          <Route element={<UserStudyPlanner />}>
            <Route path="plan-study/:eid" element={<StudyPlanner />} />
          </Route>
          <Route path="profile" element={<Profile />} />
          <Route path="performance" element={<PerformanceAnalytics />} />
          <Route path="plan-exams" element={<ExamsPlanning />} />
          <Route path="mock-tests" element={<MockTests />}>
            <Route path="preference/:examId" element={<MockTestPreferencePage />} />
          </Route>
          <Route path="mock-tests/session/:attemptId" element={<MockTest />} />
          <Route path="results/history" element={<ResultsHistory />} />
          <Route path="results" element={<ResultSelection />} />
          <Route path="results/:attemptId" element={<Results />} />
        </Route>
        <Route path="/user/confirm-oauth" element={<ConfirmOAuthPage />} />
      </>
    )
  );

  // --- FLAGSHIP: PRESENCE LAYER ---
  // The SplashScreen stays visible while Redux is loading OR the app is initializing
  const isSplashVisible = isInitializing || userLoading;

  return (
    <>
      <SplashScreen isVisible={isSplashVisible} />
      
      <NotificationsSystem
        notifications={notifications}
        dismissNotification={(id) => dismissNotification(id)}
        theme={wyboTheme}
      />
      
      <Suspense fallback={<SplashScreen isVisible={true} />}>
        <RouterProvider router={router} />
      </Suspense>
      
      <ScrollToTop />
    </>
  );
}

export default App;
