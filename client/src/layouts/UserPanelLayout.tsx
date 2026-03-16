import { QueueListIcon } from "@heroicons/react/24/solid";
import {
  BarChart,
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  LogOut,
  Menu,
  Notebook,
  Package,
  School,
} from "lucide-react";
import { useDispatch, useSelector } from "react-redux";

import { Link, NavLink, Outlet } from "react-router-dom";
import type { AppDispatch, RootState } from "../store";
import { supabase } from "../utils/supabase";
import { clearUser } from "../slice/userSlice";
import { useState } from "react";

const navItems = [
  {
    label: "Dashboard",
    icon: <LayoutDashboard color="blue" size={20} />,
    path: "/user/dashboard",
  },
  {
    label: "Performance",
    icon: <BarChart color="blue" size={20} />,
    path: "/user/performance",
  },
  {
    label: "Study Planner",
    icon: <Notebook color="blue" size={20} />,
    path: "/user/plan-exams",
  },
  {
    label: "Mock Tests",
    icon: <Package color="blue" size={20} />,
    path: "/user/mock-tests",
  },
  {
    label: "Results",
    icon: <Package color="blue" size={20} />,
    path: "/user/results",
  },
];

export default function UserPanelLayout() {
  const { user } = useSelector((state: RootState) => state.user ?? null);
  const dispatch = useDispatch<AppDispatch>();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const handleLogout = () => {
    const { error }: any = supabase.auth.signOut();
    if (error) {
      console.log("Logout Error", error);
    }
    dispatch(clearUser());
    console.log("Logout Successfully");
  };

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950">
      {/* Sidebar */}
      <aside 
        className={`${
          isCollapsed ? "w-20" : "w-64"
        } border-r border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md flex flex-col transition-all duration-300 relative group`}
      >
        {/* Toggle Button */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={`absolute -right-3 top-20 size-6 bg-[#1a57db] text-white rounded-full flex items-center justify-center shadow-lg z-50 transition-all duration-200 ${
            isCollapsed ? "opacity-100" : "opacity-100 group-hover:opacity-100"
          }`}
        >
          {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>

        {/* Logo */}
        <div className={`p-6 flex items-center ${isCollapsed ? "justify-center" : "gap-3"}`}>
          <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center text-white shrink-0">
            <School color="white" size={20} />
          </div>
          {!isCollapsed && (
            <h2 className="text-xl font-bold tracking-tight truncate">OPrep Portal</h2>
          )}
        </div>

        {/* User Profile */}
        <UserProfile user={user} isCollapsed={isCollapsed} />

        {/* Navigation */}
        <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
          {navItems.map((item, index) => (
            <NavLink
              key={index}
              to={item.path}
              title={isCollapsed ? item.label : ""}
              className={({ isActive }) =>
                `flex items-center ${isCollapsed ? "justify-center" : "gap-3"} px-3 py-2.5 rounded-lg transition-all duration-200 ${
                  isActive
                    ? "bg-[#1a57db]/10 text-[#1a57db] font-medium shadow-sm"
                    : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                }`
              }
            >
              <div className="shrink-0">{item.icon}</div>
              {!isCollapsed && <span className="truncate">{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-200 dark:border-slate-800">
          <button
            onClick={handleLogout}
            title={isCollapsed ? "Log Out" : ""}
            className={`w-full py-2 bg-white text-[#1a57db] text-xs font-bold rounded-lg hover:bg-slate-100 transition-all duration-200 flex items-center justify-center gap-2 ${isCollapsed ? "px-0" : "px-4"}`}
          >
            <LogOut size={16} />
            {!isCollapsed && <span>Log Out</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}

const UserProfile = ({ user, isCollapsed }: any) => {
  return (
    <div className={`px-4 mb-6 ${isCollapsed ? "flex justify-center" : ""}`}>
      <div className={`p-4 bg-[#1a57db]/5 rounded-xl border border-[#1a57db]/10 ${isCollapsed ? "p-2" : ""}`}>
        <div className={`flex items-center gap-3 ${isCollapsed ? "justify-center mb-0" : "mb-2"}`}>
          <div className="w-10 h-10 bg-blue-200 shrink-0 flex justify-center items-center rounded-full bg-cover bg-center shadow-lg"></div>
          {!isCollapsed && (
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-semibold truncate">
                {user?.email || ""}
              </span>
              <span className="text-xs text-slate-500">OPSC Aspirant</span>
            </div>
          )}
        </div>
        {!isCollapsed && (
          <Link
            to={"/user/profile"}
            className="w-full px-5 flex items-center justify-center py-1.5 text-xs font-bold bg-[#1a57db] text-white rounded-lg hover:bg-[#1a57db]/90 transition-all duration-200"
          >
            View Profile
          </Link>
        )}
      </div>
    </div>
  );
};
