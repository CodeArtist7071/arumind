import { Edit, Grid2X2, NotebookTabs, Timer } from "lucide-react";
import { useEffect, useRef, useState, useMemo } from "react";
import { useNavigate, useParams } from "react-router";
import { AlertPopup } from "./AlertPopup";
import { Button } from "./Button";
import { WarningModal } from "./WarningModal";
import { useDispatch, useSelector } from "react-redux";
import type { AppDispatch, RootState } from "../../store";
import { fetchQuestion } from "../../slice/questionSlice";
import { useNotifications } from "reapop";
import { QuestionPalette } from "./QuestionPalette";
import { useForm, FormProvider } from "react-hook-form";
import { QuestionList } from "../pracTiceTest/QuestionList";
import { supabase } from "../../utils/supabase";

const SESSION_TTL = 30 * 60 * 1000; // 30 minutes in milliseconds

export default function PracticeTest() {
  const { eid, sid, cid } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const { notify } = useNotifications();

  const { data: questions } = useSelector((state: RootState) => state.questions);
  const { user } = useSelector((state: RootState) => state.user);

  const [openAlert, setOpenAlert] = useState<boolean>(false);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const isCreatingRef = useRef(false);
  const [lastSaved, setLastSaved] = useState<number>(Date.now());
  const [confirmedAnswers, setConfirmedAnswers] = useState<Record<number, boolean>>({});

  const methods = useForm<any>({
    defaultValues: { answers: {} },
  });

  const { handleSubmit, setValue, watch, reset } = methods;
  const watchedAnswers = watch("answers");

  // Consolidated initialization and reset
  useEffect(() => {
    console.log(`[PracticeTest] CID changed or component mounted. Current CID: ${cid}`);
    
    // 1. CLEAR previous state to prevent carry-over
    setAttemptId(null);
    setConfirmedAnswers({});
    reset({ answers: {} });

    // 2. Try loading from storage
    const storageKey = `practice_test_${cid}`;
    const savedState = localStorage.getItem(storageKey);
    
    if (savedState) {
      try {
        const { answers, timestamp, confirmed, attemptId: savedAttemptId } = JSON.parse(savedState);
        const now = Date.now();
        
        if (now - timestamp < SESSION_TTL) {
          console.log(`[PracticeTest] Restoring session from storage. AttemptID: ${savedAttemptId}`);
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
      localStorage.setItem(storageKey, JSON.stringify({
        answers: watchedAnswers,
        confirmed: confirmedAnswers,
        attemptId: attemptId,
        timestamp: Date.now()
      }));
      setLastSaved(Date.now());
    }
  }, [watchedAnswers, cid, confirmedAnswers, attemptId]);

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
        console.log("Checking for existing 'started' attempt for user/chapter...");
        
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
          const state = current ? JSON.parse(current) : { answers: {}, confirmed: {} };
          localStorage.setItem(storageKey, JSON.stringify({
            ...state,
            attemptId: existing.id,
            timestamp: Date.now()
          }));
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
            started_at: new Date().toISOString()
          })
          .select()
          .single();

        if (error) throw error;

        if (data) {
          setAttemptId(data.id);
          // Immediately update localStorage with the new attemptId
          const storageKey = `practice_test_${cid}`;
          const current = localStorage.getItem(storageKey);
          const state = current ? JSON.parse(current) : { answers: {}, confirmed: {} };
          localStorage.setItem(storageKey, JSON.stringify({
            ...state,
            attemptId: data.id,
            timestamp: Date.now()
          }));
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

  const onSubmit = async (data: any) => {
    console.log("[PracticeTest] Attempting to submit. AttemptID in state:", attemptId);
    if (!attemptId) {
      notify({ title: "Error", message: "No active session found. Please refresh.", status: "error" });
      return;
    }

    try {
      const payload = Object.entries(data.answers).map(([questionId, answer]) => ({
        attempt_id: attemptId,
        question_id: Number(questionId),
        selected_option: answer,
        is_submitted: true
      }));

      console.log(`[PracticeTest] Upserting ${payload.length} answers...`);
      const { error: answerError } = await supabase
        .from("test_attempt_answers")
        .upsert(payload, { onConflict: "attempt_id,question_id" });

      if (answerError) throw answerError;

      console.log(`[PracticeTest] Updating status to COMPLETED for AttemptID: ${attemptId}`);
      const { data: updateData, error: attemptError } = await supabase
        .from("test_attempts")
        .update({ status: "COMPLETED", submitted_at: new Date().toISOString() })
        .eq("id", attemptId)
        .select();

      if (attemptError) throw attemptError;
      console.log("[PracticeTest] Status update result:", updateData);

      if (!updateData || updateData.length === 0) {
        console.warn("[PracticeTest] No rows were updated! This usually means the ID doesn't exist.");
      }

      // Clear local storage
      localStorage.removeItem(`practice_test_${cid}`);

      notify({
        title: "Success",
        message: "Your answers have been submitted successfully!",
        status: "success",
        dismissAfter: 5000,
      });

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

  const handleBackButton = () => {
    setOpenAlert(true);
  };

  const confirmExit = () => {
    navigate(-1);
  };

  const handleConfirm = async (questionId: number, answer: string) => {
    if (!attemptId) return;

    try {
      const { error } = await supabase
        .from("test_attempt_answers")
        .upsert({
          attempt_id: attemptId,
          question_id: questionId,
          selected_option: answer,
          is_submitted: false
        }, { onConflict: "attempt_id,question_id" });

      if (error) throw error;

      // Also potentially track in question_attempt_tracking
      await supabase.from("question_attempt_tracking").insert({
        user_id: user?.id,
        question_id: questionId,
        attempt_id: attemptId,
        selected_option: answer,
        attempted_at: new Date().toISOString()
      });

    } catch (error) {
      console.error("Failed to sync answer:", error);
    }
  };

  const questionRef = useRef<(HTMLDivElement | null)[]>([]);

  return (
    <FormProvider {...methods}>
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 font-display min-h-screen flex flex-col">
          <Header />

          <AlertPopup
            isOpen={openAlert}
            message="Are you sure you want to leave the exam? Your progress will be saved for a short while."
            onClose={() => setOpenAlert(false)}
            title="Leave Exam"
          >
            <div className="flex gap-3 justify-end mt-4">
              <Button onClick={confirmExit} title="Yes, Exit" />
              <Button
                onClick={() => setOpenAlert(false)}
                title="Cancel"
                className="bg-white text-blue-500! border border-blue-500!"
              />
            </div>
          </AlertPopup>

          <main className="flex-1 max-w-360 mx-auto w-full grid sm:grid-cols-1 lg:grid-cols-12 gap-6 p-4 lg:p-8">
            {/* Left Sidebar - Question Content */}
            <QuestionList
              confirmedAnswers={confirmedAnswers}
              setConfirmedAnswers={setConfirmedAnswers}
              questionRef={questionRef}
              onConfirm={handleConfirm}
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

const Header = () => {
  return (
    <header className="sticky top-0 z-50 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 lg:px-8 py-3">
      <div className="max-w-360 mx-auto flex items-center justify-between">
        <div className="flex items-center gap-4">
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
          <div className="hidden md:flex items-center gap-2 bg-slate-100 dark:bg-slate-800 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700">
            <Timer className="text-slate-500 size-4" />
            <span className="font-mono font-bold text-slate-700 dark:text-slate-200">
              Practice Session
            </span>
          </div>

          <button
            type="submit"
            className="bg-primary cursor-pointer hover:bg-primary/90 text-white px-6 py-2 rounded-lg font-bold text-sm transition-all flex items-center gap-2 shadow-sm shadow-primary/20"
          >
            Finish Test
          </button>
        </div>
      </div>
    </header>
  );
};
