import React, { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import type { AppDispatch, RootState } from "../../store";
import { fetchExams } from "../../slice/examSlice";
import { Book, ChevronRight, Zap, Target, Clock, ShieldCheck } from "lucide-react";
import MockTestPreferenceModal from "../../components/ui/MockTestPreferenceModal";

const MockTests = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { examData, loading: examsLoading } = useSelector(
    (state: RootState) => state.exams,
  );
  const { profile } = useSelector((state: RootState) => state.user);
  const { user } = useSelector((state: RootState) => state.user);

  const [selectedExam, setSelectedExam] = useState<{ id: string; name: string } | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    dispatch(fetchExams());
  }, [dispatch]);

  const targetedExams = examData.filter((el) =>
    profile?.target_exams?.includes(el.id),
  );

  const handleStartExam = (id: string, name: string) => {
    setSelectedExam({ id, name });
    setIsModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-surface-container-low p-6 lg:p-10">
      <div className="max-w-7xl mx-auto space-y-10">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-2">
            <h1 className="text-4xl font-black tracking-tight text-on-surface dark:text-white">
              Adaptive Mock <span className="text-primary">Portal</span>
            </h1>
            <p className="text-on-surface-variant dark:text-slate-400 font-medium max-w-lg">
              Generate personalized mock tests based on your past performance. 
              Improve your score with AI-driven question selection.
            </p>
          </div>
          <div className="bg-primary text-white px-6 py-3 rounded-2xl shadow-xl shadow-green-600/20 flex items-center gap-3">
            <Zap className="size-5" fill="white" />
            <span className="font-bold tracking-wide uppercase text-sm">
              Adaptive Learning Active
            </span>
          </div>
        </div>

        {/* Exams Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {targetedExams.map((exam) => (
            <div
              key={exam.id}
              className="group relative bg-surface dark:bg-surface-container-low rounded-3xl  dark:border-slate-800 p-8 hover:shadow-2xl hover:shadow-green-600/5 transition-all duration-500 cursor-pointer overflow-hidden"
              onClick={() => handleStartExam(exam.id, exam.name)}
            >
              {/* Background gradient effect */}
              <div className="absolute -top-24 -right-24 size-48 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/10 transition-all duration-500" />
              
              <div className="relative z-10 space-y-6">
                <div className="size-16 bg-green-50 dark:bg-green-900/20 rounded-2xl flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all duration-500">
                  <Book className="size-8" />
                </div>

                <div>
                  <h3 className="text-xl font-black text-on-surface dark:text-white mb-2 leading-tight">
                    {exam.name}
                  </h3>
                  <p className="text-sm text-on-surface-variant dark:text-slate-400 font-medium line-clamp-2">
                    Start a custom mock session for this exam.
                  </p>
                </div>

                <div className="pt-4 flex items-center justify-between border-t border-slate-100 dark:border-slate-800">
                  <div className="flex gap-2">
                    <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                      Exam Ready
                    </span>
                  </div>
                  <div className="p-2 rounded-xl bg-surface-container-low dark:bg-slate-800 group-hover:bg-primary group-hover:text-white transition-all duration-500">
                    <ChevronRight className="size-5" />
                  </div>
                </div>
              </div>
            </div>
          ))}

          {targetedExams.length === 0 && !examsLoading && (
             <div className="col-span-full py-20 text-center space-y-4">
                <div className="size-20 bg-surface-container-high dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto text-slate-400">
                   <Target className="size-10" />
                </div>
                <h3 className="text-xl font-bold">No targeted exams found</h3>
                <p className="text-on-surface-variant">Please set your target exams in your profile or dashboard.</p>
             </div>
          )}
        </div>

        {/* Info Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-10  dark:border-slate-800">
           <div className="flex gap-4">
              <div className="size-12 rounded-2xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center text-amber-600 shrink-0">
                 <ShieldCheck className="size-6" />
              </div>
              <div className="space-y-1">
                 <h4 className="font-bold text-on-surface dark:text-white">Performance-Led</h4>
                 <p className="text-xs text-on-surface-variant">Ratios focus on your weak points while revisiting mastered topics.</p>
              </div>
           </div>
           <div className="flex gap-4">
              <div className="size-12 rounded-2xl bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center text-purple-600 shrink-0">
                 <Clock className="size-6" />
              </div>
              <div className="space-y-1">
                 <h4 className="font-bold text-on-surface dark:text-white">Timed Sessions</h4>
                 <p className="text-xs text-on-surface-variant">Practice under pressure with customizable timers for better endurance.</p>
              </div>
           </div>
           <div className="flex gap-4">
              <div className="size-12 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center text-emerald-600 shrink-0">
                 <Target className="size-6" />
              </div>
              <div className="space-y-1">
                 <h4 className="font-bold text-on-surface dark:text-white">Exam Specific</h4>
                 <p className="text-xs text-on-surface-variant">Questions are curated exactly to your chosen exam's curriculum.</p>
              </div>
           </div>
        </div>
      </div>

      {/* Preference Modal */}
      {selectedExam && (
        <MockTestPreferenceModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          examId={selectedExam.id}
          examName={selectedExam.name}
          userId={user?.id || ""}
        />
      )}
    </div>
  );
};

export default MockTests;
