// components/ui/DifficultyBadge.tsx
import { useSelector } from "react-redux";
import type { RootState } from "../../store";

export default function DifficultyBadge() {
  const { currentDifficulty, ability } = useSelector(
    (state: RootState) => state.adaptive
  );

  const config = {
    Easy:     { bg: "bg-green-100",  text: "text-green-700",  label: "Easy"     },
    Moderate: { bg: "bg-yellow-100", text: "text-yellow-700", label: "Moderate" },
    Hard:     { bg: "bg-red-100",    text: "text-red-700",    label: "Hard"      },
  };

  const c = config[currentDifficulty];
  const pct = Math.round(ability.theta * 100);

  return (
    <div className="flex items-center gap-3">
      <span className={`text-xs font-bold px-3 py-1 rounded-full ${c.bg} ${c.text}`}>
        {c.label}
      </span>
      <div className="flex flex-col">
        <div className="w-32 h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-500 rounded-full transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="text-[10px] text-slate-400 font-bold mt-0.5">
          Ability {pct}%
        </span>
      </div>
    </div>
  );
}