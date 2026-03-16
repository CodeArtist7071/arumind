import React from "react";
import { useSelector } from "react-redux";
import type { RootState } from "../store";
import { ArrowLeftCircle, Book } from "lucide-react";
import { useNavigate } from "react-router";

export const ExamsList = () => {
  const { examData } = useSelector((state: RootState) => state.exams ?? null);
  const navigate = useNavigate();
  return (
    <> 
      <div className="mb-10 cursor-pointer"><ArrowLeftCircle onClick={()=>navigate(-1)} size={30} /></div>
      <div className="grid sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {examData.map((exam, index) => (
          <div
            key={index}
            className="p-6 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm hover:border-[#1a57db] hover:shadow-xl transition-all duration-300 group cursor-pointer"
            onClick={() => {}}
          >
            <div className="w-10 h-10 bg-linear-to-r from-[#1a57db]/10 to-[#1a57db]/20 rounded-lg flex items-center justify-center text-[#1a57db] mb-4 group-hover:bg-gradient-to-r group-hover:from-[#1a57db] group-hover:to-blue-600 group-hover:text-white transition-all duration-300">
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
    </>
  );
};
