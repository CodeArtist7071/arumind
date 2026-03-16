import React, { useEffect } from "react";
import { useSelector } from "react-redux";
import type { RootState } from "../../store";
import { getExamsById } from "../../services/examService";
import { Book } from "lucide-react";
import { useNavigate } from "react-router";

export const ExamsPlanning = () => {
  const { profile } = useSelector((state: RootState) => state.user ?? null);
  const { examData } = useSelector((state: RootState) => state.exams ?? null);
  const navigate = useNavigate();
  console.log("profiles", examData);

  const filteredExams = examData.filter((exam) =>
    profile.target_exams.includes(exam.id),
  );



  function handleButton(id:string){
   navigate(`/user/plan-study/${id}`)
  }

  return (
    <>
      <h2 className="text-4xl font-bold mt-10 mb-5">Please Select your Exams</h2>
      <h3 className="mb-5">Select for which you want to create study planner..</h3>
      <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {filteredExams.map((el, i) => (
          <div
            key={i}
            className="p-6 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm hover:border-[#1a57db] hover:shadow-xl transition-all duration-300 group cursor-pointer"
            onClick={() =>handleButton(el.id)}
          >
            <div className="w-10 h-10 bg-linear-to-r from-[#1a57db]/10 to-[#1a57db]/20 rounded-lg flex items-center justify-center text-[#1a57db] mb-4 group-hover:bg-gradient-to-r group-hover:from-[#1a57db] group-hover:to-blue-600 group-hover:text-white transition-all duration-300">
              <Book />
            </div>
            <h3 className="font-black text-lg mb-1">{el.name}</h3>
            <p className="text-xs text-slate-500 mb-4">{el.full_name}</p>
            <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
              <p className="text-[10px] text-slate-400 font-bold uppercase mb-2 tracking-wider">
                Exam Type
              </p>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">
                {el.type}
              </p>
            </div>
          </div>
        ))}
      </div>
    </>
  );
};
