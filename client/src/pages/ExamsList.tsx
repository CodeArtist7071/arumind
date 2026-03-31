import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import type { AppDispatch, RootState } from "../store";
import { ArrowLeftCircle, Book } from "lucide-react";
import { useNavigate } from "react-router";
import { fetchBoardExams } from "../slice/examBoardSlice";
import { supabase } from "../utils/supabase";

export const ExamsList = () => {
  const [filteredExams, setFilteredExams] = useState([]);
  const [selectedBoardId, setSelectedBoardId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const dispatch = useDispatch<AppDispatch>();
  const { examData } = useSelector(
    (state: RootState) => state.examBoards ?? { examData: [] },
  );

  const navigate = useNavigate();

  useEffect(() => {
    dispatch(fetchBoardExams());
  }, []);

  // Once examData loads, auto-select the first board as default
  useEffect(() => {
    if (examData?.length > 0 && selectedBoardId === null) {
      const defaultBoard = examData[0];
      setSelectedBoardId(defaultBoard.id);
      fetchExamsForBoard(defaultBoard.id);
    }
  }, [examData]);

  async function fetchExamsForBoard(id: string) {
    setLoading(true);
    const { data, error } = await supabase
      .from("exams")
      .select()
      .eq("exam_board_id", id)
      .eq("is_active", true)
      .order("name");

    if (!error) setFilteredExams(data ?? []);
    setLoading(false);
  }

  function handleSelectBoard(id: string) {
    if (id === selectedBoardId) return; // already selected
    setSelectedBoardId(id);
    fetchExamsForBoard(id);
  }

  return (
    <div className="space-y-12 pb-20 animate-reveal">
      {/* Editorial Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-16 border-b border-outline-variant/30 pb-12">
        <div className="flex items-center gap-8">
           <button
             type="button"
             onClick={() => navigate(-1)}
             className="size-12 flex items-center justify-center bg-surface-container-high hover:bg-surface-dim rounded-full transition-all duration-500 cursor-pointer group hover:scale-110 active:scale-95 shadow-sm shadow-black/5"
           >
             <ArrowLeftCircle className="size-6 text-on-surface-variant group-hover:text-primary transition-colors" />
           </button>
           
           <div className="flex flex-col">
              <span className="text-[10px] font-technical font-black text-on-surface-variant/40 uppercase tracking-[0.4em] mb-2">Registry Access</span>
              <h1 className="text-5xl lg:text-7xl font-black tracking-tighter text-on-surface leading-none">Exam Library.</h1>
           </div>
        </div>

        <div className="flex flex-col md:items-end">
           <p className="text-sm font-medium text-on-surface-variant max-w-xs md:text-right leading-relaxed opacity-70">
              Select your targeted syllabus from our curated botanical records.
           </p>
        </div>
      </div>

      {/* Board Selector: Tactical Pods */}
      <div className="space-y-4">
        <span className="text-[10px] font-technical font-black text-primary uppercase tracking-[0.2em] opacity-40">Classification</span>
        <div className="flex flex-wrap gap-4">
          {examData?.map((el) => {
            const isSelected = el.id === selectedBoardId;
            return (
              <button
                key={el.id}
                onClick={() => handleSelectBoard(el.id)}
                className={`px-8 py-3 rounded-full cursor-pointer transition-all duration-500 font-technical font-black text-[10px] uppercase tracking-widest
                  ${
                    isSelected
                      ? "bg-linear-to-r from-primary to-primary-container text-white shadow-ambient scale-105"
                      : "bg-surface-container-low text-on-surface-variant/60 hover:bg-surface-container-high hover:text-on-surface hover:scale-102"
                  }`}
              >
                {el.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Exams Grid: Botanical Registry */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-40 animate-pulse">
           <p className="text-sm font-technical font-black text-primary uppercase tracking-[0.4em]">Restoring Records...</p>
        </div>
      ) : filteredExams.length === 0 ? (
        <div className="bg-surface-container-low rounded-4xl p-20 text-center shadow-inner">
           <p className="text-xs font-technical font-black text-on-surface-variant/40 uppercase tracking-[0.2em]">Zero Records Found for this Pod.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
          {filteredExams.map((exam, index) => (
            <div
              key={exam.id ?? index}
              className="group p-10 bg-surface-container-low rounded-4xl shadow-ambient hover-bloom cursor-pointer relative overflow-hidden"
              onClick={() => {}}
            >
              <div className="relative z-10">
                <div className="size-16 bg-primary/10 rounded-2xl flex items-center justify-center text-primary mb-8 group-hover:bg-linear-to-r group-hover:from-primary group-hover:to-primary-container group-hover:text-white transition-all duration-700 ease-botanical shadow-sm group-hover:rotate-3">
                  <Book className="size-8" />
                </div>

                <div className="space-y-4">
                  <div>
                    <h3 className="text-2xl font-black text-on-surface tracking-tight group-hover:text-primary transition-colors leading-none mb-2">
                       {exam.name}
                    </h3>
                    <p className="text-xs font-medium text-on-surface-variant/60 leading-relaxed truncate">
                       {exam.full_name}
                    </p>
                  </div>

                  <div className="pt-8 border-t border-outline-variant/30 mt-6">
                    <div className="flex items-center justify-between">
                       <div className="flex flex-col">
                          <p className="text-[8px] font-technical font-black text-on-surface-variant/40 uppercase tracking-[0.3em] mb-1">
                            Syllabus Type
                          </p>
                          <p className="text-[10px] font-technical font-black text-primary uppercase tracking-widest">
                            {exam.type}
                          </p>
                       </div>
                       
                       <div className="size-8 rounded-full bg-surface-container-high flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                          <span className="material-symbols-outlined text-on-surface-variant text-sm group-hover:text-primary">arrow_forward</span>
                       </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Decorative Corner Element */}
              <div className="absolute -right-4 -bottom-4 size-32 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/20 transition-all duration-1000" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
