export const PieChart = ({percent, color, label}: {percent: number, color: string, bg: string, label: string}) => (
  <div className="flex flex-col items-center gap-4 group">
    <div className="relative p-3 size-[150px]">
      <svg className="size-full" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="40" fill="none" stroke={color} strokeWidth="12" />
        <circle cx="50" cy="50" r="40" fill="none" stroke={"#ffffff"} strokeWidth="12" strokeDasharray={`${percent * 2.51}, 251`} strokeLinecap="butt" transform="rotate(-90 50 50)" className="transition-all duration-1000 ease-out" />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center"><span className="text-[20px] font-black">{percent}%</span></div>
    </div>
  </div>
);