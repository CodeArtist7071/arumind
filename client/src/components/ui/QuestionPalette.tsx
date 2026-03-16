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
    <aside className="fixed right-10 space-y-6 w-[20%] lg:col-span-3">
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
        <h3 className="font-bold mb-4 flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-sm">
            <Grid2X2 />
          </span>
          Question Palette
        </h3>

        <div className="grid grid-cols-5 gap-2">
          {data.map((_, i) => {
            const isConfirmed = Array.isArray(confirmed)
              ? confirmed.includes(i)
              : confirmed === i;

            return (
              <button
                key={i}
                onClick={() =>
                  questionRefs.current[i]?.scrollIntoView({
                    behavior: "smooth",
                    block: "center",
                  })
                }
                className={`aspect-square cursor-pointer flex items-center justify-center rounded-xl border font-bold text-sm
                  ${
                    confirmed[data[i].id]
                      ? "bg-green-500 text-white border-green-600"
                      : "bg-slate-100 hover:bg-slate-300 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400"
                  }`}
              >
                {i + 1}
              </button>
            );
          })}
        </div>
      </div>

      <div className="bg-primary/5 dark:bg-primary/10 border border-primary/20 rounded-xl p-4">
        <div className="flex justify-between mb-2">
          <span className="text-sm font-semibold text-primary">
            Test Progress
          </span>
          <span className="text-xs font-bold text-primary">
            {progressPercentage}%
          </span>
        </div>

        <div className="h-2 w-full bg-primary/20 rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full"
            style={{ width: `${progressPercentage}%` }}
          ></div>
        </div>

        <p className="mt-3 text-xs text-slate-600 dark:text-slate-400 font-medium">
          {completedQuestions} of {totalQuestions} questions completed
        </p>
      </div>
    </aside>
  );
};
