import { TrendingUp, Calendar, Award, CheckCircle2, Zap } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

type WeekDetail = {
  completed: number;
  total: number;
};

type WeeklyProgressProps = {
  weekPercents?: number[];
  weekDetails?: WeekDetail[];
  monthlyCompleted?: number;
  monthlyTotal?: number;
  totalHabits?: number;
};

const ProgressPie = ({ completed, total, size = 60, strokeWidth = 6 }: { completed: number, total: number, size?: number, strokeWidth?: number }) => {
  const percent = total === 0 ? 0 : Math.round((completed / total) * 100);
  const data = [
    { value: completed },
    { value: Math.max(0, total - completed) }
  ];
  const COLORS = ['var(--color-primary)', 'var(--color-surface-container-highest)'];

  return (
    <div className="relative flex flex-col items-center">
      <div style={{ width: size, height: size }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              innerRadius={size/2 - strokeWidth}
              outerRadius={size/2}
              paddingAngle={0}
              dataKey="value"
              stroke="none"
              startAngle={90}
              endAngle={-270}
            >
              <Cell fill={COLORS[0]} />
              <Cell fill={COLORS[1]} />
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="absolute inset-x-0 top-[22%] flex flex-col items-center justify-center pointer-events-none">
        <span className="text-[10px] font-technical font-black leading-none opacity-40">{percent}%</span>
      </div>
    </div>
  );
};

export default function WeeklyProgress({ 
  weekPercents = [0, 0, 0, 0],
  weekDetails = [
    { completed: 0, total: 0 },
    { completed: 0, total: 0 },
    { completed: 0, total: 0 },
    { completed: 0, total: 0 }
  ],
  monthlyCompleted = 0,
  monthlyTotal = 0,
  totalHabits = 0
}: WeeklyProgressProps) {
  
  const averageConsistency = monthlyTotal === 0 ? 0 : Math.round((monthlyCompleted / monthlyTotal) * 100);

  // Velocity Calculation: simplified average tasks per day needed vs current
  const daysElapsed = weekDetails.reduce((acc, w) => acc + (w.total > 0 ? 7 : 0), 0) || 1;
  const velocity = (monthlyCompleted / daysElapsed).toFixed(1);
  const estDays = monthlyTotal === 0 ? 0 : Math.round((monthlyTotal - monthlyCompleted) / (parseFloat(velocity) || 1));

  const perks = [
    { 
      label: "Mastery Score", 
      value: `${averageConsistency}%`, 
      icon: <Zap size={18} fill="currentColor" />,
      color: "text-tertiary",
      desc: "Overall syllabus mastery" 
    },
    { 
      label: "Items Finished", 
      value: monthlyCompleted, 
      icon: <CheckCircle2 size={18} />,
      color: "text-primary",
      desc: `${monthlyTotal} total tasks scheduled` 
    },
    { 
      label: "Planner Status", 
      value: averageConsistency > 80 ? "Elite" : averageConsistency > 50 ? "Pro" : "Seed", 
      icon: <Award size={18} />,
      color: "text-primary",
      desc: "Your current study rank" 
    },
    { 
      label: "Est. Completion", 
      value: `${estDays} Days`, 
      icon: <Calendar size={18} />,
      color: "text-tertiary",
      desc: "Based on current focus" 
    }
  ];

  return (
    <div className="space-y-12">
      <div className="flex items-center justify-between px-2">
        <div>
          <h3 className="text-[11px] font-technical font-black uppercase tracking-[0.4em] text-on-surface-variant opacity-60 mb-2">Academic Vitals</h3>
          <h2 className="text-3xl font-black tracking-tighter text-on-surface">
            Progress Metrics
          </h2>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {perks.map((perk, i) => (
          <div key={i} className="bg-surface-container-low p-8 rounded-4xl shadow-ambient hover:scale-105 transition-all duration-500 group">
            <div className="flex items-start justify-between mb-8">
               <div className={`p-4 bg-surface-container-high rounded-2xl group-hover:bg-primary group-hover:text-white transition-all duration-500 ${perk.color}`}>
                  {perk.icon}
               </div>
               <span className="text-[9px] font-technical font-black uppercase tracking-widest text-on-surface-variant opacity-30">Live</span>
            </div>
            <div className="space-y-1">
              <h4 className="text-4xl font-technical font-black text-on-surface tracking-tighter">{perk.value}</h4>
              <p className="text-[10px] font-technical font-black text-on-surface-variant uppercase tracking-[0.2em] opacity-40">{perk.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 pt-4">
        {/* Monthly Master Pie */}
        <div className="lg:col-span-5 bg-surface-container-low p-10 rounded-[3rem] shadow-ambient flex flex-col items-center justify-center gap-10">
          <h3 className="text-[11px] font-technical font-black uppercase tracking-[0.4em] text-on-surface-variant opacity-40">Monthly Mastery</h3>
          <div className="relative size-60">
            <ProgressPie completed={monthlyCompleted} total={monthlyTotal} size={240} strokeWidth={24} />
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
               <span className="text-5xl font-technical font-black text-primary tracking-tighter">{averageConsistency}%</span>
               <span className="text-[10px] font-technical font-black uppercase text-on-surface-variant opacity-40 tracking-widest mt-1">Syllabus</span>
            </div>
          </div>
          <div className="text-center bg-white/30 px-8 py-4 rounded-full">
            <p className="text-[10px] font-technical font-black text-on-surface-variant uppercase tracking-widest opacity-60">
              Validated Progress: <span className="text-primary">{monthlyCompleted}</span> <span className="opacity-20">/</span> {monthlyTotal}
            </p>
          </div>
        </div>

        {/* Weekly Breakdown Pies */}
        <div className="lg:col-span-7 bg-surface-container-low p-10 rounded-[3rem] shadow-ambient">
           <h3 className="text-[11px] font-technical font-black uppercase tracking-[0.4em] text-on-surface-variant opacity-40 mb-12">Weekly Milestones</h3>
           <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {weekDetails.map((w, i) => (
                <div key={i} className="flex flex-col items-center gap-6 group">
                  <div className="relative p-2 bg-surface-container-high rounded-4xl group-hover:scale-110 group-hover:bg-white transition-all duration-500 shadow-sm shadow-black/5">
                    <ProgressPie completed={w.completed} total={w.total} size={120} strokeWidth={12} />
                  </div>
                  <div className="text-center">
                    <span className="text-[10px] font-technical font-black uppercase text-on-surface-variant opacity-40 tracking-[0.3em] block mb-2">Week {i+1}</span>
                    <span className="text-[9px] font-technical font-black text-primary bg-primary/5 px-3 py-1.5 rounded-full tracking-widest whitespace-nowrap">
                      {w.completed}<span className="opacity-30">/</span>{w.total !== 0 ? w.total / totalHabits : 0} ITEMS
                    </span>
                  </div>
                </div>
              ))}
           </div>
           
           <div className="mt-12 p-8 bg-white/20 rounded-4xl border border-on-surface/5">
             <p className="text-[10px] font-technical font-black text-on-surface-variant uppercase tracking-[0.2em] opacity-40 leading-relaxed text-center italic">
               "Each pie chart represents your focus for the week. Complete all items to hit 100% and unlock your potential."
             </p>
           </div>
        </div>
      </div>
    </div>
  );
}
