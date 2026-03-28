import React, { Suspense, useEffect, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { getExamSubjects } from "../services/examService";
import { useDispatch, useSelector } from "react-redux";
import { fetchExamSubjects } from "../slice/examSubjectSlice";
import type { AppDispatch, RootState } from "../store";
import { BookCopy, Shield, Zap, Coffee, Clock, CheckCircle2, ChevronRight, ChevronDown, Target } from "lucide-react";
import { fetchChapter } from "../slice/chapterSlice";
import { useNotifications } from "reapop";
import { supabase } from "../utils/supabase";

const Exam = () => {

  const { eid } = useParams<{ eid: string }>();
  const dispatch = useDispatch< AppDispatch>();
  const navigate = useNavigate();
  const location = useLocation();
  const { notify } = useNotifications();
  
  const [showPrefs, setShowPrefs] = useState(false);
  const [prefs, setPrefs] = useState({
    sid: "",
    cid: "",
    mode: "normal" as "normal" | "speed" | "proctored",
    time: 30
  });

  const { examData } = useSelector((state: RootState) => state.exams ?? { examData: [] });
  const { data, e_data, loading, error } = useSelector(
    (state: RootState) => state.examSubject ?? null,
  );
  const { user, profile } = useSelector((state: RootState) => state.user ?? { user: null, profile: null });
  const [attemptedChapters, setAttemptedChapters] = useState<Set<string>>(new Set());
  const [expandedSubjects, setExpandedSubjects] = useState<Set<string>>(new Set());
  
  const targetedExams = React.useMemo(() => {
    if (!profile?.target_exams || !examData) return [];
    return examData.filter((ex) => profile.target_exams.includes(ex.id));
  }, [profile, examData]);

  const autoOpenChapterId = location.state?.autoOpenChapterId;

  const toggleSubject = (sid: string) => {
    setExpandedSubjects(prev => {
      const next = new Set(prev);
      if (next.has(sid)) {
        next.delete(sid);
      } else {
        next.add(sid);
      }
      return next;
    });
  };

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

  // Handle Automation from Dashboard
  useEffect(() => {
    if (autoOpenChapterId && data.length > 0 && e_data.length > 0) {
      const chapter = e_data.find(c => c.id === autoOpenChapterId);
      if (chapter) {
        const sid = chapter.subjects.id;
        setExpandedSubjects(new Set([sid]));
        setTimeout(() => {
           handleButton(sid, autoOpenChapterId);
        }, 1200); // Wait for open animation
      }
    }
  }, [autoOpenChapterId, data, e_data]);

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
    <div className="text-on-surface min-h-screen font-narrative antialiased transition-colors duration-700">
      {/* Main Content */}
      <main className="max-w-300 mx-auto w-full px-4 md:px-10">
        {/* Page Header - Asymmetrical & Editorial */}
        <div className="mb-16 max-w-2xl">
          <h1 className="text-5xl md:text-6xl font-black tracking-tight mb-6 leading-[0.9] text-on-surface animate-reveal">
            Subject-wise <span className="text-primary italic">Curriculum</span>
          </h1>
          <p className="text-on-surface-variant text-lg leading-relaxed max-w-md animate-reveal opacity-80" style={{ animationDelay: '0.1s' }}>
            Target your weak areas and track your growth across the OSSC CGL
            ecosystem.
          </p>
        </div>

        {/* --- STICKY EXAM PREFERENCE BAR --- */}
        <div className="sticky -top-6 lg:-top-10 z-40 bg-white/80 dark:bg-surface-container-low/80 backdrop-blur-3xl border-b border-on-surface/5 -mx-6 lg:-mx-10 px-6 lg:px-10 py-6 mb-12 shadow-sm transition-all duration-500">
           <div className="max-w-300 mx-auto overflow-x-auto custom-scrollbar-hide flex items-center gap-2">
              <div className="flex items-center gap-3 mr-6 shrink-0">
                 <Target className="size-4 text-primary" />
                 <span className="text-[10px] font-technical uppercase tracking-[0.3em] font-black opacity-40">Active Landscapes:</span>
              </div>
              {targetedExams.map((exam) => (
                <button
                  key={exam.id}
                  onClick={() => navigate(`../exam/${exam.id}`)}
                  className={`px-6 py-2 rounded-full font-technical font-black text-[10px] uppercase tracking-widest transition-all duration-500 shrink-0 ${
                    eid === exam.id
                      ? "bg-primary text-white shadow-lg shadow-primary/20 scale-105"
                      : "text-on-surface-variant hover:bg-surface-container-high"
                  }`}
                >
                  {exam.name}
                </button>
              ))}
           </div>
        </div>

        {data.map((subject: any, index: number) => {
          console.log("is exam id true...", subject.subjects.exam_subjects);
          if (subject.exam_id === eid)
            return (
              <section
                key={index}
                className="bg-surface-container-low rounded-3xl overflow-hidden hover-bloom mb-12 transition-all duration-500 ease-botanical"
              >
                {/* Subject Header - Accordion Toggle */}
                <div 
                  onClick={() => toggleSubject(subject.subjects.id)}
                  className="p-8 bg-surface-container-high/40 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 cursor-pointer group"
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div className="size-14 bg-primary/10 rounded-2xl flex text-black items-center justify-center transition-transform duration-500 group-hover:scale-110">
                      <span className="text-primary text-2xl">
                        <BookCopy size={28} />
                      </span>
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold tracking-tight text-on-surface">
                        {subject.subjects.name}
                      </h2>
                      <p className="text-sm text-on-surface-variant max-w-sm opacity-60">
                        {subject.subjects.description}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-8 w-full md:w-auto">
                    <div className="w-full md:w-48">
                      <div className="flex justify-between items-baseline mb-3">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-primary font-mono opacity-70">Study Progress</span>
                        <span className="text-sm font-bold font-mono">4 <span className="text-on-surface-variant/40 font-normal">/</span> 12</span>
                      </div>
                      <div className="w-full h-3 bg-surface-container-highest rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary-container rounded-full transition-all duration-1000 ease-botanical"
                          style={{ width: "33%" }}
                        />
                      </div>
                    </div>

                    <div className={`p-2 rounded-full bg-surface-container-highest text-on-surface-variant transition-transform duration-500 ${expandedSubjects.has(subject.subjects.id) ? "rotate-180" : ""}`}>
                      <ChevronDown size={20} />
                    </div>
                  </div>
                </div>

                {/* Collapsible Content */}
                <div className={`grid transition-all duration-500 ease-botanical ${expandedSubjects.has(subject.subjects.id) ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
                  <div className="overflow-hidden">
                    <div className="px-4 py-8 space-y-2 bg-surface/30">
                      {/* Chapter Items */}
                      {e_data.map((item, idx) => {
                    // Check if chapter belongs to current subject
                    if (subject.subjects.id === item.subjects.id) {
                      return (
                        <div
                          onClick={() =>
                              handleButton(item.subjects.id, item.id)
                            }
                          key={idx}
                          className="group p-5 mx-2 rounded-2xl flex justify-between items-center cursor-pointer hover:bg-surface-container-high transition-all duration-300 ease-botanical"
                        >
                          <div className="flex items-center gap-5">
                            <div className={`size-2 rounded-full ${attemptedChapters.has(item.id) ? "bg-primary" : "bg-on-surface-variant/20 group-hover:bg-primary/40"}`} />
                            <div>
                              <h4 className="font-bold text-on-surface text-lg group-hover:text-primary transition-colors">
                                {item.name}
                              </h4>
                              <span className="text-xs font-mono font-bold uppercase tracking-wider text-on-surface-variant/60">
                                Completed 2 days ago
                              </span>
                            </div>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleButton(item.subjects.id, item.id);
                            }}
                            className={`px-6 py-2.5 rounded-full text-sm font-black transition-all duration-300 shadow-sm ${
                              attemptedChapters.has(item.id) 
                                ? "bg-surface-container-highest text-on-surface hover:bg-surface-dim" 
                                : "bg-linear-to-r from-primary to-primary-container text-white hover:scale-105 active:scale-95 shadow-primary/20 hover:shadow-lg"
                            }`}
                          >
                            {attemptedChapters.has(item.id) ? "Retake Test" : "Take Test"}
                          </button>
                        </div>
                          );
                        }
                        return null;
                      })}
                    </div>
                  </div>
                </div>
              </section>
            );
        })}

        {/* --- PREFERENCES MODAL --- */}
        {showPrefs && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div 
              className="absolute inset-0 bg-on-surface/20 backdrop-blur-md"
              onClick={() => setShowPrefs(false)}
            />
            <div className="relative bg-surface-container-lowest w-full max-w-xl rounded-[2.5rem] shadow-ambient-lg overflow-hidden animate-in zoom-in-95 duration-300">
              {/* Modal Header */}
              <div className="p-10 pb-6 bg-surface-container-low/50">
                <h3 className="text-3xl font-black tracking-tighter text-on-surface">Exam Preferences</h3>
                <p className="text-on-surface-variant text-base mt-2 opacity-70">Tailor your attempt for this chapter</p>
              </div>

              {/* Modal Content */}
              <div className="p-10 pt-4 space-y-4">
                {/* 1. Normal Mode */}
                <div 
                  onClick={() => setPrefs(p => ({ ...p, mode: "normal" }))}
                  className={`p-6 rounded-3xl transition-all duration-300 cursor-pointer flex items-center gap-5 ${
                    prefs.mode === "normal" 
                      ? "bg-primary/5 ring-2 ring-primary" 
                      : "bg-surface-container-low hover:bg-surface-container-high"
                  }`}
                >
                  <div className={`p-4 rounded-2xl ${prefs.mode === "normal" ? "bg-primary text-white" : "bg-surface-container-highest text-on-surface-variant"}`}>
                    <Coffee size={24} />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-lg flex items-center gap-2 text-on-surface">
                      Relaxed Practice
                      {prefs.mode === "normal" && <CheckCircle2 size={18} className="text-primary" />}
                    </h4>
                    <p className="text-sm text-on-surface-variant opacity-70">No timer, no proctoring. Study at your own pace.</p>
                  </div>
                </div>

                {/* 2. Speed Drill */}
                <div 
                  onClick={() => setPrefs(p => ({ ...p, mode: "speed" }))}
                  className={`p-6 rounded-3xl transition-all duration-300 cursor-pointer space-y-5 ${
                    prefs.mode === "speed" 
                      ? "bg-tertiary/5 ring-2 ring-tertiary" 
                      : "bg-surface-container-low hover:bg-surface-container-high"
                  }`}
                >
                  <div className="flex items-center gap-5">
                    <div className={`p-4 rounded-2xl ${prefs.mode === "speed" ? "bg-tertiary text-white" : "bg-surface-container-highest text-on-surface-variant"}`}>
                      <Zap size={24} />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-lg flex items-center gap-2 text-tertiary">
                        Speed Drill
                        {prefs.mode === "speed" && <CheckCircle2 size={18} className="text-tertiary" />}
                      </h4>
                      <p className="text-sm text-on-surface-variant opacity-70">Timer enabled, Camera disabled. Perfect for speed.</p>
                    </div>
                  </div>

                  {prefs.mode === "speed" && (
                    <div className="pl-16 flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                       <span className="text-[10px] font-mono font-bold text-on-surface-variant/40 uppercase tracking-widest">Select Duration:</span>
                       {[30, 60, 90].map(t => (
                         <button
                            key={t}
                            onClick={(e) => { e.stopPropagation(); setPrefs(p => ({ ...p, time: t })); }}
                            className={`px-5 py-2 rounded-full text-xs font-mono font-bold transition-all duration-300 ${
                              prefs.time === t 
                                ? "bg-tertiary text-white shadow-lg shadow-tertiary/20" 
                                : "bg-surface-container-highest text-on-surface-variant hover:bg-surface-dim"
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
                  className={`p-6 rounded-3xl transition-all duration-300 cursor-pointer flex items-center gap-5 ${
                    prefs.mode === "proctored" 
                      ? "bg-on-surface ring-2 ring-on-surface" 
                      : "bg-surface-container-low hover:bg-surface-container-high"
                  }`}
                >
                  <div className={`p-4 rounded-2xl ${prefs.mode === "proctored" ? "bg-on-surface text-surface" : "bg-surface-container-highest text-on-surface-variant"}`}>
                    <Shield size={24} />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-lg flex items-center gap-2 text-on-surface">
                      Full Simulation
                      {prefs.mode === "proctored" && <CheckCircle2 size={18} className="text-primary" />}
                    </h4>
                    <p className="text-sm text-on-surface-variant opacity-70">Camera + Timer. The ultimate exam environment.</p>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-10 bg-surface-container-low flex gap-4">
                <button 
                  onClick={() => setShowPrefs(false)}
                  className="flex-1 py-5 text-sm font-black text-on-surface-variant hover:bg-surface-container-highest rounded-full transition-all duration-300"
                >
                  Go Back
                </button>
                <button 
                  onClick={handleStartTest}
                  className="flex-[1.5] py-5 text-sm font-black bg-primary text-white rounded-full hover:scale-105 active:scale-95 transition-all duration-300 flex items-center justify-center gap-2 shadow-xl shadow-primary/20"
                >
                  Begin Attempt
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer - Minimal & Technical */}
      <footer className="mt-20 py-12 px-4 md:px-10 border-t border-on-surface/5 opacity-40">
        <div className="max-w-300 mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="text-[10px] font-mono font-bold uppercase tracking-[0.2em]">
            © 2024 ARU.EDU <span className="mx-2 text-primary">•</span> DIGITAL GREENHOUSE v1.0
          </div>
          <div className="flex gap-8 text-[10px] font-mono font-bold uppercase tracking-widest">
            <a href="#" className="hover:text-primary transition-colors">Integrity Policy</a>
            <a href="#" className="hover:text-primary transition-colors">Privacy</a>
            <a href="#" className="hover:text-primary transition-colors">Support</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Exam;


const ExamSkeleton = () => {
  return (
    <div className="bg-surface font-narrative min-h-screen animate-pulse">
      <main className="max-w-300 mx-auto w-full px-4 py-12 md:px-10">
        
        {/* Header Skeleton */}
        <div className="mb-16 mt-8">
          <div className="h-16 w-96 bg-surface-container-high rounded-2xl mb-6"></div>
          <div className="h-6 w-80 bg-surface-container-low rounded-xl"></div>
        </div>

        {/* Subject Card Skeleton */}
        {[1,2].map((_, index) => (
          <section
            key={index}
            className="bg-surface-container-low rounded-3xl mb-12 overflow-hidden"
          >
            {/* Subject Header */}
            <div className="p-8 bg-surface-container-high/40 flex justify-between items-center">
              
              <div className="flex items-center gap-4">
                <div className="size-14 bg-surface-container-highest rounded-2xl"></div>
                <div>
                  <div className="h-6 w-48 bg-surface-container-highest rounded-lg mb-2"></div>
                  <div className="h-4 w-64 bg-surface-container-highest rounded-lg opacity-50"></div>
                </div>
              </div>

              {/* Progress Skeleton */}
              <div className="w-48">
                <div className="h-4 w-24 bg-surface-container-highest rounded mb-3"></div>
                <div className="w-full h-3 bg-surface-container-highest rounded-full"></div>
              </div>

            </div>

            {/* Chapter Skeleton Rows */}
            {[1,2,3].map((_, idx) => (
              <div
                key={idx}
                className="p-5 mx-2 flex justify-between items-center"
              >
                <div className="flex items-center gap-5">
                  <div className="size-2 rounded-full bg-surface-container-highest"></div>
                  <div>
                    <div className="h-5 w-48 bg-surface-container-high rounded-lg mb-2"></div>
                    <div className="h-3 w-32 bg-surface-container-high rounded-lg opacity-50"></div>
                  </div>
                </div>

                <div className="h-10 w-28 bg-surface-container-high rounded-full"></div>
              </div>
            ))}
          </section>
        ))}
      </main>
    </div>
  );
};
