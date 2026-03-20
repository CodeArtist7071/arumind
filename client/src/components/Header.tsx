import { Notebook, Search } from "lucide-react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router";
import type { RootState } from "../store";

export const Header = () => {
  const navigate = useNavigate();
  const { user } = useSelector((state: RootState) => state.user ?? null);
  console.log("usersss.....!!", user);

  return (
    <header className="flex items-center justify-between border-b border-slate-200 bg-white dark:border-slate-800 py-4 sticky top-0 z-50 backdrop-blur-md">
      <div className="flex items-center gap-8">
        <div className="flex items-center gap-2 text-[#1e3a5f]">
          <Notebook className="text-3xl font-bold" />
          <h2 className="text-xl font-black leading-tight tracking-tight">
            Odisha Exam Prep
          </h2>
        </div>
        <nav className="hidden md:flex items-center gap-8">
          {["Exams", "Courses", "Test Series", "Current Affairs"].map(
            (item) => (
              <a
                key={item}
                className="text-slate-600 dark:text-slate-400 hover:text-[#1e3a5f] dark:hover:text-[#1e3a5f] text-sm font-medium transition-colors duration-200"
                href="#"
              >
                {item}
              </a>
            ),
          )}
        </nav>
      </div>
      <div className="flex items-center gap-4">
        <div className="hidden sm:flex relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm" />
          <input
            className="bg-slate-100 dark:bg-slate-800 border-none rounded-lg pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-[#1e3a5f] w-48 lg:w-64 transition-all"
            placeholder="Search exams..."
            type="text"
          />
        </div>
        {user ? (
          <div>
            <button
              onClick={() => navigate("/user/dashboard")}
              className="bg-[#1e3a5f] text-white px-5 py-2 rounded-lg text-sm font-bold hover:bg-[#1e3a5f]/90 transition-all duration-200"
            >
              Your Dashboard
            </button>
            <span className="w-10 h-10 bg-blue-900 text-white px-3 py-2 ml-4 rounded-full">{user.email[0].toUpperCase()}</span>
          </div>
        ) : (
          <>
            <div className="flex gap-2">
              <button
                onClick={() => navigate("/register")}
                className="bg-[#1e3a5f] text-white px-5 py-2 rounded-lg text-sm font-bold hover:bg-[#1e3a5f]/90 transition-all duration-200"
              >
                Sign Up
              </button>
              <button
                onClick={() => navigate("/login")}
                className="bg-slate-100 dark:bg-slate-800 dark:text-slate-100 px-5 py-2 rounded-lg text-sm font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-all duration-200"
              >
                Login
              </button>
            </div>
          </>
        )}
      </div>
    </header>
  );
};
