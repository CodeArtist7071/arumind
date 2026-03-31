import { TrendingUp } from "lucide-react";

export const GrowthChart = ({
  performanceTrajectory,
  maxScore,
  chartMode,
  setChartMode,
}: {
  performanceTrajectory: any[];
  maxScore: number;
  chartMode: "Practice" | "Mock";
  setChartMode: (m: "Practice" | "Mock") => void;
}) => {
  return (
    <div className="sm:col-span-full lg:col-span-8 bg-surface-container-high p-10 rounded-[3rem] shadow-ambient">
      <div className="block md:flex justify-between items-center mb-12">
        <h3 className="text-xl font-black text-on-surface tracking-tight flex items-center gap-4">
          <div className="size-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
             <TrendingUp size={20} />
          </div>
          Session Trajectory
        </h3>
        <div className="flex sm:mt-4 md:mt-0 gap-1 bg-surface-container-high p-1 rounded-full shadow-inner">
          <button
            onClick={() => setChartMode("Practice")}
            className={`text-[10px] font-technical font-black uppercase tracking-[0.2em] px-6 py-2 rounded-full transition-all duration-500 cursor-pointer ${
              chartMode === "Practice" 
                ? "bg-primary text-on-primary shadow-md scale-105" 
                : "text-on-surface-variant hover:text-on-surface"
            }`}
          >
            Practice
          </button>
          <button
            onClick={() => setChartMode("Mock")}
            className={`text-[10px] font-technical font-black uppercase tracking-[0.2em] px-6 py-2 rounded-full transition-all duration-500 cursor-pointer ${
              chartMode === "Mock" 
                ? "bg-tertiary text-white shadow-md scale-105" 
                : "text-on-surface-variant hover:text-on-surface"
            }`}
          >
            Mock
          </button>
        </div>
      </div>
      <div className="flex items-end gap-3 h-56 px-4">
        {(performanceTrajectory.length > 0
          ? performanceTrajectory
          : Array(10).fill({ accuracy: 0, chapterName: "Seedling" })
        ).map((item, i) => {
          const barColor = chartMode === "Practice" ? "bg-primary" : "bg-tertiary";
          const barOpacity = item.accuracy === 0 ? "opacity-10" : "opacity-100";
          
          return (
            <div
              key={i}
              className="flex-1 bg-on-surface/5 rounded-t-2xl relative group h-full flex flex-col justify-end transition-all duration-700 ease-(--ease-botanical) hover:bg-on-surface/10"
            >
              <div
                className={`rounded-t-2xl transition-all duration-1000 ease-out shadow-sm ${barColor} ${barOpacity} group-hover:brightness-110`}
                style={{ height: `${(item.accuracy / maxScore) * 100}%` }}
              />
              
              <div className="absolute -top-16 left-1/2 -translate-x-1/2 bg-on-surface text-surface text-[10px] font-technical font-black px-4 py-3 rounded-2xl shadow-ambient opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all pointer-events-none whitespace-nowrap z-20 flex flex-col items-center gap-1 border border-outline-variant/10">
                <span className={chartMode === "Practice" ? "text-primary-container" : "text-tertiary"}>
                  {item.accuracy}%
                </span>
                <span className="text-[8px] uppercase tracking-widest opacity-40">
                  {item.chapterName}
                </span>
                <div className="absolute bottom-[-6px] left-1/2 -translate-x-1/2 w-3 h-3 bg-on-surface rotate-45" />
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex justify-between mt-8 px-4 opacity-30">
        {(performanceTrajectory.length > 0
          ? performanceTrajectory
          : Array(10).fill(null)
        ).map((_, i) => (
          <span
            key={i}
            className="flex-1 text-center text-[9px] font-technical font-black uppercase tracking-[0.2em] text-on-surface-variant"
          >
            S{i + 1}
          </span>
        ))}
      </div>
    </div>
  );
};
