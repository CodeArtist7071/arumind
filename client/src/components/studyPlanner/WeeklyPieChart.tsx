import { PieChart, Pie, Tooltip, Cell, ResponsiveContainer, Legend } from "recharts";
import { BookOpen, HelpCircle, RotateCcw, Monitor, PieChart as PieIcon } from "lucide-react";

interface Props {
  data: { name: string; value: number }[];
}

export default function WeeklyPieChart({ data }: Props) {
  const COLORS = {
    theory: "#6366f1",
    mcq: "#22c55e",
    revision: "#f59e0b",
    mock: "#ef4444",
  };

  const getIcon = (name: string) => {
    switch (name.toLowerCase()) {
      case 'theory': return <BookOpen size={12} className="text-[#6366f1]" />;
      case 'mcq': return <HelpCircle size={12} className="text-[#22c55e]" />;
      case 'revision': return <RotateCcw size={12} className="text-[#f59e0b]" />;
      case 'mock': return <Monitor size={12} className="text-[#ef4444]" />;
      default: return <PieIcon size={12} />;
    }
  };

  const renderCustomLegend = (props: any) => {
    const { payload } = props;
    return (
      <div className="grid grid-cols-2 gap-3 mt-6">
        {payload.map((entry: any, index: number) => (
          <div key={`item-${index}`} className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/50 px-3 py-2 rounded-xl border border-slate-100 dark:border-slate-800">
            {getIcon(entry.value)}
            <div className="flex flex-col">
              <span className="text-[10px] font-black uppercase text-slate-500 tracking-tighter">{entry.value}</span>
              <span className="text-[9px] font-bold text-slate-400">{data[index]?.value || 0} Tasks</span>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="bg-white dark:bg-slate-900/50 p-6 rounded-4xl border border-slate-200 dark:border-slate-800">
      <div className="flex items-center gap-3 mb-6">
        <div className="size-10 bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center text-indigo-600">
           <PieIcon size={20} />
        </div>
        <div>
          <h3 className="text-sm font-black uppercase tracking-widest text-slate-800 dark:text-white">Study Distribution</h3>
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Your Focus Balance</p>
        </div>
      </div>

      <div className="h-[240px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={90}
              paddingAngle={5}
              dataKey="value"
              nameKey="name"
              stroke="none"
              animationBegin={0}
              animationDuration={1500}
            >
              {data.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={COLORS[entry.name.toLowerCase() as keyof typeof COLORS] || "#94a3b8"} 
                />
              ))}
            </Pie>
            <Tooltip 
              contentStyle={{ 
                backgroundColor: '#1e293b', 
                borderRadius: '12px', 
                border: 'none',
                color: '#fff',
                fontSize: '12px',
                fontWeight: 'bold'
              }}
              itemStyle={{ color: '#fff' }}
            />
            <Legend content={renderCustomLegend} verticalAlign="bottom" />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}