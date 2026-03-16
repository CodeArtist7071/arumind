import { EyeClosed, Mail } from "lucide-react";
import { InputWithLabel } from "./ui/InputWithLabel";
import { Button } from "./ui/Button";
import { useForm } from "react-hook-form";
import { supabase } from "../utils/supabase";
import { useEffect, useState } from "react";
import { StatusBanner } from "./ui/StatusBanner";
import { Navigate, useNavigate } from "react-router";

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
      // Attempt to set session with magic link token
      supabase.auth
        .setSession({
          access_token: accessToken,
          refresh_token: "",
        })
        .then(({ error }) => {
          setLoading(false);
          if (error) {
            if (error.message.includes("Email not confirmed")) {
              setErrorMessage("Please verify your email before logging in.");
            } else {
              setErrorMessage(error.message);
            }
          } else {
            // Successfully logged in, redirect to dashboard
            isSubmitting;
            navigate("/dashboard");
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
    setLoading(true);
    setError(null); // clear previous errors

    try {
      // Sign in with Supabase
      const { data, error } = await supabase.auth.signInWithPassword({
        email: info.email,
        password: info.password,
      });
      setError(error);
    } catch (error) {
      if (error) {
        // Show error banner
        console.log("Login error:", error);
        setError(error);
        return;
      }
    }
  };

  const handleGoogleSignIn = async () => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: "https://aru-edu.artististysn.workers.dev/confirm-oauth", // change for prod
      },
    });

    if (error) {
      console.error("Google login error:", error.message);
      return;
    }

    console.log("Redirecting to Google login...", data);
  };

  return (
    <div className="bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-slate-100 min-h-screen flex flex-col">
      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md">
          <div className="bg-white dark:bg-slate-900 shadow-xl shadow-slate-200/50 dark:shadow-none rounded-xl p-8 border border-slate-100 dark:border-slate-800">
            <h1 className="text-2xl text-center font-bold text-slate-900 dark:text-white mb-2">
              Welcome Back
            </h1>
            <p className="text-slate-500 mb-5 text-center dark:text-slate-400 text-sm">
              Login to continue your exam preparation journey
            </p>

            {error && <StatusBanner status={error} />}

            <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
              <InputWithLabel
                label="Email Address"
                type="email"
                id="email"
                placeholder="name@student.com"
                error={errors.email}
                labelIcon={<Mail className="text-slate-400" />}
                {...register("email", {
                  required: "Email is required",
                  pattern: {
                    value: /^\S+@\S+\.\S+$/,
                    message: "Enter a valid email",
                  },
                })}
              />
              <InputWithLabel
                {...register("password")}
                label="Password"
                id="password"
                {...register("password", {
                  required: "Password is required",
                  minLength: {
                    value: 6,
                    message: "Invalid Pasword",
                  },
                })}
                icon={<EyeClosed color="black" size={20} />}
                error={errors.password}
              />

              {/* Remember Me */}
              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  <input
                    id="remember-me"
                    name="remember-me"
                    type="checkbox"
                    className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary transition-all"
                  />
                  <label
                    htmlFor="remember-me"
                    className="ml-2 block text-sm text-slate-600 dark:text-slate-400"
                  >
                    Remember me for 30 days
                  </label>
                </div>
                <a className="text-blue-800 text-sm cursor-pointer">Forget Password.?</a>
              </div>

              {/* Sign In Button */}
              <Button
                disabled={isSubmitting}
                title={isSubmitting ? "Submitting" : "Sign In"}
              />
            </form>

            {/* Divider */}
            <div className="relative my-8">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200 dark:border-slate-800"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white dark:bg-slate-900 text-slate-500">
                  Or continue with
                </span>
              </div>
            </div>

            {/* Google Login */}
            <div className="grid grid-cols-1 gap-3">
              <button
                onClick={handleGoogleSignIn}
                className="flex items-center justify-center gap-3 w-full px-4 py-2.5 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
                <span>Google</span>
              </button>
            </div>

            {/* Footer Link */}
            <p className="mt-8 text-center text-sm text-slate-600 dark:text-slate-400">
              Don't have an account?{" "}
              <a
                href="#"
                className="font-semibold text-primary hover:underline"
              >
                Create an account
              </a>
            </p>
          </div>

          {/* Extra Links */}
          <div className="mt-8 flex justify-center gap-6 text-xs text-slate-500 dark:text-slate-400">
            <a href="#" className="hover:text-primary transition-colors">
              Privacy Policy
            </a>
            <a href="#" className="hover:text-primary transition-colors">
              Terms of Service
            </a>
            <a href="#" className="hover:text-primary transition-colors">
              Contact Support
            </a>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 px-6 text-center text-slate-500 text-xs">
        © 2024 Odisha Exam Prep. All rights reserved.
        <br className="md:hidden" />
        Dedicated to excellence in administrative and technical exam
        preparation.
      </footer>
    </div>
  );
};

export default Login;
