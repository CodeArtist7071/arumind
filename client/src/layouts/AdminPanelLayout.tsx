import {
  BarChart3,
  BookOpen,
  CircleHelp,
  GraduationCap,
  LayoutDashboard,
  LayoutGrid,
  Layers3,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  School,
  SlidersHorizontal,
  Terminal,
  Users,
  X,
} from "lucide-react";
import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import type { AppDispatch, RootState } from "../store";
import { clearUser } from "../slice/userSlice";
import { supabase } from "../utils/supabase";

const navItems = [
  { label: "Overview", icon: LayoutDashboard, path: "/admin/dashboard" },
  { label: "Curriculum designer", icon: BarChart3, path: "/admin/lattice" },
  { label: "Exam boards", icon: LayoutGrid, path: "/admin/boards" },
  { label: "Exams", icon: GraduationCap, path: "/admin/exams" },
  { label: "Subjects", icon: BookOpen, path: "/admin/subjects" },
  { label: "Chapters", icon: Layers3, path: "/admin/chapters" },
  { label: "Questions", icon: CircleHelp, path: "/admin/questions" },
  { label: "Features", icon: SlidersHorizontal, path: "/admin/features" },
  { label: "Users", icon: Users, path: "/admin/users" },
  { label: "SQL editor", icon: Terminal, path: "/admin/sql" },
];

const pageTitles = new Map(navItems.map(({ path, label }) => [path, label]));

