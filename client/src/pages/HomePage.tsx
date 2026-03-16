import { BellAlertIcon } from "@heroicons/react/24/solid";
import {
  Antenna,
  ArrowRight,
  BanknoteIcon,
  Book,
  ChevronRight,
  GalleryHorizontal,
  NotebookPen,
  PlayCircle,
  Presentation,
  Tv,
  User2Icon,
  Verified,
} from "lucide-react";
import React, { useState, useEffect } from "react";
import Footer from "../components/Footer";
import { Header } from "../components/Header";
import {useNotifications } from "reapop";

interface featuresDataTypes {
  icon: Element | any;
  status: boolean;
  title: string;
  desc: string;
}

const featuresData: featuresDataTypes[] = [
  {
    icon: <Book />,
    status: true,
    title: "Daily Mock Tests",
    desc: "Simulate the real exam experience with daily tests based on the latest OPSC and OSSC exam patterns.",
  },
  {
    icon: <GalleryHorizontal />,
    status: true,
    title: "Comprehensive Material",
    desc: "Access curated PDF notes, previous year question banks, and localized current affairs for Odisha.",
  },

  {
    icon: <User2Icon />,
    status: true,
    title: "Personalized Analytics",
    desc: "Track your performance with detailed reports highlighting your strengths and areas needing improvement.",
  },
  {
    icon: <NotebookPen />,
    status: true,
    title: "Learn on the Go",
    desc: "Download videos and study material to learn anytime, anywhere with our high-speed mobile app.",
  },
  {
    icon: <Presentation />,
    status: false,
    title: "AI Expert Faculty",
    desc: "Learn from educators who have cracked these exams themselves. Get insights and shortcuts you won't find in textbooks.",
  },
  {
    icon: <Tv />,
    status: false,
    title: "Live Interactive Classes",
    desc: "Real-time doubt clearing sessions and interactive lectures to keep you engaged and on track.",
  },
];

const examData = [
  {
    icon: <BanknoteIcon />,
    title: "OPSC",
    desc: "Odisha Public Service Commission - Group A & B Civil Services, Medical & Judicial exams.",
  },
  {
    icon: "badge",
    title: "OSSC",
    desc: "Odisha Staff Selection Commission - Combined Graduate Level (CGL), CTS, and specialized cadres.",
  },
  {
    icon: "groups",
    title: "OSSSC",
    desc: "Odisha Sub-Ordinate Staff Selection Commission - RI, ARI, Amin, Forest Guard, and LSI.",
  },
];

