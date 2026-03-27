import React, { useEffect } from "react";
import { useSelector } from "react-redux";
import type { RootState } from "../../store";
import { getExamsById } from "../../services/examService";
import { Book, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router";

export const ExamsPlanning = () => {
  const { profile } = useSelector((state: RootState) => state.user ?? null);
  const { examData } = useSelector((state: RootState) => state.exams ?? null);
  const navigate = useNavigate();
  console.log("profiles", examData);

  const filteredExams = examData.filter((exam) =>
    profile.target_exams.includes(exam.id),
  );



  function handleButton(id: string) {
    navigate(`/user/plan-study/${id}`)
  }

  return (
    <>
      <h2 className="text-4xl font-bold mt-10 mb-5">Please Select your Exams</h2>
      <h3 className="mb-5">Select for which you want to create study planner..</h3>
      <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {filteredExams.map((el, i) => (
          <>
            <div
              key={i}
              className="group relative bg-surface dark:bg-surface-container-low rounded-3xl  dark:border-slate-800 p-8 hover:shadow-2xl hover:shadow-green-600/5 transition-all duration-500 cursor-pointer overflow-hidden"
              onClick={() => handleButton(el.id)}
            >
              {/* Background gradient effect */}
              <div className="absolute -top-24 -right-24 size-48 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/10 transition-all duration-500" />

              <div className="relative z-10 space-y-6">
                <div className="size-16 bg-green-50 dark:bg-green-900/20 rounded-2xl flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all duration-500">
                  <Book className="size-8" />
                </div>

                <div>
                  <h3 className="text-xl font-black text-on-surface dark:text-white mb-2 leading-tight">
                    {el.name}
                  </h3>
                  <p className="text-sm text-on-surface-variant dark:text-slate-400 font-medium line-clamp-2">
                    Start a custom mock session for this exam.
                  </p>
                </div>

                <div className="pt-4 flex items-center justify-between border-t border-slate-100 dark:border-slate-800">
                  <div className="flex gap-2">
                    <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                      {el.type}
                    </span>
                  </div>
                  <div className="p-2 rounded-xl bg-surface-container-low dark:bg-slate-800 group-hover:bg-primary group-hover:text-white transition-all duration-500">
                    <ChevronRight className="size-5" />
                  </div>
                </div>
              </div>
            </div>
          </>

        ))}
      </div>
    </>
  );
};
