import React, { useState, useEffect } from 'react';
import { Search, ChevronRight, Book, BookOpen, Layers, Plus, CheckCircle2, X, Clock, Calendar } from 'lucide-react';
import { useGoogleCalendar } from '../../utils/useGoogleCalender';
import { getChaptersByExamID } from '../../services/examService';

interface Chapter {
  id: string;
  name: string;
  subjects: {
    id: string;
    name: string;
  };
}

interface MasterySelectorProps {
  examId: string;
  onAdd: (chapter: Chapter, date: string, startTime: string, endTime: string, syncToCalendar: boolean) => void;
  existingIds: string[];
  onRequestConnection?: () => void;
}

// ── Friendly Time Picker (Re-shared logic) ───────────────────────────────────
const FriendlyTimePicker = ({ 
  label, 
  value, 
  onChange, 
  error 
}: { 
  label: string; 
  value: string; 
  onChange: (val: string) => void; 
  error?: string;
}) => {
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

  const handleMChange = (newM: string) => {
    onChange(`${h24}:${newM.padStart(2, "0")}`);
  };

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
      <label className="text-[10px] font-black uppercase text-blue-700 flex items-center gap-1.5">
        <Clock size={10} /> {label}
      </label>
      <div className={`flex items-center gap-1 p-1 bg-white border rounded-xl transition-all ${error ? "border-red-300 ring-2 ring-red-50" : "border-slate-200 focus-within:ring-2 focus-within:ring-blue-100 focus-within:border-blue-300"}`}>
        <select 
          value={h12.toString()} 
          onChange={(e) => handleHChange(e.target.value)}
          className="bg-transparent text-sm font-bold text-slate-700 outline-none px-1 py-1 cursor-pointer"
        >
          {hours.map(h => <option key={h} value={h}>{h}</option>)}
        </select>
        <span className="text-slate-400 font-bold">:</span>
        <select 
          value={m} 
          onChange={(e) => handleMChange(e.target.value)}
          className="bg-transparent text-sm font-bold text-slate-700 outline-none px-1 py-1 cursor-pointer"
        >
          {Array.from({length: 60}, (_, i) => i.toString().padStart(2, "0")).map(min => (
             <option key={min} value={min}>{min}</option>
          ))}
        </select>
        <div className="flex ml-auto bg-slate-50 border border-slate-100 rounded-lg p-0.5 shadow-sm">
          {["AM", "PM"].map(type => (
            <button
              key={type}
              type="button"
              onClick={() => handleAMPMChange(type)}
              className={`px-2 py-1 rounded-md text-[9px] font-black transition-all ${ampm === type ? "bg-blue-600 text-white shadow-sm" : "text-slate-400 hover:text-slate-600"}`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>
      {error && <p className="text-[9px] font-bold text-red-500 pl-1">{error}</p>}
    </div>
  );
};

export default function MasterySelector({ examId, onAdd, existingIds, onRequestConnection }: MasterySelectorProps) {
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedChapter, setSelectedChapter] = useState<Chapter | null>(null);
  const [testDate, setTestDate] = useState(new Date().toISOString().split('T')[0]);
  const [testStartTime, setTestStartTime] = useState("09:00");
  const [testEndTime, setTestEndTime] = useState("10:00");
  const [error, setError] = useState("");
  const { connected } = useGoogleCalendar();
  const [syncToCalendar, setSyncToCalendar] = useState(connected);

  useEffect(() => {
    setSyncToCalendar(connected);
  }, [connected]);

  useEffect(() => {
    const fetchChapters = async () => {
      try {
        setLoading(true);
        const data = await getChaptersByExamID(examId);
        // data comes back with nested subjects
        setChapters(data as any);
      } catch (err) {
        console.error("Error fetching chapters for selector:", err);
      } finally {
        setLoading(false);
      }
    };
    if (examId) fetchChapters();
  }, [examId]);

  const filtered = chapters.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.subjects?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const grouped = filtered.reduce((acc, cur) => {
    const subName = cur.subjects?.name || "Other";
    if (!acc[subName]) acc[subName] = [];
    acc[subName].push(cur);
    return acc;
  }, {} as Record<string, Chapter[]>);

  return (
    <div className="flex flex-col h-full max-h-150 overflow-hidden">
      <div className="p-6 border-b border-slate-100 dark:border-slate-800">
        <h3 className="text-xl font-black tracking-tight mb-4">Add Syllabus Mastery</h3>
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search chapters or subjects..."
            className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl text-sm outline-none focus:ring-2 ring-[#1a57db]/30 transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="size-10 border-4 border-[#1a57db] border-t-transparent rounded-full animate-spin" />
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Loading Syllabus...</p>
          </div>
        ) : selectedChapter ? (
           /* Scheduling Screen */
           <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div className="flex items-center gap-4 p-4 bg-blue-50 rounded-2xl border border-blue-100">
                 <div className="size-12 bg-white rounded-xl flex items-center justify-center text-[#1a57db] shadow-sm">
                    <BookOpen size={24} />
                 </div>
                 <div>
                    <p className="text-[10px] font-black uppercase text-blue-400 tracking-widest">Scheduling Test For</p>
                    <h4 className="text-lg font-black text-slate-800 leading-tight">{selectedChapter.name}</h4>
                 </div>
              </div>

               <div className="space-y-4">
                  <div className="space-y-2">
                     <label className="text-[10px] font-black uppercase text-slate-400 pl-1">Test Date</label>
                     <input 
                       type="date" 
                       value={testDate}
                       onChange={(e) => { setTestDate(e.target.value); setError(""); }}
                       className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm font-bold outline-none focus:ring-2 ring-blue-500/30 transition-all"
                     />
                  </div>
                  
                  <div className="flex gap-4">
                     <FriendlyTimePicker 
                       label="Start Time" 
                       value={testStartTime} 
                       onChange={(v) => { setTestStartTime(v); setError(""); }}
                     />
                     <FriendlyTimePicker 
                       label="End Time" 
                       value={testEndTime} 
                       onChange={(v) => { setTestEndTime(v); setError(""); }}
                     />
                  </div>
                  {error && <p className="text-xs font-bold text-red-500 text-center">{error}</p>}

                   {/* Sync Toggle */}
                   <div className="flex items-center justify-between p-4 bg-blue-50/50 rounded-2xl border border-blue-100/50">
                      <div className="flex items-center gap-2.5">
                        <div className={`p-2 rounded-lg ${connected ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-400'}`}>
                          <Calendar size={16} />
                        </div>
                        <div>
                           <p className="text-xs font-black text-slate-700">Google Calendar Sync</p>
                           <p className="text-[10px] text-slate-500 font-medium">
                             {connected ? "Enabled for this test" : "Connect calendar to enable"}
                           </p>
                        </div>
                      </div>
                      
                      {connected ? (
                         <label className="relative inline-flex items-center cursor-pointer">
                            <input 
                              type="checkbox" 
                              checked={syncToCalendar}
                              onChange={(e) => setSyncToCalendar(e.target.checked)}
                              className="sr-only peer" 
                            />
                            <div className="w-11 h-6 rounded-full peer transition-all bg-slate-200 peer-checked:bg-green-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full">
                            </div>
                         </label>
                      ) : (
                         <div className="relative inline-flex items-center cursor-pointer" onClick={() => onRequestConnection && onRequestConnection()}>
                            <div className="w-11 h-6 rounded-full transition-all bg-slate-200 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all">
                            </div>
                         </div>
                      )}
                   </div>
               </div>

              <div className="flex gap-3 pt-4">
                 <button 
                   onClick={() => setSelectedChapter(null)}
                   className="flex-1 px-6 py-4 rounded-2xl border-2 border-slate-100 text-slate-400 font-black uppercase tracking-widest text-xs hover:bg-slate-50 transition-colors"
                 >
                    Back
                 </button>
                  <button 
                    onClick={() => {
                        if (testEndTime <= testStartTime) {
                          setError("End time must be after start time");
                          return;
                        }
                        onAdd(selectedChapter, testDate, testStartTime, testEndTime, syncToCalendar);
                    }}
                    className="flex-2 px-6 py-4 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-widest text-xs shadow-lg shadow-blue-500/30 transition-all active:scale-95"
                  >
                     Confirm Schedule
                  </button>
              </div>
           </div>
        ) : Object.keys(grouped).length === 0 ? (
          <div className="text-center py-20 text-slate-400 font-bold uppercase text-[10px] tracking-widest">
            No Chapters Found
          </div>
        ) : (
          Object.entries(grouped).map(([subject, subChapters]) => (
            <div key={subject} className="space-y-3">
              <div className="flex items-center gap-2 px-1">
                <Book className="size-3 text-[#1a57db]" />
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">{subject}</span>
              </div>
              <div className="grid gap-2">
                {subChapters.map(chapter => {
                  const isAdded = existingIds.includes(chapter.id);
                  return (
                    <div key={chapter.id} className={`flex justify-between items-center ${isAdded ? 'bg-slate-50' : 'bg-slate-200 dark:bg-slate-900'} rounded-xl p-4`}>
                      <div className="flex items-center gap-4 text-left">
                        <div className={`size-8 rounded-lg flex items-center justify-center ${isAdded ? 'bg-slate-200 text-slate-400' : 'bg-white dark:bg-slate-900 text-[#1a57db] shadow-sm'}`}>
                          {isAdded ? <CheckCircle2 size={16} /> : <BookOpen size={16} />}
                        </div>
                      </div>
                      <div className='w-full '>
                        <span className="text-sm ml-4 font-bold text-slate-900 dark:text-white line-clamp-1">{chapter.name}</span>
                      </div>
                      <div
                        onClick={() => !isAdded && setSelectedChapter(chapter)}
                        className={`flex items-center cursor-pointer h-10 w-12 transition-all ${isAdded ? 'items-center justify-center text-slate-400' : 'bg-blue-600 hover:bg-blue-700 rounded-full justify-center shadow-md'}`}
                      >
                        {isAdded ? <CheckCircle2 size={25} /> : <Plus color='white' size={16} />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
