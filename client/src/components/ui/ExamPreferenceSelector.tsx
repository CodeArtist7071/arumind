import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import type { AppDispatch, RootState } from "../../store";
import { fetchExams } from "../../slice/examSlice";
import { supabase } from "../../utils/supabase";
import { Check, Target, Loader2 } from "lucide-react";
import { updateUserLocally } from "../../slice/userSlice";

export function ExamPreferenceSelector() {
  const dispatch = useDispatch<AppDispatch>();
  const { examData, loading: examsLoading } = useSelector((state: RootState) => state.exams);
  const { profile } = useSelector((state: RootState) => state.user);
  const [syncingId, setSyncingId] = useState<string | null>(null);

  useEffect(() => {
    if (examData.length === 0) {
      dispatch(fetchExams());
    }
  }, [dispatch, examData.length]);

  const targetExams = profile?.target_exams || [];

  const handleToggleExam = async (examId: string) => {
    if (!profile?.id) return;
    
    setSyncingId(examId);
    const newTargets = targetExams.includes(examId)
      ? targetExams.filter((id: string) => id !== examId)
      : [...targetExams, examId];

    try {
      const { error } = await supabase
        .from("profiles")
        .update({ target_exams: newTargets })
        .eq("id", profile.id);

      if (error) throw error;

      // Update locally for immediate UI response
      dispatch(updateUserLocally({ target_exams: newTargets }));
    } catch (err) {
      console.error("Failed to sync exam preference:", err);
    } finally {
      setSyncingId(null);
    }
  };

  if (examsLoading && examData.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 opacity-40">
        <Loader2 className="size-6 animate-spin mb-2" />
        <span className="text-[10px] font-technical uppercase tracking-widest">Accessing Registry...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col">
        <span className="text-[10px] font-technical font-black text-primary uppercase tracking-[0.4em] mb-2">Subject Goals</span>
        <h4 className="text-xl font-black text-on-surface tracking-tighter">Exam Preferences</h4>
        <p className="text-[10px] text-on-surface-variant/40 font-medium leading-relaxed mt-2 uppercase tracking-wide">Select your primary examination boards to manifest relevant study manifestos.</p>
      </div>

      <div className="grid gap-3">
        {examData.map((exam) => {
          const isSelected = targetExams.includes(exam.id);
          const isSyncing = syncingId === exam.id;

          return (
            <button
              key={exam.id}
              onClick={() => handleToggleExam(exam.id)}
              disabled={isSyncing}
              className={`w-full group relative overflow-hidden flex items-center justify-between p-5 rounded-4xl transition-all duration-500 border border-outline-variant/5 text-left ${
                isSelected 
                ? "bg-primary text-white shadow-ambient-sm scale-[1.02]" 
                : "bg-surface-container-high/40 text-on-surface-variant hover:bg-surface-container-highest hover:text-on-surface"
              }`}
            >
              <div className="flex flex-col relative z-10">
                <span className={`text-[10px] font-technical font-black uppercase tracking-[0.2em] mb-1 transition-colors ${isSelected ? "text-white/60" : "text-primary/60"}`}>
                  {exam.name}
                </span>
                <span className="text-sm font-black tracking-tight">{exam.full_name}</span>
              </div>

              <div className={`size-10 rounded-2xl flex items-center justify-center transition-all duration-500 relative z-10 ${
                isSelected ? "bg-white/20 text-white" : "bg-surface-container-highest text-on-surface-variant/20"
              }`}>
                {isSyncing ? (
                  <Loader2 className="size-5 animate-spin" />
                ) : isSelected ? (
                  <Check size={20} className="stroke-3" />
                ) : (
                  <Target size={20} />
                )}
              </div>

              {/* Tonal Interaction Layer */}
              <div className={`absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500 ${isSelected ? "hidden" : ""}`} />
            </button>
          );
        })}
      </div>

      {targetExams.length === 0 && (
        <div className="p-6 rounded-4xl bg-tertiary/5 border border-tertiary/10 text-center animate-pulse">
           <p className="text-[10px] font-technical font-black text-tertiary uppercase tracking-widest">No Manifest Targets Selected</p>
        </div>
      )}
    </div>
  );
}
