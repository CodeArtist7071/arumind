import React, { useRef } from "react";
import { FormProvider } from "react-hook-form";
import { QuestionList } from "../pracTiceTest/QuestionList";
import { QuestionPalette } from "./QuestionPalette";
import AdvancedProctoring from "./AdvanceProctoring";
import ViolationFeed from "./ViolationFeed";
import ViolationWarningModal from "./ViolationWarningModel";
import { AlertPopup } from "./AlertPopup";
import { Clock, LogOut, Send, Target } from "lucide-react";

export const MobileMockTest = ({ logic }: { logic: any }) => {
  const {
    questions, language, timeLeft, violations, lastViolation, proctoringStatus, 
    showWarning, cameraReady, faceDetected, openAlert, showSubmitConfirm, counts, 
    confirmedAnswers, setConfirmedAnswers, methods, onSubmit, 
    handleConfirm, confirmExit, videoRef, mode, setShowWarning, setShowSubmitConfirm, setOpenAlert,
    minimized, setMinimized
  } = logic;

  const questionRef = useRef<(HTMLDivElement | null)[]>([]);
  const timerSeconds = typeof timeLeft === "number" ? Math.max(0, timeLeft) : null;
  const timerLabel = timerSeconds === null
    ? "Timer unavailable"
    : `${String(Math.floor(timerSeconds / 60)).padStart(2, "0")}:${String(timerSeconds % 60).padStart(2, "0")}`;

  return (
    <FormProvider {...methods}>
      <form onSubmit={methods.handleSubmit(onSubmit)}>
        <div className="text-on-surface font-narrative min-h-screen flex flex-col transition-colors duration-700 ease-botanical pb-20">
          <header className="sticky top-0 z-40 flex items-center justify-between gap-3 border-b border-outline-variant/20 bg-surface/95 px-4 py-3 shadow-sm backdrop-blur">
            <div className="min-w-0">
              <p className="text-xs font-semibold text-on-surface-variant">Mock test</p>
              <p className="flex items-center gap-1.5 text-sm font-bold tabular-nums text-primary"><Clock size={16} aria-hidden="true" />{timerLabel}</p>
            </div>
            <div className="flex shrink-0 gap-2">
              <button type="button" onClick={() => setOpenAlert(true)} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-outline-variant/30 px-3 text-sm font-semibold text-on-surface-variant" aria-label="Exit mock test"><LogOut size={16} />Exit</button>
              <button type="button" onClick={() => setShowSubmitConfirm(true)} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-3 text-sm font-semibold text-white shadow-sm"><Send size={16} />Submit</button>
            </div>
          </header>
          <main className="flex-1 w-full pt-4 pb-4 pl-2 pr-12 animate-reveal relative">
            <div className="w-full">
              <QuestionList 
                confirmedAnswers={confirmedAnswers} 
                setConfirmedAnswers={setConfirmedAnswers} 
                questionRef={questionRef} 
                onConfirm={handleConfirm} 
                language={language} 
              />
            </div>
          </main>

          {/* Mobile manifestation of Question Palette */}
          <div className="lg:hidden">
             <QuestionPalette questionRefs={questionRef} confirmed={confirmedAnswers} mode="mobile" />
          </div>

          {/* Mobile Proctoring status - Draggable */}
          {mode === "proctored" && (
            <div className="z-40">
               <AdvancedProctoring 
                 videoRef={videoRef} 
                 isCameraReady={cameraReady} 
                 isFaceDetected={faceDetected} 
                 statusText={proctoringStatus} 
                 violationCount={violations.length} 
                 autoSubmitAt={7} 
                 minimized={minimized}
                 setMinimized={setMinimized}
               />
               <div className="fixed bottom-24 right-4 z-40 pointer-events-auto max-h-32 overflow-y-auto scale-90 origin-bottom-right">
                 <ViolationFeed violations={violations} totalCount={violations.length} autoSubmitAt={7} />
               </div>
            </div>
          )}

          <ViolationWarningModal 
            isOpen={showWarning} 
            violation={lastViolation} 
            totalCount={violations.length} 
            autoSubmitAt={7} 
            onClose={() => setShowWarning(false)} 
          />
          
          <AlertPopup 
            isOpen={openAlert} 
            message="Your current progress will be preserved." 
            onClose={() => setOpenAlert(false)} 
            title="Leave Mock Exam?"
          >
            <div className="flex justify-between items-center gap-3 mt-6">
               <button type="button" onClick={confirmExit} className="w-full p-4 bg-surface-container-high text-on-surface-variant font-technical font-black uppercase tracking-widest rounded-2xl hover:bg-surface-dim transition-all text-xs">Yes, Exit</button>
               <button type="button" onClick={() => setOpenAlert(false)} className="w-full p-4 bg-primary text-white font-technical font-black uppercase tracking-widest rounded-2xl shadow-ambient hover:scale-105 transition-all text-xs">Cancel</button>
            </div>
          </AlertPopup>

          <AlertPopup 
            isOpen={showSubmitConfirm} 
            title="Final Submission" 
            onClose={() => setShowSubmitConfirm(false)} 
            message=""
          >
             <div className="space-y-8 py-4">
                <div className="bg-linear-to-br from-surface-container-low to-surface p-6 rounded-3xl relative overflow-hidden shadow-inner border border-outline-variant/10">
                   <div className="grid grid-cols-2 gap-4 relative z-10">
                      <div className="flex flex-col items-center justify-center p-4 bg-surface/60 backdrop-blur-xl rounded-2xl shadow-ambient border border-white/10">
                         <p className="text-xs font-semibold text-primary uppercase tracking-wide mb-1">Attempted</p>
                         <p className="text-3xl font-technical font-black text-on-surface tracking-tighter">{counts.attempted}</p>
                      </div>
                      <div className="flex flex-col items-center justify-center p-4 bg-surface/60 backdrop-blur-xl rounded-2xl shadow-ambient border border-white/10">
                         <p className="text-xs font-semibold text-orange-600 uppercase tracking-wide mb-1">Remaining</p>
                         <p className="text-3xl font-technical font-black text-orange-500 tracking-tighter">{counts.total - counts.attempted}</p>
                      </div>
                   </div>
                </div>

                <div className="text-center space-y-2">
                   <h4 className="text-xl font-black text-on-surface">Ready to Submit?</h4>
                   <p className="text-sm text-on-surface-variant font-medium leading-relaxed">Your answers are ready to be submitted for grading.</p>
                </div>

                <div className="flex flex-col gap-3">
                   <button type="button" onClick={() => methods.handleSubmit(onSubmit)()} className="w-full p-4 bg-linear-to-r from-primary to-primary-container text-white rounded-full font-technical font-black text-xs uppercase tracking-widest shadow-ambient-lg flex items-center justify-center gap-3">Submit Mock Exam <Target size={16} /></button>
                   <button type="button" onClick={() => setShowSubmitConfirm(false)} className="w-full min-h-11 p-3 text-sm font-semibold text-on-surface-variant">Cancel</button>
                </div>
             </div>
          </AlertPopup>
        </div>
      </form>
    </FormProvider>
  );
};
