import { EyeClosed, Mail, Notebook } from "lucide-react";
import { InputWithLabel } from "./ui/InputWithLabel";
import { Button } from "./ui/Button";
import { useForm } from "react-hook-form";
import { supabase } from "../utils/supabase";
import { useEffect, useState } from "react";
import { StatusBanner } from "./ui/StatusBanner";
import { useNavigate } from "react-router";

interface LoginProps {
  email: string;
  password: string;
}

const Login = () => {
  const navigate = useNavigate();
  const [error, setError] = useState<any>();
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const accessToken = urlParams.get("access_token");

    if (accessToken) {
      supabase.auth
        .setSession({
          access_token: accessToken,
          refresh_token: "",
        })
        .then(({ error }) => {
          setLoading(false);
          if (error) {
            setErrorMessage(error.message);
          } else {
            navigate("/user/dashboard");
          }
        });
    } else {
      setLoading(false);
    }
  }, [navigate]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginProps>({ mode: "onChange" });

  const onSubmit = async (info: LoginProps) => {
    setError(null);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: info.email,
        password: info.password,
      });
      
      if (error) {
        setError(error);
        return;
      }

      if (data.session) {
        navigate("/user/dashboard");
      }
    } catch (err) {
      setError(err);
    }
  };

  const handleGoogleSignIn = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/user/confirm-oauth`,
      },
    });
  };

  return (
    <div className="flex flex-col items-center justify-center p-6 lg:p-12 min-h-screen">
      <div className="w-full max-w-md space-y-12">
        {/* Brand Header */}
        <div className="text-center space-y-4">
          <div className="inline-flex size-14 bg-primary/10 rounded-2xl items-center justify-center text-primary shadow-sm mx-auto">
            <Notebook className="size-8" />
          </div>
          <div>
            <h1 className="text-4xl font-black tracking-tighter text-on-surface">Welcome Back</h1>
            <p className="text-[10px] font-technical font-black uppercase tracking-[0.3em] text-on-surface-variant opacity-40">The Living Journal awaits</p>
          </div>
        </div>

        {/* Card */}
        <div className="bg-surface p-10 rounded-[3rem] shadow-ambient border border-on-surface/5 space-y-8 animate-reveal">
          {error && <StatusBanner status={error} />}
          {errorMessage && <div className="p-4 bg-primary/5 text-primary text-[10px] font-technical font-black uppercase tracking-widest rounded-xl text-center">{errorMessage}</div>}
          
          {/* Google Identity Ritual (Social First) */}
          <div className="space-y-8 animate-reveal">
            <button
              onClick={handleGoogleSignIn}
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
                <span className="px-4 bg-surface text-on-surface-variant opacity-30">Manifest via Journal</span>
              </div>
            </div>
          </div>

          <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
            <InputWithLabel
              label="Journal Email"
              type="email"
              id="email"
              placeholder="name@student.com"
              error={errors.email}
              labelIcon={<Mail className="size-4" />}
              {...register("email", {
                required: "Email is required",
                pattern: { value: /^\S+@\S+\.\S+$/, message: "Invalid email" }
              })}
            />
            <InputWithLabel
              label="Secret Key"
              id="password"
              type="password"
              placeholder="••••••••"
              error={errors.password}
              labelIcon={<EyeClosed className="size-4" />}
              {...register("password", { required: "Password is required" })}
            />

            <div className="flex justify-between items-center px-2">
              <label className="flex items-center gap-2 cursor-pointer group">
                <input type="checkbox" className="size-4 rounded-full border-on-surface/10 text-primary focus:ring-primary/20 transition-all cursor-pointer" />
                <span className="text-[10px] font-technical font-black uppercase tracking-widest text-on-surface-variant opacity-60 group-hover:opacity-100 transition-opacity">Stay Logged In</span>
              </label>
              <button type="button" className="text-[10px] font-technical font-black uppercase tracking-widest text-primary hover:underline">Lost Key?</button>
            </div>

            <Button
              disabled={isSubmitting}
              title={isSubmitting ? "Authenticating..." : "Open Journal"}
            />
          </form>
        </div>

        {/* Footer Links */}
        <div className="text-center space-y-6">
          <p className="text-sm font-medium text-on-surface-variant">
            Don't have a journal yet?{" "}
            <button 
              onClick={() => navigate("/register")}
              className="font-black text-primary hover:underline transition-all"
            >
              Begin Journey
            </button>
          </p>
          <div className="flex justify-center gap-8 text-[9px] font-technical font-black uppercase tracking-[0.2em] text-on-surface-variant opacity-40">
            <a href="#" className="hover:opacity-100 transition-opacity">Privacy</a>
            <a href="#" className="hover:opacity-100 transition-opacity">Terms</a>
            <a href="#" className="hover:opacity-100 transition-opacity">Help</a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
