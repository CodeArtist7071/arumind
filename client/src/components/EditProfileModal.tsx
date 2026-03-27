import React, { useState } from "react";
import { X, User, Phone, MapPin, Save, Loader2 } from "lucide-react";

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (updates: any) => Promise<void>;
  initialData: {
    name: string;
    phone: string;
    location: string;
  };
}

export const EditProfileModal = ({
  isOpen,
  onClose,
  onSave,
  initialData,
}: EditProfileModalProps) => {
  const [formData, setFormData] = useState(initialData);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onSave(formData);
      onClose();
    } catch (error) {
      console.error("Failed to update profile", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-surface/80 backdrop-blur-xl transition-opacity animate-in fade-in duration-300"
        onClick={onClose}
      />
      
      {/* Modal Tube */}
      <div className="relative bg-surface-container-low w-full max-w-xl rounded-[3rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.15)] ring-1 ring-black/5 overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-10 duration-500">
        {/* Header Tube */}
        <div className="p-8 pb-0 flex justify-between items-center bg-linear-to-b from-white/50 to-transparent">
          <div className="flex items-center gap-4">
            <div className="size-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
              <User size={20} />
            </div>
            <div>
              <h3 className="text-[11px] font-technical font-black uppercase tracking-[0.4em] text-on-surface-variant opacity-60">Identity Refinement</h3>
              <p className="font-narrative font-bold text-on-surface">Modify your digital manifesto</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="size-10 rounded-full hover:bg-on-surface/5 flex items-center justify-center transition-colors"
          >
            <X size={20} className="text-on-surface-variant" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-10 space-y-8">
          <div className="space-y-6">
            <InputField 
              icon={<User size={16} />} 
              label="Full Identity" 
              placeholder="Enter your name"
              value={formData.name}
              onChange={(v) => setFormData({ ...formData, name: v })}
            />
            <InputField 
              icon={<Phone size={16} />} 
              label="Comm Link (Phone)" 
              placeholder="Enter your phone number"
              value={formData.phone}
              onChange={(v) => setFormData({ ...formData, phone: v })}
            />
            <InputField 
              icon={<MapPin size={16} />} 
              label="Geographic Node (Location)" 
              placeholder="Enter your location (e.g. Bhubaneswar, Odisha)"
              value={formData.location}
              onChange={(v) => setFormData({ ...formData, location: v })}
            />
          </div>

          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-8 py-4 rounded-full font-technical font-black uppercase tracking-widest text-[10px] bg-on-surface/5 text-on-surface-variant hover:bg-on-surface/10 transition-all"
            >
              Abort Mission
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-2 bg-primary text-white px-8 py-4 rounded-full font-technical font-black uppercase tracking-widest text-[10px] shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:grayscale disabled:scale-100"
            >
              {isSubmitting ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <Save size={18} />
              )}
              {isSubmitting ? "Syncing..." : "Sync Manifesto"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const InputField = ({ icon, label, placeholder, value, onChange }: { 
  icon: any, 
  label: string, 
  placeholder: string,
  value: string,
  onChange: (v: string) => void 
}) => (
  <div className="group space-y-2">
    <div className="flex items-center gap-2 opacity-40 group-focus-within:opacity-100 transition-opacity">
      {icon}
      <span className="text-[9px] font-technical font-black uppercase tracking-[0.2em]">{label}</span>
    </div>
    <div className="relative">
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-white/30 border border-on-surface/5 rounded-2xl px-6 py-4 font-narrative font-semibold text-on-surface placeholder:text-on-surface-variant/20 focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all shadow-sm"
      />
    </div>
  </div>
);
