import {
  BarChart,
  Box,
  HelpCircle,
  LayoutDashboard,
  Layers,
  LogOut,
  Notebook,
  NotebookText,
  Package,
  School,
  Users,
  Layout,
} from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { Link, NavLink, Outlet } from "react-router-dom";
import type { AppDispatch, RootState } from "../store";
import { supabase } from "../utils/supabase";
import { clearUser } from "../slice/userSlice";
import { useState } from "react";

const navItems = [
  {
    label: "Lattice Architect",
    icon: <BarChart size={20} />,
    path: "/admin/lattice",
  },
  {
    label: "Dashboard",
    icon: <LayoutDashboard size={20} />,
    path: "/admin/dashboard",
  },
  {
    label: "Boards",
    icon: <Layout size={20} />,
    path: "/admin/boards",
  },
  {
    label: "Exams",
    icon: <School size={20} />,
    path: "/admin/exams",
  },
  {
    label: "Subjects",
    icon: <Notebook size={20} />,
    path: "/admin/subjects",
  },
  {
    label: "Chapters",
    icon: <Layers size={20} />,
    path: "/admin/chapters",
  },
  {
    label: "Questions",
    icon: <HelpCircle size={20} />,
    path: "/admin/questions",
  },
  {
    label: "Users",
    icon: <Users size={20} />,
    path: "/admin/users",
  },
];

export default function AdminPanelLayout() {
  const { user } = useSelector((state: RootState) => state.user ?? null);
  const dispatch = useDispatch<AppDispatch>();

  const handleLogout = () => {
    const { error }: any = supabase.auth.signOut();
    if (error) {
      console.log("Logout Error", error);
    }
    dispatch(clearUser());
    console.log("Logout Successfully");
  };
  return (
    <div className="flex h-screen bg-surface-container-low dark:bg-slate-950">
      {/* Sidebar */}
      <aside className="w-64  dark:border-slate-800 bg-surface/90 dark:bg-slate-900/90 backdrop-blur-md flex flex-col">
        {/* Logo */}
        <div className="p-6 flex items-center gap-3">
          <div className="w-8 h-8 bg-[#16a34a] rounded-lg flex items-center justify-center text-white">
            <School color="white" size={20} />
          </div>
          <h2 className="text-xl font-bold tracking-tight">OPrep Portal</h2>
        </div>

        {/* User Profile */}
        <UserProfile user={user} />

        {/* Navigation */}
        <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
          {navItems.map((item, index) => (
            <NavLink
              key={index}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
                  isActive
                    ? "bg-[#16a34a]/10 text-[#16a34a] font-medium shadow-sm"
                    : "hover:bg-surface-container-high dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                }`
              }
            >
              {item.icon}
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Upgrade CTA */}
        <div className="p-4  dark:border-slate-800">
          <button
            onClick={handleLogout}
            className="w-full py-2 bg-surface text-[#16a34a] text-xs font-bold rounded-lg hover:bg-surface-container-high transition-all duration-200"
          >
            Log Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}

const UserProfile = ({ user }: any) => {
  return (
    <div className="px-4 mb-6">
      <div className="p-4 bg-[#16a34a]/5 rounded-xl border border-[#16a34a]/10">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-primary/20 px-5 flex justify-center items-center rounded-full bg-cover bg-center shadow-lg"></div>
          <div className="flex flex-col">
            <span className="w-30 text-sm font-semibold truncate">
              {user?.email || ""}
            </span>
            <span className="text-xs text-on-surface-variant">OPSC Aspirant</span>
          </div>
        </div>
        <Link
          to={"/user/profile"}
          className="w-full px-5 flex items-center justify-center py-1.5 text-xs font-bold bg-[#16a34a] text-white rounded-lg hover:bg-[#16a34a]/90 transition-all duration-200"
        >
          View Profile
        </Link>
      </div>
    </div>
  );
};
