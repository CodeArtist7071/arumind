import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import type { RootState } from "../../store";
import { useFormContext } from "react-hook-form";
import { CheckCircle2 } from "lucide-react";

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
  const filteredQuestionData = useSelector((state: RootState) => state.questions.filteredQuestionData)
  console.log("filteredQuestionData.....", filteredQuestionData)
  const { data: questionData } = useSelector(
    (state: RootState) => state.questions,
  );

  const { register, watch } = useFormContext();
  const answers = watch("answers");

  return (
    <section className="col-span-full lg:col-span-8 space-y-12">
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

        return (
          <div
            key={q.id}
            ref={(el: any) => {
              if (questionRef.current) questionRef.current[i] = el;
            }}
            className="bg-surface-container-high rounded-4xl p-6 lg:p-12 shadow-ambient transition-all duration-700 ease-botanical hover:shadow-ambient-lg group/q"
          >
            {/* Header: Editorial & Technical Stamped */}
            <div className="flex flex-row md:items-end justify-between gap-6 mb-6 lg:mb-12 border-b border-outline-variant/30 pb-5 lg:pb-8">
              <div className="flex flex-col">
                <span className="text-[10px] font-technical font-black text-on-surface-variant/40 uppercase tracking-[0.4em] mb-2">Inquiry</span>
                <h2 className="text-4xl lg:text-6xl font-black tracking-tighter text-on-surface">
                  {String(i + 1).padStart(2, '0')}.
                </h2>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex flex-col items-end">
                  <span className="text-[8px] font-technical font-black text-on-surface-variant/30 uppercase tracking-[0.3em] mb-1">Complexity</span>
                  <span className={`text-[10px] font-technical font-black uppercase tracking-widest px-3 py-1.5 rounded-full ${difficultyClass}`}>
                    {q.difficulty_level}
                  </span>
                </div>

                <div className="h-8 w-px bg-outline-variant/30" />

                <div className="flex flex-col items-end">
                  <span className="text-[8px] font-technical font-black text-on-surface-variant/30 uppercase tracking-[0.3em] mb-1">Growth Value</span>
                  <span className="text-[10px] font-technical font-black uppercase tracking-widest px-3 py-1.5 bg-primary text-white rounded-full">
                    {q.marks} Pts
                  </span>
                </div>
              </div>
            </div>

            {/* Body: High Legibility */}
            <div className="flex-1 max-w-4xl">
              <div className="space-y-8 mb-8 lg:mb-12">
                {!isOdia && (
                <p className="text-on-surface font-semibold text-md lg:text-xl leading-relaxed tracking-tight">
                  {q.question}
                </p>
                )}
                {isOdia && odiaData?.question && (
                  <div className="bg-primary/5 p-1 rounded-xl border-l-5 border-primary">
                    <p className="ml-4 md:ml-0 text-primary font-bold text-md leading-relaxed">
                      {odiaData.question}
                    </p>
                  </div>
                )}
              </div>

              <div className="grid gap-4">
                {q.options.map((opt: any) => (
                  <div key={opt.l} className="relative flex items-center">
                    <label className={`
                      flex w-full items-center p-4 rounded-2xl transition-all duration-500 cursor-pointer
                      ${currentAnswer === opt.l
                        ? 'bg-surface-container-highest shadow-inner ring-1 ring-primary/20 scale-[1.02]'
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
                        className="size-6 text-primary focus:ring-primary/30 border-outline-variant transition-all"
                      />

                      <div className="ml-6 flex flex-col gap-2 flex-1">
                        <div className="flex items-center gap-5">
                          <span className="hidden md:flex items-center justify-center size-8 rounded-xl bg-surface-container-high font-technical font-black text-xs text-on-surface-variant">
                            {opt.l}
                          </span>
                          <span className="font-bold text-sm lg:text-lg text-on-surface">{opt.v}</span>
                        </div>
                        {isOdia && odiaData?.options?.find((o: any) => o.l === opt.l) && (
                          <div className="ml-0 lg:ml-13 text-primary text-base font-bold opacity-80">
                            {odiaData.options.find((o: any) => o.l === opt.l)?.v}
                          </div>
                        )}
                      </div>

                      {/* Confirmation Glow indicator inside selection */}
                      {confirmedAnswers[q.id] && currentAnswer === opt.l && (
                        <div className="size-3 bg-primary rounded-full animate-pulse shadow-[0_0_15px_rgba(34,197,94,0.6)]" />
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
                        className="absolute  md:right-6 bg-linear-to-r from-primary to-primary-container text-white p-2 md:px-6 md:py-2 rounded-full text-[10px] font-technical font-black uppercase tracking-widest shadow-ambient-lg transition-all animate-in slide-in-from-right-4 hover:scale-110 active:scale-95 cursor-pointer"
                      >
                        <span className="">Select</span>
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* Status Indicator */}
              {confirmedAnswers[q.id] && (
                <div className="flex items-center gap-3 mt-10">
                  <div className="flex items-center gap-2 bg-primary/10 px-4 py-2 rounded-full border border-primary/20">
                    <div className="size-2 rounded-full bg-primary animate-ping" />
                    <span className="text-[10px] font-technical font-black text-primary uppercase tracking-[0.2em]">Validated • Recorded</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </section>
  );
};
