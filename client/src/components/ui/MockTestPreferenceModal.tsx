import React, { useState } from "react";
import { X, ShieldCheck, Zap, Target, Clock, BookOpen, AlertCircle } from "lucide-react";
import type { DifficultyMode } from "../../services/mockTestService";
import { generateMockTestQuestions } from "../../services/mockTestService";
import { supabase } from "../../utils/supabase";
import { useNavigate } from "react-router-dom";

interface MockTestPreferenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  examId: string;
  examName: string;
  userId: string;
}

const MockTestPreferenceModal: React.FC<MockTestPreferenceModalProps> = ({
  isOpen,
  onClose,
  examId,
  examName,
  userId,
}) => {
  const navigate = useNavigate();
  const [difficulty, setDifficulty] = useState<DifficultyMode>("MODERATE");
  const [questionCount, setQuestionCount] = useState(30);
  const [timeLimit, setTimeLimit] = useState(60);
  const [acceptedInstructions, setAcceptedInstructions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [cameraStatus, setCameraStatus] = useState<"idle" | "checking" | "granted" | "denied">("idle");

  if (!isOpen) return null;

  const checkCamera = async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraStatus("denied");
      setErrorMsg("Camera access is not supported in this browser or context (Insecure connection). Please use HTTPS.");
      return;
    }

    setCameraStatus("checking");
    console.log("Triggering camera permission prompt...");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      console.log("Camera permission granted successfully.");
      stream.getTracks().forEach((track) => track.stop());
      setCameraStatus("granted");
      setErrorMsg(null);
    } catch (err: any) {
      console.error("Camera check failed:", err);
      setCameraStatus("denied");
      
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setErrorMsg("Camera access was blocked. Please click the Lock icon in the address bar and reset/allow Camera permissions.");
      } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
        setErrorMsg("No camera found on this device. Please connect a camera to proceed.");
      } else {
        setErrorMsg(`Camera error: ${err.message || "Failed to initialize camera"}`);
      }
    }
  };

  const handleStart = async () => {
    if (!acceptedInstructions) return;
    if (cameraStatus !== "granted") {
      await checkCamera();
      return;
    }
    setLoading(true);
    try {
      // 1. Generate adaptive question set
      const questionIds = await generateMockTestQuestions(
        userId,
        examId,
        questionCount,
        difficulty
      );
      if (questionIds.length === 0) {
        setErrorMsg("No questions found for this exam. Please try another exam or contact support.");
        setLoading(false);
        return;
      }

      // 2. Create the test attempt record with the new columns
      const { data: attempt, error: attemptError } = await supabase
        .from("test_attempts")
        .insert({
          user_id: userId,
          exam_id: examId,
          difficulty_mode: difficulty,
          total_questions: questionCount,
          time_limit: timeLimit,
          is_mock_test: true,
          status: "STARTED",
          started_at: new Date().toISOString(),
          question_ids: questionIds,
        })
        .select()
        .single();

      if (attemptError) throw attemptError;

      // 3. Redirect to mock test session
      navigate(`/user/mock-tests/session/${attempt.id}`);
      onClose();
    } catch (err: any) {
      console.error("Failed to start mock test:", err);
      setErrorMsg(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-surface dark:bg-slate-900 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden  dark:border-slate-800 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-linear-to-r from-slate-50 to-white dark:from-slate-800/50 dark:to-slate-900">
          <div>
            <h2 className="text-2xl font-black tracking-tight text-on-surface dark:text-white">
              Mock Test Settings
            </h2>
            <p className="text-sm font-bold text-primary uppercase tracking-wider mt-1">
              {examName}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition-colors"
          >
            <X size={24} className="text-slate-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-8 space-y-8 overflow-y-auto flex-1">
          {/* Instructions */}
          <div className="bg-green-50 dark:bg-green-900/20 p-6 rounded-2xl border border-green-100 dark:border-green-800/50 space-y-4">
            <h3 className="text-sm font-black uppercase tracking-widest text-primary dark:text-green-400 flex items-center gap-2">
              <BookOpen size={16} />
              Exam Instructions
            </h3>
            <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400 font-medium">
              <li className="flex gap-2">
                <span className="text-primary">•</span>
                The test will be auto-submitted once the timer reaches zero.
              </li>
              <li className="flex gap-2">
                <span className="text-primary">•</span>
                Do not refresh the page or navigate away during the test.
              </li>
              <li className="flex gap-2">
                <span className="text-primary">•</span>
                Questions are selected based on your chosen difficulty mode.
              </li>
            </ul>
            <label className="flex items-center gap-3 pt-2 cursor-pointer group">
              <input
                type="checkbox"
                checked={acceptedInstructions}
                onChange={(e) => setAcceptedInstructions(e.target.checked)}
                className="size-5 rounded border-green-200 text-primary focus:ring-green-500 cursor-pointer"
              />
              <span className="text-sm font-bold text-slate-700 dark:text-slate-200 group-hover:text-primary transition-colors">
                I have read and understood all instructions.
              </span>
            </label>
          </div>

          {errorMsg && (
            <div className="bg-rose-50 dark:bg-rose-900/20 p-4 rounded-xl border border-rose-100 dark:border-rose-800 flex items-center gap-3 text-rose-600 dark:text-rose-400 text-sm font-bold animate-in slide-in-from-top-2">
              <AlertCircle size={20} />
              {errorMsg}
            </div>
          )}

          {/* Camera Status */}
          <div className={`p-4 rounded-xl border flex items-center justify-between transition-all ${
            cameraStatus === "granted" 
              ? "bg-emerald-50 border-emerald-100 text-emerald-700 dark:bg-emerald-900/10 dark:border-emerald-800" 
              : cameraStatus === "denied"
              ? "bg-rose-50 border-rose-100 text-rose-700 dark:bg-rose-900/10 dark:border-rose-800"
              : "bg-surface-container-low border-slate-100 text-slate-600 dark:bg-slate-800/50 dark:border-slate-800"
          }`}>
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${
                cameraStatus === "granted" ? "bg-emerald-500 text-white" : 
                cameraStatus === "denied" ? "bg-rose-500 text-white" : "bg-slate-400 text-white"
              }`}>
                <ShieldCheck size={18} />
              </div>
              <div>
                <p className="text-sm font-bold">Camera Verification</p>
                <p className="text-xs opacity-80">
                  {cameraStatus === "granted" ? "Camera is ready and verified." : 
                   cameraStatus === "denied" ? "Camera access was denied." : 
                   cameraStatus === "checking" ? "Verifying camera..." : "Verification required before starting."}
                </p>
              </div>
            </div>
            {cameraStatus !== "granted" && (
              <button 
                type="button"
                onClick={checkCamera}
                disabled={cameraStatus === "checking"}
                className="px-4 py-2 bg-slate-900 dark:bg-primary text-white text-xs font-bold rounded-lg hover:opacity-90 disabled:opacity-50"
              >
                {cameraStatus === "checking" ? "Checking..." : "Verify Camera"}
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Difficulty */}
            <div className="space-y-4">
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2">
                <Zap size={14} className="text-amber-500" />
                Difficulty Mode
              </h3>
              <div className="grid grid-cols-1 gap-2">
                {(["EASY", "MODERATE", "HARD"] as DifficultyMode[]).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setDifficulty(mode)}
                    className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all font-bold text-sm ${
                      difficulty === mode
                        ? "border-primary bg-green-50 dark:bg-green-900/10 text-primary shadow-md translate-x-1"
                        : "border-slate-100 dark:border-slate-800 text-on-surface-variant hover:border-slate-200 dark:hover:border-slate-700"
                    }`}
                  >
                    {mode}
                    {difficulty === mode && <ShieldCheck size={18} className="text-primary" />}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-slate-400 italic">
                {difficulty === "EASY" && "60% Previously Seen • 40% New"}
                {difficulty === "MODERATE" && "40% Previously Seen • 60% New"}
                {difficulty === "HARD" && "20% Previously Seen • 80% New"}
              </p>
            </div>

            {/* Config */}
            <div className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2">
                  <Target size={14} className="text-primary" />
                  Total Questions
                </h3>
                <div className="flex gap-2">
                  {[30, 60, 100].map((num) => (
                    <button
                      key={num}
                      onClick={() => setQuestionCount(num)}
                      className={`flex-1 py-3 rounded-xl border-2 transition-all font-black text-xs ${
                        questionCount === num
                          ? "border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-surface dark:text-on-surface"
                          : "border-slate-100 dark:border-slate-800 text-on-surface-variant hover:bg-surface-container-low"
                      }`}
                    >
                      {num}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2">
                  <Clock size={14} className="text-purple-500" />
                  Time Limit (Min)
                </h3>
                <input
                  type="range"
                  min="30"
                  max="180"
                  step="15"
                  value={timeLimit}
                  onChange={(e) => setTimeLimit(parseInt(e.target.value))}
                  className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-green-600"
                />
                <div className="flex justify-between text-xs font-bold text-on-surface-variant uppercase">
                  <span>30m</span>
                  <span className="text-primary text-sm font-black">{timeLimit} Minutes</span>
                  <span>180m</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 bg-surface-container-low dark:bg-slate-800/30 border-t border-slate-100 dark:border-slate-800">
          <button
            onClick={handleStart}
            disabled={!acceptedInstructions || loading}
            className={`w-full py-4 rounded-2xl font-black text-lg transition-all shadow-2xl flex items-center justify-center gap-3 ${
              acceptedInstructions && !loading
                ? "bg-[#16a34a] text-white hover:bg-primary hover:shadow-green-500/25 active:scale-[0.98]"
                : "bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed"
            }`}
          >
            {loading ? (
              <div className="size-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                {cameraStatus === "granted" ? "Start Mock Exam" : "Verify Camera & Start"}
                <Zap size={20} fill="white" />
              </>
            )}
          </button>
          {!acceptedInstructions && (
            <div className="mt-3 flex items-center justify-center gap-2 text-rose-500 text-xs font-bold animate-pulse">
              <AlertCircle size={14} />
              Please accept the instructions to proceed
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MockTestPreferenceModal;
