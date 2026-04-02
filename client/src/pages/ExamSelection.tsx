import { useEffect, useState, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import type { AppDispatch, RootState } from "../store";
import { fetchExams } from "../slice/examSlice";
import { supabase } from "../utils/supabase";
import { Check, Sparkles, Search, ArrowRight, Target, Bookmark } from "lucide-react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router";
import { useNotifications } from "reapop";
import { fetchUserProfile } from "../slice/userSlice";

export default function ExamGoalSelection() {
  const [selected, setSelected] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const navigate = useNavigate();
  const { notify } = useNotifications();
  const { examData } = useSelector((state: RootState) => state.exams);
  const { profile } = useSelector((state: RootState) => state.user);
  const dispatch = useDispatch<AppDispatch>();

  useEffect(() => {
    dispatch(fetchExams());
    if (profile?.target_exams) {
      setSelected(profile.target_exams);
    }
  }, [dispatch, profile]);

  const handleSaveExams = async () => {
    if (selected.length === 0) {
      notify({ title: "Goal Required", message: "Please select at least one mission to proceed.", status: "warning" });
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          target_exams: selected,
          user_selected: true,
        })
        .eq("id", user.id);

      if (error) throw error;
      
      // CRITICAL: Synchronize Redux manifest so GoalGuard permits entry
      await dispatch(fetchUserProfile());
      
      notify({ title: "Path Established", message: "Your ecological focus has been set.", status: "success" });
      navigate("/user/dashboard");
    } catch (error: any) {
      console.error("Error saving exams", error);
      notify({ title: "Connection Interrupted", message: error.message || "Failed to update mission focus.", status: "error" });
    }
  };

  const toggleExam = (id: string) => {
    if (selected.includes(id)) {
      setSelected(selected.filter((item) => item !== id));
    } else {
      setSelected([...selected, id]);
    }
  };

  const filteredExams = useMemo(() => {
    return examData.filter(
      (exam) =>
        exam.name.toLowerCase().includes(search.toLowerCase()) ||
        exam.full_name.toLowerCase().includes(search.toLowerCase()),
    ).sort((a, b) => {
      const aSelected = selected.includes(a.id);
      const bSelected = selected.includes(b.id);
      if (aSelected === bSelected) return 0;
      return aSelected ? -1 : 1;
    });
  }, [examData, search, selected]);

  return (
    <div className="bg-surface text-on-surface min-h-screen flex flex-col font-narrative selection:bg-primary/20 selection:text-primary transition-colors duration-700 overflow-x-hidden">
      {/* BOTANICAL GRADIENT LAYER (Digital Greenhouse soul) */}
      <div className="fixed top-0 right-0 -z-10 opacity-30 pointer-events-none">
        <div className="w-[400px] lg:w-[600px] h-[400px] lg:h-[600px] rounded-full bg-linear-to-br from-primary/10 via-primary-container/5 to-transparent blur-[80px] lg:blur-[120px] -mr-20 lg:-mr-40 -mt-20 lg:-mt-40 animate-pulse-slow" />
      </div>

      <div className="flex-1 flex flex-col max-w-[1200px] mx-auto w-full px-5 lg:px-16 pt-5 lg:pt-24 pb-48 lg:pb-48">
        {/* EDITORIAL HEADER: Narrative Manifestation */}
        <header className="mb-5 lg:mb-20 animate-reveal">
          <div className="flex items-center gap-3 mb-3 lg:mb-8">
            <div className="size-1.5 bg-primary rounded-full animate-pulse shadow-[0_0_8px_rgba(0,110,47,0.4)]" />
            <span className="text-[9px] lg:text-[10px] font-technical font-black uppercase tracking-[0.4em] lg:tracking-[0.6em] text-primary/60">Establishing Mission Focus</span>
          </div>
          
          <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4 lg:gap-12 text-left">
            <div className="max-w-3xl relative">
              <h1 className="text-3xl lg:text-5xl font-black tracking-tighter leading-[0.9] lg:leading-[0.85] text-on-surface mb-2 lg:mb-10">
                Choose Your<br />
                <span className="text-primary italic animate-in fade-in duration-1000 delay-300">Target Realms</span>
              </h1>
              <p className="text-md lg:text-2xl font-medium text-on-surface-variant leading-relaxed opacity-80 max-w-xl">
                 Select the examination boards you intend to practice this season.
              </p>
            </div>
            
            {/* TECHNICAL STAMP: Realmode Counter */}
            <div className="flex flex-col items-start lg:items-end gap-3 pt-0 lg:pt-10">
              <div className="bg-surface-container-low px-4 lg:px-8 py-2 lg:py-4 rounded-3xl border border-black/5 shadow-ambient flex items-center gap-4 group hover:scale-105 transition-transform duration-500">
                 <Target className="size-5 lg:size-6 text-primary animate-pulse" />
                 <span className="text-2xl lg:text-5xl font-technical font-black tracking-tighter text-on-surface">
                    {selected.length.toString().padStart(2, '0')}
                 </span>
                 <span className="text-[9px] lg:text-[10px] font-technical font-black uppercase tracking-[0.2em] text-on-surface-variant opacity-40">Active Realms</span>
              </div>
            </div>
          </div>
        </header>

        {/* SEARCH: Technical Archives Pod */}
        <div className="relative mb-6 lg:mb-16 group animate-reveal duration-700 delay-100 w-full max-w-2xl">
          <div className="absolute inset-y-0 left-6 lg:left-8 flex items-center pointer-events-none">
            <Search className="size-5 text-on-surface-variant/40 group-focus-within:text-primary transition-colors" />
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            disabled={examData.length === 0}
            placeholder="Search Syllabus Archives..."
            className="w-full bg-surface-container-low border-none rounded-3xl py-3 lg:py-6 pl-16 lg:pl-18 pr-8 text-base lg:text-lg font-narrative placeholder:text-on-surface-variant/30 focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all outline-hidden shadow-inner"
          />
        </div>

        {/* CUSTOM TICKER UI FOREST: Pill Manifestation */}
        <div className="flex flex-wrap gap-3 lg:gap-4">
          {filteredExams.length === 0 && examData.length > 0 && (
            <div className="w-full py-16 lg:py-20 text-center bg-surface-container-low/50 rounded-4xl border-2 border-dashed border-primary/10 animate-reveal">
              <Sparkles className="size-10 lg:size-12 mx-auto text-primary/20 mb-4" />
              <p className="text-on-surface-variant font-narrative italic text-lg lg:text-xl px-4 leading-relaxed opacity-60">No paths found matching this cipher.</p>
            </div>
          )}

          {filteredExams.map((exam, idx) => {
            const isSelected = selected.includes(exam.id);

            return (
              <button
                key={exam.id}
                onClick={() => toggleExam(exam.id)}
                style={{ animationDelay: `${idx * 40}ms` }}
                className={`group relative px-4 lg:px-10 py-2 lg:py-5 rounded-full flex items-center gap-2 lg:gap-4 transition-all duration-500 ease-botanical hover:scale-[1.05] active:scale-95 ring-1 ring-black/5 shadow-ambient animate-reveal opacity-0 ${
                  isSelected 
                    ? "bg-primary text-white shadow-xl shadow-primary/30" 
                    : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container-highest hover:text-on-surface"
                }`}
              >
                {/* Custom Dot Ritual */}
                <div className={`size-2 lg:size-2 rounded-full transition-all duration-500 ${
                    isSelected ? "bg-white scale-110 shadow-[0_0_10px_rgba(255,255,255,0.8)]" : "bg-primary/20 group-hover:bg-primary/60 scale-75"
                }`} />

                <div className="flex flex-col items-start gap-0.5">
                   <span className={`text-xs lg:text-sm font-technical font-black uppercase tracking-[0.2em] transition-colors ${
                      isSelected ? "text-white" : "text-on-surface"
                   }`}>
                      {exam.name}
                   </span>
                </div>

                {isSelected && (
                   <Check className="size-3 lg:size-4 text-white ml-1 lg:ml-2 animate-in zoom-in-95 duration-500" strokeWidth={4} />
                )}
                
                {/* Hover Aura */}
                <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 rounded-full transition-opacity" />
              </button>
            );
          })}
        </div>

        {/* BOTTOM ACTION BAR: Weighted Manifestation */}
        <div className="fixed bottom-0 left-0 right-0 p-5 lg:p-16 pointer-events-none z-50">
          <div className="max-w-[1200px] mx-auto flex justify-end">
            <button
              onClick={handleSaveExams}
              className={`pointer-events-auto bg-linear-to-r from-primary to-primary-container text-white h-16 lg:h-22 px-10 lg:px-16 rounded-full font-technical font-black text-[11px] lg:text-sm uppercase tracking-[0.4em] lg:tracking-[0.5em] flex items-center gap-4 lg:gap-6 transition-all duration-700 hov-bloom shadow-ambient-lg ${
                selected.length > 0
                  ? "bg-linear-to-r from-primary to-primary-container scale-105 shadow-primary/30 active:scale-95"
                  : "bg-surface-container-highest cursor-not-allowed opacity-100 border border-black/5"
              }`}
            >
              <span>{selected.length > 0 ? "Proceed" : "Select at least one exam"}</span>
              <ArrowRight className={`size-4 lg:size-5 transition-transform duration-700 ${selected.length > 0 ? "translate-x-1 lg:translate-x-6" : ""}`} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
