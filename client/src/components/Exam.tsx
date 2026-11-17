import React, { Suspense, useEffect, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { getExamSubjects } from "../services/examService";
import { useDispatch, useSelector } from "react-redux";
import { fetchExamSubjects } from "../slice/examSubjectSlice";
import type { AppDispatch, RootState } from "../store";
import {
  BookCopy,
  Shield,
  Zap,
  Coffee,
  Clock,
  CheckCircle2,
  ChevronRight,
  ChevronDown,
  Target,
  ArrowRight,
} from "lucide-react";
import { fetchChapter } from "../slice/chapterSlice";
import { useNotifications } from "reapop";
import { supabase } from "../utils/supabase";
import { ExamTicker } from "../components/ui/ExamTicker";

const Exam = () => {
  const { eid } = useParams<{ eid: string }>();
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const location = useLocation();
  const { notify } = useNotifications();

  const [showPrefs, setShowPrefs] = useState(false);
  const [prefs, setPrefs] = useState({
    sid: "",
    cid: "",
    mode: "normal" as "normal" | "speed" | "proctored",
    time: 30,
  });

  const { examData } = useSelector(
    (state: RootState) => state.exams ?? { examData: [] },
  );
  const { data, e_data, loading, error } = useSelector(
    (state: RootState) => state.examSubject ?? null,
  );
  const { user, profile } = useSelector(
    (state: RootState) => state.user ?? { user: null, profile: null },
  );
  const [attemptedChapters, setAttemptedChapters] = useState<Set<string>>(
    new Set(),
  );
  const [expandedSubjects, setExpandedSubjects] = useState<Set<string>>(
    new Set(),
  );

  const targetedExams = React.useMemo(() => {
    if (!profile?.target_exams || !examData) return [];
    return examData.filter((ex) => profile.target_exams.includes(ex.id));
  }, [profile, examData]);

  const autoOpenChapterId = location.state?.autoOpenChapterId;

  const toggleSubject = (sid: string) => {
    setExpandedSubjects((prev) => {
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
        const ids = new Set(data.map((a) => a.chapter_id));
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
      const chapter = e_data.find((c) => c.id === autoOpenChapterId);
      if (chapter && chapter.subjects) {
        const sid = chapter.subjects.id;
        setExpandedSubjects(new Set([sid]));
        setTimeout(() => {
          handleButton(sid, autoOpenChapterId);
        }, 1200); // Wait for open animation
      }
    }
  }, [autoOpenChapterId, data, e_data]);

  function handleButton(sid: string, cid: string) {
    setPrefs((prev) => ({ ...prev, sid, cid }));
    setShowPrefs(true);
  }

  function handleStartTest() {
    const { sid, cid, mode, time } = prefs;
    navigate(`test/${sid}/${cid}?mode=${mode}&time=${time}`);
    setShowPrefs(false);
  }

  console.log("Redux Data:", data);

  if (loading) {
    return <ExamSkeleton />;
  }

  return (
    <div className="min-h-full text-on-surface font-narrative antialiased transition-colors duration-700">
      {/* Main Content */}
      <main className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
        {/* Page header */}
        <div className="mb-6 max-w-3xl sm:mb-8">
          <p className="text-sm font-semibold text-primary">Your learning library</p>
          <h1 className="mt-1 text-2xl font-bold leading-tight tracking-tight text-on-surface animate-reveal sm:text-3xl lg:text-4xl">
            Subjects and chapters
          </h1>
          <p
            className="mt-2 max-w-2xl text-sm leading-relaxed text-on-surface-variant animate-reveal sm:text-base"
            style={{ animationDelay: "0.1s" }}
          >
            Browse your exam curriculum and choose a chapter to start practicing.
          </p>
        </div>

        {/* --- STICKY EXAM PREFERENCE TICKER --- */}
        {!eid && (
          <div className="sticky top-0 z-40 -mx-4 mb-5 border-y border-outline-variant/20 bg-surface/95 px-4 py-3 shadow-sm backdrop-blur-xl transition-all duration-300 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
            <div className="flex-col md:flex-row max-w-300 mx-auto overflow-x-auto custom-scrollbar-hide flex items-center justify-between gap-2">
              {/* <div className="flex items-center gap-3 mr-6 shrink-0">
              <Target className="size-4 text-primary" />
              <span className="text-[10px] font-technical uppercase tracking-[0.3em] font-black opacity-40">Active Landscapes:</span>
            </div> */}

              <div className="overflow-x-scroll">
                <ExamTicker
                  targetedExams={targetedExams}
                  selectedExam={eid || ""}
                  setSelectedExam={(id) =>
                    navigate(`/user/dashboard/exam/${id}`)
                  }
                />
              </div>
            </div>
          </div>
        )}

        <div className="space-y-3 pb-20 sm:space-y-4">
          {data.map((subject: any, index: number) => {
            // Technical Verification: ensure parent subject existence manifestation
            if (!subject.subjects) return null;

            if (subject.exam_id === eid) {
              const subjectChapters = e_data.filter(
                (chapter) => chapter.subjects?.id === subject.subjects.id,
              );
              const completedChapters = subjectChapters.filter((chapter) =>
                attemptedChapters.has(chapter.id),
              ).length;
              const progress = subjectChapters.length
                ? Math.round((completedChapters / subjectChapters.length) * 100)
                : 0;
              return (
                <section
                  key={index}
                  className="overflow-hidden rounded-2xl border border-outline-variant/20 bg-surface-container-low shadow-sm transition-shadow duration-300 hover:shadow-md sm:rounded-3xl"
                >
                  {/* Subject Header - Accordion Toggle */}
                  <button
                    type="button"
                    aria-expanded={expandedSubjects.has(subject.subjects.id)}
                    onClick={() => toggleSubject(subject.subjects.id)}
                    className="group flex w-full flex-col items-start justify-between gap-4 bg-gradient-to-r from-primary/8 to-surface-container-low p-4 text-left transition-colors hover:from-primary/10 sm:p-5 md:flex-row md:items-center md:gap-6 md:p-6"
                  >
                    <div className="flex items-center gap-2 md:gap-4 flex-1">
                      <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary transition-transform duration-300 group-hover:scale-105 sm:size-12 sm:rounded-2xl">
                        <span className="text-primary text-2xl">
                          <BookCopy className="size-6 sm:size-8" />
                        </span>
                      </div>
                      <div>
                        <h2 className="text-base font-semibold tracking-tight text-on-surface sm:text-lg md:text-xl">
                          {subject.subjects.name}
                        </h2>
                        <p className="mt-1 max-w-xl text-sm leading-relaxed text-on-surface-variant">
                          {subject.subjects.description}
                        </p>
                      </div>
                    </div>

                    <div className="flex w-full items-center gap-3 md:w-auto md:gap-5">
                      <div className="w-full md:w-48">
                        <div className="mb-2 flex items-baseline justify-between">
                          <span className="text-xs font-medium text-on-surface-variant">
                            Chapters completed
                          </span>
                          <span className="text-xs font-semibold tabular-nums text-on-surface">
                            {completedChapters} / {subjectChapters.length}
                          </span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-surface-container-highest" role="progressbar" aria-label={`${subject.subjects.name} chapters completed`} aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
                          <div
                            className="h-full rounded-full bg-primary transition-all duration-500"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>

                      <div
                        className={`grid size-9 shrink-0 place-items-center rounded-full bg-surface-container-highest text-on-surface-variant transition-transform duration-300 ${expandedSubjects.has(subject.subjects.id) ? "rotate-180" : ""}`}
                      >
                        <ChevronDown size={20} />
                      </div>
                    </div>
                  </button>

                  {/* Collapsible Content */}
                  <div
                    className={`grid transition-all duration-500 ease-botanical ${expandedSubjects.has(subject.subjects.id) ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}
                  >
                    <div className="overflow-hidden">
                      <div className="space-y-2 bg-surface/40 p-3 sm:p-4">
                        {/* Chapter Items */}
                        {e_data.map((item, idx) => {
                          // Technical Verification: ensure chapter subject manifestation
                          if (!item.subjects || !subject.subjects) return null;

                          if (subject.subjects.id === item.subjects.id) {
                            return (
                              <div
                                key={idx}
                                className="group flex flex-col gap-3 rounded-xl border border-outline-variant/15 bg-surface-container-lowest/70 p-3 transition-colors hover:border-primary/20 hover:bg-surface-container-lowest sm:flex-row sm:items-center sm:justify-between sm:p-4"
                              >
                                <div className="flex min-w-0 items-center gap-3 sm:gap-4">
                                  <div className={`grid size-9 shrink-0 place-items-center rounded-xl ${attemptedChapters.has(item.id) ? "bg-primary/10 text-primary" : "bg-surface-container-high text-on-surface-variant"}`}>
                                    {attemptedChapters.has(item.id) ? <CheckCircle2 size={18} /> : <BookCopy size={18} />}
                                  </div>
                                  <div>
                                    <h4 className="font-semibold text-on-surface text-sm sm:text-base group-hover:text-primary transition-colors">
                                      {item.name}
                                    </h4>
                                      <span className="text-xs text-on-surface-variant">
                                      Chapter practice
                                    </span>
                                  </div>
                                </div>
                                <div className="block w-full sm:w-auto">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleButton(item.subjects.id, item.id);
                                    }}
                                    className={`min-h-11 w-full rounded-xl px-5 py-2.5 text-sm font-semibold transition-all duration-300 shadow-sm sm:min-w-36 sm:w-auto sm:rounded-full ${
                                      attemptedChapters.has(item.id)
                                        ? "border border-primary/20 bg-primary/5 text-primary hover:bg-primary/10"
                                        : "bg-primary text-white hover:bg-primary/90 active:scale-[0.98]"
                                    }`}
                                  >
                                    {attemptedChapters.has(item.id)
                                      ? "Retake Test"
                                      : "Take Test"}
                                  </button>
                                </div>
                                {/* <div className="block md:hidden">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleButton(item.subjects.id, item.id);
                                    }}
                                    className={`md:mt-0 p-2 rounded-full text-sm font-black transition-all duration-300 shadow-sm ${
                                      attemptedChapters.has(item.id)
                                        ? "bg-surface-container-highest text-on-surface hover:bg-surface-dim"
                                        : "bg-linear-to-r from-primary to-primary-container text-white hover:scale-105 active:scale-95 shadow-primary/20 hover:shadow-lg"
                                    }`}
                                  >
                                    <ArrowRight />
                                  </button>
                                </div> */}
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
            }
          })}
        </div>

        {/* --- ADAPTIVE PREFERENCES MANIFEST (ACTION SHEET) --- */}
        {showPrefs && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
            <div
              className="absolute inset-0 bg-on-surface/20 backdrop-blur-md transition-all duration-1000 ease-botanical"
              onClick={() => setShowPrefs(false)}
            />
            <div className="relative bg-surface-container-lowest w-full sm:max-w-xl rounded-t-[2.5rem] rounded-b-none sm:rounded-b-[2.5rem] shadow-ambient-lg overflow-hidden animate-in fade-in slide-in-from-bottom sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-700 ease-botanical">
              {/* Mobile Drag Handle Ritual */}
              <div className="pt-4 pb-0 sm:hidden">
                <div className="w-12 h-1.5 bg-on-surface/10 rounded-full mx-auto" />
              </div>

              {/* Modal Header */}
            <div className="bg-surface-container-low/50 p-5 pb-4 sm:p-10 sm:pb-6">
                <h3 className="text-2xl sm:text-3xl font-black tracking-tighter text-on-surface">
                  Exam Preferences
                </h3>
                <p className="text-on-surface-variant text-sm sm:text-base mt-2 opacity-70">
                  Tailor your attempt for this chapter
                </p>
              </div>

              {/* Modal Content - Scrollable for small screens */}
              <div className="max-h-[70vh] space-y-4 overflow-y-auto p-5 pt-4 custom-scrollbar sm:p-10 sm:pt-4">
                {/* 1. Normal Mode */}
                <div
                  onClick={() => setPrefs((p) => ({ ...p, mode: "normal" }))}
                  className={`p-5 sm:p-6 rounded-3xl transition-all duration-300 cursor-pointer flex items-center gap-4 sm:gap-5 ${
                    prefs.mode === "normal"
                      ? "bg-primary/5 ring-2 ring-primary"
                      : "bg-surface-container-low hover:bg-surface-container-high"
                  } ${showPrefs ? "animate-reveal" : "opacity-0"}`}
                  style={{ animationDelay: "100ms" }}
                >
                  <div
                    className={`p-3 sm:p-4 rounded-2xl ${prefs.mode === "normal" ? "bg-primary text-white" : "bg-surface-container-highest text-on-surface-variant"}`}
                  >
                    <Coffee size={24} />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-base sm:text-lg flex items-center gap-2 text-on-surface">
                      Relaxed Practice
                      {prefs.mode === "normal" && (
                        <CheckCircle2 size={16} className="text-primary" />
                      )}
                    </h4>
                    <p className="text-xs sm:text-sm text-on-surface-variant opacity-70">
                      No timer, no proctoring. Study at your own pace.
                    </p>
                  </div>
                </div>

                {/* 2. Speed Drill */}
                <div
                  onClick={() => setPrefs((p) => ({ ...p, mode: "speed" }))}
                  className={`p-5 sm:p-6 rounded-3xl transition-all duration-300 cursor-pointer space-y-4 sm:space-y-5 ${
                    prefs.mode === "speed"
                      ? "bg-tertiary/5 ring-2 ring-tertiary"
                      : "bg-surface-container-low hover:bg-surface-container-high"
                  } ${showPrefs ? "animate-reveal" : "opacity-0"}`}
                  style={{ animationDelay: "200ms" }}
                >
                  <div className="flex items-center gap-4 sm:gap-5">
                    <div
                      className={`p-3 sm:p-4 rounded-2xl ${prefs.mode === "speed" ? "bg-tertiary text-white" : "bg-surface-container-highest text-on-surface-variant"}`}
                    >
                      <Zap size={24} />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-base sm:text-lg flex items-center gap-2 text-tertiary">
                        Speed Drill
                        {prefs.mode === "speed" && (
                          <CheckCircle2 size={16} className="text-tertiary" />
                        )}
                      </h4>
                      <p className="text-xs sm:text-sm text-on-surface-variant opacity-70">
                        Timer enabled, Camera disabled. Perfect for speed.
                      </p>
                    </div>
                  </div>

                  {prefs.mode === "speed" && (
                    <div className="pl-12 sm:pl-16 flex items-center gap-2 sm:gap-3 animate-in fade-in slide-in-from-top-2">
                      <span className="text-[9px] sm:text-[10px] font-mono font-bold text-on-surface-variant/40 uppercase tracking-widest">
                        Tempo:
                      </span>
                      {[30, 60, 90].map((t) => (
                        <button
                          key={t}
                          onClick={(e) => {
                            e.stopPropagation();
                            setPrefs((p) => ({ ...p, time: t }));
                          }}
                          className={`px-4 sm:px-5 py-1.5 sm:py-2 rounded-full text-[10px] sm:text-xs font-mono font-bold transition-all duration-300 ${
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
                {/* <div
                  onClick={() => setPrefs(p => ({ ...p, mode: "proctored" }))}
                  className={`p-5 sm:p-6 rounded-3xl transition-all duration-300 cursor-pointer flex items-center gap-4 sm:gap-5 ${prefs.mode === "proctored"
                      ? "bg-on-surface ring-2 ring-on-surface"
                      : "bg-surface-container-low hover:bg-surface-container-high"
                    } ${showPrefs ? "animate-reveal" : "opacity-0"}`}
                  style={{ animationDelay: '300ms' }}
                >
                  <div className={`p-3 sm:p-4 rounded-2xl ${prefs.mode === "proctored" ? "bg-on-surface text-surface" : "bg-surface-container-highest text-on-surface-variant"}`}>
                    <Shield size={24} />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-base sm:text-lg flex items-center gap-2 text-on-surface">
                      Full Simulation
                      {prefs.mode === "proctored" && <CheckCircle2 size={16} className="text-secondary" />}
                    </h4>
                    <p className="text-xs sm:text-sm text-on-surface-variant opacity-70">Camera + Timer. The ultimate exam environment.</p>
                  </div>
                </div> */}
              </div>

              {/* Modal Footer */}
              <div className="p-8 sm:p-10 bg-surface-container-low flex gap-3 sm:gap-4">
                <button
                  onClick={() => setShowPrefs(false)}
                  className="flex-1 py-4 sm:py-5 text-xs sm:text-sm font-black text-on-surface-variant hover:bg-surface-container-highest rounded-full transition-all duration-300"
                >
                  Cancel
                </button>
                <button
                  onClick={handleStartTest}
                  className="flex-[1.5] py-4 sm:py-5 text-xs sm:text-sm font-black bg-primary text-white rounded-full hover:scale-105 active:scale-95 transition-all duration-300 flex items-center justify-center gap-2 shadow-xl shadow-primary/20"
                >
                  Try Yourself.
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer - Minimal & Technical */}
      <footer className="hidden mt-20 py-12 px-4 md:px-10 border-t border-on-surface/5 opacity-40">
        <div className="max-w-300 mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="text-[10px] font-mono font-bold uppercase tracking-[0.2em]">
            © 2024 ARUMIND <span className="mx-2 text-primary">•</span> AI STUDY
            SPACE v1.0
          </div>
          <div className="flex gap-8 text-[10px] font-mono font-bold uppercase tracking-widest">
            <a href="#" className="hover:text-primary transition-colors">
              Integrity Policy
            </a>
            <a href="#" className="hover:text-primary transition-colors">
              Privacy
            </a>
            <a href="#" className="hover:text-primary transition-colors">
              Support
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Exam;

const ExamSkeleton = () => {
  return (
    <div className=" font-narrative min-h-screen animate-pulse">
      <main className="max-w-300 mx-auto w-full px-4 py-12 md:px-10">
        {/* Header Skeleton */}
        <div className="mb-16 mt-8">
          <div className="h-16 w-96 bg-surface-container-high rounded-2xl mb-6"></div>
          <div className="h-6 w-80 bg-surface-container-low rounded-xl"></div>
        </div>

        {/* Subject Card Skeleton */}
        {[1, 2].map((_, index) => (
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
            {[1, 2, 3].map((_, idx) => (
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
