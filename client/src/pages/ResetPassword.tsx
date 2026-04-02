import { EyeClosed, KeyRound, Notebook, ShieldCheck } from "lucide-react";
import { InputWithLabel } from "../components/ui/InputWithLabel";
import { Button } from "../components/ui/Button";
import { useForm } from "react-hook-form";
import { supabase } from "../utils/supabase";
import { useState } from "react";
import { StatusBanner } from "../components/ui/StatusBanner";
import { useNavigate } from "react-router";

interface ResetProps {
  password: string;
  confirmPassword: string;
}

const ResetPassword = () => {
  const navigate = useNavigate();
  const [error, setError] = useState<any>();
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ResetProps>({ mode: "onChange" });

  const onSubmit = async (info: ResetProps) => {
    setError(null);
    try {
      const { error } = await supabase.auth.updateUser({
        password: info.password
      });
      
      if (error) {
        setError(error);
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        navigate("/login");
      }, 3000);
    } catch (err) {
      setError(err);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center p-6 lg:p-12 min-h-screen">
      <div className="w-full max-w-md space-y-12">
        {/* Brand Header */}
        <div className="text-center space-y-4">
          <div className="inline-flex size-14 bg-primary/10 rounded-2xl items-center justify-center text-primary shadow-sm mx-auto">
            <ShieldCheck className="size-8" />
          </div>
          <div>
            <h1 className="text-4xl font-black tracking-tighter text-on-surface">Forge New Key</h1>
            <p className="text-[10px] font-technical font-black uppercase tracking-[0.3em] text-on-surface-variant opacity-40">Securing your journal's manifestation</p>
          </div>
        </div>

        {/* Card */}
        <div className="bg-surface p-10 rounded-[3rem] shadow-ambient border border-on-surface/5 space-y-8 animate-reveal overflow-hidden">
          {error && <StatusBanner status={error} />}
          
          {success ? (
            <div className="py-12 flex flex-col items-center justify-center space-y-6 text-center animate-reveal">
               <div className="size-20 bg-primary/10 rounded-full flex items-center justify-center text-primary animate-pulse">
                  <KeyRound size={40} />
               </div>
               <div className="space-y-4">
                  <h3 className="text-2xl font-black text-on-surface">Key Manifested</h3>
                  <p className="text-xs font-technical font-black text-on-surface-variant/60 uppercase tracking-widest leading-relaxed">
                    Your journal access is now secured with the new key. Returning to garden login...
                  </p>
               </div>
            </div>
          ) : (
            <form className="space-y-8" onSubmit={handleSubmit(onSubmit)}>
              <div className="space-y-6">
                <InputWithLabel
                  label="New Secret Key"
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  error={errors.password}
                  labelIcon={<EyeClosed className="size-4" />}
                  {...register("password", { 
                    required: "Secret Key is required",
                    minLength: { value: 6, message: "Key must be at least 6 characters" }
                  })}
                />
                <InputWithLabel
                  label="Confirm Soul Key"
                  id="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  error={errors.confirmPassword}
                  labelIcon={<ShieldCheck className="size-4" />}
                  {...register("confirmPassword", { 
                    required: "Please confirm your key",
                    validate: (val: string) => {
                      if (watch('password') !== val) {
                        return "Keys do not harmonize";
                      }
                    }
                  })}
                />
              </div>

              <div className="pt-4">
                <Button
                  disabled={isSubmitting}
                  title={isSubmitting ? "Forging Key..." : "Manifest New Key"}
                />
              </div>

              <div className="text-center">
                 <button 
                  type="button" 
                  onClick={() => navigate("/login")}
                  className="text-[10px] font-technical font-black uppercase tracking-[0.4em] text-on-surface-variant opacity-40 hover:opacity-100 transition-opacity"
                 >
                   Recall Original Journey
                 </button>
              </div>
            </form>
          )}
        </div>

        {/* Footer Botanical Manifestation */}
        <div className="flex justify-center gap-8 text-[9px] font-technical font-black uppercase tracking-[0.2em] text-on-surface-variant opacity-20">
          <span>Shielded</span>
          <span>Botanical Encryption</span>
          <span>Verified</span>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
