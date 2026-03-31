import { Clock } from "lucide-react";

export const TimePicker = ({ label, value, onChange, error }: { label: string; value: string; onChange: (val: string) => void; error?: string; }) => {
    const [h24, m] = (value || "09:00").split(":");
    let hNum = parseInt(h24);
    const ampm = hNum >= 12 ? "PM" : "AM";
    const h12 = hNum % 12 || 12;

    const handleHChange = (newH12: string) => {
        let nh = parseInt(newH12);
        if (ampm === "PM" && nh < 12) nh += 12;
        if (ampm === "AM" && nh === 12) nh = 0;
        onChange(`${nh.toString().padStart(2, "0")}:${m}`);
    };

    const handleMChange = (newM: string) => { onChange(`${h24}:${newM.padStart(2, "0")}`); };
    const handleAMPMChange = (newAMPM: string) => {
        if (newAMPM === ampm) return;
        let nh = hNum;
        if (newAMPM === "PM" && hNum < 12) nh += 12;
        if (newAMPM === "AM" && hNum >= 12) nh -= 12;
        onChange(`${nh.toString().padStart(2, "0")}:${m}`);
    };

    const hours = Array.from({ length: 12 }, (_, i) => (i + 1).toString());

    return (
        <div className="space-y-1.5 flex-1">
            <label className="text-[10px] font-black uppercase text-green-700 flex items-center gap-1.5 ml-1"><Clock size={10} /> {label}</label>
            <div className={`flex items-center gap-1 p-1 bg-surface-container-low border rounded-xl transition-all ${error ? "border-red-300 ring-2 ring-red-50" : "border-slate-200 focus-within:ring-2 focus-within:ring-green-100 focus-within:border-green-300"}`}>
                <select value={h12.toString()} onChange={(e) => handleHChange(e.target.value)} className="bg-transparent text-sm font-bold text-slate-700 outline-none px-1 py-1 cursor-pointer">
                    {hours.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
                <span className="text-slate-400 font-bold">:</span>
                <select value={m} onChange={(e) => handleMChange(e.target.value)} className="bg-transparent text-sm font-bold text-slate-700 outline-none px-1 py-1 cursor-pointer">
                    {Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, "0")).map(min => (
                        <option key={min} value={min}>{min}</option>
                    ))}
                </select>
                <div className="flex ml-auto bg-surface  rounded-lg p-0.5 shadow-sm">
                    {["AM", "PM"].map(type => (
                        <button key={type} type="button" onClick={() => handleAMPMChange(type)} className={`px-2 py-1 rounded-md text-[9px] font-black transition-all ${ampm === type ? "bg-green-600 text-white shadow-sm" : "text-slate-400 hover:text-slate-600"}`}>{type}</button>
                    ))}
                </div>
            </div>
            {error && <p className="text-[9px] font-bold text-red-500 pl-1">{error}</p>}
        </div>
    );
};