export default function AdminPanelLayout() {
  const { user } = useSelector((state: RootState) => state.user);
  const dispatch = useDispatch<AppDispatch>();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const pageTitle = pageTitles.get(location.pathname) ?? "Admin workspace";
  const displayName = user?.email?.split("@")[0] || "Administrator";
  const initials = displayName.slice(0, 2).toUpperCase();

  const handleLogout = async () => {
    setIsLoggingOut(true);
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("Unable to sign out:", error.message);
      setIsLoggingOut(false);
      return;
    }
    dispatch(clearUser());
  };

  return (
    <div className="relative flex h-dvh overflow-hidden bg-[#f4f5ef] text-[#1b2419] dark:bg-[#101510] dark:text-[#e8eee4]">
      {isSidebarOpen && (
        <button
          aria-label="Close navigation menu"
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px] lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[276px] flex-col border-r border-[#dfe5d9] bg-[#fbfcf8] transition-[transform,width] duration-300 ease-botanical dark:border-white/10 dark:bg-[#151c15] lg:static lg:translate-x-0 ${
          isCollapsed ? "lg:w-[84px]" : "lg:w-[276px]"
        } ${isSidebarOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"}`}
      >
        <div className={`flex h-[84px] shrink-0 items-center ${isCollapsed ? "justify-center px-3" : "gap-3 px-6"}`}>
          <div className="grid size-10 shrink-0 place-items-center rounded-2xl bg-[#154212] text-white shadow-sm dark:bg-[#2d5a27]">
            <School size={21} strokeWidth={1.8} />
          </div>
          <div className={`min-w-0 ${isCollapsed ? "hidden lg:block" : ""}`}>
              <p className="truncate text-[15px] font-bold tracking-tight">Arumind</p>
              <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#72806c]">Admin workspace</p>
          </div>
          <button
            aria-label="Close navigation menu"
            className="ml-auto rounded-lg p-2 text-[#71806c] hover:bg-[#edf1e9] lg:hidden"
            onClick={() => setIsSidebarOpen(false)}
          >
            <X size={18} />
          </button>
        </div>

        <div className={`mx-4 mb-5 rounded-2xl bg-[#f0f4ec] p-3 dark:bg-white/[0.045] ${isCollapsed ? "lg:hidden" : ""}`}>
            <div className="flex items-center gap-3">
              <div className="grid size-9 shrink-0 place-items-center rounded-full bg-[#dce9d4] text-xs font-bold text-[#285922] dark:bg-[#254226] dark:text-[#cce6c2]">
                {initials}
              </div>
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold">{displayName}</p>
                <p className="mt-0.5 text-[11px] text-[#788473]">Administrator</p>
              </div>
              <span className="ml-auto size-2 rounded-full bg-[#4c9a43]" title="Account active" />
            </div>
        </div>

        <div className={`mb-2 px-6 text-[10px] font-bold uppercase tracking-[0.16em] text-[#879181] ${isCollapsed ? "lg:px-0 lg:text-center" : ""}`}>
          {isCollapsed ? "Menu" : "Workspace"}
        </div>
        <nav aria-label="Admin navigation" className="flex-1 space-y-1 overflow-y-auto px-3 pb-4">
          {navItems.map(({ label, icon: Icon, path }) => (
            <NavLink
              key={path}
              to={path}
              onClick={() => setIsSidebarOpen(false)}
              title={isCollapsed ? label : undefined}
              className={({ isActive }) =>
                `group flex min-h-11 items-center rounded-xl transition-colors ${
                  isCollapsed ? "justify-center px-2" : "gap-3 px-3.5"
                } ${
                  isActive
                    ? "bg-[#e8f0e3] text-[#24551e] dark:bg-[#244024] dark:text-[#d8efd0]"
                    : "text-[#687565] hover:bg-[#f0f3ed] hover:text-[#263b22] dark:text-[#aeb9aa] dark:hover:bg-white/[0.06] dark:hover:text-white"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon size={18} strokeWidth={isActive ? 2.2 : 1.8} />
                  <span className={`truncate text-[13px] font-medium ${isCollapsed ? "lg:hidden" : ""}`}>{label}</span>
                  {isActive && <span className={`ml-auto size-1.5 rounded-full bg-[#4c8b3e] ${isCollapsed ? "lg:hidden" : ""}`} />}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="shrink-0 border-t border-[#e7ebe2] p-3 dark:border-white/10">
          <button
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="mb-2 hidden min-h-10 w-full items-center justify-center gap-3 rounded-xl px-3 text-[#687565] hover:bg-[#f0f3ed] hover:text-[#263b22] dark:hover:bg-white/[0.06] lg:flex"
            onClick={() => setIsCollapsed((value) => !value)}
          >
            {isCollapsed ? <PanelLeftOpen size={18} /> : <><PanelLeftClose size={18} /><span className="text-xs font-medium">Collapse menu</span></>}
          </button>
          <button
            className={`flex min-h-10 w-full items-center justify-center gap-3 rounded-xl px-3 text-[#788473] transition-colors hover:bg-[#f7e9e5] hover:text-[#9e4638] dark:hover:bg-[#3b2521] dark:hover:text-[#f0b3a6] ${isCollapsed ? "" : "justify-start"}`}
            disabled={isLoggingOut}
            onClick={handleLogout}
            title={isCollapsed ? "Sign out" : undefined}
          >
            <LogOut size={17} />
            <span className={`text-xs font-semibold ${isCollapsed ? "lg:hidden" : ""}`}>{isLoggingOut ? "Signing out…" : "Sign out"}</span>
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="z-30 flex h-[72px] shrink-0 items-center justify-between border-b border-[#e1e6dc] bg-[#fbfcf8]/90 px-4 backdrop-blur-md dark:border-white/10 dark:bg-[#151c15]/90 sm:px-7 lg:px-9">
          <div className="flex min-w-0 items-center gap-3">
            <button
              aria-label="Open navigation menu"
              className="-ml-2 rounded-xl p-2 text-[#64715f] hover:bg-[#edf1e9] lg:hidden"
              onClick={() => setIsSidebarOpen(true)}
            >
              <Menu size={21} />
            </button>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold tracking-tight sm:text-[15px]">{pageTitle}</p>
              <p className="mt-0.5 hidden text-[11px] text-[#818b7c] sm:block">Manage your learning platform</p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="hidden items-center gap-2 rounded-full bg-[#edf4e9] px-3 py-1.5 text-[10px] font-semibold text-[#426b39] dark:bg-[#203620] dark:text-[#b7d7ad] sm:flex">
              <span className="size-1.5 rounded-full bg-[#4c9a43]" />
              System online
            </div>
            <Link to="/user/profile" aria-label="View administrator profile" className="grid size-9 place-items-center rounded-full bg-[#dce9d4] text-xs font-bold text-[#285922] transition-transform hover:scale-105 dark:bg-[#254226] dark:text-[#cce6c2]">
              {initials || "AD"}
            </Link>
          </div>
        </header>
        <main className="min-h-0 flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
