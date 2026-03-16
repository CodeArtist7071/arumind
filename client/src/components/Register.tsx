import {
  ArrowUpAZIcon,
  CheckCheckIcon,
  Info,
  LockIcon,
  Mail,
  Phone,
  User,
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
  const [userData, setUserData] = useState<any>();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting, isValid },
  } = useForm<RegisterProps>({
    mode: "onChange",
  });

  const password = watch("create_password");

  async function onSubmit(details: RegisterProps) {
    const { data, error } = await supabase.auth.signUp({
      email: details.email,
      password: details.create_password,
      options: {
        emailRedirectTo:
          "https://aru-edu.artististysn.workers.dev/login",
        data: {
          phone: details.phone,
          name: details.name,
        },
      },
    });

    if (data.user?.aud === "authenticated") {
      navigate("/user/dashboard");
    }

    setUserData(data.user);

    if (error) {
      console.log(error);
    }
  }

  return (
    <div className="bg-background-light container dark:bg-background-dark font-display text-slate-900 dark:text-slate-100 min-h-screen">
      <div className="grid grid-cols-2">
        {/* LEFT PANEL */}
        <div className="bg-blue-500 h-screen px-10 flex items-center justify-center">
          <div className="flex flex-col">
            <h2 className="text-4xl text-white font-bold">
              Unlock Your Potential with Personalized Coaching.
            </h2>

            <p className="text-white mt-5 mb-10">
              "The beautiful thing about learning is that no one can take it away from you."
            </p>

            <div className="text-white">
              <div className="flex items-center my-2">
                <CheckCheckIcon />
                <div className="ml-2">
                  <p className="font-semibold">Curated Content</p>
                  <p>Expert-led courses for OPSC & OSSC.</p>
                </div>
              </div>

              <div className="flex items-center my-2">
                <ArrowUpAZIcon
                  color="white"
                  size={20}
                  className="bg-blue-400 w-5 h-5"
                />
                <div className="ml-2">
                  <p className="font-semibold">Real-time Progress</p>
                  <p>Track your performance with advanced analytics.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div className="flex flex-1 flex-col justify-center px-6 lg:px-24">
          <div className="mx-auto w-full h-screen overflow-y-auto max-w-120">
            <div className="mb-10">
              <h2 className="text-3xl font-extrabold mb-2">
                Create Account
              </h2>

              <p className="text-slate-500">
                Join thousands of students preparing for success.
              </p>
            </div>

            <form className="space-y-5 mb-10" onSubmit={handleSubmit(onSubmit)}>
              <div className="grid grid-cols-1 gap-5">

                {/* NAME */}
                <InputWithLabel
                  label="Full Name"
                  id="name"
                  placeholder="John Doe"
                  error={errors.name}
                  labelIcon={<User className="text-slate-400" />}
                  {...register("name", {
                    required: "Full name is required",
                    minLength: {
                      value: 3,
                      message: "Name must be at least 3 characters",
                    },
                  })}
                />

                {/* EMAIL */}
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

                {/* PHONE */}
                <InputWithLabel
                  label="Phone Number"
                  type="tel"
                  id="phone"
                  placeholder="00000 00000"
                  error={errors.phone}
                  labelIcon={<Phone className="text-slate-400" />}
                  {...register("phone", {
                    required: "Phone number is required",
                    pattern: {
                      value: /^[6-9]\d{9}$/,
                      message: "Enter 10 digits phone number",
                    },
                  })}
                />

                {/* PASSWORD */}
                <InputWithLabel
                  label="Create Password"
                  id="create_password"
                  type="password"
                  placeholder="Create your password"
                  error={errors.create_password}
                  labelIcon={<LockIcon />}
                  {...register("create_password", {
                    required: "Password is required",
                    minLength: {
                      value: 6,
                      message: "Minimum 6 characters required",
                    },
                  })}
                />

                {/* CONFIRM PASSWORD */}
                <InputWithLabel
                  label="Confirm Password"
                  id="confirm_password"
                  type="password"
                  placeholder="Confirm your password"
                  error={errors.confirm_password}
                  labelIcon={<LockIcon />}
                  {...register("confirm_password", {
                    required: "Confirm your password",
                    validate: (value) =>
                      value === password || "Passwords do not match",
                  })}
                />
              </div>

              {/* INFO BOX */}
              <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex gap-3 items-center">
                <Info />
                <p className="text-xs text-slate-600">
                  We'll send a <span className="font-bold text-primary">One-Time Password (OTP)</span> to verify your account.
                </p>
              </div>

              {/* TERMS */}
              <div className="flex items-start gap-3 py-2">
                <input
                  type="checkbox"
                  {...register("terms", {
                    required: "You must accept terms Terms and Conditions",
                  })}
                />

                <label className="text-sm text-slate-500">
                  I agree to the Terms of Service and Privacy Policy
                </label>
              </div>

              {errors.terms && (
                <p className="text-red-500 text-sm">
                  {errors.terms.message}
                </p>
              )}

              {/* SUBMIT */}
              <Button
                disabled={isSubmitting}
                type="submit"
                title={isSubmitting ? "Creating Account..." : "Create Account"}
              />
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;