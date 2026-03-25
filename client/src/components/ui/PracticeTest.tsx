import { ChevronLeft, Edit, Grid2X2, NotebookTabs, Timer } from "lucide-react";
import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { useNavigate, useParams, useSearchParams, useBlocker } from "react-router";
import { AlertPopup } from "./AlertPopup";
import { Button } from "./Button";
import { WarningModal } from "./WarningModal";
import { useDispatch, useSelector } from "react-redux";
import type { AppDispatch, RootState } from "../../store";
import {
  fetchFilteredQuestion,
  fetchQuestion,
} from "../../slice/questionSlice";
import { useNotifications } from "reapop";
import { QuestionPalette } from "./QuestionPalette";
import { useForm, FormProvider } from "react-hook-form";
import { QuestionList } from "../pracTiceTest/QuestionList";
import { supabase } from "../../utils/supabase";
import { detect } from "../../utils/detect";
import AdvancedProctoring from "./AdvanceProctoring";
import { startCamera } from "../../utils/startCamera";
import type { Violation } from "./ViolationFeed";
import ViolationWarningModal from "./ViolationWarningModel";
import ViolationFeed from "./ViolationFeed";
import { seedAbilityFromMockTest } from "../../services/questionService";

const SESSION_TTL = 30 * 60 * 1000; // 30 minutes in milliseconds

