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
    <>
      <div className="mb-10 cursor-pointer">
        <ArrowLeftCircle onClick={() => navigate(-1)} size={30} />
      </div>

      <div className="grid">
        <span className="text-3xl font-bold mb-5">Select Exams..</span>
        <span className="text-xl mb-4">Please Add Exams to your Lists...</span>
      </div>

      {/* Board selector tabs */}
      <div className="flex flex-wrap gap-3 mb-10">
        {examData?.map((el) => {
          const isSelected = el.id === selectedBoardId;
          return (
            <span
              key={el.id}
              onClick={() => handleSelectBoard(el.id)}
              className={`px-6 py-2 rounded-full border cursor-pointer transition-all duration-200 font-medium text-sm
                ${
                  isSelected
                    ? "bg-[#1a57db] text-white border-[#1a57db] shadow-md"
                    : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-[#1a57db] hover:text-[#1a57db]"
                }`}
            >
              {el.name}
            </span>
          );
        })}
      </div>

      {/* Exams grid */}
      {loading ? (
        <div className="text-slate-400 text-sm">Loading exams...</div>
      ) : filteredExams.length === 0 ? (
        <div className="text-slate-400 text-sm">No exams found for this board.</div>
      ) : (
        <div className="grid sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredExams.map((exam, index) => (
            <div
              key={exam.id ?? index}
              className="p-6 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm hover:border-[#1a57db] hover:shadow-xl transition-all duration-300 group cursor-pointer"
              onClick={() => {}}
            >
              <div className="w-10 h-10 bg-gradient-to-r from-[#1a57db]/10 to-[#1a57db]/20 rounded-lg flex items-center justify-center text-[#1a57db] mb-4 group-hover:bg-gradient-to-r group-hover:from-[#1a57db] group-hover:to-blue-600 group-hover:text-white transition-all duration-300">
                <Book />
              </div>
              <h3 className="font-black text-lg mb-1">{exam.name}</h3>
              <p className="text-xs text-slate-500 mb-4">{exam.full_name}</p>
              <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                <p className="text-[10px] text-slate-400 font-bold uppercase mb-2 tracking-wider">
                  Exam Type
                </p>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">
                  {exam.type}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
};