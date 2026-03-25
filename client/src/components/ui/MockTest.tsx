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
  fetchQuestionsByIds
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

export default function MockTest() {
  const { eid, attemptId: urlAttemptId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const { notify } = useNotifications();

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
  const [showCameraModal, setShowCameraModal] = useState(false);

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
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [confirmedAnswers, setConfirmedAnswers] = useState<
    Record<number, boolean>
  >({});
  const [language, setLanguage] = useState<"en" | "od">("en");
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [counts, setCounts] = useState({ attempted: 0, total: 0 });

  const isNavigatingAwayRef = useRef(false);

  const methods = useForm<any>({
    defaultValues: { answers: {} },
  });

  const { handleSubmit, setValue, watch, reset } = methods;
  const watchedAnswers = watch("answers");

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

  const [examId, setExamId] = useState<string | null>(null);

  // Initialization for Mock Test
  useEffect(() => {
    setAttemptId(null);
    setExamId(null);
    setConfirmedAnswers({});
    reset({ answers: {} });

    if (urlAttemptId) {
      const loadMockAttempt = async () => {
        try {
          const { data: attempt, error } = await supabase
            .from("test_attempts")
            .select("question_ids, time_limit, exam_id")
            .eq("id", urlAttemptId)
            .single();

          if (error) throw error;
          if (attempt?.question_ids) {
            dispatch(fetchQuestionsByIds(attempt.question_ids));
            if (attempt.time_limit) {
              setTimeLeft(attempt.time_limit * 60);
            }
            if (attempt.exam_id) {
              setExamId(attempt.exam_id);
            }
            setAttemptId(urlAttemptId);
          }
        } catch (err) {
          console.error("Failed to load mock attempt:", err);
          notify({ title: "Error", message: "Failed to load mock test session", status: "error" });
        }
      };
      loadMockAttempt();
    }
  }, [urlAttemptId, dispatch, reset]);

  // proctoring init...
  useEffect(() => {
    let cancelled = false;
    
    if (mode !== "proctored") {
      setProctoringStatus("Standard Mode");
      return;
    }

    const initProctoring = async () => {
      try {
        const stream = await startCamera({ videoRef });
        streamRef.current = stream;
        if (cancelled) return;
        setCameraReady(true);

        setProctoringStatus("Loading AI Engine...");
        const tf = await import("@tensorflow/tfjs");
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
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError' || err.message?.includes('Permission denied')) {
          setShowCameraModal(true);
        }
      }
    };

    initProctoring();

    return () => {
      cancelled = true;
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    };
  }, []);

  const stopProctoring = useCallback(() => {
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraReady(false);
    setProctoringStatus("Proctoring Stopped");
  }, []);

  const handlePreSubmit = () => {
    const total = questions?.length || 0;
    const attempted = questions?.filter(q => watchedAnswers?.[q.id]).length || 0;
    setCounts({ attempted, total });
    setShowSubmitConfirm(true);
  };

  const onSubmit = async (data: any) => {
    if (!attemptId) return;

    try {
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

      const { error: answerError } = await supabase
        .from("test_attempt_answers")
        .upsert(payload, { onConflict: "attempt_id,question_id" });

      if (answerError) throw answerError;

      await supabase
        .from("test_attempts")
        .update({ 
          status: "COMPLETED", 
          submitted_at: new Date().toISOString(),
          total_questions,
          total_marks,
          score
        })
        .eq("id", attemptId);

      stopProctoring();
      await seedAbilityFromMockTest(user?.id, examId, attemptId);
      
      notify({
        title: "Success",
        message: "Mock Test submitted successfully!",
        status: "success",
      });

      isNavigatingAwayRef.current = true;
      navigate(`/user/results/${attemptId}`);
    
    } catch (error: any) {
      console.error("Submission failed:", error);
      notify({ title: "Error", message: error.message, status: "error" });
    }
  };

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
        const next = [newViolation, ...prev];
        if (next.length >= 3) setShowWarning(true);
        if (next.length >= 7) handleAutoSubmit();
        return next;
      });

      setLastViolation(newViolation);

      if (attemptId && user?.id) {
        supabase.from("exam_violations").insert({
          attempt_id: attemptId,
          user_id: user.id,
          exam_id: examId,
          type,
          occurred_at: newViolation.occurred_at,
        });
      }
    },
    [attemptId, user, examId],
  );

  useEffect(() => {
    registerViolationRef.current = registerViolation;
  }, [registerViolation]);

  const handleAutoSubmit = useCallback(() => {
    handleSubmit(onSubmit)();
  }, [handleSubmit, onSubmit]);

  // Timer logic
  useEffect(() => {
    if (mode === "normal" || timeLeft === null) return;

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
  }, [mode, timeLeft, handleAutoSubmit]);

  const confirmExit = async () => {
    setOpenAlert(false);
    if (attemptId) {
      await supabase
        .from("test_attempts")
        .update({ status: "LEFT THE EXAM", submitted_at: new Date().toISOString() })
        .eq("id", attemptId);
    }
    isNavigatingAwayRef.current = true;
    if (blocker.state === "blocked") blocker.reset();
    navigate(attemptId ? `/user/results/${attemptId}` : "/user/mock-tests");
  };

  const handleConfirm = async (questionId: number, answer: string) => {
    if (!attemptId) return;
    try {
      await supabase.from("test_attempt_answers").upsert(
        {
          attempt_id: attemptId,
          question_id: questionId,
          selected_option: answer,
          is_submitted: false,
        },
        { onConflict: "attempt_id,question_id" },
      );

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
             onBack={() => setOpenAlert(true)}
             language={language}
             setLanguage={setLanguage}
          />
          
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

          <div style={{ position: "fixed", bottom: "24px", right: "24px", zIndex: 50 }}>
            <ViolationFeed violations={violations} totalCount={violations.length} autoSubmitAt={7} />
          </div>

          <ViolationWarningModal isOpen={showWarning} violation={lastViolation} totalCount={violations.length} autoSubmitAt={7} onClose={() => setShowWarning(false)} />

          <AlertPopup 
            isOpen={showCameraModal} 
            title="Camera Permission Required" 
            onClose={() => {}} 
            message="This mock exam requires camera access for proctoring. Please enable your camera and restart the session."
          >
            <div className="flex flex-col gap-4 mt-4">
               <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-800">
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                     1. Click the lock icon in your browser's address bar.<br/>
                     2. Toggle "Camera" to <b>On</b>.<br/>
                     3. Click the button below to reload.
                  </p>
               </div>
               <Button 
                 onClick={async () => {
                   try {
                     // Try to trigger the browser's native permission prompt
                     const stream = await navigator.mediaDevices.getUserMedia({ video: true });
                     // If successful, stop the tracks immediately and reload
                     stream.getTracks().forEach(track => track.stop());
                     window.location.reload();
                   } catch (err) {
                     console.error("Camera permission request failed:", err);
                     // Even if it fails (user denies), reload to update the state
                     window.location.reload();
                   }
                 }} 
                 title="Grant Permission & Reload" 
                 className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl shadow-lg shadow-blue-600/20"
               />
            </div>
          </AlertPopup>

          <AlertPopup isOpen={openAlert} title="Leave Mock Exam" onClose={() => setOpenAlert(false)} message="Are you sure you want to exit this mock exam?">
            <div className="flex w-full gap-3 justify-between mt-4">
              <Button onClick={confirmExit} title="Yes, Exit" />
              <Button onClick={() => setOpenAlert(false)} title="Cancel" className="bg-white text-blue-500! border border-blue-500!" />
            </div>
          </AlertPopup>

          <AlertPopup isOpen={showSubmitConfirm} title="Final Submission" onClose={() => setShowSubmitConfirm(false)} message="">
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
                <div className="flex gap-4 pt-2">
                   <button type="button" onClick={() => setShowSubmitConfirm(false)} className="flex-1 py-4 text-sm font-bold text-slate-500 hover:bg-slate-100 rounded-2xl">Review</button>
                   <button type="button" onClick={() => { setShowSubmitConfirm(false); handleSubmit(onSubmit)(); }} className="flex-1 py-4 text-sm font-bold bg-blue-600 text-white rounded-2xl">Submit</button>
                </div>
             </div>
          </AlertPopup>

          <main className="flex-1 max-w-360 mx-auto w-full grid sm:grid-cols-1 lg:grid-cols-12 gap-6 p-4 lg:p-8">
            <QuestionList confirmedAnswers={confirmedAnswers} setConfirmedAnswers={setConfirmedAnswers} questionRef={questionRef} onConfirm={handleConfirm} language={language} />
            <QuestionPalette questionRefs={questionRef} confirmed={confirmedAnswers} />
          </main>
        </div>
      </form>
    </FormProvider>
  );
}

const Header = ({ attemptId, timeLeft, onPreSubmit, onBack, language, setLanguage }: any) => {
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
            <h1 className="text-lg font-bold tracking-tight">Mock Exam</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider">
              Adaptive session
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
