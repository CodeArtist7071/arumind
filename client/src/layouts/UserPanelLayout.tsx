import React, { cloneElement, useState, useEffect, useRef } from "react";
import { ActionCenter } from "../components/ui/ActionCenter";
import {
  BarChart,
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  LogOut,
  Notebook,
  Package,
  School,
  Sun,
  Moon,
  TrendingUp,
  History,
  Target,
  Eye,
  EyeOff,
  Timer,
  LayoutGrid,
  Book,
} from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import InstallAppButton from "../components/InstallAppButton";
import { useTheme } from "../hooks/useTheme";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router";
import type { AppDispatch, RootState } from "../store";
import { supabase } from "../utils/supabase";
import { clearUser } from "../slice/userSlice";
import {
  toggleEyeProtection,
  triggerTestSubmit,
  setTestLanguage,
  toggleActionCenter,
} from "../slice/uiSlice";

const routeMetadata: Record<string, { label: string; title: string }> = {
  "/user/dashboard": {
    label: "Journal Overview",
    title: "Ecological Dashboard",
  },
  "/user/performance": { label: "Growth Analysis", title: "Syllabus Mastery" },
  "/user/plan-exams": { label: "Exam Rituals", title: "Strategic Planner" },
  "/user/mock-tests": { label: "Simulation Lab", title: "Testing Grounds" },
  "/user/results": {
    label: "Performance Records",
    title: "Achievement Manifest",
  },
  "/user/profile": { label: "Personal Identity", title: "User Manifesto" },
  "/user/dashboard/exam-lists": {
    label: "Syllabus Discovery",
    title: "Exam Registry",
  },
  "/user/results/history": { label: "Log Manifest", title: "Archive Manifest" },
};

