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
