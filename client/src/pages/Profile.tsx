import { useDispatch, useSelector } from "react-redux";
import type { AppDispatch, RootState } from "../store";
import { updateUserLocally } from "../slice/userSlice";
import { toggleEyeProtection, toggleBlueLightShield } from "../slice/uiSlice";
import { updateUserProfile } from "../services/userServices";
import { EditProfileModal } from "../components/EditProfileModal";
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  GraduationCap, 
  Award, 
  Zap, 
  Target, 
  Gem, 
  RefreshCcw, 
  CreditCard,
  CheckCircle2,
  Calendar,
  Settings,
  ChevronRight,
  Eye
} from "lucide-react";
import { useState } from "react";

const Profile = () => {
    const { user, profile } = useSelector((state: RootState) => state.user);
    const { isEyeProtectionActive, blueLightShield } = useSelector((state: RootState) => state.ui);
    const dispatch = useDispatch<AppDispatch>();
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    
    const userData = user?.user_metadata;

    const handleSaveProfile = async (updates: any) => {
        if (!user?.id) return;
        
        try {
            // Map the internal form fields to the Supabase profiles table fields
            const supabaseUpdates = {
                full_name: updates.name,
                phone: updates.phone,
                location: updates.location
            };
            
            await updateUserProfile(supabaseUpdates, user.id);
            dispatch(updateUserLocally(supabaseUpdates));
        } catch (error) {
            console.error("Update failed", error);
            throw error;
        }
    };

    return (
        <div className="space-y-10 pb-20 animate-reveal">
            <EditProfileModal 
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                onSave={handleSaveProfile}
                initialData={{
                    name: profile?.full_name || user?.identities?.[0]?.identity_data?.name || "",
                    phone: profile?.phone || user?.phone || "",
                    location: profile?.location || "Bhubaneswar, Odisha"
                }}
            />
            {/* Identity Editorial Hero */}
            <section className="bg-surface-container-low rounded-[3rem] p-10 shadow-ambient relative overflow-hidden group hover-bloom">
                {/* Decorative Pattern */}
                <div className="absolute top-0 right-0 p-12 opacity-[0.03] group-hover:scale-110 transition-transform duration-3000 pointer-events-none">
                    <User size={300} />
                </div>

                <div className="flex flex-col md:flex-row items-center gap-10 relative z-10">
                    <div className="relative">
                        <div className="size-40 rounded-full border-8 border-white dark:border-surface shadow-2xl overflow-hidden ring-4 ring-primary/20">
                            <img
                                className="h-full w-full object-cover"
                                src={user?.identities?.[0]?.identity_data?.avatar_url || "https://lh3.googleusercontent.com/a/ACg8ocL8jX9S4Z4c9X..."}
                                alt="profile"
                            />
                        </div>
                        {userData?.email_verified && (
                            <div className="absolute bottom-2 right-2 bg-primary text-white p-2 rounded-full shadow-lg ring-4 ring-white dark:ring-surface animate-bounce-slow">
                                <CheckCircle2 size={18} />
                            </div>
                        )}
                    </div>

                    <div className="text-center md:text-left flex-1 space-y-4">
                        <div>
                            <h2 className="text-4xl lg:text-5xl font-black text-on-surface tracking-tighter leading-none mb-2">
                                {profile?.full_name || user?.identities?.[0]?.identity_data?.name || "Premium Aspirant"}
                            </h2>
                            <div className="flex flex-wrap justify-center md:justify-start gap-3 items-center">
                                <span className="bg-primary/10 text-primary px-4 py-1.5 rounded-full text-[10px] font-technical font-black uppercase tracking-widest">
                                    OPSC Elite Aspirant
                                </span>
                                <span className="text-[10px] font-technical font-black uppercase tracking-[0.2em] text-on-surface-variant opacity-40">
                                    Batch of 2024
                                </span>
                            </div>
                        </div>

                        <div className="flex flex-wrap justify-center md:justify-start gap-6 text-on-surface-variant text-sm font-medium opacity-70">
                            <div className="flex items-center gap-2">
                                <MapPin size={14} className="text-primary" />
                                <span>{profile?.location || "Odisha, India"}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Calendar size={14} className="text-primary" />
                                <span>Joined Oct 2023</span>
                            </div>
                        </div>
                    </div>

                    <button 
                        onClick={() => setIsEditModalOpen(true)}
                        className="bg-primary text-white px-8 py-4 rounded-full font-technical font-black uppercase tracking-widest shadow-lg shadow-primary/20 hover:scale-105 transition-all duration-300 flex items-center gap-3"
                    >
                        <Settings size={18} />
                        Edit Profile
                    </button>
                </div>
            </section>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                {/* Left Column: Deep Analysis */}
                <div className="lg:col-span-8 space-y-10">
                    {/* Personal Information Tube */}
                    <section className="bg-surface-container-low rounded-[3rem] p-10 shadow-ambient hover-bloom">
                        <div className="flex items-center gap-4 mb-10">
                            <div className="size-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                                <User size={20} />
                            </div>
                            <h3 className="text-[11px] font-technical font-black uppercase tracking-[0.4em] text-on-surface-variant opacity-60">Personal Manifesto</h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <InfoField icon={<User size={14} />} label="Full Identity" value={profile?.full_name || user?.identities?.[0]?.identity_data?.name || "N/A"} />
                            <InfoField icon={<Mail size={14} />} label="Signal Address" value={user?.email || "N/A"} />
                            <InfoField icon={<Phone size={14} />} label="Comm Link" value={profile?.phone || user?.phone || "N/A"} />
                            <InfoField icon={<MapPin size={14} />} label="Geographic Node" value={profile?.location || "Bhubaneswar, Odisha"} />
                        </div>
                    </section>

                    {/* Academic Pedigree Tube */}
                    <section className="bg-surface-container-low rounded-[3rem] p-10 shadow-ambient hover-bloom">
                        <div className="flex items-center gap-4 mb-10">
                            <div className="size-10 bg-tertiary/10 rounded-xl flex items-center justify-center text-tertiary">
                                <GraduationCap size={20} />
                            </div>
                            <h3 className="text-[11px] font-technical font-black uppercase tracking-[0.4em] text-on-surface-variant opacity-60">Academic Pedigree</h3>
                        </div>

                        <div className="space-y-6">
                            <AcademicEntry
                                degree="Master of Technology (M.Tech)"
                                college="Biju Patnaik University of Technology"
                                details="2022 • 8.5 CGPA"
                                active
                            />
                            <AcademicEntry
                                degree="Bachelor of Technology (B.Tech)"
                                college="VSSUT, Burla"
                                details="2020 • 7.9 CGPA"
                            />
                        </div>
                    </section>
                </div>

                {/* Right Column: Vitals */}
                <div className="lg:col-span-4 space-y-10">
                    {/* Environmental Vitals: Eye Protection & Blue Light Shield */}
                    <section className="bg-surface-container-low rounded-4xl p-10 shadow-ambient border border-primary/5">
                        <div className="flex items-center gap-4 mb-8">
                             <div className="size-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                                 <Eye size={20} />
                             </div>
                             <h3 className="text-[11px] font-technical font-black uppercase tracking-[0.4em] text-on-surface-variant opacity-60">Environmental Vitals</h3>
                        </div>

                        <div className="space-y-6">
                            {/* Eye Protection Toggle */}
                            <div className="flex items-center justify-between p-6 bg-white/50 rounded-4xl group hover:bg-white transition-all duration-500">
                                <div className="flex flex-col">
                                    <p className="text-xs font-bold text-on-surface">Eye Protection</p>
                                    <p className="text-[9px] font-technical font-black uppercase tracking-widest text-primary mt-1">Soft Warmth</p>
                                </div>
                                <button 
                                    type="button"
                                    onClick={() => dispatch(toggleEyeProtection())}
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-500 cursor-pointer ${isEyeProtectionActive ? 'bg-primary' : 'bg-surface-dim'}`}
                                >
                                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-500 ${isEyeProtectionActive ? 'translate-x-6' : 'translate-x-1'}`} />
                                </button>
                            </div>

                            {/* Blue Light Shield Toggle */}
                            <div className="flex items-center justify-between p-6 bg-white/50 rounded-4xl group hover:bg-white transition-all duration-500 ring-1 ring-tertiary/5">
                                <div className="flex flex-col">
                                    <p className="text-xs font-bold text-on-surface">Blue Light Shield</p>
                                    <p className="text-[9px] font-technical font-black uppercase tracking-widest text-tertiary mt-1">Amber Filter</p>
                                </div>
                                <button 
                                    type="button"
                                    onClick={() => dispatch(toggleBlueLightShield())}
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-500 cursor-pointer ${blueLightShield ? 'bg-tertiary' : 'bg-surface-dim'}`}
                                >
                                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-500 ${blueLightShield ? 'translate-x-6' : 'translate-x-1'}`} />
                                </button>
                            </div>
                        </div>

                        <p className="mt-8 text-[9px] text-on-surface-variant opacity-40 font-medium leading-relaxed italic">
                           * Reduces high-energy blue-violet light. Recommended for night-time reviews.
                        </p>
                    </section>

                    {/* Mastery Snapshot Pod */}
                    <section className="bg-surface-container-low rounded-4xl p-10 shadow-ambient">
                        <h3 className="text-[11px] font-technical font-black uppercase tracking-[0.4em] text-on-surface-variant opacity-60 mb-10">Mastery Snapshot</h3>
                        
                        <div className="space-y-8">
                            <div>
                                <div className="flex justify-between items-end mb-4">
                                    <p className="text-[10px] font-technical font-black uppercase tracking-widest text-on-surface-variant opacity-40">Accuracy Rate</p>
                                    <span className="text-xl font-technical font-black text-primary tracking-tighter">78%</span>
                                </div>
                                <div className="h-3 w-full bg-surface-container-high rounded-full overflow-hidden p-1 shadow-inner ring-1 ring-black/5">
                                    <div className="h-full bg-primary rounded-full transition-all duration-1000 w-[78%]" />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-white/50 p-6 rounded-4xl shadow-sm group hover:bg-white transition-all">
                                    <p className="text-2xl font-technical font-black text-on-surface mb-1">42</p>
                                    <p className="text-[8px] font-technical font-black uppercase tracking-[0.2em] text-on-surface-variant opacity-40">Manifests</p>
                                </div>
                                <div className="bg-white/50 p-6 rounded-4xl shadow-sm group hover:bg-white transition-all">
                                    <p className="text-2xl font-technical font-black text-tertiary mb-1">840</p>
                                    <p className="text-[8px] font-technical font-black uppercase tracking-[0.2em] text-on-surface-variant opacity-40">Focus Hrs</p>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Subscription Layer */}
                    <section className="bg-linear-to-br from-primary to-primary-container p-1 rounded-[3rem] shadow-lg shadow-primary/20 overflow-hidden">
                        <div className="bg-white/5 backdrop-blur-xl p-10 rounded-[2.8rem] space-y-8">
                            <div className="flex justify-between items-start">
                                <div className="bg-white/20 p-4 rounded-2xl text-white">
                                    <Gem size={28} />
                                </div>
                                <span className="bg-white/20 text-white px-4 py-1.5 rounded-full text-[9px] font-technical font-black uppercase tracking-widest">
                                    Elite Plan
                                </span>
                            </div>

                            <div className="text-white">
                                <h4 className="text-2xl font-black tracking-tighter leading-none mb-1">Elite Test Series</h4>
                                <p className="text-[10px] font-technical font-black uppercase tracking-widest opacity-60">Unlimited Access to OPSC</p>
                            </div>

                            <div className="space-y-4 pt-4 border-t border-white/10">
                                <div className="flex justify-between items-center text-white/80">
                                    <div className="flex items-center gap-2">
                                        <RefreshCcw size={12} />
                                        <span className="text-[10px] uppercase font-technical font-black">Renewal</span>
                                    </div>
                                    <span className="text-xs font-bold">15 Oct 2024</span>
                                </div>
                                <div className="flex justify-between items-center text-white/80">
                                    <div className="flex items-center gap-2">
                                        <CreditCard size={12} />
                                        <span className="text-[10px] uppercase font-technical font-black">Amount</span>
                                    </div>
                                    <span className="text-xs font-bold">₹2,499</span>
                                </div>
                            </div>

                            <button className="w-full bg-white text-primary py-4 rounded-full font-technical font-black text-[10px] uppercase tracking-[0.3em] hover:scale-105 transition-all">
                                Manage Subscription
                            </button>
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
};

