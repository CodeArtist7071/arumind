import React, { useState, useEffect } from 'react';
import { Search, ChevronRight, Book, BookOpen, Layers, Plus, CheckCircle2 } from 'lucide-react';
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
  onAdd: (chapter: Chapter) => void;
  existingIds: string[];
}

export default function MasterySelector({ examId, onAdd, existingIds }: MasterySelectorProps) {
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

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
                    <button
                      key={chapter.id}
                      disabled={isAdded}
                      onClick={() => onAdd(chapter)}
                      className={`flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-transparent transition-all group ${isAdded ? 'opacity-50 grayscale' : 'hover:border-[#1a57db]/30 hover:bg-white dark:hover:bg-slate-800'}`}
                    >
                      <div className="flex items-center gap-4 text-left">
                        <div className={`size-8 rounded-lg flex items-center justify-center ${isAdded ? 'bg-slate-200 text-slate-400' : 'bg-white dark:bg-slate-900 text-[#1a57db] shadow-sm'}`}>
                          {isAdded ? <CheckCircle2 size={16} /> : <BookOpen size={16} />}
                        </div>
                        <span className="text-sm font-bold text-slate-900 dark:text-white line-clamp-1">{chapter.name}</span>
                      </div>
                      <Plus size={18} className={`text-[#1a57db] transition-transform ${isAdded ? 'hidden' : 'group-hover:rotate-90 group-hover:scale-125'}`} />
                    </button>
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
