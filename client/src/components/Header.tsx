import { Notebook, Search, Moon, Sun } from "lucide-react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router";
import type { RootState } from "../store";
import { useTheme } from "../hooks/useTheme";

export const Header = () => {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { user } = useSelector((state: RootState) => state.user ?? null);
  console.log("usersss.....!!", user);

  return (
    <header className="flex h-20 px-6 lg:px-12 items-center justify-between bg-surface/90 sticky top-0 z-60 backdrop-blur-2xl shadow-[0_10px_40px_-15px_rgba(27,28,21,0.06)]">
      <div className="flex items-center gap-8">
        <div className="flex items-center gap-3 text-primary group cursor-pointer" onClick={() => navigate("/")}>
          <div className="size-10 bg-primary/10 rounded-xl flex items-center justify-center group-hover:bg-primary group-hover:text-on-primary transition-all duration-500 shadow-sm">
            <Notebook className="size-6" />
          </div>
          <div className="flex flex-col">
            <h2 className="text-2xl font-black leading-none tracking-tighter text-on-surface">
              Arumind
            </h2>
            <span className="text-[8px] font-technical font-black uppercase tracking-[0.2em] text-on-surface-variant opacity-40 mt-1">Push Beyond Limits</span>
          </div>
        </div>
        <nav className="hidden lg:flex items-center gap-10">
          {["Exams", "Courses", "Test Series", "Current Affairs"].map(
            (item) => (
              <a
                key={item}
                className="text-on-surface-variant hover:text-primary text-[10px] font-technical font-black uppercase tracking-[0.2em] transition-all duration-300 relative group"
                href="#"
              >
                {item}
                <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-0 h-1 bg-primary/20 rounded-full transition-all duration-500 group-hover:w-8" />
              </a>
            ),
          )}
        </nav>
      </div>
      <div className="flex items-center gap-4">
        <div className="hidden sm:flex relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant size-4 opacity-40 group-focus-within:text-primary group-focus-within:opacity-100 transition-all" />
          <input
            className="bg-surface-container-low text-on-surface border-none rounded-full pl-12 pr-6 py-2.5 text-[11px] font-technical font-black uppercase tracking-widest focus:ring-2 focus:ring-primary/20 w-48 lg:w-72 transition-all placeholder:text-on-surface-variant/30"
            placeholder="Search Journal..."
            type="text"
          />
        </div>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="size-10 rounded-full bg-surface-container-low flex items-center justify-center text-on-surface-variant hover:text-primary transition-all duration-500 border border-on-surface/5"
          title={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
        >
          {theme === "light" ? <Moon className="size-4" /> : <Sun className="size-4" />}
        </button>
        {user ? (
          <div className="flex items-center gap-6">
            <button
              onClick={() => navigate("/user/dashboard")}
              className="bg-linear-to-r from-primary to-primary-container text-on-primary px-8 py-3 rounded-full text-[10px] font-technical font-black uppercase tracking-widest shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all duration-300"
            >
              Dashboard
            </button>
            <div className="size-10 bg-primary/10 rounded-full flex items-center justify-center text-primary font-technical font-black border border-primary/20 cursor-pointer hover:bg-primary hover:text-white transition-all">
              {user.email?.[0].toUpperCase()}
            </div>
          </div>
        ) : (
          <div className="flex gap-4">
            <button
              onClick={() => navigate("/login")}
              className="text-on-surface-variant hover:text-primary px-6 py-3 rounded-full text-[10px] font-technical font-black uppercase tracking-widest transition-all"
            >
              Login
            </button>
            <button
              onClick={() => navigate("/register")}
              className="bg-linear-to-r from-primary to-primary-container text-on-primary px-8 py-3 rounded-full text-[10px] font-technical font-black uppercase tracking-widest shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all duration-300"
            >
              Sign Up
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
