import { FireIcon } from "@heroicons/react/24/outline";
import {
  Bell,
  Book,
  ChevronRight,
  SearchAlert,
  Settings,
  Tags,
  Calendar as CalendarIcon,
  CheckSquare,
  BarChart2,
  BookMarked
} from "lucide-react";
import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import type { AppDispatch, RootState } from "../../store";
import { getExams } from "../../services/examService";
import { fetchExams, type examProps } from "../../slice/examSlice";
import { Outlet, useNavigate } from "react-router-dom";
import { AlertPopup } from "../../components/ui/AlertPopup";
import { Button } from "../../components/ui/Button";
import { WarningModal } from "../../components/ui/WarningModal";
import { notify } from "reapop";

const UserDashboard = () => {
  const { profile } = useSelector((state: RootState) => state.user ?? null);
  const { examData } = useSelector((state: RootState) => state.exams ?? null);
  const dispatch = useDispatch<AppDispatch>();
  console.log("exams.....", examData);
  const navigate = useNavigate();

  useEffect(() => {
    dispatch(fetchExams());
  }, []);

  console.log("users-dashboard", profile);

  const targetedExams = examData.filter((el) =>
    profile.target_exams.includes(el.id),
  );

  const subjectProgress = [
    {
      name: "History & Geography of Odisha",
      percent: 82,
      color: "bg-[#1a57db]",
    },
    {
      name: "General Studies & Current Affairs",
      percent: 45,
      color: "bg-[#1a57db]",
    },
    { name: "Odia Language & Literature", percent: 95, color: "bg-green-500" },
    { name: "Aptitude & Mental Ability", percent: 30, color: "bg-orange-500" },
  ];

  const quickLinks = [
    { icon: <CalendarIcon size={24} />, label: "Planner", path: "/user/plan-exams" },
    { icon: <CheckSquare size={24} />, label: "Tests", path: "/user/mock-tests" },
    { icon: <BarChart2 size={24} />, label: "Performance", path: "/user/performance" },
    { icon: <BookMarked size={24} />, label: "History", path: "/user/results" },
  ];

  const checklist = [
    { text: "Read Current Affairs (Odia)", checked: true },
    { text: "Solve 20 Math PYQs", checked: true },
    { text: "Attempt GS Sectional Mock", checked: false, active: true },
    { text: "Revise Odisha History notes", checked: false },
  ];

  function handleButton(id: string) {
    navigate(`exam/${id}`);
  }

  return (
    <div className="flex h-screen overflow-hidden bg-linear-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950 font-['Inter'] text-slate-900 dark:text-slate-100">
      {/* Sidebar */}

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto flex flex-col">
        {/* Header */}
        <header className="h-16 py-10 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md flex items-center justify-between px-8 sticky top-0 z-10 shadow-sm">
          <div className="flex items-center gap-4 bg-slate-100 dark:bg-slate-800 px-4 py-2 rounded-lg w-96 shadow-sm">
            <SearchAlert color="white" size={20} />
            <input
              className="bg-transparent border-none focus:ring-0 text-sm w-full outline-none placeholder-slate-500"
              placeholder="Search study material, tests, or subjects..."
              type="text"
            />
          </div>
          <div className="flex items-center gap-4">
            <button className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg relative transition-all duration-200">
              <Bell color="white" size={20} />
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white dark:border-slate-900"></span>
            </button>
            <button className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all duration-200">
              <Settings color="white" size={20} />
            </button>
          </div>
        </header>
        <div className="p-8 max-w-7xl mx-auto w-full space-y-8">
          <section className="flex flex-wrap items-center justify-between gap-6">
            <div>
              <h1 className="text-3xl font-black tracking-tight mb-2 bg-linear-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-200 bg-clip-text text-transparent">
                Namaskar, Aswin!
              </h1>
              <p className="text-slate-500 max-w-md text-lg">
                Your OPSC preparation is 65% complete. You are in the top 5% of
                aspirants this week.
              </p>
            </div>
            <div className="flex gap-4">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-6 py-4 rounded-xl shadow-sm hover:shadow-md transition-all duration-200">
                <p className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1">
                  Daily Streak
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold text-orange-600">
                    12 Days
                  </span>
                  <FireIcon
                    className="text-orange-500 text-2xl"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  />
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-6 py-4 rounded-xl shadow-sm hover:shadow-md transition-all duration-200">
                <p className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1">
                  Daily Goal
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold">4/6 Hrs</span>
                  <div className="w-16 h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div className="bg-green-500 h-full w-[66%] rounded-full shadow-sm"></div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column */}
            <div className="lg:col-span-2 space-y-8">
              {/* Target Exams */}
              <section>
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-bold mb-6 text-slate-900 dark:text-white">
                    Your Target Exams
                  </h2>
                  <span onClick={()=>navigate("exam-lists")} className="text-blue-500 underline cursor-pointer">Add More Exams To your List.!!</span>
                </div>
                <div className="grid sm:grid-cols-1 md:grid-cols-3 gap-6">
                  {targetedExams.map((exam, index) => (
                    <div
                      key={index}
                      className="p-6 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm hover:border-[#1a57db] hover:shadow-xl transition-all duration-300 group cursor-pointer"
                      onClick={() => handleButton(exam.id)}
                    >
                      <div className="w-10 h-10 bg-linear-to-r from-[#1a57db]/10 to-[#1a57db]/20 rounded-lg flex items-center justify-center text-[#1a57db] mb-4 group-hover:bg-linear-to-r group-hover:from-[#1a57db] group-hover:to-blue-600 group-hover:text-white transition-all duration-300">
                        <Book />
                      </div>
                      <h3 className="font-black text-lg mb-1">{exam.name}</h3>
                      <p className="text-xs text-slate-500 mb-4">
                        {exam.full_name}
                      </p>
                      <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                        <p className="text-[10px] text-slate-400 font-bold uppercase mb-2 tracking-wider">
                          Exam Type
                        </p>
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">
                          {exam.type}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* Subject Progress */}
              <section>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold">Subject Progress</h2>
                  <a
                    className="text-[#1a57db] text-sm font-bold hover:underline"
                    href="#"
                  >
                    View Curriculum
                  </a>
                </div>
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
                  {subjectProgress.map((subject, index) => (
                    <div key={index} className="mb-6 last:mb-0">
                      <div className="flex justify-between text-sm mb-2">
                        <span className="font-medium">{subject.name}</span>
                        <span className="text-slate-500 font-bold">
                          {subject.percent}%
                        </span>
                      </div>
                      <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden shadow-inner">
                        <div
                          className={`${subject.color} h-full rounded-full shadow-sm transition-all duration-500`}
                          style={{ width: `${subject.percent}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>

            {/* Right Column */}
            <div className="space-y-8">
              {/* Quick Links */}
              <section>
                <h2 className="text-xl font-bold mb-6 text-slate-900 dark:text-white">
                  Quick Links
                </h2>
                <div className="grid grid-cols-2 gap-4">
                  {quickLinks.map((link, index) => (
                    <button
                      key={index}
                      className="flex flex-col items-center justify-center p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl hover:shadow-xl hover:-translate-y-1 hover:border-[#1a57db]/50 transition-all duration-300 text-center cursor-pointer"
                      onClick={() => navigate(link.path)}
                    >
                      <div className="mb-2 text-[#1a57db]">{link.icon}</div>
                      <span className="text-xs font-bold text-slate-900 dark:text-white">
                        {link.label}
                      </span>
                    </button>
                  ))}
                </div>
              </section>

              <UpcomingMockTest />

              {/* Daily Checklist */}
              <section className="bg-[#1a57db]/5 border border-[#1a57db]/20 rounded-xl p-6 shadow-sm">
                <h3 className="font-bold mb-6 flex items-center gap-2 text-slate-900 dark:text-white">
                  <Tags className="text-[#1a57db]" />
                  Today's Checklist
                </h3>
                <div className="space-y-3">
                  {checklist.map((item, index) => (
                    <label
                      key={index}
                      className={`flex items-center gap-3 p-3 bg-white dark:bg-slate-900 rounded-lg cursor-pointer border transition-all duration-200 hover:shadow-sm ${
                        item.active
                          ? "border-[#1a57db]/30 shadow-sm shadow-[#1a57db]/10 ring-1 ring-[#1a57db]/20"
                          : "border-slate-100 dark:border-slate-800"
                      }`}
                    >
                      <input
                        className="rounded border-slate-300 text-[#1a57db] focus:ring-[#1a57db] h-4 w-4 shadow-sm cursor-pointer"
                        type="checkbox"
                        checked={item.checked}
                        readOnly
                      />
                      <span
                        className={`text-sm ${item.checked ? "line-through text-slate-400" : "font-medium text-slate-900 dark:text-white"}`}
                      >
                        {item.text}
                      </span>
                    </label>
                  ))}
                </div>
              </section>
            </div>
          </div>
        </div>
        <Outlet />
        {/* Footer */}
        <footer className="p-8 mt-auto border-t border-slate-200 dark:border-slate-800 text-center bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
          <p className="text-xs text-slate-400">
            © 2023 Odisha Prep Portal. Dedicated to the aspirants of Odisha
            State Government Exams.
          </p>
        </footer>
      </main>
    </div>
  );
};

export default UserDashboard;

const UpcomingMockTest = () => {
  const upcomingMocks = [
    {
      date: "24",
      month: "Aug",
      title: "OPSC Prelims Full Mock 12",
      time: "10:00 AM",
      marks: "200 Marks",
    },
    {
      date: "26",
      month: "Aug",
      title: "Odisha GK Sectional Test",
      time: "04:00 PM",
      marks: "50 Marks",
    },
    {
      date: "30",
      month: "Aug",
      title: "OSSC CGL Quantitative",
      time: "11:00 AM",
      marks: "100 Marks",
    },
  ];
  return (
    <section>
      <h2 className="text-xl font-bold mb-6 text-slate-900 dark:text-white">
        Upcoming Mock Tests
      </h2>
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {upcomingMocks.map((mock, index) => (
            <div
              key={index}
              className="p-4 flex items-center gap-4 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all duration-200 cursor-pointer group"
            >
              <div className="flex flex-col items-center justify-center min-w-[50px] bg-slate-100 dark:bg-slate-800 py-3 rounded-lg group-hover:bg-slate-200 dark:group-hover:bg-slate-700 transition-colors">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  {mock.month}
                </span>
                <span className="text-xl font-black text-slate-900 dark:text-white">
                  {mock.date}
                </span>
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-[#1a57db] transition-colors">
                  {mock.title}
                </h4>
                <p className="text-xs text-slate-500">
                  {mock.time} • {mock.marks}
                </p>
              </div>
              <ChevronRight className="text-slate-400 group-hover:translate-x-1 transition-transform" />
            </div>
          ))}
        </div>
        <button className="w-full py-3 text-xs font-bold text-[#1a57db] border-t border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all duration-200">
          View All Scheduled Tests
        </button>
      </div>
    </section>
  );
};
