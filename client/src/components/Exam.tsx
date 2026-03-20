import { Suspense, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { getExamSubjects } from "../services/examService";
import { useDispatch, useSelector } from "react-redux";
import { fetchExamSubjects } from "../slice/examSubjectSlice";
import type { AppDispatch, RootState } from "../store";
import { BookCopy, Shield, Zap, Coffee, Clock, CheckCircle2, ChevronRight } from "lucide-react";
import { fetchChapter } from "../slice/chapterSlice";
import { useNotifications } from "reapop";
import { supabase } from "../utils/supabase";

const Exam = () => {
  const { eid } = useParams<{ eid: string }>();
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { notify } = useNotifications();
  
  const [showPrefs, setShowPrefs] = useState(false);
  const [prefs, setPrefs] = useState({
    sid: "",
    cid: "",
    mode: "normal" as "normal" | "speed" | "proctored",
    time: 30
  });

  const { data, e_data, loading, error } = useSelector(
    (state: RootState) => state.examSubject ?? null,
  );
  const { user } = useSelector((state: RootState) => state.user);
  const [attemptedChapters, setAttemptedChapters] = useState<Set<string>>(new Set());

  useEffect(() => {
    const fetchAttempts = async () => {
      if (!user?.id) return;
      
      const { data, error } = await supabase
        .from("test_attempts")
        .select("chapter_id")
        .eq("user_id", user.id)
        .eq("status", "COMPLETED");

      if (error) {
        console.error("Error fetching attempts:", error);
        return;
      }

      if (data) {
        const ids = new Set(data.map(a => a.chapter_id));
        setAttemptedChapters(ids);
      }
    };

    fetchAttempts();
  }, [user]);

  useEffect(() => {
    if (eid) {
      dispatch(fetchExamSubjects(eid));
    }
  }, [dispatch, eid]);

  function handleButton(sid: string, cid: string) {
    setPrefs(prev => ({ ...prev, sid, cid }));
    setShowPrefs(true);
  }

  function handleStartTest() {
    const { sid, cid, mode, time } = prefs;
    navigate(`test/${sid}/${cid}?mode=${mode}&time=${time}`);
    setShowPrefs(false);
  }

  console.log("Redux Data:", data);

  if (loading) {
    return <ExamSkeleton/>;
  }

  return (
    <div className="bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-slate-100 min-h-screen">
      {/* Main Content */}
      <main className="max-w-300 mx-auto w-full px-4 py-6 md:px-10">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-black mb-2">Subject-wise Curriculum</h1>
          <p className="text-slate-600 dark:text-slate-400">
            Target your weak areas and track your progress across all OSSC CGL
            subjects.
          </p>
        </div>

        {data.map((subject: any, index: number) => {
          console.log("is exam id true...", subject.subjects.exam_subjects);
          if (subject.exam_id === eid)
            return (
              <section
                key={index}
                className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm mb-8"
              >
                <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between">
                  <div className="flex items-center gap-4">
                    <div className="size-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
                      <span className="material-symbols-outlined text-blue-600 text-2xl">
                        <BookCopy />
                      </span>
                    </div>
                    <div>
                      <h2 className="text-xl font-bold">
                        {subject.subjects.name}
                      </h2>
                      <p className="text-sm w-90 text-slate-500 truncate">
                        {subject.subjects.description}
                      </p>
                    </div>
                  </div>

                  <div className="min-w-[140px]">
                    <div className="flex justify-between text-xs font-semibold mb-1">
                      <span className="text-primary">Progress</span>
                      <span>4 / 12 Chapters</span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full">
                      <div
                        className="h-full bg-primary rounded-full"
                        style={{ width: "33%" }}
                      />
                    </div>
                  </div>
                </div>

                {/* Chapter Items */}
                {e_data.map((item, idx) => {
                  // Check if chapter belongs to current subject
                  if (subject.subjects.id === item.subjects.id) {
                    return (
                      <div
                        key={idx}
                        className="p-4 flex justify-between items-center cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/50"
                      >
                        <div>
                          <h4 className="font-medium">{item.name}</h4>
                          <span className="text-xs text-slate-400">
                            Completed 2 days ago
                          </span>
                        </div>
                        <button
                          onClick={() =>
                            handleButton(item.subjects.id, item.id)
                          }
                          className={`px-4 py-2 border ${attemptedChapters.has(item.id) ? "bg-blue-600" : "bg-green-600"} text-white cursor-pointer hover:text-blue-400 hover:border-slate-400 rounded-lg text-sm font-semibold hover:bg-slate-200`}
                        >
                          {attemptedChapters.has(item.id) ? "Retake Test" : "Take Test"}
                        </button>
                      </div>
                    );
                  }
                  return null; // don't forget this for map
                })}
              </section>
            );
        })}

        {/* --- PREFERENCES MODAL --- */}
        {showPrefs && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div 
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              onClick={() => setShowPrefs(false)}
            />
            <div className="relative bg-white dark:bg-slate-900 w-full max-w-xl rounded-4xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in zoom-in-95 duration-200">
              {/* Modal Header */}
              <div className="p-8 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
                <h3 className="text-2xl font-black tracking-tight">Exam Preferences</h3>
                <p className="text-slate-500 text-sm mt-1">Select how you want to attempt this chapter</p>
              </div>

              {/* Modal Content */}
              <div className="p-8 space-y-4">
                {/* 1. Normal Mode */}
                <div 
                  onClick={() => setPrefs(p => ({ ...p, mode: "normal" }))}
                  className={`p-5 rounded-2xl border-2 transition-all cursor-pointer flex items-center gap-4 ${
                    prefs.mode === "normal" 
                      ? "border-blue-600 bg-blue-50/50 dark:bg-blue-900/20" 
                      : "border-slate-100 dark:border-slate-800 hover:border-slate-200"
                  }`}
                >
                  <div className={`p-3 rounded-xl ${prefs.mode === "normal" ? "bg-blue-600 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-500"}`}>
                    <Coffee size={24} />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold flex items-center gap-2">
                      Relaxed Practice
                      {prefs.mode === "normal" && <CheckCircle2 size={16} className="text-blue-600" />}
                    </h4>
                    <p className="text-xs text-slate-500">No timer, no proctoring. Study at your own pace.</p>
                  </div>
                </div>

                {/* 2. Speed Drill */}
                <div 
                  onClick={() => setPrefs(p => ({ ...p, mode: "speed" }))}
                  className={`p-5 rounded-2xl border-2 transition-all cursor-pointer space-y-4 ${
                    prefs.mode === "speed" 
                      ? "border-orange-500 bg-orange-50/50 dark:bg-orange-900/10" 
                      : "border-slate-100 dark:border-slate-800 hover:border-slate-200"
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-xl ${prefs.mode === "speed" ? "bg-orange-500 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-500"}`}>
                      <Zap size={24} />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold flex items-center gap-2">
                        Speed Drill
                        {prefs.mode === "speed" && <CheckCircle2 size={16} className="text-orange-500" />}
                      </h4>
                      <p className="text-xs text-slate-500">Timer enabled, Camera disabled. Perfect for speed.</p>
                    </div>
                  </div>

                  {prefs.mode === "speed" && (
                    <div className="pl-14 flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                       <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Time:</span>
                       {[30, 60, 90].map(t => (
                         <button
                            key={t}
                            onClick={(e) => { e.stopPropagation(); setPrefs(p => ({ ...p, time: t })); }}
                            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                              prefs.time === t 
                                ? "bg-orange-500 text-white shadow-lg shadow-orange-500/30" 
                                : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 hover:bg-slate-50"
                            }`}
                         >
                           {t}m
                         </button>
                       ))}
                    </div>
                  )}
                </div>

                {/* 3. Proctored Mode */}
                <div 
                  onClick={() => setPrefs(p => ({ ...p, mode: "proctored" }))}
                  className={`p-5 rounded-2xl border-2 transition-all cursor-pointer flex items-center gap-4 ${
                    prefs.mode === "proctored" 
                      ? "border-emerald-600 bg-emerald-50/50 dark:bg-emerald-900/20" 
                      : "border-slate-100 dark:border-slate-800 hover:border-slate-200"
                  }`}
                >
                  <div className={`p-3 rounded-xl ${prefs.mode === "proctored" ? "bg-emerald-600 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-500"}`}>
                    <Shield size={24} />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold flex items-center gap-2">
                      Full Simulation
                      {prefs.mode === "proctored" && <CheckCircle2 size={16} className="text-emerald-600" />}
                    </h4>
                    <p className="text-xs text-slate-500">Camera + Timer. The ultimate exam environment.</p>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-8 bg-slate-50 dark:bg-slate-800/50 flex gap-4">
                <button 
                  onClick={() => setShowPrefs(false)}
                  className="flex-1 py-4 text-sm font-bold text-slate-500 hover:bg-white dark:hover:bg-slate-800 rounded-2xl transition-all border border-transparent hover:border-slate-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleStartTest}
                  className="flex-1 py-4 text-sm font-bold bg-slate-900 dark:bg-blue-600 text-white rounded-2xl hover:opacity-90 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xl"
                >
                  Start Now
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-12 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-10 px-4 md:px-10">
        <div className="max-w-300 mx-auto text-sm text-slate-500">
          © 2024 OSSC CGL Prep. All rights reserved.
        </div>
      </footer>
    </div>
  );
};

export default Exam;


const ExamSkeleton = () => {
  return (
    <div className="bg-background-light dark:bg-background-dark font-display min-h-screen animate-pulse">
      
      <main className="max-w-300 mx-auto w-full px-4 py-6 md:px-10">
        
        {/* Header Skeleton */}
        <div className="mb-8">
          <div className="h-8 w-72 bg-slate-300 dark:bg-slate-700 rounded mb-3"></div>
          <div className="h-4 w-96 bg-slate-200 dark:bg-slate-700 rounded"></div>
        </div>

        {/* Subject Card Skeleton */}
        {[1,2,3].map((_, index) => (
          <section
            key={index}
            className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm mb-8"
          >
            {/* Subject Header */}
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between">
              
              <div className="flex items-center gap-4">
                
                <div className="size-12 bg-slate-300 dark:bg-slate-700 rounded-xl"></div>

                <div>
                  <div className="h-5 w-40 bg-slate-300 dark:bg-slate-700 rounded mb-2"></div>
                  <div className="h-3 w-72 bg-slate-200 dark:bg-slate-700 rounded"></div>
                </div>

              </div>

              {/* Progress Skeleton */}
              <div className="min-w-[140px]">
                <div className="h-3 w-24 bg-slate-300 dark:bg-slate-700 rounded mb-2"></div>
                <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded"></div>
              </div>

            </div>

            {/* Chapter Skeleton Rows */}
            {[1,2,3].map((_, idx) => (
              <div
                key={idx}
                className="p-4 flex justify-between items-center"
              >
                <div>
                  <div className="h-4 w-40 bg-slate-300 dark:bg-slate-700 rounded mb-2"></div>
                  <div className="h-3 w-28 bg-slate-200 dark:bg-slate-700 rounded"></div>
                </div>

                <div className="h-8 w-20 bg-slate-300 dark:bg-slate-700 rounded-lg"></div>
              </div>
            ))}
          </section>
        ))}
      </main>

      {/* Footer Skeleton */}
      <footer className="mt-12 border-t border-slate-200 dark:border-slate-800 py-10 px-4 md:px-10">
        <div className="max-w-300 mx-auto">
          <div className="h-4 w-60 bg-slate-300 dark:bg-slate-700 rounded"></div>
        </div>
      </footer>

    </div>
  );
};
