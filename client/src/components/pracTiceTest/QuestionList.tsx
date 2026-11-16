import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import type { RootState } from "../../store";
import { useFormContext } from "react-hook-form";
import { CheckCircle2, Info } from "lucide-react";
import { HtmlContent } from "../ui/HtmlContent";

type QuestionListProps = {
  questionRef: React.RefObject<(HTMLDivElement | null)[]>;
  confirmedAnswers: Record<number, boolean>;
  setConfirmedAnswers: React.Dispatch<
    React.SetStateAction<Record<number, boolean>>
  >;
  onConfirm?: (questionId: number, answer: string) => void;
  language: "en" | "od";
};

export const QuestionList = ({
  questionRef,
  confirmedAnswers,
  setConfirmedAnswers,
  onConfirm,
  language,
}: QuestionListProps) => {
  const [lastSelected, setLastSelected] = useState<Record<number, string>>({});
  const [expandedExplanations, setExpandedExplanations] = useState<Record<number, boolean>>({});
  const filteredQuestionData = useSelector((state: RootState) => state.questions.filteredQuestionData);
  console.log("filteredQuestionData.....", filteredQuestionData)
  const { data: questionData } = useSelector(
    (state: RootState) => state.questions,
  );

  const { register, watch } = useFormContext();
  const answers = watch("answers");

  return (
    <section className="col-span-full lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-4 md:gap-8">
      {questionData?.map((q, i) => {
        const difficultyClass =
          q.difficulty_level === "Easy"
            ? "bg-primary/10 text-primary"
            : q.difficulty_level === "Hard"
              ? "bg-red-50 text-red-600"
              : "bg-tertiary/10 text-tertiary";

        const currentAnswer = answers?.[q.id];

        const isOdia = language === "od";
        const odiaData = Array.isArray(q.odia_questions) ? q.odia_questions[0] : q.odia_questions;

        console.log(`[DEBUG] Question ${i + 1} Explanations:`, q.question_explanations);

        return (
          <div
            key={q.id}
            ref={(el: any) => {
              if (questionRef.current) questionRef.current[i] = el;
            }}
            className="bg-surface-container-high rounded-2xl md:rounded-4xl p-3 md:p-6 lg:p-10 shadow-ambient transition-all duration-700 ease-botanical hover:shadow-ambient-lg group/q flex flex-col"
          >
            {/* Header: Clean & Editorial */}
            <div className="flex flex-row items-center justify-between gap-2 mb-3 lg:mb-10 border-b border-outline-variant/20 pb-3">
              <div className="flex items-center gap-3">
                <span className="hidden md:block text-[10px] font-technical font-black text-on-surface-variant/40 uppercase tracking-[0.4em]">Inquiry</span>
                <h2 className="text-lg md:text-2xl lg:text-5xl font-black tracking-tighter text-on-surface">
                  {String(i + 1).padStart(2, '0')}.
                </h2>
              </div>

              <div className="flex items-center gap-2 md:gap-4">
                <div className="flex flex-col items-end">
                  <span className="hidden md:block text-[8px] font-technical font-black text-on-surface-variant/30 uppercase tracking-[0.3em] mb-1">Complexity</span>
                  <span className={`text-[7px] md:text-[10px] font-technical font-black uppercase tracking-widest px-2 md:px-3 py-1 rounded-full ${difficultyClass}`}>
                    {q.difficulty_level}
                  </span>
                </div>

                <div className="h-4 md:h-8 w-px bg-outline-variant/30" />

                <div className="flex flex-col items-end">
                  <span className="hidden md:block text-[8px] font-technical font-black text-on-surface-variant/30 uppercase tracking-[0.3em] mb-1">Growth</span>
                  <span className="text-[7px] md:text-[10px] font-technical font-black uppercase tracking-widest px-2 md:px-3 py-1 bg-primary text-white rounded-full">
                    {q.marks} Pts
                  </span>
                </div>
              </div>
            </div>

            {/* Body: High Legibility */}
            <div className="flex-1 flex flex-col transition-all duration-700">
              <div className={`space-y-3 mb-4 lg:mb-10 transition-all duration-700 origin-left ${expandedExplanations[q.id] ? "scale-90 opacity-60" : ""}`}>
                {!isOdia && (
                  <p
                    className="text-on-surface font-semibold text-xs md:text-base lg:text-lg leading-relaxed tracking-tight"
                  ><HtmlContent html={q.question} /></p>
                )}
                {isOdia && odiaData?.question && (
                  <div className="bg-primary/5 p-1 rounded-lg border-l-4 border-primary">
                    <p className="ml-3 md:ml-0 text-primary font-bold text-xs leading-relaxed">
                      <HtmlContent html={odiaData.question} />
                    </p>
                  </div>
                )}
              </div>

              <div className={`grid gap-1.5 md:gap-3 transition-all duration-700 overflow-hidden ${expandedExplanations[q.id] ? "max-h-0 opacity-0 pointer-events-none" : "max-h-[2000px] opacity-100"}`}>
                {q.options.map((opt: any) => (
                  <div key={opt.l} className="relative flex items-center">
                    <label className={`
                      flex w-full items-center p-2.5 md:p-4 rounded-xl transition-all duration-500 cursor-pointer
                      ${currentAnswer === opt.l
                        ? 'bg-surface-container-highest shadow-inner ring-1 ring-primary/20 scale-[1.01]'
                        : 'bg-surface-container-lowest hover:bg-white hover:scale-[1.01] hover:shadow-ambient'
                      }
                    `}>
                      <input
                        type="radio"
                        value={opt.l}
                        {...register(`answers.${q.id}`, {
                          onChange: () => {
                            setConfirmedAnswers((prev) => ({
                              ...prev,
                              [q.id]: false,
                            }));
                          },
                        })}
                        className="size-3.5 md:size-5 text-primary focus:ring-primary/30 border-outline-variant transition-all"
                      />

                      <div className="ml-3 md:ml-6 flex flex-col gap-0.5 flex-1">
                        <div className="flex items-center gap-2 md:gap-5">
                          <span className="hidden sm:flex items-center justify-center size-5 md:size-8 rounded-lg bg-surface-container-high font-technical font-black text-[9px] md:text-xs text-on-surface-variant">
                            {opt.l}
                          </span>
                          <span className="font-bold text-[11px] md:text-base lg:text-lg text-on-surface">
                            <HtmlContent html={opt.v} />
                          </span>
                        </div>
                        {isOdia && odiaData?.options?.find((o: any) => o.l === opt.l) && (
                          <div className="ml-0 lg:ml-13 text-primary text-xs font-bold opacity-80">
                            <HtmlContent html={odiaData.options.find((o: any) => o.l === opt.l)?.v || ''} />
                          </div>
                        )}
                      </div>

                      {/* Status indicator inside selection (confirmed) */}
                      {confirmedAnswers[q.id] && currentAnswer === opt.l && (
                        <div className="size-1.5 md:size-3 bg-primary rounded-full animate-pulse shadow-[0_0_15px_rgba(34,197,94,0.6)]" />
                      )}
                    </label>

                    {/* Show Confirm button only if this option is selected BUT not confirmed */}
                    {currentAnswer === opt.l && !confirmedAnswers[q.id] && (
                      <button
                        type="button"
                        onClick={() => {
                          setConfirmedAnswers((prev) => ({
                            ...prev,
                            [q.id]: true,
                          }));
                          if (onConfirm) onConfirm(q.id, currentAnswer);
                        }}
                        className="absolute right-2 md:right-4 bg-linear-to-r from-primary to-primary-container text-white px-3 py-1.5 md:px-6 md:py-2 rounded-full text-[8px] md:text-[10px] font-technical font-black uppercase tracking-widest shadow-ambient-lg transition-all animate-in slide-in-from-right-4 hover:scale-110 active:scale-95 cursor-pointer"
                      >
                        Select
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* Status Indicator (Compact) */}
              {confirmedAnswers[q.id] && (
                <div className="flex flex-col gap-3 mt-4">
                  <div className="flex justify-between items-center bg-primary/5 px-3 md:px-6 py-2 md:py-4 rounded-xl md:rounded-3xl border border-primary/20">
                    <div className="flex items-center gap-2 md:gap-4">
                      <div className="size-2 rounded-full bg-primary animate-ping shadow-[0_0_15px_rgba(34,197,94,0.6)]" />
                      <span className="text-[7px] md:text-[12px] font-technical font-black text-primary uppercase tracking-[0.2em]">Recorded</span>
                    </div>
                    {q.question_explanations?.length > 0 && !expandedExplanations[q.id] && (
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          setExpandedExplanations(prev => ({ ...prev, [q.id]: true }));
                        }}
                        className="px-3 py-1 rounded-full bg-primary text-white hover:bg-primary/90 text-[7px] md:text-[10px] font-mono font-black uppercase tracking-widest transition-all cursor-pointer"
                      >
                        Explain
                      </button>
                    )}
                  </div>
                  {q.question_explanations?.length > 0 && expandedExplanations[q.id] && (
                    <ExplanationViewer
                      explanations={q.question_explanations}
                      onClose={() => setExpandedExplanations(prev => ({ ...prev, [q.id]: false }))}
                    />
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </section>
  );
};

const ExplanationViewer = ({ explanations, onClose }: { explanations: string[], onClose?: () => void }) => {
  const [index, setIndex] = useState(0);
  const validExplanations = explanations.filter(Boolean); // Filter out nulls

  if (validExplanations.length === 0) return null;

  return (
    <div className="bg-surface-container-high/40 p-6 md:p-8 rounded-4xl border-2 border-dashed border-on-surface-variant/10 animate-in zoom-in-95 duration-500 w-full overflow-hidden">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3 text-primary">
          <Info size={18} className="shrink-0" />
          <span className="text-[10px] font-mono font-black uppercase tracking-[0.3em]">
            Botanical Insights {validExplanations.length > 1 && `(${index + 1}/${validExplanations.length})`}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {validExplanations.length > 1 && (
            <button
              onClick={(e) => {
                e.preventDefault();
                setIndex((prev) => (prev + 1) % validExplanations.length);
              }}
              className="px-4 py-2 rounded-full bg-primary/10 text-primary hover:bg-primary/20 text-[10px] font-mono font-black uppercase tracking-widest transition-colors cursor-pointer"
            >
              Check another
            </button>
          )}
          {onClose && (
            <button
              onClick={(e) => {
                e.preventDefault();
                onClose();
              }}
              className="px-4 py-2 rounded-full bg-error/10 text-error hover:bg-error/20 text-[10px] font-mono font-black uppercase tracking-widest transition-colors cursor-pointer"
            >
              Close
            </button>
          )}
        </div>
      </div>
      <div className="text-sm font-medium text-on-surface-variant/80 leading-relaxed italic pr-0 md:pr-6">
        <HtmlContent html={validExplanations[index]} />
      </div>
    </div>
  );
};
