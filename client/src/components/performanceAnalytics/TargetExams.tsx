import { useSelector } from "react-redux";
import type { RootState } from "../../store";
import { useState } from "react";

export const TargetExams = () => {
  const [selectedExam, setSelectedExam] = useState<string>("");
  const { profile } = useSelector((state: RootState) => state.user) ?? null;
  const { examData } = useSelector(
    (state: RootState) => state.examSubject.e_data ?? null,
  );

  const targetedExams = examData.filter((el) =>
    profile.target_exams.includes(el.id),
  );
  return (
    <div
      className={`grid grid-cols-2 md:flex md:flex-wrap items-center justify-center gap-4 mb-12 max-w-2xl mx-auto`}
    >
      {targetedExams?.map((item: any, index: number) => (
        <button
          key={index}
          onClick={() => setSelectedExam(item.id)}
          className={`px-8 py-3 rounded-full font-black text-sm uppercase tracking-widest transition-all cursor-pointer shadow-sm border-2 ${selectedExam === item.id ? "bg-green-700 text-white border-green-700 shadow-green-200 shadow-lg scale-105" : "bg-surface text-green-800 border-green-100 hover:border-green-300 hover:bg-green-50"}`}
        >
          {item.name}
        </button>
      ))}
    </div>
  );
};
