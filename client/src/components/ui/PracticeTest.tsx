import { ChevronLeft, Edit, Grid2X2, NotebookTabs, Timer, Target } from "lucide-react";
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
import { 
  startTestSession, 
  updateTestTime, 
  setTestLanguage, 
  clearTestSession,
  triggerTestSubmit
} from "../../slice/uiSlice";
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
  const { testLanguage, triggerSubmit } = useSelector((state: RootState) => state.ui);

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
  
  const [language, setLanguageLocal] = useState<"en" | "od">(testLanguage);
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

  // Sync test session with global header on mount
  useEffect(() => {
    dispatch(startTestSession({ 
      title: "Subject Manifestation", 
      language: "en" 
    }));
    return () => {
      dispatch(clearTestSession());
    };
  }, [dispatch]);

  // Sync language with Redux
  useEffect(() => {
    setLanguageLocal(testLanguage);
  }, [testLanguage]);

  // Watch for Parent-Triggered Submit
  useEffect(() => {
    if (triggerSubmit) {
      handlePreSubmit();
    }
  }, [triggerSubmit]);

  // Sync timer with Redux
  useEffect(() => {
    if (timeLeft === null) return;
    dispatch(updateTestTime(timeLeft));
  }, [timeLeft, dispatch]);

  useEffect(() => {
    console.log(`[PracticeTest] CID changed or component mounted. CID: ${cid}`);
    setAttemptId(null);
    setConfirmedAnswers({});
    reset({ answers: {} });

    const storageKey = `practice_test_${cid}`;
    const savedState = localStorage.getItem(storageKey);

    if (savedState) {
      try {
        const { answers, timestamp, confirmed, attemptId: savedAttemptId } = JSON.parse(savedState);
        if (Date.now() - timestamp < SESSION_TTL) {
          reset({ answers });
          setConfirmedAnswers(confirmed || {});
          if (savedAttemptId) setAttemptId(savedAttemptId);
          setLastSaved(timestamp);
        } else {
          localStorage.removeItem(storageKey);
        }
      } catch (e) {
        console.error("Failed to parse storage state:", e);
      }
    }
    dispatch(fetchQuestion(cid as string));
    dispatch(fetchFilteredQuestion(user?.id));
  }, [cid, dispatch, reset]);

  // Save to localStorage
  useEffect(() => {
    if (Object.keys(watchedAnswers || {}).length > 0) {
      const storageKey = `practice_test_${cid}`;
      localStorage.setItem(storageKey, JSON.stringify({
        answers: watchedAnswers,
        confirmed: confirmedAnswers,
        attemptId: attemptId,
        timestamp: Date.now(),
      }));
      setLastSaved(Date.now());
    }
  }, [watchedAnswers, cid, confirmedAnswers, attemptId]);

  // Proctoring Init
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
        
        const faceLandmarksDetection = await import("@tensorflow-models/face-landmarks-detection");
        const detector = await faceLandmarksDetection.createDetector(
          faceLandmarksDetection.SupportedModels.MediaPipeFaceMesh,
          { 
            runtime: "mediapipe", 
            maxFaces: 1, 
            refineLandmarks: true,
            solutionPath: "https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh"
          }
        );
        if (cancelled) return;
        detectorRef.current = detector;
        setProctoringStatus("Monitoring");

        detect({
          videoRef, detector, animationRef, isProcessingRef, frameCountRef, noFaceStreakRef,
          registerViolation: (type) => registerViolationRef.current(type),
          onFaceStatusChange: (detected) => setFaceDetected(detected)
        });
      } catch (err: any) {
        console.error("Proctoring init failed:", err);
        setProctoringStatus("Model Initialization Failed");
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
  }, [mode]);

  const stopProctoring = useCallback(() => {
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraReady(false);
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
        total_marks += q.marks || 0;
        if (data.answers[q.id] === q.correct_answer) score += q.marks || 0;
      });

      const payload = (questions || []).map((q: any) => ({
        attempt_id: attemptId,
        question_id: q.id,
        is_submitted: true,
        ...(data.answers[q.id] ? { selected_option: data.answers[q.id] } : {})
      }));

      await supabase.from("test_attempt_answers").upsert(payload, { onConflict: "attempt_id,question_id" });
      const { data: updateData, error: attemptError } = await supabase
        .from("test_attempts")
        .update({ 
          status: "COMPLETED", 
          submitted_at: new Date().toISOString(),
          total_questions, total_marks, score
        })
        .eq("id", attemptId)
        .select();

      if (attemptError) throw attemptError;

      localStorage.removeItem(`practice_test_${cid}`);
      stopProctoring();
      await seedAbilityFromMockTest(user?.id, eid, attemptId);
      
      notify({ title: "Success", message: "Examination Manifested.", status: "success" });
      isNavigatingAwayRef.current = true;
      navigate(`/user/results/${attemptId}`);
    } catch (error: any) {
      console.error("Submission failed:", error);
      notify({ title: "Error", message: "Submission unsuccessful.", status: "error" });
    }
  };

  const registerViolation = useCallback(async (type: string) => {
    const now = Date.now();
    const last = violationTimestamps.current[type] ?? 0;
    if (now - last < 3000) return;
    violationTimestamps.current[type] = now;

    const newViolation: Violation = { id: crypto.randomUUID(), type, occurred_at: new Date().toISOString() };
    setViolations((prev) => {
      const next = [newViolation, ...prev];
      if (next.length >= 3) setShowWarning(true);
      if (next.length >= 7) handleAutoSubmit();
      return next;
    });
    setLastViolation(newViolation);

    if (attemptId && user?.id) {
      await supabase.from("exam_violations").insert({
        attempt_id: attemptId, user_id: user.id, exam_id: eid, subject_id: sid, chapter_id: cid, type, occurred_at: newViolation.occurred_at
      });
    }
  }, [attemptId, user, eid, sid, cid]);

  useEffect(() => { registerViolationRef.current = registerViolation; }, [registerViolation]);

  const handleAutoSubmit = useCallback(() => {
    handleSubmit(onSubmit)();
  }, [handleSubmit, onSubmit]);

  // Timer Logic
  useEffect(() => {
    if (mode === "normal") return;
    if (timeLeft === null) setTimeLeft(timeLimit * 60);

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

  // Event Listeners
  useEffect(() => {
    if (mode !== "proctored") return;
    const onBlur = () => registerViolation("window_blur");
    const onVisibility = () => document.visibilityState === "hidden" && registerViolation("tab_switch");
    const onCopy = (e: ClipboardEvent) => { e.preventDefault(); registerViolation("copy_attempt"); };
    const onBeforeUnload = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };

    window.addEventListener("blur", onBlur);
    document.addEventListener("visibilitychange", onVisibility);
    document.addEventListener("copy", onCopy);
    window.addEventListener("beforeunload", onBeforeUnload);

    return () => {
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("visibilitychange", onVisibility);
      document.removeEventListener("copy", onCopy);
      window.removeEventListener("beforeunload", onBeforeUnload);
    };
  }, [registerViolation]);

  // Create/Restore Attempt
  useEffect(() => {
    const createAttempt = async () => {
      if (!user?.id || !cid || attemptId || isCreatingRef.current) return;
      isCreatingRef.current = true;
      try {
        const { data: existing } = await supabase.from("test_attempts").select("id").eq("user_id", user.id).eq("chapter_id", cid).eq("status", "STARTED").order("started_at", { ascending: false }).limit(1).maybeSingle();
        if (existing) {
          setAttemptId(existing.id);
          return;
        }
        const { data } = await supabase.from("test_attempts").insert({ user_id: user.id, exam_id: eid, subject_id: sid, chapter_id: cid, status: "STARTED", started_at: new Date().toISOString() }).select().single();
        if (data) setAttemptId(data.id);
      } catch (err) { console.error("Attempt creation failed:", err); }
      finally { isCreatingRef.current = false; }
    };
    createAttempt();
  }, [user, eid, sid, cid, attemptId]);

  const handleConfirm = async (questionId: number, answer: string) => {
    if (!attemptId) return;
    try {
      await supabase.from("test_attempt_answers").upsert({ attempt_id: attemptId, question_id: questionId, selected_option: answer, is_submitted: false }, { onConflict: "attempt_id,question_id" });
      await supabase.from("question_attempt_tracking").insert({ user_id: user?.id, question_id: questionId, attempt_id: attemptId, selected_option: answer, attempted_at: new Date().toISOString() });
    } catch (err) { console.error("Answer sync failed:", err); }
  };

  const handleBackButton = () => setOpenAlert(true);
  const cancelExit = () => { setOpenAlert(false); blocker.reset(); };
  const confirmExit = async () => {
    if (attemptId) await supabase.from("test_attempts").update({ status: "LEFT THE EXAM", submitted_at: new Date().toISOString() }).eq("id", attemptId);
    isNavigatingAwayRef.current = true;
    blocker.proceed?.();
    navigate(`/user/results/${attemptId}`);
  };

  const questionRef = useRef<(HTMLDivElement | null)[]>([]);

  return (
    <FormProvider {...methods}>
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="bg-surface text-on-surface font-narrative min-h-screen flex flex-col transition-colors duration-700 ease-botanical">
          
          <main className="flex-1 max-w-7xl mx-auto w-full grid lg:grid-cols-12 gap-8 p-6 lg:p-12 animate-reveal">
            <QuestionList confirmedAnswers={confirmedAnswers} setConfirmedAnswers={setConfirmedAnswers} questionRef={questionRef} onConfirm={handleConfirm} language={language} />
            <QuestionPalette questionRefs={questionRef} confirmed={confirmedAnswers} />
          </main>

          {/* Immersive Proctoring Elements */}
          {mode === "proctored" && (
            <div className="fixed bottom-8 right-8 z-50 pointer-events-none">
               <AdvancedProctoring videoRef={videoRef} isCameraReady={cameraReady} isFaceDetected={faceDetected} statusText={proctoringStatus} violationCount={violations.length} autoSubmitAt={7} />
               <div className="mt-4 pointer-events-auto">
                 <ViolationFeed violations={violations} totalCount={violations.length} autoSubmitAt={7} />
               </div>
            </div>
          )}

          <ViolationWarningModal isOpen={showWarning} violation={lastViolation} totalCount={violations.length} autoSubmitAt={7} onClose={() => setShowWarning(false)} />
          
          <AlertPopup isOpen={openAlert} message="Abandon the examination manifest? Your current progress will be preserved." onClose={cancelExit} title="Evacuation Confirmation">
            <div className="flex gap-4 mt-8">
               <button type="button" onClick={confirmExit} className="flex-1 py-4 bg-surface-container-high text-on-surface-variant font-technical font-black uppercase tracking-widest rounded-full hover:bg-surface-dim transition-all">Yes, Evacuate</button>
               <button type="button" onClick={cancelExit} className="flex-1 py-4 bg-primary text-white font-technical font-black uppercase tracking-widest rounded-full shadow-ambient hover:scale-105 transition-all">Cancel</button>
            </div>
          </AlertPopup>

          <AlertPopup isOpen={showSubmitConfirm} title="Final Submission" onClose={() => setShowSubmitConfirm(false)} message="">
             <div className="space-y-10 py-6">
                <div className="bg-linear-to-br from-surface-container-low to-surface p-12 rounded-[3.5rem] relative overflow-hidden shadow-inner">
                   <div className="grid grid-cols-2 gap-10 relative z-10">
                      <div className="text-center p-8 bg-surface/60 backdrop-blur-xl rounded-4xl shadow-ambient ring-1 ring-white/20">
                         <p className="text-[10px] font-technical font-black text-primary uppercase tracking-[0.2em] mb-3">Manifested</p>
                         <p className="text-5xl font-technical font-black text-on-surface tracking-tighter">{counts.attempted}</p>
                      </div>
                      <div className="text-center p-8 bg-surface/60 backdrop-blur-xl rounded-4xl shadow-ambient ring-1 ring-white/20">
                         <p className="text-[10px] font-technical font-black text-tertiary uppercase tracking-[0.2em] mb-3">Remaining</p>
                         <p className="text-5xl font-technical font-black text-tertiary tracking-tighter">{counts.total - counts.attempted}</p>
                      </div>
                   </div>
                </div>

                <div className="text-center space-y-4">
                   <h4 className="text-3xl font-black tracking-tight text-on-surface">Ready for Manifestation?</h4>
                   <p className="text-sm text-on-surface-variant font-medium leading-relaxed max-w-sm mx-auto">Your study data is curated for professional grading. Manifesting will finalize this entry in your digital journal.</p>
                </div>

                <div className="flex gap-6">
                   <button type="button" onClick={() => setShowSubmitConfirm(false)} className="flex-1 py-5 text-xs font-technical font-black uppercase tracking-widest text-on-surface-variant/60 hover:text-on-surface transition-all">Re-evaluate</button>
                   <button type="button" onClick={() => handleSubmit(onSubmit)()} className="flex-1 py-5 bg-linear-to-r from-primary to-primary-container text-white rounded-full font-technical font-black text-xs uppercase tracking-widest shadow-ambient-lg hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-3">Manifest Submission <Target size={18} /></button>
                </div>
             </div>
          </AlertPopup>
        </div>
      </form>
    </FormProvider>
  );
}