export default function PracticeTest() {
  const { eid, sid, cid } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const { notify } = useNotifications();

  // new......
  // PracticeTest.tsx — add these refs at the top with existing refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const animationRef = useRef<number | null>(null);
  const detectorRef = useRef<any>(null);
  const isProcessingRef = useRef(false);
  const frameCountRef = useRef(0);
  const noFaceStreakRef = useRef(0);
  const violationTimestamps = useRef<Record<string, number>>({});
  const registerViolationRef = useRef<(type: string) => void>(() => {});
  const streamRef = useRef<MediaStream | null>(null);

  const [violations, setViolations] = useState<Violation[]>([]);
  const [lastViolation, setLastViolation] = useState<Violation | null>(null);
  const [proctoringStatus, setProctoringStatus] = useState<string>("Initializing...");
  const [showWarning, setShowWarning] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [faceDetected, setFaceDetected] = useState(false);

  const { data: questions } = useSelector(
    (state: RootState) => state.questions,
  );
  const { user } = useSelector((state: RootState) => state.user);

  const [openAlert, setOpenAlert] = useState<boolean>(false);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const isCreatingRef = useRef(false);
  const [lastSaved, setLastSaved] = useState<number>(Date.now());
  const [searchParams] = useSearchParams();
  const mode = searchParams.get("mode") || "proctored";
  const timeLimit = parseInt(searchParams.get("time") || "30");
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [confirmedAnswers, setConfirmedAnswers] = useState<
    Record<number, boolean>
  >({});
  const [language, setLanguage] = useState<"en" | "od">("en");
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [counts, setCounts] = useState({ attempted: 0, total: 0 });

  const isNavigatingAwayRef = useRef(false);

  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      !isNavigatingAwayRef.current &&
      Object.keys(watchedAnswers || {}).length > 0 && 
      currentLocation.pathname !== nextLocation.pathname
  );

  useEffect(() => {
    if (blocker.state === "blocked") {
      setOpenAlert(true);
    }
  }, [blocker]);

  const methods = useForm<any>({
    defaultValues: { answers: {} },
  });

  const { handleSubmit, setValue, watch, reset } = methods;
  const watchedAnswers = watch("answers");

  // Consolidated initialization and reset
  useEffect(() => {
    console.log(
      `[PracticeTest] CID changed or component mounted. Current CID: ${cid}`,
    );

    // 1. CLEAR previous state to prevent carry-over
    setAttemptId(null);
    setConfirmedAnswers({});
    reset({ answers: {} });

    // 2. Try loading from storage
    const storageKey = `practice_test_${cid}`;
    const savedState = localStorage.getItem(storageKey);

    if (savedState) {
      try {
        const {
          answers,
          timestamp,
          confirmed,
          attemptId: savedAttemptId,
        } = JSON.parse(savedState);
        const now = Date.now();

        if (now - timestamp < SESSION_TTL) {
          console.log(
            `[PracticeTest] Restoring session from storage. AttemptID: ${savedAttemptId}`,
          );
          reset({ answers });
          setConfirmedAnswers(confirmed || {});
          if (savedAttemptId) setAttemptId(savedAttemptId);
          setLastSaved(timestamp);
        } else {
          console.log("[PracticeTest] Storage session expired.");
          localStorage.removeItem(storageKey);
        }
      } catch (e) {
        console.error("[PracticeTest] Failed to parse storage state:", e);
      }
    }
    dispatch(fetchQuestion(cid as string));
    dispatch(fetchFilteredQuestion(user?.id));
  }, [cid, dispatch, reset]); // ONLY depend on cid to ensure reset happens only when chapter changes

  // Track attemptId changes
  useEffect(() => {
    if (attemptId) {
      console.log(`[PracticeTest] ACTIVE AttemptID: ${attemptId}`);
    } else {
      console.log(`[PracticeTest] AttemptID is currently null.`);
    }
  }, [attemptId]);

  // Save to localStorage on change
  useEffect(() => {
    if (Object.keys(watchedAnswers || {}).length > 0) {
      const storageKey = `practice_test_${cid}`;
      localStorage.setItem(
        storageKey,
        JSON.stringify({
          answers: watchedAnswers,
          confirmed: confirmedAnswers,
          attemptId: attemptId,
          timestamp: Date.now(),
        }),
      );
      setLastSaved(Date.now());
    }
  }, [watchedAnswers, cid, confirmedAnswers, attemptId]);

  // proctoring init...
  useEffect(() => {
    let cancelled = false;
    
    // Only run proctoring if in proctored mode
    if (mode !== "proctored") {
      setProctoringStatus("Standard Mode");
      return;
    }

    const initProctoring = async () => {
      try {
        // 1. start camera and track stream
        const stream = await startCamera({ videoRef });
        streamRef.current = stream;
        if (cancelled) return;
        setCameraReady(true);

        // 2. load TensorFlow face model
        setProctoringStatus("Loading AI Engine...");
        const tf = await import("@tensorflow/tfjs");
        
        // Ensure backends are registered explicitly for Vite
        await import("@tensorflow/tfjs-backend-webgl");
        await tf.setBackend("webgl");
        await tf.ready();
        
        setProctoringStatus("Loading Face Model...");
        const faceLandmarksDetection =
          await import("@tensorflow-models/face-landmarks-detection");
        const detector = await faceLandmarksDetection.createDetector(
          faceLandmarksDetection.SupportedModels.MediaPipeFaceMesh,
          { 
            runtime: "mediapipe", 
            maxFaces: 1, 
            refineLandmarks: true,
            solutionPath: "https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh"
          },
        );
        if (cancelled) return;
        detectorRef.current = detector;
        setProctoringStatus("Model Ready");

        // 3. start detection loop
        detect({
          videoRef,
          detector,
          animationRef,
          isProcessingRef,
          frameCountRef,
          noFaceStreakRef,
          registerViolation: (type) => registerViolationRef.current(type),
          onFaceStatusChange: (detected) => {
            setFaceDetected(detected);
            if (detected) setProctoringStatus("Monitoring");
          },
          onDiagnostic: (data) => {
            if (!faceDetected) {
              setProctoringStatus(`Searching... (${Math.round(data.inferenceTime)}ms)`);
            }
          }
        });
      } catch (err: any) {
        console.error("Proctoring init failed:", err);
        setProctoringStatus(`Error: ${err.message || 'Initialization failed'}`);
      }
    };

    initProctoring();

    return () => {
      cancelled = true;
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      // stop camera stream via ref for reliability
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    };
  }, []); // only on mount

  const stopProctoring = useCallback(() => {
    console.log("[Proctoring] Stopping proctoring and camera...");
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    
    // Stop all tracks via the persistent stream ref
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setCameraReady(false);
    setProctoringStatus("Proctoring Stopped");
  }, []);

  const handlePreSubmit = () => {
    const total = questions?.length || 0;
    const attempted = questions?.filter(q => watchedAnswers?.[q.id]).length || 0;
    setCounts({ attempted, total });
    setShowSubmitConfirm(true);
  };

  //new .....

  const onSubmit = async (data: any) => {
    console.log(
      "[PracticeTest] Attempting to submit. AttemptID in state:",
      attemptId,
    );
    if (!attemptId) {
      notify({
        title: "Error",
        message: "No active session found. Please wait for initialization or refresh.",
        status: "error",
      });
      return;
    }

    try {
      // Calculate final metrics
      const total_questions = questions?.length || 0;
      let total_marks = 0;
      let score = 0;

      questions?.forEach((q: any) => {
        const marks = q.marks || 0;
        total_marks += marks;
        if (data.answers[q.id] === q.correct_answer) {
          score += marks;
        }
      });

      const payload = (questions || []).map((q: any) => ({
        attempt_id: attemptId,
        question_id: q.id,
        is_submitted: true,
        ...(data.answers[q.id] ? { selected_option: data.answers[q.id] } : {})
      }));
      console.log("payload....", payload);
      console.log(`[PracticeTest] Upserting ${payload.length} answers...`);
      const { error: answerError } = await supabase
        .from("test_attempt_answers")
        .upsert(payload, { onConflict: "attempt_id,question_id" });

      if (answerError) throw answerError;

      console.log(
        `[PracticeTest] Updating status and metrics for AttemptID: ${attemptId}`,
      );
      const { data: updateData, error: attemptError } = await supabase
        .from("test_attempts")
        .update({ 
          status: "COMPLETED", 
          submitted_at: new Date().toISOString(),
          total_questions,
          total_marks,
          score
        })
        .eq("id", attemptId)
        .select();

      if (attemptError) throw attemptError;
      console.log("[PracticeTest] Status update result:", updateData);

      if (!updateData || updateData.length === 0) {
        console.warn(
          "[PracticeTest] No rows were updated! This usually means the ID doesn't exist.",
        );
      }

      // Clear local storage
      localStorage.removeItem(`practice_test_${cid}`);
      
      // STOP CAMERA EXPLICITLY
      stopProctoring();
       await seedAbilityFromMockTest(user?.id, eid, attemptId);
      notify({
        title: "Success",
        message: "Your answers have been submitted successfully!",
        status: "success",
        dismissAfter: 5000,
      });

      isNavigatingAwayRef.current = true;
      navigate(`/user/results/${attemptId}`);
    
    } catch (error: any) {
      console.error("Submission failed:", error);
      notify({
        title: "Submission Failed",
        message: error.message || "An error occurred during submission.",
        status: "error",
      });
    }
  };
  // new.....
  const registerViolation = useCallback(
    async (type: string) => {
      const now = Date.now();
      const last = violationTimestamps.current[type] ?? 0;
      if (now - last < 3000) return;
      violationTimestamps.current[type] = now;

      const newViolation: Violation = {
        id: crypto.randomUUID(),
        type,
        occurred_at: new Date().toISOString(),
      };

      setViolations((prev) => {
        const next = [newViolation, ...prev]; // newest first
        if (next.length >= 3) setShowWarning(true);
        if (next.length >= 7) handleAutoSubmit();
        return next;
      });

      setLastViolation(newViolation);

      // persist to Supabase
      if (attemptId && user?.id) {
        supabase.from("exam_violations").insert({
          attempt_id: attemptId,
          user_id: user.id,
          exam_id: eid,
          subject_id: sid,
          chapter_id: cid,
          type,
          occurred_at: newViolation.occurred_at,
        });
      }
    },
    [attemptId, user, eid, sid, cid],
  );

  // Sync ref with latest callback
  useEffect(() => {
    registerViolationRef.current = registerViolation;
  }, [registerViolation]);

  const handleAutoSubmit = useCallback(() => {
    console.warn("[Proctoring] AUTO-SUBMIT TRIGGERED DUE TO VIOLATIONS");
    handleSubmit(onSubmit, (err) => {
      console.error("[Proctoring] Auto-submit validation failed:", err);
      notify({
        status: "error",
        title: "Auto-submit failure",
        message: "Could not auto-submit due to form validation. Please check your answers and submit manually."
      });
    })();
  }, [handleSubmit, onSubmit, notify]);

  // Timer Initialization & Logic
  useEffect(() => {
    if (mode === "normal") return;

    // Initialize timer
    if (timeLeft === null) {
      setTimeLeft(timeLimit * 60);
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev === null || prev <= 0) {
          clearInterval(timer);
          if (prev === 0) handleAutoSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [mode, timeLimit, handleAutoSubmit]);

  // new....
  useEffect(() => {
    if (mode !== "proctored") return;
    const onBlur = () => registerViolation("window_blur");
    const onVisibility = () => {
      if (document.visibilityState === "hidden")
        registerViolation("tab_switch");
    };
    const onCopy = (e: ClipboardEvent) => {
      e.preventDefault();
      registerViolation("copy_attempt");
    };
    const onPaste = (e: ClipboardEvent) => {
      e.preventDefault();
      registerViolation("paste_attempt");
    };
    const onContextMenu = (e: MouseEvent) => e.preventDefault();
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = ""; // Required for Chrome
    };

    window.addEventListener("blur", onBlur);
    document.addEventListener("visibilitychange", onVisibility);
    document.addEventListener("copy", onCopy);
    document.addEventListener("paste", onPaste);
    document.addEventListener("contextmenu", onContextMenu);
    window.addEventListener("beforeunload", onBeforeUnload);

    return () => {
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("visibilitychange", onVisibility);
      document.removeEventListener("copy", onCopy);
      document.removeEventListener("paste", onPaste);
      document.removeEventListener("contextmenu", onContextMenu);
      window.removeEventListener("beforeunload", onBeforeUnload);
    };
  }, [registerViolation]);

  // Session Cleanup
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      if (now - lastSaved > SESSION_TTL) {
        const storageKey = `practice_test_${cid}`;
        localStorage.removeItem(storageKey);
        // Optional: notify user or redirect
      }
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [lastSaved, cid]);

  // Create test attempt record
  useEffect(() => {
    const createAttempt = async () => {
      // Don't create if missing info, or already have an ID, or is currently creating
      if (!user?.id || !cid || attemptId || isCreatingRef.current) return;

      try {
        isCreatingRef.current = true;
        console.log(
          "Checking for existing 'started' attempt for user/chapter...",
        );

        // 1. Check for existing "started" attempt to avoid duplicates
        const { data: existing, error: findError } = await supabase
          .from("test_attempts")
          .select("id")
          .eq("user_id", user.id)
          .eq("chapter_id", cid)
          .eq("status", "STARTED")
          .order("started_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (existing) {
          console.log("Found existing attempt:", existing.id);
          setAttemptId(existing.id);
          const storageKey = `practice_test_${cid}`;
          const current = localStorage.getItem(storageKey);
          const state = current
            ? JSON.parse(current)
            : { answers: {}, confirmed: {} };
          localStorage.setItem(
            storageKey,
            JSON.stringify({
              ...state,
              attemptId: existing.id,
              timestamp: Date.now(),
            }),
          );
          return;
        }

        console.log("No existing attempt found, creating new one...");
        const { data, error } = await supabase
          .from("test_attempts")
          .insert({
            user_id: user.id,
            exam_id: eid,
            subject_id: sid,
            chapter_id: cid,
            status: "STARTED",
            started_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (error) throw error;

        if (data) {
          setAttemptId(data.id);
          // Immediately update localStorage with the new attemptId
          const storageKey = `practice_test_${cid}`;
          const current = localStorage.getItem(storageKey);
          const state = current
            ? JSON.parse(current)
            : { answers: {}, confirmed: {} };
          localStorage.setItem(
            storageKey,
            JSON.stringify({
              ...state,
              attemptId: data.id,
              timestamp: Date.now(),
            }),
          );
        }
      } catch (error: any) {
        console.error("Error creating test attempt:", error);
        notify({
          title: "Session Error",
          message: error.message || "Failed to initialize test session.",
          status: "error",
        });
      } finally {
        isCreatingRef.current = false;
      }
    };

    createAttempt();
  }, [user, eid, sid, cid, attemptId]);

  // Sync questions to test_attempts metadata columns
  useEffect(() => {
    if (attemptId && questions?.length > 0) {
      const syncQuestions = async () => {
        try {
          const qIds = questions.map((q: any) => q.id.toString());
          const initialAttempted = questions.map((q: any) => ({
            question_id: q.id.toString(),
            user_answered: ""
          }));
          
          await supabase.from("test_attempts")
            .update({ 
              question_ids: qIds,
              attempted_questions: initialAttempted 
            })
            .eq("id", attemptId);
        } catch (err) {
          console.error("Failed to sync questions to attempt metadata:", err);
        }
      };
      syncQuestions();
    }
  }, [attemptId, questions]);

  const handleBackButton = () => {
    setOpenAlert(true);
  };

  const confirmExit = async () => {
    setOpenAlert(false);
    
    // If user has an active attempt, mark it as LEFT instead of leaving it in STARTED
    if (attemptId) {
      try {
        await supabase
          .from("test_attempts")
          .update({ status: "LEFT THE EXAM", submitted_at: new Date().toISOString() })
          .eq("id", attemptId);
        
        // Also clear local storage session since we're leaving
        localStorage.removeItem(`practice_test_${cid}`);
      } catch (err) {
        console.error("Failed to update status on exit:", err);
      }
    }

    isNavigatingAwayRef.current = true;
    if (blocker.state === "blocked") {
      blocker.reset();
    }
    
    if (attemptId) {
      navigate(`/user/results/${attemptId}`);
    } else {
      // Deterministic navigation back to the exam overview
      navigate(`/user/dashboard/exam/${eid}`);
    }
  };

  const cancelExit = () => {
    setOpenAlert(false);
    if (blocker.state === "blocked") {
        blocker.reset();
    }
  }

  const handleConfirm = async (questionId: number, answer: string) => {
    if (!attemptId) return;

    try {
      // 1. Original Logic: Upsert to test_attempt_answers
      const { error } = await supabase.from("test_attempt_answers").upsert(
        {
          attempt_id: attemptId,
          question_id: questionId,
          selected_option: answer,
          is_submitted: false,
        },
        { onConflict: "attempt_id,question_id" },
      );

      if (error) throw error;

      // 2. Original Logic: Track in question_attempt_tracking
      await supabase.from("question_attempt_tracking").insert({
        user_id: user?.id,
        question_id: questionId,
        attempt_id: attemptId,
        selected_option: answer,
        attempted_at: new Date().toISOString(),
      });

      // 3. New Logic: Update attempted_questions in test_attempts
      const { data: attempt } = await supabase
        .from("test_attempts")
        .select("attempted_questions")
        .eq("id", attemptId)
        .single();
      
      if (attempt?.attempted_questions) {
        const updated = attempt.attempted_questions.map((q: any) => 
          q.question_id === questionId.toString() ? { ...q, user_answered: answer } : q
        );
        await supabase.from("test_attempts")
          .update({ attempted_questions: updated })
          .eq("id", attemptId);
      }
    } catch (error) {
      console.error("Failed to sync answer:", error);
    }
  };

  const questionRef = useRef<(HTMLDivElement | null)[]>([]);

  return (
    <FormProvider {...methods}>
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 font-display min-h-screen flex flex-col">
          <Header 
             attemptId={attemptId} 
             timeLeft={timeLeft} 
             onPreSubmit={handlePreSubmit}
             onBack={handleBackButton}
             language={language}
             setLanguage={setLanguage}
          />
          {/* Floating camera widget */}
          {mode === "proctored" && (
            <AdvancedProctoring
              videoRef={videoRef}
              isCameraReady={cameraReady}
              isFaceDetected={faceDetected}
              statusText={proctoringStatus}
              violationCount={violations.length}
              autoSubmitAt={7}
            />
          )}

          {/* Floating violation feed — bottom right corner */}
          {mode === "proctored" && (
            <>
              <div
                style={{
                  position: "fixed",
                  bottom: "24px",
                  right: "24px",
                  zIndex: 50,
                }}
              >
                <ViolationFeed
                  violations={violations}
                  totalCount={violations.length}
                  autoSubmitAt={7}
                />
              </div>

              {/* Warning modal — fires on each new violation >= 3 */}
              <ViolationWarningModal
                isOpen={showWarning}
                violation={lastViolation}
                totalCount={violations.length}
                autoSubmitAt={7}
                onClose={() => setShowWarning(false)}
              />
            </>
          )}
          <AlertPopup
            isOpen={openAlert}
            message="Are you sure you want to leave the exam? Your progress will be saved, but we recommend finishing your session."
            onClose={cancelExit}
            title="Leave Exam"
          >
            <div className="flex w-full gap-3 justify-between mt-4">
              <Button  onClick={confirmExit} title="Yes, Exit" />
              <Button
                onClick={cancelExit}
                title="Cancel"
                className="bg-white text-blue-500! border border-blue-500!"
              />
            </div>
          </AlertPopup>

          {/* Submission Confirmation Modal */}
          <AlertPopup
            isOpen={showSubmitConfirm}
            title="Final Submission"
            onClose={() => setShowSubmitConfirm(false)}
            message=""
          >
             <div className="space-y-6">
                <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-2xl border border-slate-100 dark:border-slate-800">
                   <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-4 bg-white dark:bg-slate-900 rounded-xl shadow-sm">
                         <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Attempted</p>
                         <p className="text-3xl font-black text-blue-600">{counts.attempted}</p>
                      </div>
                      <div className="text-center p-4 bg-white dark:bg-slate-900 rounded-xl shadow-sm">
                         <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Unattempted</p>
                         <p className="text-3xl font-black text-orange-500">{counts.total - counts.attempted}</p>
                      </div>
                   </div>
                </div>

                <div className="text-center px-4">
                   <h4 className="text-lg font-bold">
                      {counts.attempted === counts.total 
                         ? "Excellent! You've answered everything." 
                         : "Are you sure you want to submit?"}
                   </h4>
                   <p className="text-sm text-slate-500 mt-2">
                      {counts.attempted === counts.total 
                         ? "Please proceed for the final submission." 
                         : "You still have unattempted questions remaining."}
                   </p>
                </div>

                <div className="flex gap-4 pt-2">
                   <button
                      type="button"
                      onClick={() => setShowSubmitConfirm(false)}
                      className="flex-1 py-4 text-sm font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl transition-all cursor-pointer"
                   >
                      Review Answers
                   </button>
                   <button
                      type="button"
                      onClick={() => {
                         setShowSubmitConfirm(false);
                         handleSubmit(onSubmit)();
                      }}
                      className="flex-1 py-4 text-sm font-bold bg-blue-600 text-white rounded-2xl shadow-xl shadow-blue-600/20 hover:bg-blue-700 transition-all cursor-pointer"
                   >
                      Submit Exam
                   </button>
                </div>
             </div>
          </AlertPopup>

          <main className="flex-1 max-w-360 mx-auto w-full grid sm:grid-cols-1 lg:grid-cols-12 gap-6 p-4 lg:p-8">
            {/* Left Sidebar - Question Content */}
            <QuestionList
              confirmedAnswers={confirmedAnswers}
              setConfirmedAnswers={setConfirmedAnswers}
              questionRef={questionRef}
              onConfirm={handleConfirm}
              language={language}
            />

            {/* Right Sidebar - Palette */}
            <QuestionPalette
              questionRefs={questionRef}
              confirmed={confirmedAnswers}
            />
          </main>
        </div>
      </form>
    </FormProvider>
  );
}

const Header = ({ 
  attemptId, 
  timeLeft, 
  onPreSubmit,
  onBack,
  language,
  setLanguage
}: { 
  attemptId: string | null; 
  timeLeft: number | null;
  onPreSubmit: () => void;
  onBack?: () => void;
  language: "en" | "od";
  setLanguage: (lang: "en" | "od") => void;
}) => {
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <header className="sticky top-0 z-50 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 lg:px-8 py-3">
      <div className="max-w-360 mx-auto flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={onBack}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors cursor-pointer group"
            title="Go Back"
          >
            <ChevronLeft className="size-6 text-slate-500 group-hover:text-primary transition-colors" />
          </button>
          <div className="bg-primary/10 p-2 rounded-lg">
            <NotebookTabs className="text-primary size-6" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight">Practice Test</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider">
              Subject Practice
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {timeLeft !== null && (
            <div className="flex items-center gap-2 bg-orange-100 dark:bg-orange-900/30 px-4 py-2 rounded-lg border border-orange-200 dark:border-orange-800">
              <Timer className="text-orange-600 size-4" />
              <span className="font-mono font-bold text-orange-700 dark:text-orange-200 text-lg">
                {formatTime(timeLeft)}
              </span>
            </div>
          )}

          {/* Language Toggle */}
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 shadow-inner">
            <button
               type="button"
               onClick={() => setLanguage("en")}
               className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                 language === "en" 
                   ? "bg-white dark:bg-slate-700 text-blue-600 shadow-sm" 
                   : "text-slate-500 hover:text-slate-700"
               }`}
            >
               ENG
            </button>
            <button
               type="button"
               onClick={() => setLanguage("od")}
               className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                 language === "od" 
                   ? "bg-white dark:bg-slate-700 text-blue-600 shadow-sm" 
                   : "text-slate-500 hover:text-slate-700"
               }`}
            >
               ଓଡ଼ିଆ
            </button>
          </div>

          <div className="hidden md:flex items-center gap-2 bg-slate-100 dark:bg-slate-800 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700">
            <Timer className="text-slate-500 size-4" />
            <span className="font-mono font-bold text-slate-700 dark:text-slate-200">
              {timeLeft === null ? "Relaxed Mode" : "Timed Session"}
            </span>
          </div>

          <button
            type="button"
            onClick={onPreSubmit}
            disabled={!attemptId}
            className={`bg-primary ${
              !attemptId ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:bg-primary/90"
            } text-blue-700 px-6 py-2 rounded-lg font-bold text-sm transition-all flex items-center gap-2 shadow-sm shadow-primary/20`}
          >
            {attemptId ? "Final Submit" : "Initializing..."}
          </button>
        </div>
      </div>
    </header>
  );
};
