import React from "react";
import { useDispatch, useSelector } from "react-redux";
import type { AppDispatch, RootState } from "../../store";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../utils/supabase";
import { clearUser } from "../../slice/userSlice";
import { 
  User, 
  Settings, 
  Eye, 
  EyeOff, 
  Moon, 
  Sun, 
  ChevronRight, 
  LogOut, 
  CreditCard, 
  Award,
  BookOpen,
  Target,
  ShieldCheck,
} from "lucide-react";
import { toggleEyeProtection, toggleBlueLightShield, setActionCenter } from "../../slice/uiSlice";
import { useTheme } from "../../hooks/useTheme";

interface MobileProfileProps {
  onEdit: () => void;
}

export const MobileProfile: React.FC<MobileProfileProps> = ({ onEdit }) => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { user, profile } = useSelector((state: RootState) => state.user);
  const { isEyeProtectionActive, blueLightShield } = useSelector((state: RootState) => state.ui);
  const { theme, toggleTheme } = useTheme();

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) console.error("Logout Error", error);
    dispatch(clearUser());
    navigate("/login");
  };

  const registryItems = [
    ...(profile?.role === "admin" ? [{ label: "Admin workspace", sub: "Manage platform content", icon: <ShieldCheck className="text-primary" />, action: () => navigate("/admin/dashboard") }] : []),
    { label: "Elite Subscription", sub: "₹2,499 Active Plan", icon: <CreditCard className="text-secondary" />, action: () => {} },
    { label: "Logout Session", sub: "End authorized access", icon: <LogOut className="text-red-500" />, action: handleLogout },
  ];

  return (
    <div className="flex flex-col gap-8 pb-32 animate-reveal">
      {/* Mobile Hero: Identification Manifest */}
      <section className="bg-surface-container-low rounded-[2.5rem] p-8 flex flex-col items-center text-center relative overflow-hidden shadow-ambient">
        <div className="size-28 rounded-full border-4 border-white shadow-xl overflow-hidden mb-6 ring-4 ring-primary/10 bg-linear-to-br from-primary/10 to-secondary/10 flex items-center justify-center">
           {user?.user_metadata?.avatar_url || user?.identities?.[0]?.identity_data?.avatar_url ? (
             <img 
               src={user?.user_metadata?.avatar_url || user?.identities?.[0]?.identity_data?.avatar_url}
               alt="User Manifestation"
               className="size-full object-cover"
               loading="lazy"
               decoding="async"
             />
           ) : (
             <span className="text-3xl font-black text-primary tracking-tighter">
                {(profile?.full_name || user?.user_metadata?.full_name || user?.email)?.[0]?.toUpperCase() || "A"}
             </span>
           )}
        </div>
        
        <div className="space-y-1">
          <h2 className="text-2xl font-black text-on-surface tracking-tighter">
            {profile?.full_name || user?.identities?.[0]?.identity_data?.name || "Premium Aspirant"}
          </h2>
          <p className="text-[10px] font-technical font-black text-primary uppercase tracking-[0.3em]">
             Authorized Digital Native
          </p>
        </div>

        <button 
          onClick={onEdit}
          className="mt-6 flex items-center gap-2 px-6 py-2 bg-white rounded-full text-[10px] font-technical font-black uppercase tracking-widest text-on-surface-variant shadow-sm border border-outline-variant/10 active:scale-95 transition-all"
        >
          <Settings size={14} />
          Modify Manifesto
        </button>
      </section>

      {/* Stats Horizontal Manifest */}
      <section className="flex gap-4 overflow-x-auto custom-scrollbar-hide px-2">
         {[
           { label: 'Accuracy', value: '78%', icon: <Award size={14} /> },
           { label: 'Manifests', value: '42', icon: <BookOpen size={14} /> },
           { label: 'Focus Hrs', value: '840', icon: <Target size={14} /> },
         ].map((stat, idx) => (
           <div key={idx} className="min-w-[120px] bg-surface-container-high/40 rounded-3xl p-5 flex flex-col gap-2 border border-outline-variant/5">
              <div className="text-primary opacity-40">{stat.icon}</div>
              <p className="text-xl font-technical font-black text-on-surface tracking-tighter">{stat.value}</p>
              <p className="text-[8px] font-technical uppercase tracking-widest text-on-surface-variant/40">{stat.label}</p>
           </div>
         ))}
      </section>

      {/* System Rituals Grid */}
      <section className="space-y-4">
         <div className="flex items-center gap-4 px-4 opacity-40">
            <p className="text-[10px] font-technical font-black uppercase tracking-[0.4em] text-on-surface-variant">System Rituals</p>
         </div>
         
         <div className="grid grid-cols-2 gap-4">
            <button 
              onClick={toggleTheme}
              className="flex flex-col items-center justify-center gap-3 p-8 bg-surface-container-low rounded-4xl active:scale-95 transition-all group"
            >
              <div className="bg-linear-to-br from-indigo-600 to-primary rounded-2xl size-10 flex items-center justify-center text-white group-active:rotate-12 transition-transform">
                 {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
              </div>
              <span className="text-[9px] font-technical font-black uppercase tracking-widest text-on-surface-variant">
                 {theme === 'dark' ? 'Light mode' : 'Dark Mode'}
              </span>
            </button>

            <button 
              onClick={() => dispatch(toggleEyeProtection())}
              className={`flex flex-col items-center justify-center gap-3 p-8 rounded-4xl active:scale-95 transition-all group ${
                isEyeProtectionActive 
                ? "bg-primary text-white shadow-ambient-sm" 
                : "bg-surface-container-low text-on-surface-variant"
              }`}
            >
              <div className={`size-10 rounded-2xl flex items-center justify-center ${
                isEyeProtectionActive ? "bg-white/20" : "bg-surface-container-highest text-primary"
              }`}>
                 {isEyeProtectionActive ? <Eye size={20} /> : <EyeOff size={20} />}
              </div>
              <span className="text-[9px] font-technical font-black uppercase tracking-widest">
                 Visual Shield
              </span>
            </button>
         </div>
      </section>

      {/* Access Points: Vertical Manifest */}
      <section className="space-y-3">
         <div className="flex items-center gap-4 px-4 opacity-40">
            <p className="text-[10px] font-technical font-black uppercase tracking-[0.4em] text-on-surface-variant">Registry Access</p>
         </div>

         {registryItems.map((item) => (
           <button
             type="button"
             key={item.label}
             onClick={item.action}
             className="flex min-h-20 w-full items-center gap-4 rounded-3xl bg-surface-container-low p-4 text-left transition-all active:bg-surface-container-high group sm:gap-6 sm:p-6"
           >
              <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-white opacity-80 shadow-sm sm:size-12">
                 {item.icon}
              </div>
              <div className="flex min-w-0 flex-1 flex-col">
                 <h4 className="text-sm font-black leading-tight tracking-tight text-on-surface">{item.label}</h4>
                 <p className="mt-1 text-[9px] font-technical uppercase tracking-widest text-on-surface-variant/60">{item.sub}</p>
              </div>
              <ChevronRight size={18} className="text-on-surface-variant/20 group-active:translate-x-1 transition-transform" />
           </button>
         ))}
      </section>

      {/* Metadata Stamping */}
      <footer className="text-center py-10 opacity-20">
         <p className="text-[9px] font-technical font-black uppercase tracking-[0.5em] text-on-surface-variant">
            ARUMIND JOURNAL V2.4.1
         </p>
      </footer>
    </div>
  );
};
