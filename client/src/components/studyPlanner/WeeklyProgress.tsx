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
  const COLORS = ['#1a57db', '#e2e8f0'];

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
              <Cell fill={COLORS[1]} className="dark:fill-slate-800" />
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="absolute inset-x-0 top-[20%] flex flex-col items-center justify-center pointer-events-none">
        <span className="text-[10px] font-black leading-none">{percent}%</span>
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
      icon: <Zap size={16} className="text-amber-500" />,
      desc: "Overall syllabus mastery" 
    },
    { 
      label: "Items Finished", 
      value: monthlyCompleted, 
      icon: <CheckCircle2 size={16} className="text-emerald-500" />,
      desc: `${monthlyTotal} total tasks scheduled` 
    },
    { 
      label: "Planner Status", 
      value: averageConsistency > 80 ? "Elite" : averageConsistency > 50 ? "Productive" : "Starting", 
      icon: <Award size={16} className="text-blue-500" />,
      desc: "Your current study rank" 
    },
    { 
      label: "Est. Completion", 
      value: `${estDays} Days`, 
      icon: <Calendar size={16} className="text-rose-500" />,
      desc: "Based on current focus" 
    }
  ];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black tracking-tight flex items-center gap-2">
            <TrendingUp className="text-[#1a57db]" size={20} />
            Academic Progress Hub
          </h2>
          <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest mt-1">Syllabus mastery & milestone analysis</p>
        </div>
      </div>

      <div className="grid sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {perks.map((perk, i) => (
          <div key={i} className="bg-white dark:bg-slate-900/50 p-5 rounded-3xl border border-slate-100 dark:border-slate-800 hover:shadow-xl hover:shadow-[#1a57db]/5 transition-all group">
            <div className="flex items-start justify-between mb-4">
               <div className="p-2.5 bg-slate-50 dark:bg-slate-800 rounded-2xl group-hover:scale-110 transition-transform">
                  {perk.icon}
               </div>
               <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">Live Metric</span>
            </div>
            <div className="space-y-1">
              <h4 className="text-2xl font-black text-slate-900 dark:text-white">{perk.value}</h4>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">{perk.label}</p>
            </div>
            <div className="mt-4 pt-4 border-t border-slate-50 dark:border-slate-800/50">
               <p className="text-[10px] text-slate-400 font-medium italic">"{perk.desc}"</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Monthly Master Pie */}
        <div className="lg:col-span-5 bg-slate-50 dark:bg-slate-800/20 p-8 rounded-[2.5rem] border border-slate-200/50 dark:border-slate-800 flex flex-col items-center justify-center gap-6">
          <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Monthly Mastery</h3>
          <div className="relative size-48">
            <ProgressPie completed={monthlyCompleted} total={monthlyTotal} size={200} strokeWidth={20} />
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
               <span className="text-3xl font-black text-[#1a57db]">{averageConsistency}%</span>
               <span className="text-[9px] font-black uppercase text-slate-400 tracking-tighter">Completed</span>
            </div>
          </div>
          <div className="text-center">
            <p className="text-xs font-bold text-slate-600 dark:text-slate-300">Total Progress: {monthlyCompleted} / {monthlyTotal}</p>
            <p className="text-[10px] text-slate-400 font-medium mt-1 uppercase tracking-widest">30-Day Goal Status</p>
          </div>
        </div>

        {/* Weekly Breakdown Pies */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900/50 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800">
           <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 mb-8 ml-2">Weekly Milestones</h3>
           <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-6">
              {weekDetails.map((w, i) => (
                <div key={i} className="flex flex-col items-center gap-4 group">
                  <div className="relative p-2 bg-slate-50 dark:bg-slate-800 rounded-3xl group-hover:scale-105 transition-transform">
                    <ProgressPie completed={w.completed} total={w.total} size={150} strokeWidth={20} />
                  </div>
                  <div className="text-center">
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-1">Week {i+1}</span>
                    <span className="text-[9px] font-bold text-[#1a57db] bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded-lg">
                      {w.completed}/{w.total !== 0 ? w.total / totalHabits : 0} tasks
                    </span>
                  </div>
                </div>
              ))}
           </div>
           
           <div className="mt-10 p-6 bg-slate-50 dark:bg-slate-800/30 rounded-3xl border border-dashed border-slate-200 dark:border-slate-700">
             <p className="text-[10px] text-slate-500 font-medium leading-relaxed italic text-center">
               "Each pie chart represents your focus for the week. Complete all items to hit 100% and unlock your potential."
             </p>
           </div>
        </div>
      </div>
    </div>
  );
}