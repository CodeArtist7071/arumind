import React from "react";

type MobileQuestionPaletteProps = {
  data: any[];
  confirmed: Record<string, boolean>;
  questionRefs: React.RefObject<(HTMLDivElement | null)[]>;
  progressPercentage: number;
};

export const MobileQuestionPalette = ({
  data,
  confirmed,
  questionRefs,
  progressPercentage,
}: MobileQuestionPaletteProps) => {
  return (
    <aside className="lg:hidden fixed top-20 right-0 md:right-8 z-50 h-[calc(100vh-10rem)] flex flex-col items-center group/timeline">
      <div className="flex flex-col items-center mb-4 opacity-40 group-hover/timeline:opacity-100 transition-opacity">
        <div className="size-2 rounded-full border-2 border-primary mb-2 shadow-sm" />
        <span className="text-xs font-semibold text-on-surface-variant uppercase tracking-wide [writing-mode:vertical-lr]">
          Start
        </span>
      </div>

      <div className="flex-1 w-11 md:w-16 bg-surface/80 backdrop-blur-3xl rounded-full border border-on-surface/5 shadow-ambient-lg flex flex-col items-center overflow-y-auto custom-scrollbar scroll-smooth py-8 px-1 relative transition-all duration-700 ease-botanical hover:bg-surface/95 ring-1 ring-white/10">
        {data.map((_, i) => {
          const isConfirmed = confirmed[data[i].id];
          const isLast = i === data.length - 1;

          return (
            <React.Fragment key={data[i].id}>
              <button
                type="button"
                onClick={() =>
                  questionRefs.current[i]?.scrollIntoView({
                    behavior: "smooth",
                    block: "center",
                  })
                }
                aria-label={`Go to question ${i + 1}${isConfirmed ? ", answered" : ", unanswered"}`}
                className={`relative z-10 size-10 md:size-10 rounded-full flex items-center justify-center font-semibold text-xs transition-all duration-500 ease-premium cursor-pointer group/node shrink-0 border-2
                ${
                  isConfirmed
                    ? "bg-primary text-white border-primary shadow-ambient"
                    : "bg-surface-container-highest/80 text-on-surface-variant/40 border-on-surface/5 hover:border-primary/40 hover:text-primary hover:scale-110"
                }`}
              >
                {String(i + 1).padStart(2, "0")}
              </button>
              {!isLast && (
                <div className="w-[1.5px] h-12 md:h-16 flex flex-col items-center my-1">
                  <div
                    className={`w-full h-full transition-all duration-700 ${
                      isConfirmed ? "bg-primary shadow-sm" : "bg-on-surface/20"
                    }`}
                  />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
      <div className="flex flex-col items-center mt-4 gap-2">
        <div className="size-10 md:size-14 bg-surface/90 backdrop-blur-2xl rounded-2xl shadow-ambient border border-on-surface/5 flex items-center justify-center relative overflow-hidden">
          <div
            className="absolute bottom-0 left-0 right-0 bg-primary/10 transition-all duration-1000 ease-botanical"
            style={{ height: `${progressPercentage}%` }}
          />
          <span className="text-xs font-semibold text-primary relative z-10">
            {progressPercentage}%
          </span>
        </div>
      </div>
    </aside>
  );
};
