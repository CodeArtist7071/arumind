import React, { useState, useEffect } from "react";
import { X, Info, Gauge, ListOrdered, Clock, ChevronRight, CheckCircle2 } from "lucide-react";
import { supabase } from "../../utils/supabase";

interface MockTestPreferencesProps {
  isOpen: boolean;
  onClose: () => void;
  examId: string;
  examName: string;
  onStart: (preferences: {
    difficulty: "Easy" | "Moderate" | "Hard";
    questionCount: number;
    timeLimit: number; // minutes
  }) => void;
}

export const MockTestPreferences = ({
  isOpen,
  onClose,
  examId,
  examName,
  onStart
}: MockTestPreferencesProps) => {
  const [instructions, setInstructions] = useState<string>("");
  const [hasRead, setHasRead] = useState(false);
  const [difficulty, setDifficulty] = useState<"Easy" | "Moderate" | "Hard">("Moderate");
  const [count, setCount] = useState(30);
  const [time, setTime] = useState(30);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen && examId) {
      const fetchInstructions = async () => {
        setLoading(true);
        const { data } = await supabase
          .from("exam_instructions")
          .select("instructions")
          .eq("exam_id", examId)
          .single();
        
        setInstructions(data?.instructions || "No specific instructions provided for this exam. Please ensure you have a stable internet connection.");
        setLoading(false);
      };
      fetchInstructions();
    }
  }, [isOpen, examId]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-[2.5rem] shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-300">
        
        {/* Header */}
        <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-linear-to-r from-slate-50 to-white dark:from-slate-800/50 dark:to-slate-900">
          <div className="flex items-center gap-4">
            <div className="size-12 bg-[#1a57db]/10 rounded-2xl flex items-center justify-center">
              <Gauge className="text-[#1a57db] size-6" />
            </div>
            <div>
              <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">{examName}</h2>
              <p className="text-slate-500 text-sm font-medium">Configure your mock test session</p>
            </div>
          </div>
          <button onClick={onClose} className="p-3 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl text-slate-400 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
          
          {/* Instructions Box */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold">
              <Info size={18} className="text-[#1a57db]" />
              <h3>Exam Instructions</h3>
            </div>
            <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-3xl border border-slate-100 dark:border-slate-700/50">
              {loading ? (
                <div className="h-20 flex items-center justify-center">
                  <div className="size-6 border-2 border-[#1a57db] border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">
                  {instructions}
                </p>
              )}
            </div>
            <label className="flex items-center gap-3 cursor-pointer group">
              <input 
                type="checkbox" 
                checked={hasRead}
                onChange={(e) => setHasRead(e.target.checked)}
                className="size-5 rounded border-slate-300 text-[#1a57db] focus:ring-[#1a57db] transition-all"
              />
              <span className="text-sm font-bold text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
                I have read and understood all instructions properly.
              </span>
            </label>
          </section>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Difficulty */}
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-sm font-black uppercase tracking-wider text-slate-400">
                <Gauge size={14} /> Difficulty
              </label>
              <select 
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as any)}
                className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl p-4 font-bold focus:border-[#1a57db] outline-hidden transition-all"
              >
                <option value="Easy">Easy (60% Seen)</option>
                <option value="Moderate">Moderate (40% Seen)</option>
                <option value="Hard">Hard (20% Seen)</option>
              </select>
            </div>

            {/* Question Count */}
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-sm font-black uppercase tracking-wider text-slate-400">
                <ListOrdered size={14} /> Questions
              </label>
              <input 
                type="number"
                value={count}
                onChange={(e) => setCount(parseInt(e.target.value))}
                min={10}
                max={100}
                className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl p-4 font-bold focus:border-[#1a57db] outline-hidden transition-all"
              />
            </div>

            {/* Time Limit */}
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-sm font-black uppercase tracking-wider text-slate-400">
                <Clock size={14} /> Time (Mins)
              </label>
              <input 
                type="number"
                value={time}
                onChange={(e) => setTime(parseInt(e.target.value))}
                min={5}
                max={180}
                className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl p-4 font-bold focus:border-[#1a57db] outline-hidden transition-all"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-8 bg-slate-50 dark:bg-slate-800/30 border-t border-slate-100 dark:border-slate-800">
          <button
            disabled={!hasRead}
            onClick={() => onStart({ difficulty, questionCount: count, timeLimit: time })}
            className={`w-full py-5 rounded-[2rem] font-black text-lg flex items-center justify-center gap-3 transition-all duration-300 shadow-xl ${
              hasRead 
                ? 'bg-[#1a57db] text-white hover:bg-[#1a57db]/90 hover:scale-[1.02] shadow-[#1a57db]/20' 
                : 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
            }`}
          >
            Start Practice Test
            <ChevronRight size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};
