import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import type { RootState } from "../../store";
import { useFormContext } from "react-hook-form";

type QuestionListProps = {
  questionRef: React.RefObject<(HTMLDivElement | null)[]>;
  confirmedAnswers: Record<number, boolean>;
  setConfirmedAnswers: React.Dispatch<
    React.SetStateAction<Record<number, boolean>>
  >;
  onConfirm?: (questionId: number, answer: string) => void;
};

export const QuestionList = ({
  questionRef,
  confirmedAnswers,
  setConfirmedAnswers,
  onConfirm,
}: QuestionListProps) => {
  const [lastSelected, setLastSelected] = useState<Record<number, string>>({});
  const { data: questionData } = useSelector(
    (state: RootState) => state.questions,
  );
  
  const { register, watch } = useFormContext();
  const answers = watch("answers");

  return (
    <section className="lg:col-span-9 space-y-6">
      {questionData?.map((q, i) => {
        const difficultyClass =
          q.difficulty_level === "Easy"
            ? "bg-green-100 text-green-700"
            : q.difficulty_level === "Hard"
              ? "bg-red-100 text-red-700"
              : "bg-yellow-100 text-yellow-700";

        const currentAnswer = answers?.[q.id];

        return (
          <div
            key={q.id}
            ref={(el: any) => {
              if (questionRef.current) questionRef.current[i] = el;
            }}
            className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col min-h-60"
          >
            {/* Header */}
            <div className="p-4 border-b flex justify-between items-center border-slate-100 dark:border-slate-800">
              <h2 className="text-lg font-bold">Question {i + 1}</h2>

              <div className="flex items-center gap-2">
                <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded-full ${difficultyClass}`}>
                  {q.difficulty_level}
                </span>

                <span className="text-[10px] uppercase font-bold px-2 py-1 bg-blue-100 text-blue-700 rounded-full">
                  {q.marks} Points
                </span>
              </div>
            </div>

            {/* Body */}
            <div className="p-6 flex-1">
              <p className="text-slate-800 dark:text-slate-200 font-medium text-lg mb-6 leading-relaxed">
                {q.question}
              </p>

              <div className="grid gap-3">
                {q.options.map((opt: any) => (
                  <div key={opt.l} className="relative flex items-center group">
                    <label className={`
                      flex w-full items-center p-4 rounded-xl border-2 transition-all cursor-pointer
                      ${currentAnswer === opt.l 
                        ? 'border-primary bg-primary/5 dark:bg-primary/10' 
                        : 'border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                      }
                    `}>
                      <input
                        type="radio"
                        value={opt.l}
                        {...register(`answers.${q.id}`)}
                        className="size-5 text-primary focus:ring-primary border-slate-300 dark:border-slate-600"
                      />

                      <div className="ml-4 flex items-center gap-3">
                        <span className="flex items-center justify-center size-6 rounded bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-500">
                          {opt.l}
                        </span>
                        <span className="font-medium">{opt.v}</span>
                      </div>
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
                        className="absolute right-4 bg-primary hover:bg-primary/90 text-white px-4 py-1.5 rounded-lg text-sm font-bold shadow-lg shadow-primary/20 transition-all animate-in slide-in-from-right-2"
                      >
                        Confirm
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* Status Indicator */}
              {confirmedAnswers[q.id] && (
                <div className="flex items-center gap-2 mt-6 text-emerald-600 dark:text-emerald-400 font-bold text-sm">
                  <div className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                  Answer Confirmed
                </div>
              )}
            </div>
          </div>
        );
      })}
    </section>
  );
};