export default function UserPanelLayout() {
  const { user, profile } = useSelector(
    (state: RootState) => state.user ?? { user: null, profile: null },
  );
  const {
    isEyeProtectionActive,
    blueLightShield,
    isTestActive,
    testTimeLeft,
    testLanguage,
    testTitle,
  } = useSelector((state: RootState) => state.ui);
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const [isCollapsed, setIsCollapsed] = useState(true);
  const sidebarRef = useRef<HTMLElement>(null);
  const { theme, toggleTheme } = useTheme();

  // Mobile Nav Manifestation: Scroll-to-Hide
  const [showNav, setShowNav] = useState(true);
  const [lastScrollTop, setLastScrollTop] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    const handleScroll = () => {
      const currentScrollTop = container.scrollTop;
      const diff = currentScrollTop - lastScrollTop;

      if (Math.abs(diff) < 5) return; // Jitter threshold

      if (currentScrollTop <= 0) {
        setShowNav(true); // Always manifest at start
      } else if (diff > 0) {
        // SCROLL DOWN -> HIDE (Standard Manifestation)
        setShowNav(false);
      } else {
        // SCROLL UP -> SHOW (Standard Manifestation)
        setShowNav(true);
      }
      setLastScrollTop(currentScrollTop);
    };

    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => container.removeEventListener("scroll", handleScroll);
  }, [lastScrollTop]);

  // Sidebar Auto-Collapse Manifestation
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        !isCollapsed &&
        sidebarRef.current &&
        !sidebarRef.current.contains(event.target as Node)
      ) {
        setIsCollapsed(true);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isCollapsed]);

  const firstExamId = profile?.target_exams?.[0] || "";

  const mobileNavItems = [
    {
      label: "Dashboard",
      icon: <LayoutDashboard size={20} />,
      path: "/user/dashboard",
    },
    {
      label: "Progress Meter",
      icon: <TrendingUp size={20} />,
      path: "/user/performance",
    },
    {
      label: "Time Table",
      icon: <History size={20} />,
      path: `/user/plan-study/${firstExamId}`,
    },
    {
      label: "Mock Test",
      icon: <Package size={20} />,
      path: "/user/mock-tests",
    },
    // {
    //   label: "Practice",
    //   icon: <Book size={20} />,
    //   path: `/user/dashboard/exam/${firstExamId}`,
    // },
    {
      label: "Results",
      icon: <Target size={20} />,
      path: "/user/results",
    },
  ];

  const navItems = [
    {
      label: "Dashboard",
      icon: <LayoutDashboard size={20} />,
      path: "/user/dashboard",
    },
    {
      label: "Progress Meter",
      icon: <TrendingUp size={20} />,
      path: "/user/performance",
    },
    {
      label: "Time Table",
      icon: <History size={20} />,
      path: `/user/plan-study/${firstExamId}`,
    },
    {
      label: "Practice Test",
      icon: <Book size={20} />,
      path: `/user/dashboard/exam/${firstExamId}`,
    },
    {
      label: "Mock Test",
      icon: <Package size={20} />,
      path: "/user/mock-tests",
    },

    {
      label: "Results",
      icon: <Target size={20} />,
      path: "/user/results",
    },
  ];

  const handleEyeProtectionToggle = () => {
    dispatch(toggleEyeProtection());
  };

  const location = useLocation();
  const formatTime = (seconds: number | null) => {
    if (seconds === null) return "00:00";
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const currentMetadata = routeMetadata[location.pathname] || {
    label: "Plan Your Progress",
    title: "Study Planner",
  };

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) console.error("Logout Error", error);
    dispatch(clearUser());
    navigate("/login");
  };

  return (
    <div
      className={`flex h-dvh bg-surface font-narrative text-on-surface overflow-hidden transition-colors duration-500 ${isEyeProtectionActive ? "eye-protection-active" : ""}`}
    >
      {/* Action Center Component - Temporarily Suspended */}
      {/* <ActionCenter /> */}

      {/* Blue Light Shield: Amber Overlay */}
      {blueLightShield && (
        <div
          className="fixed inset-0 z-9999 pointer-events-none transition-all duration-1000 ease-botanical"
          style={{
            backgroundColor: "rgba(255, 145, 0, 0.08)",
            mixBlendMode: "multiply",
          }}
        />
      )}

      {/* Sidebar - Desktop */}
      <aside
        ref={sidebarRef}
        className={`hidden lg:flex border-r border-on-surface/5 flex-col h-full bg-surface-container-low transition-all duration-700 ease-botanical relative z-30 shadow-ambient ${
          isCollapsed ? "w-20" : "w-72"
        }`}
      >
        {/* Logo Section */}

        <div className="h-28 flex items-center px-4 mb-4">
          <div
            className="flex items-center gap-4 group cursor-pointer"
            onClick={() => navigate("/")}
          >
            <div className="size-12 bg-linear-to-br from-primary to-primary rounded-2xl flex items-center justify-center text-white shadow-lg shadow-primary/20 group-hover:rotate-6 transition-all duration-300">
              <School className="size-6" />
            </div>
            {!isCollapsed && (
              <div className="flex flex-col">
                <h1 className="text-2xl font-black tracking-tighter leading-none text-primary">
                  ARUMIND
                </h1>
                <span className="text-[10px] font-technical uppercase tracking-[0.2em] text-on-surface-variant opacity-60">
                  Your Personal Assistant
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Navigation Section */}
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto overflow-x-hidden">
          {navItems.map((item) => (
            <NavLink
              key={item.label}
              to={item.path}
              end={item.path === "/user/dashboard"}
              className={({ isActive }) =>
                `flex flex-row items-center justify-start px-3 py-2  rounded-4xl transition-all duration-300 group ${
                  isActive
                    ? "bg-primary text-white shadow-sm scale-105"
                    : "text-on-surface-variant hover:text-primary flex items-center justify-center hover:bg-surface-container-high hover:text-on-surface hover:dark:text-primary"
                }`
              }
            >
              <div className="shrink-0 group-hover:scale-110 my-1 flex items-center justify-center transition-transform duration-300">
                {cloneElement(item.icon as React.ReactElement<any>, {
                  color: "currentColor",
                  className: "size-6",
                })}
              </div>
              {!isCollapsed && (
                <span className="text-sm ml-3 font-technical uppercase tracking-widest font-black opacity-80 group-hover:opacity-100">
                  {item.label}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Action Buttons Section */}
        <div className="p-4 space-y-4">
          <InstallAppButton isCollapsed={isCollapsed} />

          <div className="flex gap-2">
            <button
              onClick={toggleTheme}
              className="flex-1 flex items-center justify-center p-2 rounded-full bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest hover:text-primary transition-all duration-300 group"
              title="Toggle Mood"
            >
              {theme === "dark" ? (
                <Sun className="size-5" />
              ) : (
                <Moon className="size-5" />
              )}
            </button>

            {/* <button
              onClick={handleEyeProtectionToggle}
              className={`flex-1 flex items-center justify-center p-2 rounded-full transition-all duration-300 group ${isEyeProtectionActive
                ? "bg-primary text-white shadow-sm"
                : "bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest hover:text-primary"
                }`}
              title="Eye Protection Mode"
            >
              {isEyeProtectionActive ? <Eye size={20} /> : <EyeOff size={20} />}
            </button> */}

            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="flex-1 flex items-center justify-center p-2 rounded-full bg-surface-container-high text-primary hover:bg-surface-container-highest transition-all duration-300"
            >
              <ChevronLeft
                className={`size-5 transition-transform duration-500 ${isCollapsed ? "rotate-180" : ""}`}
              />
            </button>
          </div>

          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-3 p-4 rounded-full text-on-surface-variant hover:text-red-600 hover:bg-red-500/5 transition-all duration-300 group"
          >
            <LogOut className="size-5 group-hover:-translate-x-1 transition-transform" />
            {!isCollapsed && (
              <span className="text-[10px] font-technical uppercase tracking-widest font-black">
                Close Session
              </span>
            )}
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col relative overflow-hidden bg-surface-container-low backdrop-blur-3xl transition-colors duration-500">
        {/* Editorial Dynamic Header - Now Multi-State */}
        <header className="h-15 md:h-25  flex items-center justify-between px-5 md:px-10 sticky top-0 z-20 border-b border-outline-variant/10">
          {!isTestActive ? (
            // Standard View: Page Context
            <>
              <div
                className="animate-reveal"
                key={location.pathname + "-title"}
              >
                <div className="flex flex-col">
                  <span className="text-[9px] md:text-sm font-technical uppercase tracking-[0.4em] text-primary opacity-60 mb-1">
                    {currentMetadata.label}
                  </span>
                  <h2 className="text-xl md:text-3xl font-black text-on-surface tracking-tighter leading-none">
                    {currentMetadata.title}
                  </h2>
                </div>
              </div>

              <div className="flex flex-col-reverse md:flex-row items-center gap-2 md:gap-6">
                {/* Action Center Toggle - Temporarily Suspended */}
                {/* <button 
                    onClick={() => dispatch(toggleActionCenter())}
                    className="size-14 rounded-4xl bg-surface-container-high/40 text-on-surface-variant hover:bg-surface-container-highest hover:text-primary transition-all duration-500 flex items-center justify-center group shadow-sm border border-outline-variant/5"
                    title="Action Center"
                  >
                    <LayoutGrid className="size-6 group-hover:rotate-90 transition-transform duration-700" />
                  </button> */}

                <div className="flex flex-col items-end mr-2">
                  <p className="hidden md:block text-[9px] font-technical font-black text-on-surface-variant opacity-40 uppercase tracking-widest">
                    {user?.email?.split("@")[0]}
                  </p>
                  <div className="flex items-center gap-2">
                    <div className="size-2 absolute right-4 top-2 bg-primary rounded-full animate-pulse" />
                    <span className="hidden md:block text-[9px] font-technical font-black text-primary uppercase tracking-widest">
                      Active User
                    </span>
                  </div>
                </div>
                <div
                  className="size-7 md:size-14 bg-linear-to-br from-primary to-primary-container rounded-2xl flex items-center justify-center text-white font-technical font-bold text-xl shadow-lg shadow-primary/20 hover:scale-110 active:scale-95 transition-all cursor-pointer group relative overflow-hidden"
                  onClick={() => navigate("/user/profile")}
                >
                  {user?.user_metadata?.avatar_url ||
                  user?.identities?.[0]?.identity_data?.avatar_url ? (
                    <>
                      <img
                        src={
                          user?.user_metadata?.avatar_url ||
                          user?.identities?.[0]?.identity_data?.avatar_url
                        }
                        alt="ID"
                        className="size-full object-cover"
                        loading="lazy"
                        decoding="async"
                      />
                    </>
                  ) : (
                    <span className="relative z-10">
                      {(profile?.full_name ||
                        user?.user_metadata?.full_name ||
                        user?.email)?.[0]?.toUpperCase() || ""}
                    </span>
                  )}
                  <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
            </>
          ) : (
            // Test View: Immersive Context
            <>
              <div className="animate-reveal" key="test-active-title">
                <div className="flex flex-col">
                  <span className="md:text-[10px] text-[8px] font-technical uppercase tracking-[0.4em] text-primary opacity-60 md:mb-2 mb-1">
                    Live Examination
                  </span>
                  <h2 className="md:text-3xl text-md font-black text-on-surface tracking-tighter leading-none">
                    {testTitle || "Subject Manifestation"}
                  </h2>
                </div>
              </div>

              <div className="flex items-center md:gap-8 gap-2">
                {/* Timer Pod */}
                {testTimeLeft !== null && (
                  <div className="flex items-center md:gap-5 gap-2 bg-surface-container-high/60 backdrop-blur-md md:px-8 md:py-3 px-4 py-2 rounded-full shadow-inner ring-1 ring-white/10 group">
                    <Timer className="text-tertiary size-5 animate-pulse" />
                    <div className="flex flex-row md:flex-col">
                      <span className="text-[8px] font-technical font-black text-tertiary uppercase tracking-widest opacity-40">
                        Tempo Reset
                      </span>
                      <span className="font-technical font-black text-on-surface text-xs md:text-2xl tracking-tighter tabular-nums">
                        {formatTime(testTimeLeft)}
                      </span>
                    </div>
                  </div>
                )}

                {/* Language Toggle */}
                {/* <div className="hidden bg-surface-container-low p-1 rounded-full shadow-inner border border-outline-variant/5">
                  <button
                    type="button"
                    onClick={() => dispatch(setTestLanguage("en"))}
                    className={`px-6 py-2 rounded-full text-[10px] font-technical font-black uppercase tracking-widest transition-all ${testLanguage === "en" ? "bg-white text-primary shadow-sm" : "text-on-surface-variant opacity-40 hover:opacity-100"
                      }`}
                  >
                    EN
                  </button>
                  <button
                    type="button"
                    onClick={() => dispatch(setTestLanguage("od"))}
                    className={`px-6 py-2 rounded-full text-[10px] font-technical font-black uppercase tracking-widest transition-all ${testLanguage === "od" ? "bg-white text-primary shadow-sm" : "text-on-surface-variant opacity-40 hover:opacity-100"
                      }`}
                  >
                    OD
                  </button>
                </div> */}

                {/* Final Submit Button */}
                <button
                  onClick={() => dispatch(triggerTestSubmit())}
                  className="px-3 md:px-10 py-2 md:py-4 bg-linear-to-r from-primary to-primary-container text-white rounded-full font-technical font-black md:text-xs text-[10px] uppercase tracking-[0.3em] shadow-ambient-lg hover:scale-105 active:scale-95 transition-all cursor-pointer flex items-center gap-3 group"
                >
                  Submit
                  <Target
                    size={18}
                    className="group-hover:rotate-12 transition-transform"
                  />
                </button>
              </div>
            </>
          )}
        </header>

        <div
          ref={scrollRef}
          key={location.pathname}
          className="flex-1 bg-surface-container-low overflow-y-auto h-full custom-scrollbar p-0 lg:px-10"
        >
          <Outlet />
        </div>

        {/* Mobile Nav - Android 15 (Material 3) Navigation Bar Manifestation */}
        <nav
          className={`lg:hidden fixed bottom-0 left-0 right-0 h-auto pb-[env(safe-area-inset-bottom)] backdrop-blur-2xl flex justify-around items-center z-40 border-t border-outline-variant/10 shadow-ambient transition-all duration-500 ease-botanical ${
            showNav
              ? "translate-y-0 opacity-100"
              : "translate-y-full opacity-0 pointer-events-none"
          }`}
        >
          {mobileNavItems.map((item) => (
            <NavLink
              key={item.label}
              to={item.path}
              end={item.path === "/user/dashboard"}
              className="flex-1 flex flex-col items-center justify-center py-1.5"
            >
              {({ isActive }) => (
                <>
                  <div className="relative p-2 flex items-center justify-center mb-0.5">
                    {/* Material 3 Active Pill Indicator */}
                    <div
                      className={`absolute inset-0 bg-primary rounded-full transition-all duration-400 ease-botanical ${isActive ? "opacity-100  -translate-y-8 scale-100" : "opacity-0 scale-75"}`}
                    />

                    <div
                      className={`relative z-10 transition-all duration-300 ${isActive ? "text-surface-container-high -translate-y-8 scale-110" : "text-on-surface-variant/70"}`}
                    >
                      {cloneElement(item.icon as React.ReactElement<any>, {
                        size: 24,
                      })}
                    </div>
                  </div>
                  <span
                    className={`text-[10px] text-center font-technical font-black uppercase tracking-wider transition-colors duration-300 ${
                      isActive
                        ? "text-primary opacity-100 -translate-y-8"
                        : "text-on-surface-variant/40 opacity-0"
                    }`}
                  >
                    {item.label}
                  </span>
                </>
              )}
            </NavLink>
          ))}
        </nav>
      </main>
    </div>
  );
}
