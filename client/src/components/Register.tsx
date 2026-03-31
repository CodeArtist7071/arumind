import {
  CheckCheckIcon,
  Info,
  LockIcon,
  Mail,
  Phone,
  User,
  Notebook,
  ArrowRight
} from "lucide-react";
import { InputWithLabel } from "./ui/InputWithLabel";
import { Button } from "./ui/Button";
import { useForm } from "react-hook-form";
import { supabase } from "../utils/supabase";
import { useState } from "react";
import { useNavigate } from "react-router";

interface RegisterProps {
  name: string;
  email: string;
  phone: string;
  create_password: string;
  confirm_password: string;
  terms: boolean;
}

const Register = () => {
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RegisterProps>({ mode: "onChange" });

  const password = watch("create_password");

  async function onSubmit(details: RegisterProps) {
    const { data, error } = await supabase.auth.signUp({
      email: details.email,
      password: details.create_password,
      options: {
        emailRedirectTo: `${window.location.origin}/login`,
        data: {
          phone: details.phone,
          name: details.name,
        },
      },
    });

    if (data.user?.aud === "authenticated") {
      navigate("/user/dashboard");
    }
    if (error) console.error(error);
  }

  return (
    <div className="grid lg:grid-cols-2 min-h-screen">
      {/* LEFT PANEL: Editorial */}
      <div className="hidden lg:flex bg-surface-container-low p-16 flex-col justify-between relative overflow-hidden">
        <div className="absolute top-0 right-0 p-24 opacity-5 rotate-12">
          <Notebook size={400} />
        </div>
        
        <div className="space-y-8 relative z-10">
          <div className="flex items-center gap-3 text-primary">
            <div className="size-12 bg-primary/10 rounded-2xl flex items-center justify-center shadow-sm">
              <Notebook className="size-6" />
            </div>
            <div>
              <h2 className="text-3xl font-black leading-none tracking-tighter text-on-surface">Arumind</h2>
              <span className="text-[9px] font-technical font-black uppercase tracking-[0.3em] text-on-surface-variant opacity-40">The Living Journal</span>
            </div>
          </div>
          
          <h1 className="text-6xl font-black leading-[0.9] tracking-tighter text-on-surface max-w-md">
            Unlock Your <span className="text-primary italic font-serif -ml-2">Potential</span> With Focus.
          </h1>
          
          <p className="text-on-surface-variant text-xl font-medium leading-relaxed max-w-sm">
            "The beautiful thing about learning is that no one can take it away from you."
          </p>
        </div>

        <div className="space-y-6 relative z-10">
          {[
            { title: "Curated Content", desc: "Expert-led courses for OPSC & OSSC excellence." },
            { title: "Real-time Progress", desc: "Advanced analytics for your exam journey." }
          ].map((feature, i) => (
            <div key={i} className="flex gap-4 items-start">
              <div className="size-6 bg-primary/20 rounded-full flex items-center justify-center text-primary mt-1">
                <CheckCheckIcon size={14} />
              </div>
              <div>
                <p className="text-sm font-black text-on-surface uppercase tracking-widest">{feature.title}</p>
                <p className="text-xs text-on-surface-variant font-medium opacity-60">{feature.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* RIGHT PANEL: Form */}
      <div className="flex items-center justify-center p-8 lg:p-24 relative bg-surface">
        <div className="w-full max-w-md space-y-10">
          <div className="space-y-2">
            <h2 className="text-4xl font-black tracking-tighter text-on-surface">Begin Journey</h2>
            <p className="text-on-surface-variant font-medium">Join thousands of students preparing for success.</p>
          </div>

          {/* Google Identity Ritual (Social First) */}
          <div className="space-y-8 animate-reveal">
            <button
              onClick={async () => {
                await supabase.auth.signInWithOAuth({
                  provider: "google",
                  options: {
                    redirectTo: `${window.location.origin}/user/confirm-oauth`,
                  },
                });
              }}
              className="flex items-center justify-center gap-4 w-full py-4 rounded-full bg-surface-container-low text-[10px] font-technical font-black uppercase tracking-widest text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-all duration-300 shadow-sm border border-outline-variant/10"
            >
              <svg className="size-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Google Identity
            </button>

            {/* Social Divider Ritual */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-on-surface/5"></div>
              </div>
              <div className="relative flex justify-center text-[9px] font-technical font-black uppercase tracking-[0.4em]">
                <span className="px-4 bg-surface text-on-surface-variant opacity-30">Manifest via Email</span>
              </div>
            </div>
          </div>

          <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
            <div className="grid grid-cols-1 gap-6">
              <InputWithLabel
                label="Identity"
                id="name"
                placeholder="Full Name"
                error={errors.name}
                labelIcon={<User className="size-4" />}
                {...register("name", { required: "Name is required" })}
              />
              <InputWithLabel
                label="Communication"
                type="email"
                id="email"
                placeholder="Email Address"
                error={errors.email}
                labelIcon={<Mail className="size-4" />}
                {...register("email", { required: "Email is required" })}
              />
              <InputWithLabel
                label="Contact"
                type="tel"
                id="phone"
                placeholder="Phone Number"
                error={errors.phone}
                labelIcon={<Phone className="size-4" />}
                {...register("phone", { required: "Phone is required" })}
              />
              <div className="grid md:grid-cols-2 gap-6">
                <InputWithLabel
                  label="Secret Key"
                  id="create_password"
                  type="password"
                  placeholder="Password"
                  error={errors.create_password}
                  labelIcon={<LockIcon className="size-4" />}
                  {...register("create_password", { required: "Required" })}
                />
                <InputWithLabel
                  label="Confirm Key"
                  id="confirm_password"
                  type="password"
                  placeholder="Confirm"
                  error={errors.confirm_password}
                  labelIcon={<LockIcon className="size-4" />}
                  {...register("confirm_password", {
                    required: "Required",
                    validate: (val) => val === password || "Mismatch"
                  })}
                />
              </div>
            </div>

            <div className="p-5 rounded-3xl bg-primary/5 border border-primary/10 flex gap-4 items-center">
              <Info className="text-primary size-5 shrink-0" />
              <p className="text-[10px] font-technical font-black uppercase tracking-widest leading-relaxed text-on-surface-variant">
                We'll sync one-time verification to secure your <span className="text-primary">Journal Access</span>.
              </p>
            </div>

            <label className="flex items-start gap-4 cursor-pointer group px-2">
              <input type="checkbox" className="size-5 rounded-full border-on-surface/10 text-primary focus:ring-primary/20 transition-all cursor-pointer mt-1" {...register("terms", { required: "Terms acceptance required" })} />
              <span className="text-[10px] font-technical font-black uppercase tracking-widest text-on-surface-variant opacity-60 group-hover:opacity-100 transition-opacity leading-relaxed">
                I agree to the Living Journal Terms of Service and Privacy Policy
              </span>
            </label>

            <Button
              disabled={isSubmitting}
              title={isSubmitting ? "Generating..." : "Create Account"}
            />
          </form>

          <p className="text-center text-sm font-medium text-on-surface-variant">
            Already have a journal?{" "}
            <button 
              onClick={() => navigate("/login")}
              className="font-black text-primary hover:underline"
            >
              Sign In
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
