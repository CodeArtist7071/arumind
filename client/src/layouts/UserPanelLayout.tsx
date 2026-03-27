import React, { cloneElement, useState } from "react";
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
  Target
} from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import InstallAppButton from "../components/InstallAppButton";
import { useTheme } from "../hooks/useTheme";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import type { AppDispatch, RootState } from "../store";
import { supabase } from "../utils/supabase";
import { clearUser } from "../slice/userSlice";

const navItems = [
  {
    label: "Dashboard",
    icon: <LayoutDashboard size={20} />,
    path: "/user/dashboard",
  },
  {
    label: "Analytics",
    icon: <TrendingUp size={20} />,
    path: "/user/performance",
  },
  {
    label: "Planner",
    icon: <History size={20} />,
    path: "/user/plan-exams",
  },
  {
    label: "Inventory",
    icon: <Package size={20} />,
    path: "/user/mock-tests",
  },
  {
    label: "Results",
    icon: <Target size={20} />,
    path: "/user/results",
  },
];

export default function UserPanelLayout() {
  const { user } = useSelector((state: RootState) => state.user ?? null);
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { theme, toggleTheme } = useTheme();

  const location = useLocation();

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) console.error("Logout Error", error);
    dispatch(clearUser());
    navigate("/login");
  };

  return (
    <div className="flex h-screen bg-surface font-narrative text-on-surface overflow-hidden transition-colors duration-500">
      {/* Sidebar - Desktop */}
      <aside
        className={`hidden lg:flex border-r border-on-surface/5 flex-col h-full bg-surface-container-low transition-all duration-700 ease-[var(--ease-botanical)] relative z-30 shadow-ambient ${
          isCollapsed ? "w-20" : "w-72"
        }`}
      >
        {/* Logo Section */}
        <div className="h-28 flex items-center px-8 mb-4">
          <div className="flex items-center gap-4 group cursor-pointer" onClick={() => navigate("/")}>
             <div className="size-12 bg-linear-to-br from-primary to-primary-container rounded-2xl flex items-center justify-center text-white shadow-lg shadow-primary/20 group-hover:rotate-6 transition-all duration-300">
                <School className="size-6" />
             </div>
             {!isCollapsed && (
               <div className="flex flex-col">
                 <h1 className="text-2xl font-black tracking-tighter leading-none text-primary">ARUMIND</h1>
                 <span className="text-[10px] font-technical uppercase tracking-[0.2em] text-on-surface-variant opacity-60">Digital Journal</span>
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
                    ? "bg-surface-container-highest text-primary shadow-sm scale-105"
                    : "text-on-surface-variant flex items-center justify-center hover:bg-(--color-primary) hover:text-on-surface hover:text-white"
                }`
              }
            >
              <div className="shrink-0 group-hover:scale-110 my-1 flex items-center justify-center transition-transform duration-300">
                 {cloneElement(item.icon as React.ReactElement<any>, { 
                   color: "currentColor", 
                   className: "size-6" 
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
                {theme === 'dark' ? <Sun className="size-5" /> : <Moon className="size-5" />}
              </button>

              <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="flex-1 flex items-center justify-center p-2 rounded-full bg-surface-container-high text-primary hover:bg-surface-container-highest transition-all duration-300"
              >
                <ChevronLeft className={`size-5 transition-transform duration-500 ${isCollapsed ? "rotate-180" : ""}`} />
              </button>
           </div>

           <button
             onClick={handleLogout}
             className="w-full flex items-center justify-center gap-3 p-4 rounded-full text-on-surface-variant hover:text-red-600 hover:bg-red-500/5 transition-all duration-300 group"
           >
             <LogOut className="size-5 group-hover:-translate-x-1 transition-transform" />
             {!isCollapsed && <span className="text-[10px] font-technical uppercase tracking-widest font-black">Close Session</span>}
           </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col relative overflow-hidden bg-surface transition-colors duration-500">
        {/* Editorial Header */}
        <header className="h-24 bg-surface/40 backdrop-blur-2xl flex items-center justify-between px-10 sticky top-0 z-20">
           <div>
              <div className="flex flex-col">
                <h2 className="text-[10px] font-technical uppercase tracking-[0.4em] text-on-surface-variant opacity-40 mb-1">Authenticated Account</h2>
                <div className="flex items-center gap-3">
                   <div className="size-2 bg-primary rounded-full animate-pulse" />
                   <p className="font-technical text-xs font-bold text-on-surface tracking-tight">{user?.email}</p>
                </div>
              </div>
           </div>

           <div className="flex items-center gap-6">
              <div className="size-12 bg-linear-to-br from-primary to-primary-container rounded-2xl flex items-center justify-center text-white font-technical font-bold text-lg shadow-lg shadow-primary/20 hover:scale-105 transition-transform cursor-pointer" onClick={() => navigate("/user/profile")}>
                 {user?.email?.[0].toUpperCase()}
              </div>
           </div>
        </header>

        {/* Content Viewport */}
        <div 
          key={location.pathname}
          className="flex-1 bg-surface-container-low overflow-y-auto custom-scrollbar p-6 lg:p-10 animate-reveal"
        >
          <Outlet />
        </div>

        {/* Mobile Nav - "The Bottom Bar" */}
        <nav className="lg:hidden h-20 bg-surface-container-highest/80 backdrop-blur-xl flex justify-around items-center px-4 sticky bottom-0 z-30 border-t border-outline-variant/10 shadow-ambient">
           {navItems.slice(0, 4).map((item) => (
             <NavLink
               key={item.label}
               to={item.path}
               className={({ isActive }) =>
                 `flex flex-col items-center justify-center size-14 rounded-2xl transition-all ${
                   isActive ? "text-primary bg-surface shadow-sm" : "text-on-surface-variant"
                 }`
               }
             >
               {cloneElement(item.icon as React.ReactElement<any>, { size: 20 })}
             </NavLink>
           ))}
        </nav>
      </main>
    </div>
  );
}

