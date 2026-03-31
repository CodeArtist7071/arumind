import { Grid2X2 } from "lucide-react";
import React from "react";
import { useSelector } from "react-redux";
import type { RootState } from "../../store";

type QuestionPaletteProps = {
  questionRefs: React.RefObject<(HTMLDivElement | null)[]>;
  confirmed: number | number[]; // single or multiple confirmed questions
};

export const QuestionPalette = ({ questionRefs, confirmed }) => {
  const { data } = useSelector((state: RootState) => state.questions);
  const totalQuestions = data.length;
  const completedQuestions = Object.keys(confirmed).length; // number of confirmed
  const progressPercentage = Math.round(
    (completedQuestions / totalQuestions) * 100,
  );
  return (
    <aside className="fixed top-32 right-10 space-y-8 w-[20%] lg:col-span-3 transition-all duration-700 ease-botanical">
      <div className="bg-surface-container-low rounded-4xl p-8 lg:p-12 shadow-ambient transition-all duration-700 ease-botanical hover:shadow-ambient-lg group/q">
        <div className="flex flex-col mb-6">
           <span className="text-[8px] font-technical font-black text-on-surface-variant/40 uppercase tracking-[0.4em] mb-1">Navigation</span>
           <h3 className="text-sm font-black text-on-surface flex items-center gap-2">
             <Grid2X2 size={16} className="text-primary" />
             Question Palette
           </h3>
        </div>

        <div className="grid grid-cols-5 gap-2.5">
          {data.map((_, i) => {
            const isConfirmed = confirmed[data[i].id];

            return (
              <button
                key={i}
                onClick={() =>
                  questionRefs.current[i]?.scrollIntoView({
                    behavior: "smooth",
                    block: "center",
                  })
                }
                className={`aspect-square cursor-pointer flex items-center justify-center rounded-xl font-technical font-black text-[10px] transition-all duration-500
                  ${
                    isConfirmed
                      ? "bg-primary text-white shadow-ambient scale-110 rotate-3 group-hover:rotate-0"
                      : "bg-surface-container-highest/60 hover:bg-white hover:text-primary hover:scale-105 text-on-surface-variant/40"
                  }`}
              >
                {String(i + 1).padStart(2, '0')}
              </button>
            );
          })}
        </div>
      </div>

      {/* Progress Pod */}
      <div className="bg-surface-container-highest/30 rounded-3xl p-6 border border-outline-variant/5">
        <div className="flex justify-between items-end mb-4">
          <div className="flex flex-col">
            <span className="text-[8px] font-technical font-black text-on-surface-variant/40 uppercase tracking-[0.4em] mb-1">Growth Progress</span>
            <span className="text-xs font-black text-on-surface">
               Session Velocity
            </span>
          </div>
          <span className="text-xl font-technical font-black text-primary tracking-tighter">
            {progressPercentage}%
          </span>
        </div>

        {/* The Pod Pattern Progress Bar */}
        <div className="h-3 w-full bg-surface-container-high rounded-full overflow-hidden shadow-inner p-0.5">
          <div
            className="h-full bg-linear-to-r from-primary to-primary-container rounded-full transition-all duration-[1.5s] ease-botanical shadow-sm"
            style={{ width: `${progressPercentage}%` }}
          ></div>
        </div>

        <div className="mt-4 flex items-center justify-between">
           <p className="text-[10px] font-technical font-black text-on-surface-variant/60 uppercase tracking-widest">
             {completedQuestions} / {totalQuestions}
           </p>
           <p className="text-[10px] font-technical font-black text-primary uppercase tracking-widest opacity-0 animate-pulse group-hover:opacity-100">
             Grading Active
           </p>
        </div>
      </div>
    </aside>
  );
};
