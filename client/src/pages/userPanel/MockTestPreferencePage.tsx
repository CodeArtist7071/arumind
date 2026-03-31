import React, { useState, useEffect } from "react";
import { X, ShieldCheck, Zap, Target, Clock, BookOpen, AlertCircle } from "lucide-react";
import type { DifficultyMode } from "../../services/mockTestService";
import { generateMockTestQuestions } from "../../services/mockTestService";
import { supabase } from "../../utils/supabase";
import { useNavigate, useParams } from "react-router";
import { useSelector } from "react-redux";
import type { RootState } from "../../store";

const MockTestPreferencePage: React.FC = () => {
  const { examId } = useParams<{ examId: string }>();
  const navigate = useNavigate();
  const { user } = useSelector((state: RootState) => state.user);
  const { examData } = useSelector((state: RootState) => state.exams);

  const [examName, setExamName] = useState("");
  const [difficulty, setDifficulty] = useState<DifficultyMode>("MODERATE");
  const [questionCount, setQuestionCount] = useState(30);
  const [timeLimit, setTimeLimit] = useState(60);
  const [acceptedInstructions, setAcceptedInstructions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [cameraStatus, setCameraStatus] = useState<"idle" | "checking" | "granted" | "denied">("idle");

  useEffect(() => {
    if (examId && examData.length > 0) {
      const exam = examData.find((e) => e.id === examId);
      if (exam) {
        setExamName(exam.name);
      }
    }
  }, [examId, examData]);

  const handleClose = () => {
    navigate("/user/mock-tests");
  };

  const checkCamera = async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraStatus("denied");
      setErrorMsg("Camera access is not supported in this browser or context (Insecure connection). Please use HTTPS.");
      return;
    }

    setCameraStatus("checking");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
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
    if (!user || !examId) return;

    setLoading(true);
    try {
      const questionIds = await generateMockTestQuestions(
        user.id,
        examId,
        questionCount,
        difficulty
      );
      if (questionIds.length === 0) {
        setErrorMsg("No questions found for this exam. Please try another exam or contact support.");
        setLoading(false);
        return;
      }

      const { data: attempt, error: attemptError } = await supabase
        .from("test_attempts")
        .insert({
          user_id: user.id,
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

      navigate(`/user/mock-tests/session/${attempt.id}`);
    } catch (err: any) {
      console.error("Failed to start mock test:", err);
      setErrorMsg(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-[500px] md:w-[600px] bg-surface dark:bg-surface-dim shadow-ambient-lg flex flex-col animate-buttery-slide border-l border-on-surface/5">
      {/* Header */}
      <div className="p-8 sm:p-10 border-b border-on-surface/5 flex justify-between items-center bg-surface-container-low/50">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tighter text-on-surface">
            Mock Test Ritual
          </h2>
          <p className="text-[10px] sm:text-xs font-technical font-black text-primary uppercase tracking-[0.3em] mt-2">
            {examName} Manifesto
          </p>
        </div>
        <button
          onClick={handleClose}
          className="p-3 bg-surface-container-high rounded-full transition-all hover:rotate-90 duration-500"
        >
          <X size={20} className="text-on-surface-variant" />
        </button>
      </div>

      {/* Content */}
      <div className="p-8 sm:p-10 space-y-10 overflow-y-auto flex-1 custom-scrollbar">
        {/* Section 1: Instructions */}
        <div className="space-y-6 animate-reveal-stagger" style={{ animationDelay: '0.1s' }}>
          <div className="flex items-center gap-4 opacity-40">
             <BookOpen size={16} className="text-primary" />
             <h3 className="text-[10px] font-technical font-black uppercase tracking-[0.4em] text-on-surface-variant">Exam Instructions</h3>
             <div className="h-px flex-1 bg-on-surface-variant/20" />
          </div>

          <div className="bg-surface-container-low p-6 rounded-4xl border border-primary/5 space-y-4">
            <ul className="space-y-3 text-sm text-on-surface-variant font-medium">
              <li className="flex gap-4">
                <div className="size-1.5 bg-primary rounded-full mt-2" />
                <span>The test will be auto-submitted once the timer reaches zero.</span>
              </li>
              <li className="flex gap-4">
                <div className="size-1.5 bg-primary rounded-full mt-2" />
                <span>Do not refresh the page or navigate away during the simulation.</span>
              </li>
              <li className="flex gap-4">
                <div className="size-1.5 bg-primary rounded-full mt-2" />
                <span>Questions are contextually balanced based on your difficulty focus.</span>
              </li>
            </ul>
            
            <label className="flex items-center gap-4 p-5 bg-white/50 rounded-3xl cursor-pointer group hover:bg-white transition-all duration-300 shadow-inner">
              <input
                type="checkbox"
                checked={acceptedInstructions}
                onChange={(e) => setAcceptedInstructions(e.target.checked)}
                className="size-6 rounded-xl border-primary/20 text-primary focus:ring-primary/50 cursor-pointer"
              />
              <span className="text-sm font-bold text-on-surface group-hover:text-primary transition-colors">
                I have read and realized the instructions.
              </span>
            </label>
          </div>
        </div>

        {errorMsg && (
          <div className="bg-tertiary/10 p-5 rounded-3xl border border-tertiary/10 flex items-center gap-4 text-tertiary text-xs font-bold animate-in slide-in-from-top-3">
            <AlertCircle size={20} />
            {errorMsg}
          </div>
        )}

        {/* Section 2: Camera Status */}
        <div className="space-y-6 animate-reveal-stagger" style={{ animationDelay: '0.2s' }}>
          <div className={`p-6 rounded-4xl border flex flex-col sm:flex-row items-center justify-between gap-6 transition-all duration-700 ease-botanical ${
            cameraStatus === "granted" 
              ? "bg-primary/5 border-primary/20" 
              : cameraStatus === "denied"
              ? "bg-tertiary/5 border-tertiary/20"
              : "bg-surface-container-low border-on-surface/5"
          }`}>
            <div className="flex items-center gap-5 w-full sm:w-auto">
              <div className={`size-12 rounded-2xl flex items-center justify-center transition-all ${
                cameraStatus === "granted" ? "bg-primary text-white" : 
                cameraStatus === "denied" ? "bg-tertiary text-white" : "bg-surface-container-highest text-on-surface-variant/40"
              }`}>
                <ShieldCheck size={24} />
              </div>
              <div>
                <p className="text-sm font-black text-on-surface">Proctoring Verification</p>
                <p className="text-[10px] font-technical uppercase tracking-widest text-on-surface-variant opacity-60">
                  {cameraStatus === "granted" ? "Camera Shield Active" : 
                  cameraStatus === "denied" ? "Verification Failure" : 
                  cameraStatus === "checking" ? "Environment Syncing..." : "Hardware Check Required"}
                </p>
              </div>
            </div>
            
            {cameraStatus !== "granted" && (
              <button 
                type="button"
                onClick={checkCamera}
                disabled={cameraStatus === "checking"}
                className="w-full sm:w-auto px-8 py-3 bg-on-surface text-surface text-[10px] font-technical font-black uppercase tracking-widest rounded-full hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
              >
                {cameraStatus === "checking" ? "Checking..." : "Verify Environment"}
              </button>
            )}
          </div>
        </div>

        {/* Section 3: Configuration */}
        <div className="grid grid-cols-1 gap-10 animate-reveal-stagger" style={{ animationDelay: '0.3s' }}>
          {/* Difficulty */}
          <div className="space-y-6">
            <h3 className="text-[10px] font-technical font-black uppercase tracking-[0.3em] text-on-surface-variant/40 flex items-center gap-3">
              <Zap size={14} className="text-primary" />
              Adaptive Focus
            </h3>
            <div className="grid grid-cols-3 gap-3">
              {(["EASY", "MODERATE", "HARD"] as DifficultyMode[]).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setDifficulty(mode)}
                  className={`flex flex-col items-center justify-center p-4 rounded-3xl transition-all duration-300 font-bold text-xs ${
                    difficulty === mode
                      ? "bg-primary/5 ring-2 ring-primary text-primary"
                      : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high"
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-on-surface-variant opacity-40 italic font-medium px-2 text-center">
              {difficulty === "EASY" && "Manifest seen questions 60/40 mix"}
              {difficulty === "MODERATE" && "Syllabus exploration 40/60 mix"}
              {difficulty === "HARD" && "Stress simulation 20/80 mix"}
            </p>
          </div>

          {/* Config */}
          <div className="space-y-10">
            <div className="space-y-6">
              <h3 className="text-[10px] font-technical font-black uppercase tracking-[0.3em] text-on-surface-variant/40 flex items-center gap-3">
                <Target size={14} className="text-primary" />
                Manifest Count
              </h3>
              <div className="flex gap-3">
                {[30, 60, 100].map((num) => (
                  <button
                    key={num}
                    onClick={() => setQuestionCount(num)}
                    className={`flex-1 py-4 rounded-3xl transition-all duration-300 font-black text-xs ${
                      questionCount === num
                        ? "bg-on-surface text-surface shadow-xl"
                        : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high"
                    }`}
                  >
                    {num}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-6">
              <h3 className="text-[10px] font-technical font-black uppercase tracking-[0.3em] text-on-surface-variant/40 flex items-center gap-3">
                <Clock size={14} className="text-primary" />
                Tempo Offset
              </h3>
              <div className="px-2">
                <input
                  type="range"
                  min="30"
                  max="180"
                  step="15"
                  value={timeLimit}
                  onChange={(e) => setTimeLimit(parseInt(e.target.value))}
                  className="w-full h-2 bg-surface-container-highest rounded-full appearance-none cursor-pointer accent-primary"
                />
              </div>
              <div className="flex justify-between items-end px-2">
                <span className="text-[9px] font-technical font-black text-on-surface-variant/30 uppercase tracking-widest">30m</span>
                <span className="text-xl font-technical font-black text-primary tracking-tighter">{timeLimit} <span className="text-[10px] opacity-40 uppercase ml-1">Mins</span></span>
                <span className="text-[9px] font-technical font-black text-on-surface-variant/30 uppercase tracking-widest">180m</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer ritual */}
      <div className="p-8 sm:p-10 bg-surface-container-low/50 border-t border-on-surface/5 flex flex-col gap-4">
        <button
          onClick={handleStart}
          disabled={!acceptedInstructions || loading}
          className={`w-full py-5 rounded-full font-black text-xs lg:text-sm uppercase tracking-[0.3em] transition-all shadow-xl flex items-center justify-center gap-4 group ${
            acceptedInstructions && !loading
              ? "bg-linear-to-r from-primary to-primary-container text-white hover:scale-105 active:scale-95 shadow-primary/20"
              : "bg-surface-container-high text-on-surface-variant opacity-40 cursor-not-allowed"
          }`}
        >
          {loading ? (
            <div className="size-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              {cameraStatus === "granted" ? "Begin Simulation" : "Sync Environment & Begin"}
              <Zap size={20} className="group-hover:rotate-12 transition-transform" />
            </>
          )}
        </button>
        
        {!acceptedInstructions && (
          <div className="flex items-center justify-center gap-3 text-tertiary text-[9px] font-technical font-black uppercase tracking-widest animate-pulse">
            <AlertCircle size={14} />
            Acknowledge Manifesto to Proceed
          </div>
        )}
      </div>
    </div>
  );
};

export default MockTestPreferencePage;
