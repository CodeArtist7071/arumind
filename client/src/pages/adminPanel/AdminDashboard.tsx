import React from "react";
import { LayoutDashboard, Users, School, BookOpen, HelpCircle } from "lucide-react";
import { useSelector } from "react-redux";
import type { RootState } from "../../store";

const AdminDashboard: React.FC = () => {
  const { profile } = useSelector((state: RootState) => state.user);

  return (
    <div className="p-10 space-y-10 animate-in fade-in duration-1000">
      <header>
        <h2 className="text-4xl font-bold tracking-tight text-slate-800 dark:text-slate-100 italic">
          OPrep Control Center
        </h2>
        <p className="text-[10px] text-[#16a34a] uppercase font-black tracking-[0.3em] mt-2">
          Hello, {profile?.email || "Administrator"} — Viewing platform telemetry
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total Students" value="1,245" icon={<Users size={20}/>} change="+12%" />
        <StatCard title="Active Exams" value="8" icon={<School size={20}/>} />
        <StatCard title="Total Chapters" value="317" icon={<BookOpen size={20}/>} />
        <StatCard title="Questions Live" value="8,450" icon={<HelpCircle size={20}/>} change="Syncing..." />
      </div>

      <div className="bg-surface/50 dark:bg-slate-900/50 backdrop-blur-xl p-10 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl">
        <h3 className="text-sm font-black uppercase tracking-widest text-[#16a34a] mb-6">Manifestation Status</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between py-3 border-b border-slate-100 dark:border-slate-800/50">
            <span className="text-sm text-slate-600 dark:text-slate-400">Database Sync Status</span>
            <span className="text-xs font-black uppercase text-emerald-500">OPERATIONAL</span>
          </div>
          <div className="flex items-center justify-between py-3 border-b border-slate-100 dark:border-slate-800/50">
            <span className="text-sm text-slate-600 dark:text-slate-400">Admin Privileges</span>
            <span className="text-xs font-black uppercase text-emerald-500">ROOT LEVEL ACCESS</span>
          </div>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ title, value, icon, change }: any) => (
  <div className="bg-white/80 dark:bg-slate-900/50 backdrop-blur-xl p-8 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all">
    <div className="flex items-center justify-between mb-4">
      <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl text-[#16a34a]">
        {icon}
      </div>
      {change && <span className="text-[10px] font-black text-emerald-500">{change}</span>}
    </div>
    <p className="text-[10px] uppercase font-black tracking-widest text-slate-400 mb-1">{title}</p>
    <h3 className="text-3xl font-bold text-slate-800 dark:text-slate-100 italic">{value}</h3>
  </div>
);

export default AdminDashboard;
