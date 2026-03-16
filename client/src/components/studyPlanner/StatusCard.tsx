export default function StatusCard({ title, value, extra }) {
  return (
    <div className="flex-1 min-w-[140px] bg-white dark:bg-slate-900 rounded-xl p-4 shadow-sm border border-slate-200 dark:border-slate-800">
      <p className="text-slate-500 text-xs font-bold uppercase mb-1">
        {title}
      </p>

      <div className="flex items-end gap-2">
        <span className="text-2xl font-black">{value}</span>
        <span className="text-emerald-500 text-sm font-bold">{extra}</span>
      </div>
    </div>
  );
}