const InfoField = ({ icon, label, value }: { icon: any, label: string, value: string }) => (
    <div className="bg-white/30 p-6 rounded-4xl border border-on-surface/5 group hover:bg-white transition-all duration-500">
        <div className="flex items-center gap-3 mb-3 text-primary opacity-40 group-hover:opacity-100 transition-opacity">
            {icon}
            <p className="text-[9px] font-technical font-black uppercase tracking-[0.2em] text-on-surface-variant">{label}</p>
        </div>
        <p className="text-sm font-bold text-on-surface tracking-tight truncate">{value}</p>
    </div>
);

const AcademicEntry = ({ degree, college, details, active = false }: { degree: string, college: string, details: string, active?: boolean }) => (
    <div className={`flex items-start gap-6 p-6 rounded-4xl transition-all duration-700 ease-(--ease-botanical) hover:translate-x-2 ${active ? 'bg-white shadow-ambient ring-1 ring-black/5' : 'bg-on-surface/5 opacity-60 hover:opacity-100'}`}>
        <div className={`size-12 rounded-2xl flex items-center justify-center shrink-0 ${active ? 'bg-primary text-white shadow-lg' : 'bg-surface-container-high text-on-surface-variant'}`}>
            <Award size={24} />
        </div>
        <div>
            <h4 className="font-bold text-on-surface tracking-tight leading-tight">{degree}</h4>
            <p className="text-xs text-on-surface-variant font-medium mt-1">{college}</p>
            <p className="text-[10px] font-technical font-black uppercase tracking-widest mt-2 opacity-40">{details}</p>
        </div>
        <ChevronRight size={16} className="ml-auto opacity-20" />
    </div>
);

export default Profile;
