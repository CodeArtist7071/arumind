import { useSelector } from "react-redux";
import type { RootState } from "../../store";


export default function WeeklyAnalysis() {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xl p-6 flex flex-col gap-6">
      <h3 className="text-lg font-black">Week 2 Analysis</h3>

      <div className="relative w-40 h-40 mx-auto">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
          <circle
            cx="18"
            cy="18"
            r="16"
            stroke="#e2e8f0"
            strokeWidth="3"
            fill="transparent"
          />

          <circle
            cx="18"
            cy="18"
            r="16"
            stroke="#1a57db"
            strokeWidth="3"
            strokeDasharray="68,100"
            fill="transparent"
          />
        </svg>

        <div className="absolute inset-0 flex items-center justify-center text-2xl font-bold">
          68%
        </div>
      </div>

      <button className="bg-primary text-white py-3 rounded-lg font-bold">
        Claim Weekly Rewards
      </button>
    </div>
  );
}