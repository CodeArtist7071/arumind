import { PieChart, Pie, Tooltip, Cell, ResponsiveContainer, Legend } from "recharts";
import { BookOpen, HelpCircle, RotateCcw, Monitor, PieChart as PieIcon } from "lucide-react";

interface Props {
  data: { name: string; value: number }[];
}

export default function WeeklyPieChart({ data }: Props) {
  const COLORS = {
    theory: "var(--primary)",
    mcq: "var(--primary-container)",
    revision: "#84cc16",
    mock: "var(--tertiary)",
  };

  const getIcon = (name: string) => {
    switch (name.toLowerCase()) {
      case 'theory': return <BookOpen size={16} className="text-primary" />;
      case 'mcq': return <HelpCircle size={16} className="text-primary-container" />;
      case 'revision': return <RotateCcw size={16} className="text-[#84cc16]" />;
      case 'mock': return <Monitor size={16} className="text-tertiary" />;
      default: return <PieIcon size={16} />;
    }
  };

  const renderCustomLegend = (props: any) => {
    const { payload } = props;
    return (
      <div className="grid grid-cols-2 gap-4 mt-8">
        {payload.map((entry: any, index: number) => (
          <div key={`item-${index}`} className="flex items-center gap-3 bg-white/40 px-4 py-3 rounded-2xl shadow-sm hover:bg-white transition-all duration-300 group">
            <div className="opacity-60 group-hover:opacity-100 transition-opacity">
              {getIcon(entry.value)}
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-technical font-black uppercase text-on-surface-variant tracking-widest opacity-40">{entry.value}</span>
              <span className="text-[11px] font-technical font-black text-on-surface tracking-tighter">
                {data[index]?.value || 0} <span className="opacity-30">TASKS</span>
              </span>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="bg-surface-container-low p-8 rounded-[2.5rem] shadow-ambient">
      <div className="flex items-center gap-4 mb-10 px-2">
        <div className="size-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary shadow-sm">
           <PieIcon size={24} />
        </div>
        <div>
          <h3 className="text-[11px] font-technical font-black uppercase tracking-[0.4em] text-on-surface-variant opacity-60">Focus Distribution</h3>
          <p className="text-xl font-black text-on-surface tracking-tighter mt-1">Syllabus Balance</p>
        </div>
      </div>

      <div className="h-[280px] w-full relative">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={70}
              outerRadius={100}
              paddingAngle={8}
              dataKey="value"
              nameKey="name"
              stroke="none"
              animationBegin={0}
              animationDuration={2000}
            >
              {data.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={COLORS[entry.name.toLowerCase() as keyof typeof COLORS] || "var(--surface-container-highest)"} 
                  className="hover:opacity-80 transition-opacity cursor-pointer"
                />
              ))}
            </Pie>
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'var(--on-surface)', 
                borderRadius: '24px', 
                border: 'none',
                color: 'var(--surface)',
                fontSize: '10px',
                fontWeight: '900',
                padding: '12px 20px',
                fontFamily: 'Space Grotesk'
              }}
              itemStyle={{ color: 'var(--primary-container)' }}
            />
            <Legend content={renderCustomLegend} verticalAlign="bottom" />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-x-0 top-[35%] flex flex-col items-center justify-center pointer-events-none">
           <PieIcon size={32} className="text-on-surface opacity-[0.03]" />
        </div>
      </div>
    </div>
  );
}
