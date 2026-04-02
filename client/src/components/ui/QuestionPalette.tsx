import { Grid2X2, Sparkles } from "lucide-react";
import React from "react";
import { useSelector } from "react-redux";
import type { RootState } from "../../store";

type QuestionPaletteProps = {
  questionRefs: React.RefObject<(HTMLDivElement | null)[]>;
  confirmed: Record<string, boolean>; // assuming record based on usage confirmed[id]
  mode?: "mobile" | "desktop";
};

export const QuestionPalette = ({ questionRefs, confirmed, mode }: QuestionPaletteProps) => {
  const { data } = useSelector((state: RootState) => state.questions);
  const totalQuestions = data.length;
  const completedQuestions = Object.keys(confirmed).length;
  const progressPercentage = Math.round(
    (completedQuestions / totalQuestions) * 100,
  );

  return (
    <>
      {/* MOBILE MANIFESTATION (Fixed Scrubber Overlay) */}
      {(!mode || mode === "mobile") && (
        <aside className="lg:hidden fixed top-32 right-0 md:right-8 z-50 h-[calc(100vh-16rem)] flex flex-col items-center group/timeline">
          <div className="flex flex-col items-center mb-4 opacity-40 group-hover/timeline:opacity-100 transition-opacity">
            <div className="size-2 rounded-full border-2 border-primary mb-2 shadow-sm" />
            <span className="text-[6px] font-technical font-black text-on-surface-variant uppercase tracking-[0.4em] [writing-mode:vertical-lr]">Start</span>
          </div>

          <div className="flex-1 w-11 md:w-16 bg-surface/80 backdrop-blur-3xl rounded-full border border-on-surface/5 shadow-ambient-lg flex flex-col items-center overflow-y-auto custom-scrollbar scroll-smooth py-8 px-1 relative transition-all duration-700 ease-botanical hover:bg-surface/95 ring-1 ring-white/10">
            {data.map((_, i) => {
              const isConfirmed = confirmed[data[i].id];
              const isLast = i === data.length - 1;

              return (
                <React.Fragment key={i}>
                  <button
                    type="button"
                    onClick={() =>
                      questionRefs.current[i]?.scrollIntoView({
                        behavior: "smooth",
                        block: "center",
                      })
                    }
                    className={`relative z-10 size-8 md:size-10 rounded-full flex items-center justify-center font-technical font-black text-[9px] md:text-xs transition-all duration-500 ease-premium cursor-pointer group/node shrink-0 border-2
                    ${isConfirmed ? "bg-primary text-white border-primary shadow-ambient" : "bg-surface-container-highest/80 text-on-surface-variant/40 border-on-surface/5 hover:border-primary/40 hover:text-primary hover:scale-110"}`}
                  >
                    {String(i + 1).padStart(2, '0')}
                  </button>
                  {!isLast && (
                    <div className="w-0.5 h-4 md:h-6 flex flex-col items-center">
                      <div className={`w-full h-full transition-all duration-700 ${isConfirmed ? "bg-primary" : "bg-on-surface/5"}`} />
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>
          <div className="flex flex-col items-center mt-4 gap-2">
            <div className="size-10 md:size-14 bg-surface/90 backdrop-blur-2xl rounded-2xl shadow-ambient border border-on-surface/5 flex items-center justify-center relative overflow-hidden">
              <div className="absolute bottom-0 left-0 right-0 bg-primary/10 transition-all duration-1000 ease-botanical" style={{ height: `${progressPercentage}%` }} />
              <span className="text-[9px] md:text-xs font-technical font-black text-primary relative z-10">{progressPercentage}%</span>
            </div>
          </div>
        </aside>
      )}

      {/* DESKTOP MANIFESTATION (Sticky Grid Sidebar) */}
      {(!mode || mode === "desktop") && (
        <aside className="hidden lg:block lg:col-span-4 transition-all duration-700 ease-botanical animate-reveal relative h-full">
          <div className="sticky top-0 space-y-8 h-fit">
            <div className="bg-surface-container-low rounded-4xl p-8 xl:p-10 shadow-ambient transition-all duration-700 ease-botanical hover:shadow-ambient-lg group/q border border-on-surface/5">
              <div className="flex flex-col mb-10">
                <span className="text-[9px] font-technical font-black text-on-surface-variant/40 uppercase tracking-[0.4em] mb-2">Subject Navigation</span>
                <h3 className="text-xl font-black text-on-surface flex items-center gap-3">
                  <Grid2X2 size={24} className="text-primary" />
                  Question Palette
                </h3>
              </div>

              <div className="grid grid-cols-4 xl:grid-cols-5 gap-3">
                {data.map((_, i) => {
                  const isConfirmed = confirmed[data[i].id];

                  return (
                    <>
                    <div className="bg-white w-1 h-10 mb-5 flex flex-col"/>
                    <button
                      key={i}
                      type="button"
                      onClick={() =>
                        questionRefs.current[i]?.scrollIntoView({
                          behavior: "smooth",
                          block: "center",
                        })
                      }
                      className={`aspect-square cursor-pointer flex items-center mt-10 justify-center rounded-2xl font-technical font-black text-xs transition-all duration-500
                        ${isConfirmed ? "bg-primary text-white shadow-ambient scale-110 rotate-3 group-hover:rotate-0" : "bg-surface-container-highest/60 hover:bg-white hover:text-primary hover:shadow-md hover:scale-105 text-on-surface-variant/40 border border-outline-variant/10"}`}
                    >
                      {String(i + 1).padStart(2, '0')}
                    </button>
                    </>
                    
                  );
                })}
              </div>
            </div>

            <div className="bg-surface-container-low/50 backdrop-blur-xl rounded-[3rem] p-8 xl:p-10 border border-outline-variant/10 shadow-ambient-sm">
              <div className="flex justify-between items-end mb-6">
                <div className="flex flex-col">
                  <span className="text-[10px] font-technical font-black text-on-surface-variant/40 uppercase tracking-[0.4em] mb-2">Growth Progress</span>
                  <span className="text-base font-black text-on-surface">Session Velocity</span>
                </div>
                <span className="text-3xl font-technical font-black text-primary tracking-tighter">{progressPercentage}%</span>
              </div>

              <div className="h-4 w-full bg-surface-container-high rounded-full overflow-hidden shadow-inner p-1">
                <div className="h-full bg-linear-to-r from-primary to-primary-container rounded-full transition-all duration-[1.5s] ease-premium shadow-sm" style={{ width: `${progressPercentage}%` }}></div>
              </div>

              <div className="mt-6 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="size-4 text-primary animate-pulse" />
                  <p className="text-[11px] font-technical font-black text-on-surface-variant/60 uppercase tracking-widest">{completedQuestions} / {totalQuestions}</p>
                </div>
                <p className="text-[10px] font-technical font-black text-primary uppercase tracking-widest opacity-40 group-hover:opacity-100 transition-opacity">Grading Active</p>
              </div>
            </div>
          </div>
        </aside>
      )}
    </>
  );
};
