import React, { useState, useEffect } from "react";
import { X, Search, PlusCircle, HelpCircle, Loader2 } from "lucide-react";
import { supabase } from "../../utils/supabase";
import { AdminTable } from "./AdminTable";

interface QuestionDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  chapterId: string | null;
  chapterName: string;
}

/**
 * Question Drawer Manifestation.
 * A slide-over orchestration layer for managing questions within a specific chapter manifestation.
 */
export const QuestionDrawer: React.FC<QuestionDrawerProps> = ({
  isOpen,
  onClose,
  chapterId,
  chapterName,
}) => {
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const fetchQuestions = async () => {
      if (!chapterId || !isOpen) return;
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("questions")
          .select("*")
          .eq("chapter_id", chapterId)
          .order("question_number", { ascending: true });

        if (error) throw error;
        setQuestions(data || []);
      } catch (err) {
        console.error("Failed to fetch questions:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchQuestions();
  }, [chapterId, isOpen]);

  const filteredQuestions = questions.filter((q) =>
    q.question.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const columns = [
    {
      header: "Question",
      key: "question",
      render: (val: string) => (
        <span className="text-xs font-medium line-clamp-2" title={val}>
          {val}
        </span>
      ),
    },
    {
      header: "Ans",
      key: "correct_answer",
      render: (val: string) => (
        <span className="text-[10px] font-black text-[#16a34a] bg-[#16a34a]/10 px-2 py-0.5 rounded">
          {val}
        </span>
      ),
    },
    {
      header: "Difficulty",
      key: "difficulty",
      render: (val: string) => (
        <span className="text-[9px] uppercase font-black tracking-widest opacity-60">
          {val || "MEDIUM"}
        </span>
      ),
    },
  ];

  return (
    <>
      {/* Backdrop Backdrop Overlay */}
      <div
        className={`fixed inset-0 bg-slate-950/20 z-60 transition-opacity duration-500 ${
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
      />

      {/* Slide-over Drawer Layer */}
      <aside
        className={`fixed inset-y-0 right-0 z-70 w-full max-w-2xl bg-white dark:bg-slate-900 shadow-2xl transition-transform duration-700 ease-botanical transform ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="h-full flex flex-col p-8 lg:p-12">
          {/* Header Manifestation */}
          <header className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-[#16a34a]/10 rounded-2xl text-[#16a34a]">
                <HelpCircle size={28} />
              </div>
              <div>
                <h3 className="text-3xl font-bold tracking-tighter text-slate-800 dark:text-slate-100">
                  {chapterName}
                </h3>
                <p className="text-[10px] text-[#16a34a] uppercase font-black tracking-[0.2em] mt-1">
                  Question Orchestration Layer
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-3 text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-all"
            >
              <X size={24} />
            </button>
          </header>

          {/* Search & Actions Bar */}
          <div className="flex items-center gap-4 mb-8">
            <div className="flex-1 relative group">
              <Search
                size={18}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#16a34a] transition-colors"
              />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search question manifestations..."
                className="w-full bg-slate-50 dark:bg-slate-800/50 rounded-xl pl-12 pr-6 py-4 text-sm font-medium border border-slate-100 dark:border-slate-800 focus:ring-2 focus:ring-[#16a34a] focus:bg-white outline-none transition-all"
              />
            </div>
            <button className="flex items-center gap-2 px-6 py-4 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-[#16a34a]/10 hover:text-[#16a34a] transition-all">
              <PlusCircle size={16} />
              Inject Question
            </button>
          </div>

          {/* Data Table */}
          <div className="flex-1 overflow-hidden relative">
            {loading ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-on-surface-variant animate-pulse">
                <Loader2 className="animate-spin mb-4 text-[#16a34a]" size={32} />
                <span className="text-[10px] font-black uppercase tracking-widest text-[#16a34a]/60">
                  Accessing Repository...
                </span>
              </div>
            ) : (
              <div className="h-full overflow-y-auto custom-scrollbar pr-2">
                <AdminTable
                  columns={columns}
                  data={filteredQuestions}
                  onEdit={(item) => console.log("Edit question", item)}
                  onDelete={(id) => console.log("Delete question", id)}
                />
              </div>
            )}
          </div>

          {/* Footer Metadata */}
          <footer className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800/50 flex items-center justify-between opacity-40">
            <span className="text-[9px] font-bold uppercase tracking-[0.2em]">
              OPrep Assessment Engine v1.0
            </span>
            <span className="text-[9px] font-bold uppercase tracking-[0.2em]">
              Artifact ID: {chapterId?.split("-")[0]}
            </span>
          </footer>
        </div>
      </aside>
    </>
  );
};