const Hompage = () => {
  const { notify } = useNotifications();
  const [countdown, setCountdown] = useState({
    days: 2,
    hours: 14,
    minutes: 35,
  });

  useEffect(() => {

    const timer = setInterval(() => {
      setCountdown((prev) => {
        let { days, hours, minutes } = prev;
        if (minutes > 0) {
          minutes--;
        } else if (hours > 0) {
          hours--;
          minutes = 59;
        } else if (days > 0) {
          days--;
          hours = 23;
          minutes = 59;
        }
        return { days, hours, minutes };
      });
    }, 60000); // Update every minute

    return () => clearInterval(timer);
  }, []);

  const MaterialIcon = ({ name, className = "material-symbols-outlined" }) => (
    <span className={`${className} font-normal leading-none`}>{name}</span>
  );

  return (
    <div className="min-h-screen w-full flex flex-col overflow-x-hidden bg-linear-to-br from-orange-50 to-amber-50 dark:from-slate-900 dark:to-slate-950 text-slate-800 dark:text-slate-100 font-['Inter'] transition-colors duration-300">
      <Header />
      <main className="flex-1">
        {/* Hero Section */}
        <section className="max-w-7xl mx-auto px-6 py-12 lg:py-20">
          <div className="grid sm:grid-cols-1 md:grid-cols-2 gap-12">
            <div className="w-full">
              <div className="inline-flex items-center gap-2 bg-[#1e3a5f]/10 text-[#1e3a5f] px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                <Verified className="text-sm" />
                Odisha's #1 Learning Platform
              </div>
              <h1 className="text-5xl lg:text-6xl font-black leading-tight tracking-tight">
                Ace Your <span className="text-[#1e3a5f]">Odisha Govt</span>{" "}
                Exams
              </h1>
              <p className="text-slate-600 dark:text-slate-400 text-lg leading-relaxed max-w-135">
                Comprehensive coaching and real-time mock tests for OPSC, OSSC,
                and OSSSC aspirants. Join over 50,000 students achieving their
                dream government careers.
              </p>
              <div className="flex flex-wrap gap-4 mt-2">
                <button className="bg-[#1e3a5f] text-white px-8 py-4 rounded-lg text-lg font-bold shadow-lg shadow-[#1e3a5f]/20 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200">
                  Start Learning Now
                </button>
                <button className="dark:bg-slate-800 border border-slate-200 dark:border-slate-700 dark:text-white px-8 py-4 rounded-lg text-lg font-bold hover:bg-slate-50 dark:hover:bg-slate-700 transition-all duration-200 flex items-center gap-2">
                  <PlayCircle />
                  Free Demo Class
                </button>
              </div>
              <div className="flex items-center gap-4 text-sm text-slate-500 mt-4">
                <div className="flex -space-x-2">
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className="w-8 h-8 rounded-full bg-slate-300 border-2 border-white dark:border-slate-900 shadow-sm"
                      style={{
                        backgroundColor: `hsl(${300 + i * 50}, 40%, ${60 - i * 10}%)`,
                      }}
                    />
                  ))}
                </div>
                <span>
                  Trusted by <strong>10,000+</strong> successful candidates
                </span>
              </div>
            </div>
            <div className="w-full">
              <div className="relative rounded-2xl overflow-hidden shadow-2xl aspect-4/3 bg-slate-200 group">
                <div className="absolute inset-0 bg-linear-to-tr from-[#1e3a5f]/20 to-transparent" />
                <div
                  className="w-full h-full bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
                  style={{
                    backgroundImage:
                      'url("https://lh3.googleusercontent.com/aida-public/AB6AXuAQUenS4aOtdqIYCzU1M80UYchn7-IMxiZrWTbKYhRqLY-cmbrFDZr9wFv8O4TVc3yM4Gghx79lB6nHCN-wdrdqEEcU_tzAzT3SBbIqmvz8FGaE40zT_T3KkqmxT0V8Z4YyeAAxqoceWiYrKnqSvNlHyQJBYE11Y47vtMYx4Ydcm5bBptsGxDPIQHvew1PizByxJeTvjr3dbtyEzvTIIL3vdeRG5q8qZtc2NeG69WB3Jb_IYZ33t3myi9NcaV1-Gks_gTy_Ow6GPQ")',
                  }}
                />
                <div className="absolute bottom-6 left-6 right-6 backdrop-blur-md p-6 rounded-xl border border-white/20 shadow-xl bg-white/90 dark:bg-slate-900/90">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-slate-500 font-bold uppercase tracking-wide">
                        Next Batch Starts In
                      </p>
                      <p className="text-xl font-black text-[#1e3a5f]">
                        {countdown.days}d :{" "}
                        {countdown.hours.toString().padStart(2, "0")}h :{" "}
                        {countdown.minutes.toString().padStart(2, "0")}m
                      </p>
                    </div>
                    <div className="bg-[#1e3a5f] text-white p-3 rounded-lg">
                      <BellAlertIcon />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Target Exams */}
        <section className="py-16 bg-white/50 dark:bg-slate-900/50">
          <div className="max-w-7xl mx-auto px-6">
            <div className="flex flex-col md:flex-row md:items-start justify-between mb-10 gap-4">
              <div>
                <h2 className="text-[#1e3a5f] font-bold tracking-widest uppercase text-sm mb-2">
                  Target Exams
                </h2>
                <h3 className="text-3xl font-black dark:text-white">
                  What are you preparing for?
                </h3>
              </div>
              <a
                className="text-[#1e3a5f] font-bold flex items-center gap-1 hover:underline underline-offset-4"
                href="#"
              >
                View all exam categories <ChevronRight size={20} />
              </a>
            </div>
            <div className="grid sm:grid-cols-1 md:grid-cols-3 gap-6">
              {examData.map(({ icon, title, desc }, i) => (
                <div
                  key={i}
                  className="group flex flex-col gap-4 rounded-xl border border-slate-200 dark:border-slate-800 p-8 hover:border-[#1e3a5f] transition-all duration-200 hover:shadow-xl bg-white/70 dark:bg-slate-900/70"
                >
                  <div className="w-14 h-14 bg-[#1e3a5f]/10 text-[#1e3a5f] rounded-xl flex items-center justify-center group-hover:bg-[#1e3a5f] group-hover:text-white transition-colors duration-200">
                    {icon}
                  </div>
                  <div className="flex flex-col gap-2">
                    <h2 className="dark:text-white text-2xl font-black">
                      {title}
                    </h2>
                    <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">
                      {desc}
                    </p>
                  </div>
                  <button className="mt-4 flex items-center gap-2 text-[#1e3a5f] font-bold text-sm hover:translate-x-1 transition-transform">
                    Explore Courses <ArrowRight className="text-sm" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="max-w-7xl mx-auto px-6 py-20">
          <div className="text-center mb-16">
            <h2 className="text-[#1e3a5f] font-bold tracking-widest uppercase text-sm mb-2">
              Our Features
            </h2>
            <h3 className="text-4xl font-black dark:text-white">
              Why Choose Odisha Exam Prep?
            </h3>
            <p className="text-slate-600 dark:text-slate-400 mt-4 max-w-2xl mx-auto text-lg">
              We combine traditional teaching excellence with modern technology
              to deliver the most effective learning experience.
            </p>
          </div>
          <div className="grid sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
            {featuresData.map(({ icon, title, desc, status }, i) => (
              <div
                key={i}
                className={
                  status
                    ? "cursor-pointer flex flex-col  gap-5 p-4 hover:scale-[1.02] transition-transform duration-200"
                    : "cursor-not-allowed flex flex-col  gap-5 p-4 hover:scale-[1.02] transition-transform duration-200"
                }
              >
                <span className="flex justify-between items-center ">
                  <div className="w-12 h-12 bg-[#1e3a5f] rounded-lg flex items-center justify-center text-white shadow-lg">
                    {icon}
                  </div>
                  <p
                    className={
                      status
                        ? `bg-green-500 text-white px-3 py-1 text-xs rounded-full`
                        : `bg-yellow-500 text-white px-3 py-1 text-xs rounded-full`
                    }
                  >
                    {status ? "try yourself" : "coming soon"}
                  </p>
                </span>

                <div className="flex flex-col gap-2">
                  <h4 className="dark:text-white text-xl font-bold">{title}</h4>
                  <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
                    {desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* CTA Section */}
        <section className="max-w-7xl mx-auto px-6 py-10">
          <div className="bg-[#1e3a5f] rounded-3xl p-8 lg:p-16 flex flex-col lg:flex-row items-center justify-between gap-10">
            <div className="text-center lg:text-left">
              <h3 className="text-white text-3xl lg:text-4xl font-black mb-4">
                Ready to start your preparation?
              </h3>
              <p className="text-blue-100 text-lg">
                Join Odisha's most trusted learning community and secure your
                future.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-4">
              <button className="bg-white text-[#1e3a5f] px-8 py-4 rounded-xl text-lg font-bold hover:bg-slate-50 transition-all duration-200 shadow-lg">
                Get Started for Free
              </button>
              <button className="bg-transparent border-2 border-white text-white px-8 py-4 rounded-xl text-lg font-bold hover:bg-white/10 transition-all duration-200">
                Talk to Academic Expert
              </button>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Hompage;
