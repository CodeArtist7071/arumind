import { ChevronRight, Notebook, TrendingUp } from "lucide-react";
import { useNavigate } from "react-router";

export const ExamSelectorCard = ({
  targetRef,
  targetedExams,
}: {
  targetRef?: any;
  targetedExams: any;
}) => {
  const navigate = useNavigate();
  return (
    <section ref={targetRef} className="scroll-mt-32">
      <div className="flex justify-between items-center mb-8 px-2">
        <h3 className="text-[11px] font-technical font-black uppercase tracking-[0.4em] text-on-surface-variant opacity-60">
          Target Landscapes
        </h3>
        <button
          onClick={() => navigate("/select-exams")}
          className="text-[10px] font-technical bg-primary px-3 py-2 rounded-full font-black uppercase tracking-widest text-white hover:bg-primary/80 transition-opacity"
        >
          Add More Exams +
        </button>
      </div>
      <div className="flex flex-wrap md:grid md:grid-cols-2 gap-6">
        {targetedExams.map((exam, index) => (
          <div
            key={index}
            className="px-4 py-2 w-fit md:w-full md:p-8 bg-surface-container-high/40 rounded-[2.5rem] shadow-ambient hover:bg-surface-container-high group cursor-pointer relative overflow-hidden"
            onClick={() => navigate(`exam/${exam.id}`)}
          >
            <div className="flex flex-row md:flex md:flex-col md:items-start items-center gap-4">
              <div className="size-8 lg:size-14  bg-surface-container-high rounded-2xl flex items-center justify-center text-primary mb-0 lg:mb-6 group-hover:bg-primary group-hover:text-white transition-all duration-500 shadow-sm">
                <Notebook className="size-4 lg:size-6" />
              </div>
              <div className="flex flex-col">
                <h4 className="font-black text-md md:text-2xl mb-0 md:mb-2 text-on-surface tracking-tighter leading-none">
                  {exam.name}
                </h4>
                <p className="hidden md:block text-xs truncate w-40 md:w-full text-on-surface-variant mb-0 md:mb-6 font-medium leading-relaxed opacity-60">
                  {exam.full_name}
                </p>
              </div>
              <div className="pt-6 w-full hidden border-t border-on-surface/5 md:flex items-center justify-between">
                <div>
                  <p className="text-[9px] font-technical font-black uppercase tracking-widest text-on-surface-variant group-hover:text-black opacity-40 mb-1">
                    Status
                  </p>
                  <p className="text-[10px] font-technical font-black text-primary uppercase tracking-widest leading-none">
                    Active Cycle
                  </p>
                </div>
                <ChevronRight className="size-5 text-on-surface-variant opacity-20 group-hover:opacity-100 group-hover:translate-x-2 transition-all duration-500" />
              </div>
            </div>



          </div>
        ))}
      </div>
    </section>
  );
};
