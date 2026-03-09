import {
  ArrowUpAZIcon,
  Check,
  CheckCheckIcon,
  EyeClosed,
  Info,
  Lock,
  LockIcon,
  Mail,
  Phone,
  User,
} from "lucide-react";
import { InputWithLabel } from "./ui/InputWithLabel";
import { MultiSelect } from "./ui/MultiSelect";
import { Button } from "./ui/Button";
import { useForm, Watch } from "react-hook-form";
import supabase from "../utils/supabase";
import { useState } from "react";
import { useNavigate } from "react-router";

interface RegisterProps {
  name: string;
  email: string;
  phone: string;
  create_password: string;
  confirm_password: string;
}

const Register = () => {
  const [userData, setUserData] = useState<any>();
  const navigate = useNavigate();
  const id = '252cfb73-3a8a-4c56-845a-e595dd2ee753';
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RegisterProps>();
  const password = watch("create_password");
  const confirmPassword = watch("confirm_password");

  const passwordMatch = confirmPassword && password === confirmPassword;

  async function onSubmit(details:RegisterProps) {
    console.log("details",details)
   const {data,error} = await supabase.auth.signUp({
    email:details.email,
    phone:details.phone,
    password:details.confirm_password,
    options:{
      emailRedirectTo:"https://codeartist7071.github.io/#/login",
    }
   })
   if(data.user?.aud === "authenticated"){
     navigate('/user/dashboard');
   }
   console.log(data);
   setUserData(data.user)
   if(error){
    console.log(error)
   }
  }

  return (
    <div className="bg-background-light container dark:bg-background-dark font-display text-slate-900 dark:text-slate-100 min-h-screen">
      <div className="grid grid-cols-2">
        <div className="bg-blue-500 h-screen px-10 flex items-center justify-center ">
          {/* <div className="">
            <div className="">
              <span className="">school</span>
              <h1 className="">
                StudentPortal
              </h1>
            </div>
          </div> */}

          <div className="flex flex-col">
            <div className="">
              <h2 className="text-4xl text-white font-bold">
                Unlock Your Potential with Personalized Coaching.
              </h2>
              <p className="text-white mt-5 mb-10">
                "The beautiful thing about learning is that no one can take it
                away from you."
              </p>
              <div className="text-white">
                <div className="flex items-center my-2">
                  <CheckCheckIcon />
                  <div>
                    <p className="text-white font-semibold">Curated Content</p>
                    <p className="">Expert-led courses for OPSC &amp; OSSC.</p>
                  </div>
                </div>
                <div className="flex items-center my-2">
                  <ArrowUpAZIcon
                    color="white"
                    size={20}
                    className="bg-blue-400 w-5 h-5 text-white"
                  />
                  <div>
                    <p className="font-semibold">Real-time Progress</p>
                    <p className="">
                      Track your performance with advanced analytics.
                    </p>
                  </div>
                </div>
              </div>

              <div className="text-white absolute bottom-20 translate-x-[35%]">
                <p className="text-center text-slate-400 text-sm">
                  Trust by over 50,000+ students across Odisha
                </p>
                <div className="mt-4 flex justify-center gap-6 opacity-50 grayscale hover:grayscale-0 transition-all duration-300">
                  <div className="h-6 w-20 bg-slate-400 rounded-md"></div>
                  <div className="h-6 w-20 bg-slate-400 rounded-md"></div>
                  <div className="h-6 w-20 bg-slate-400 rounded-md"></div>
                </div>
                <p className="mt-10">
                  {" "}
                  © 2024 StudentPortal. Dedicated to student success.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-1 flex-col justify-center px-6 lg:px-24 bg-background-light dark:bg-background-dark">
          <div className="mx-auto w-full h-screen overflow-y-auto max-w-120">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-2 lg:hidden">
                <span className="material-symbols-outlined text-primary text-3xl">
                  school
                </span>
                <span className="font-bold text-xl">StudentPortal</span>
              </div>
              <div className="text-sm">
                <span className="text-slate-500">Already a member?</span>
                <a
                  className="text-primary font-semibold hover:underline ml-1"
                  href="#"
                >
                  Login
                </a>
              </div>
            </div>

            <div className="mb-10">
              <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white mb-2 tracking-tight">
                Create Account
              </h2>
              <p className="text-slate-500 dark:text-slate-400">
                Join thousands of students preparing for success.
              </p>
            </div>

            {/* <div className="mb-8">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold text-primary">
                  Step 1: Personal Details
                </span>
                <span className="text-sm text-slate-400 font-medium">
                  33% Complete
                </span>
              </div>
              <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                <div className="bg-primary h-full w-1/3 transition-all duration-500"></div>
              </div>
            </div> */}

            <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
              <div className="grid grid-cols-1 gap-5">
                <InputWithLabel
                  label={"Full Name"}
                  id={"name"}
                  {...register("name")}
                  placeholder="Jhon Doe"
                  labelIcon={<User className="text-slate-400" />}
                />
                <InputWithLabel
                  label="Email Address"
                  type="email"
                  id="email"
                  {...register("email")}
                  placeholder="name@student.com"
                  labelIcon={<Mail className="text-slate-400" />}
                />
                <InputWithLabel
                  label="Phone Number"
                  type="tel"
                  id="phone"
                  prefix="+ 91"
                  {...register("phone")}
                  placeholder="00000 00000"
                  labelIcon={
                    <div className="flex items-center">
                      <Phone className="text-slate-400" />
                      {/* <span> +91</span> */}
                    </div>
                  }
                />

                {/* <div className="space-y-2">
                  <MultiSelect
                    multiple
                    children={
                      <>
                        <option value="OPSC">OPSC</option>
                        <option value="OPSC">ASO</option>
                      </>
                    }
                    id={""}
                    label={"Select Exams"}
                  />
                  <div className="grid grid-cols-3 gap-3">
                    <label className="cursor-pointer">
                      <input
                        className="peer sr-only"
                        name="exam"
                        type="radio"
                      />
                      <div className="text-center py-3 rounded-xl border border-slate-200 dark:border-slate-700 peer-checked:border-primary peer-checked:bg-primary/5 peer-checked:text-primary transition-all">
                        <span className="text-sm font-bold">OPSC</span>
                      </div>
                    </label>

                    <label className="cursor-pointer">
                      <input
                        className="peer sr-only"
                        name="exam"
                        type="radio"
                      />
                      <div className="text-center py-3 rounded-xl border border-slate-200 dark:border-slate-700 peer-checked:border-primary peer-checked:bg-primary/5 peer-checked:text-primary transition-all">
                        <span className="text-sm font-bold">OSSC</span>
                      </div>
                    </label>

                    <label className="cursor-pointer">
                      <input
                        className="peer sr-only"
                        name="exam"
                        type="radio"
                      />
                      <div className="text-center py-3 rounded-xl border border-slate-200 dark:border-slate-700 peer-checked:border-primary peer-checked:bg-primary/5 peer-checked:text-primary transition-all">
                        <span className="text-sm font-bold">OSSSC</span>
                      </div>
                    </label>
                  </div>
                </div> */}
                <InputWithLabel
                  label={"Create Password"}
                  id={"create_password"}
                  type="password"
                  {...register("create_password")}
                  placeholder="Create your password"
                  labelIcon={<LockIcon />}
                />
                <InputWithLabel
                  label={"Confirm Password"}
                  id={"confirm_password"}
                  type="password"
                  {...register("confirm_password", {
                    validate: (value) =>
                      value === confirmPassword || "Passwords do not match",
                  })}
                  placeholder="Confirm your password"
                  labelIcon={<LockIcon />}
                />
              </div>

              <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex gap-3 items-center">
                <Info />
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  We'll send a{" "}
                  <span className="font-bold text-primary">
                    One-Time Password (OTP)
                  </span>{" "}
                  to your mobile and email for verification in the next step.
                </p>
              </div>

              <div className="flex items-start gap-3 py-2">
                <div className="flex h-5 items-center">
                  <input
                    className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                    id="terms"
                    name="terms"
                    type="checkbox"
                  />
                </div>
                <label
                  className="text-sm text-slate-500 dark:text-slate-400"
                  htmlFor="terms"
                >
                  I agree to the{" "}
                  <a
                    className="text-primary hover:underline font-medium"
                    href="#"
                  >
                    Terms of Service
                  </a>{" "}
                  and{" "}
                  <a
                    className="text-primary hover:underline font-medium"
                    href="#"
                  >
                    Privacy Policy
                  </a>
                  .
                </label>
              </div>
              <Button type="submit" title={isSubmitting ? "Creating Account":"Create Account"} />
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
