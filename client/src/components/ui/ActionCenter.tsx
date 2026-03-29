import React, { useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import type { AppDispatch, RootState } from "../../store";
import { setActionCenter, toggleEyeProtection, toggleBlueLightShield } from "../../slice/uiSlice";
import { ExamPreferenceSelector } from "./ExamPreferenceSelector";
import { useTheme } from "../../hooks/useTheme";
import { 
  X, 
  Sun, 
  Moon, 
  Eye, 
  EyeOff, 
  Bell, 
  ShieldCheck, 
  Cpu, 
  RefreshCcw,
  User,
  Zap
} from "lucide-react";

export function ActionCenter() {
  const dispatch = useDispatch<AppDispatch>();
  const { isActionCenterOpen, isEyeProtectionActive, blueLightShield } = useSelector((state: RootState) => state.ui);
  const { user, profile } = useSelector((state: RootState) => state.user);
  const { theme, toggleTheme } = useTheme();
  const drawerRef = useRef<HTMLDivElement>(null);

  // Close on Escape or Outside Click
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") dispatch(setActionCenter(false));
    };
    if (isActionCenterOpen) {
      window.addEventListener("keydown", handleEscape);
    }
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isActionCenterOpen, dispatch]);

  const toggleActionCenter = () => dispatch(setActionCenter(!isActionCenterOpen));

  return (
    <>
      {/* Backdrop Backdrop */}
      <div 
        className={`fixed inset-0 z-99 transition-all duration-1000 ease-botanical ${
          isActionCenterOpen 
          ? "bg-on-surface/10 backdrop-blur-md opacity-100 pointer-events-auto" 
          : "opacity-0 pointer-events-none backdrop-blur-0"
        }`}
        onClick={() => dispatch(setActionCenter(false))}
      />

      {/* Action Center Drawer */}
      <aside
        ref={drawerRef}
        className={`fixed top-0 right-0 h-screen w-full sm:w-[520px] bg-surface/80 backdrop-blur-3xl z-100 transition-all duration-700 ease-botanical shadow-ambient border-l border-white/10 flex flex-col ${
          isActionCenterOpen 
          ? "translate-x-0 opacity-100 scale-100" 
          : "translate-x-12 opacity-0 scale-[0.98] pointer-events-none"
        }`}
      >
        {/* Drawer Header */}
        <header className="h-28 flex items-center justify-between px-10 shrink-0">
          <div className="flex flex-col">
            <span className="text-[10px] font-technical font-black text-primary uppercase tracking-[0.4em] mb-2">Systems Registry</span>
            <h2 className="text-3xl font-black text-on-surface tracking-tighter uppercase leading-none">Action Center</h2>
          </div>
          <button 
            onClick={() => dispatch(setActionCenter(false))}
            className="size-14 rounded-full bg-surface-container-high/40 text-on-surface-variant hover:text-primary transition-all duration-300 flex items-center justify-center group"
          >
            <X className="size-6 group-hover:rotate-90 transition-transform duration-500" />
          </button>
        </header>

        {/* Scrollable Content Workspace */}
        <div className="flex-1 overflow-y-auto custom-scrollbar px-10 py-6 space-y-16">
          
          {/* Section 1: Profile Summary */}
          <section className={`space-y-6 ${isActionCenterOpen ? "animate-reveal" : "opacity-0"}`} style={{ animationDelay: '100ms' }}>
             <div className="bg-surface-container-low rounded-[2.5rem] p-8 flex items-center gap-8 shadow-inner ring-1 ring-white/10 group">
                <div className="size-20 bg-linear-to-br from-primary to-primary-container rounded-4xl flex items-center justify-center text-white text-3xl font-black shadow-lg shadow-primary/20 group-hover:scale-110 transition-transform duration-500">
                   {user?.email?.[0].toUpperCase()}
                </div>
                <div className="flex flex-col flex-1">
                   <p className="text-[10px] font-technical font-black text-primary uppercase tracking-[0.3em] mb-2">{profile?.target_exams?.length || 0} Syllabus Targets</p>
                   <h3 className="text-xl font-black text-on-surface tracking-tight">{user?.email?.split('@')[0]}</h3>
                   <div className="flex items-center gap-3 mt-3">
                      <div className="size-2 bg-green-500 rounded-full animate-pulse shadow-sm shadow-green-500/50" />
                      <span className="text-[9px] font-technical font-black text-on-surface-variant opacity-40 uppercase tracking-widest">Digital Native Journal</span>
                   </div>
                </div>
             </div>
          </section>

          {/* Section 2: Quick Settings Rituals */}
          <section className={`space-y-8 ${isActionCenterOpen ? "animate-reveal" : "opacity-0"}`} style={{ animationDelay: '200ms' }}>
             <div className="flex items-center gap-6 opacity-30">
                <p className="text-[10px] font-technical font-black uppercase tracking-[0.4em] text-on-surface-variant">System Rituals</p>
                <div className="h-px flex-1 bg-on-surface-variant/20" />
             </div>

             <div className="grid grid-cols-2 gap-4">
                <button 
                  onClick={toggleTheme}
                  className="flex flex-col items-center justify-center gap-4 p-8 bg-surface-container-high/60 rounded-3xl hover:bg-surface-container-highest transition-all duration-300 group"
                >
                  <div className="size-12 rounded-2xl bg-surface-container-highest flex items-center justify-center text-primary group-hover:rotate-12 transition-transform duration-500">
                    {theme === 'dark' ? <Sun className="size-6" /> : <Moon className="size-6" />}
                  </div>
                  <span className="text-[9px] font-technical font-black uppercase tracking-widest opacity-60 group-hover:opacity-100 transition-opacity">
                    {theme === 'dark' ? 'Sol Invictus' : 'Lunar Manifest'}
                  </span>
                </button>

                <button 
                  onClick={() => dispatch(toggleEyeProtection())}
                  className={`flex flex-col items-center justify-center gap-4 p-8 rounded-4xl transition-all duration-500 group ${
                    isEyeProtectionActive 
                    ? "bg-primary text-white shadow-ambient-sm scale-105" 
                    : "bg-surface-container-high/60 text-on-surface-variant hover:bg-surface-container-highest hover:text-primary"
                  }`}
                >
                  <div className={`size-12 rounded-2xl flex items-center justify-center transition-all duration-500 ${
                    isEyeProtectionActive ? "bg-white/20" : "bg-surface-container-highest text-primary"
                  }`}>
                    {isEyeProtectionActive ? <Eye className="size-6" /> : <EyeOff className="size-6" />}
                  </div>
                  <span className="text-[9px] font-technical font-black uppercase tracking-widest opacity-60 group-hover:opacity-100 transition-opacity">
                    Visual Shield
                  </span>
                </button>
             </div>
          </section>

          {/* Section 3: Exam Preference Selector */}
          <section className={`space-y-8 ${isActionCenterOpen ? "animate-reveal" : "opacity-0"}`} style={{ animationDelay: '300ms' }}>
             <div className="flex items-center gap-6 opacity-30">
                <p className="text-[10px] font-technical font-black uppercase tracking-[0.4em] text-on-surface-variant">Preference Selector</p>
                <div className="h-px flex-1 bg-on-surface-variant/20" />
             </div>
             
             <ExamPreferenceSelector />
          </section>

          {/* Section 4: Archival Metadata Stamps */}
          <section className={`space-y-6 pt-10 pb-20 transition-all duration-700 opacity-30 hover:opacity-100 ${isActionCenterOpen ? "animate-reveal" : "opacity-0"}`} style={{ animationDelay: '400ms' }}>
             <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-4 p-4 bg-surface-container-high/20 rounded-3xl border border-white/5">
                   <RefreshCcw className="size-4 text-primary" />
                   <div className="flex flex-col">
                      <span className="text-[8px] font-technical font-black uppercase tracking-widest opacity-40">Persistence Layer</span>
                      <span className="text-[10px] font-technical font-bold">Active Sync</span>
                   </div>
                </div>
                <div className="flex items-center gap-4 p-4 bg-surface-container-high/20 rounded-3xl border border-white/5">
                   <Cpu className="size-4 text-primary" />
                   <div className="flex flex-col">
                      <span className="text-[8px] font-technical font-black uppercase tracking-widest opacity-40">Core Version</span>
                      <span className="text-[10px] font-technical font-bold">V 2.4.1.manifest</span>
                   </div>
                </div>
             </div>
          </section>
        </div>
      </aside>
    </>
  );
}
