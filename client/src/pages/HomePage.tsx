import { 
  Verified, 
  ChevronRight, 
  ArrowRight, 
  Notebook, 
  GalleryHorizontal, 
  User2Icon, 
  NotebookPen, 
  Presentation,
  TrendingUp,
  Award,
  Zap,
  Globe
} from "lucide-react";
import React, { useState, useEffect } from "react";
import Footer from "../components/Footer";
import { Header } from "../components/Header";
import { useNavigate } from "react-router-dom";

const Hompage = () => {
  const navigate = useNavigate();

  const featuresData = [
    {
      icon: <Notebook className="size-6" />,
      title: "Daily Mock Tests",
      desc: "Simulate the real exam experience with daily tests based on the latest OPSC and OSSC exam patterns.",
      tag: "Active Cycle"
    },
    {
      icon: <GalleryHorizontal className="size-6" />,
      title: "Comprehensive Material",
      desc: "Access curated PDF notes, previous year question banks, and localized current affairs for Odisha.",
      tag: "Curated"
    },
    {
      icon: <TrendingUp className="size-6" />,
      title: "Personalized Analytics",
      desc: "Track your performance with detailed reports highlighting your strengths and areas needing improvement.",
      tag: "AI Powered"
    }
  ];

  return (
    <div className="min-h-screen bg-surface text-on-surface font-narrative overflow-x-hidden animate-reveal transition-colors duration-700">
      <Header />
      
      <main>
        {/* Editorial Hero Section */}
        <section className="relative pt-20 pb-32 px-6 lg:px-12 max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-10 relative z-10">
              <div className="inline-flex items-center gap-3 bg-primary/5 text-primary px-4 py-1.5 rounded-full text-[10px] font-technical font-black uppercase tracking-[0.2em] animate-greeting">
                <Verified size={14} />
                Odisha's 1st AI Focus Journal
              </div>
              
              <h1 className="text-7xl lg:text-8xl font-black leading-[0.85] tracking-tighter text-on-surface animate-greeting">
                Ace Your <span className="text-primary italic font-serif -ml-2 lg:-ml-4">Mind</span> <br />
                Conquer Tests.
              </h1>
              
              <p className="text-on-surface-variant max-w-lg text-xl lg:text-2xl leading-relaxed opacity-0 animate-greeting-delay font-medium">
                Comprehensive coaching and real-time mock tests for <span className="text-primary font-black border-b-2 border-primary/20">OPSC</span> & <span className="text-primary font-black border-b-2 border-primary/10">OSSC</span> aspirants. 
              </p>

              <div className="flex flex-wrap gap-6 pt-4 opacity-0 animate-greeting-delay">
                <button 
                  onClick={() => navigate("/register")}
                  className="bg-linear-to-r from-primary to-primary-container text-on-primary px-10 py-5 rounded-full text-xs font-technical font-black uppercase tracking-[0.2em] shadow-xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all duration-300"
                >
                  Begin Your Journey
                </button>
                <div className="flex items-center gap-4 px-6 py-5 rounded-full bg-surface-container-low shadow-ambient group cursor-pointer hover:bg-white transition-all duration-500">
                   <div className="size-10 bg-primary/10 rounded-full flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                      <Presentation size={18} />
                   </div>
                   <span className="text-[10px] font-technical font-black uppercase tracking-widest text-on-surface-variant group-hover:text-primary transition-colors">Free Orientation</span>
                </div>
              </div>

              <div className="flex items-center gap-6 pt-8 opacity-0 animate-greeting-delay">
                <div className="flex -space-x-3">
                  {[1,2,3,4].map(i => (
                    <div key={i} className="size-12 rounded-full border-4 border-surface overflow-hidden bg-surface-container-high shadow-sm">
                      <img src={`https://i.pravatar.cc/100?img=${i+10}`} alt="user" className="size-full object-cover" />
                    </div>
                  ))}
                </div>
                <div className="flex flex-col">
                  <span className="text-2xl font-technical font-black text-on-surface tracking-tighter leading-none">52,480+</span>
                  <span className="text-[9px] font-technical font-black uppercase tracking-widest text-on-surface-variant opacity-40">Verified Aspirants</span>
                </div>
              </div>
            </div>

            <div className="relative lg:scale-110 translate-x-12 opacity-0 animate-greeting-delay">
              <div className="absolute inset-0 bg-primary/5 rounded-[4rem] -rotate-3 translate-x-4 translate-y-4" />
              <div className="relative aspect-4/5 bg-surface-container-low rounded-[4rem] overflow-hidden shadow-ambient group border-8 border-surface-container-lowest">
                <img 
                  src="https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?q=80&w=1974&auto=format&fit=crop" 
                  alt="Journaling" 
                  className="size-full object-cover group-hover:scale-105 transition-transform duration-3000"
                />
                <div className="absolute inset-0 bg-linear-to-t from-on-surface/40 to-transparent opacity-60" />
                <div className="absolute bottom-10 left-10 text-white">
                  <p className="text-[10px] font-technical font-black uppercase tracking-[0.4em] mb-2 opacity-80">Next Intake</p>
                  <p className="text-4xl font-black tracking-tighter leading-none">Sept 2024</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Tonal Sectioning: Target Landscapes */}
        <section className="bg-surface-container-low pt-32 pb-40 relative">
          <div className="max-w-7xl mx-auto px-6 lg:px-12">
            <div className="flex flex-col lg:flex-row justify-between items-end gap-8 mb-20">
              <div className="space-y-4">
                <h3 className="text-[11px] font-technical font-black uppercase tracking-[0.4em] text-primary">Landscape Discovery</h3>
                <h2 className="text-5xl lg:text-6xl font-black tracking-tighter text-on-surface leading-none">
                  What defines your <br /> <span className="italic font-serif">Horizon?</span>
                </h2>
              </div>
              <p className="text-on-surface-variant max-w-sm text-lg font-medium opacity-60 leading-relaxed">
                Choose your specific target path. Our AI identifies the most critical nodes for your success.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {[
                { name: "OPSC", desc: "Group A & B Civil Services, Medical & Judicial excellence.", icon: <Award className="size-8" /> },
                { name: "OSSC", desc: "Combined Graduate Level (CGL) and specialized technical cadres.", icon: <Zap className="size-8" /> },
                { name: "OSSSC", desc: "RI, ARI, Amin, and vital field administration roles.", icon: <Globe className="size-8" /> }
              ].map((exam, i) => (
                <div key={i} className="bg-surface p-10 rounded-[3rem] shadow-ambient hover-bloom group cursor-pointer relative overflow-hidden transition-colors duration-500">
                   <div className="size-16 bg-surface-container-low rounded-2xl flex items-center justify-center text-primary mb-8 group-hover:bg-primary group-hover:text-on-primary transition-all duration-500 shadow-sm">
                      {exam.icon}
                   </div>
                   <h4 className="text-3xl font-black text-on-surface mb-4 tracking-tighter">{exam.name}</h4>
                   <p className="text-sm text-on-surface-variant font-medium leading-relaxed opacity-60 mb-10">
                    {exam.desc}
                   </p>
                   <div className="pt-8 border-t border-on-surface/5 flex justify-between items-center group-hover:border-primary/20 transition-colors">
                      <span className="text-[10px] font-technical font-black uppercase tracking-widest text-primary">Explore Syllabus</span>
                      <ArrowRight className="size-5 text-on-surface-variant opacity-20 group-hover:opacity-100 group-hover:translate-x-2 transition-all duration-500" />
                   </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Feature Pods: Intentional Asymmetry */}
        <section className="py-40 max-w-7xl mx-auto px-6 lg:px-12">
          <div className="grid lg:grid-cols-12 gap-16 items-center">
            <div className="lg:col-span-5 space-y-12">
               <div className="space-y-4">
                <h3 className="text-[11px] font-technical font-black uppercase tracking-[0.4em] text-primary">Growth Architecture</h3>
                <h2 className="text-5xl font-black tracking-tighter text-on-surface leading-tight">
                  A learning experience that <span className="text-primary italic">breathes.</span>
                </h2>
              </div>
              
              <div className="space-y-8">
                {featuresData.map((f, i) => (
                  <div key={i} className="flex gap-8 group">
                    <div className="size-14 bg-surface-container-low rounded-2xl flex items-center justify-center text-primary group-hover:shadow-lg transition-shadow">
                      {f.icon}
                    </div>
                    <div className="space-y-2">
                       <div className="flex items-center gap-3">
                         <h4 className="text-xl font-black text-on-surface tracking-tight">{f.title}</h4>
                         <span className="text-[8px] font-technical font-black uppercase tracking-widest text-tertiary px-2 py-0.5 bg-tertiary/10 rounded-full">{f.tag}</span>
                       </div>
                       <p className="text-on-surface-variant text-sm font-medium leading-relaxed opacity-60">{f.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="lg:col-span-7 grid grid-cols-2 gap-8 translate-y-12">
              <div className="space-y-8 pt-20">
                <div className="aspect-square bg-surface-container-high rounded-[3rem] overflow-hidden shadow-ambient hover-bloom">
                   <img src="https://images.unsplash.com/photo-1434030216411-0b793f4b4173?q=80&w=2070&auto=format&fit=crop" alt="study" className="size-full object-cover" />
                </div>
                <div className="bg-primary p-12 rounded-[3.5rem] text-on-primary shadow-xl shadow-primary/20">
                   <p className="text-5xl font-technical font-black tracking-tighter mb-2">98<span className="text-xl opacity-60">%</span></p>
                   <p className="text-[10px] font-technical font-black uppercase tracking-widest leading-relaxed">Syllabus <br /> Penetration Rate</p>
                </div>
              </div>
              <div className="space-y-8">
                 <div className="bg-surface-container-highest p-10 rounded-[3.5rem] shadow-ambient overflow-hidden relative group">
                    <div className="absolute -top-4 -right-4 size-24 bg-primary/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-1000" />
                    <NotebookPen className="size-10 text-primary mb-6" />
                    <p className="text-sm font-bold text-on-surface leading-relaxed">Personalized focus timers and session-tracking journals.</p>
                 </div>
                 <div className="aspect-3/4 bg-surface-container-low rounded-[3.5rem] overflow-hidden shadow-ambient hover-bloom">
                    <img src="https://images.unsplash.com/photo-1517842645767-c639042777db?q=80&w=2070&auto=format&fit=crop" alt="notes" className="size-full object-cover" />
                 </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section: The Big Journal Entry */}
        <section className="max-w-7xl mx-auto px-6 lg:px-12 pb-32">
          <div className="bg-linear-to-br from-primary to-primary-container rounded-[4rem] p-16 lg:p-24 relative overflow-hidden text-center lg:text-left">
            <div className="absolute top-0 right-0 p-20 opacity-10 animate-pulse">
               <Notebook size={300} className="text-on-primary" />
            </div>
            
            <div className="grid lg:grid-cols-2 gap-12 items-center relative z-10">
              <div className="space-y-6">
                <h3 className="text-4xl lg:text-6xl font-black text-on-primary tracking-tighter leading-none">
                  Ready to draft your <br /> <span className="italic">Success?</span>
                </h3>
                <p className="text-on-primary/80 text-xl font-medium max-w-md">
                  Join Odisha's most intentional learning community and secure your government career.
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-6 lg:justify-end">
                <button 
                  onClick={() => navigate("/register")}
                  className="bg-surface-container-lowest text-primary px-10 py-5 rounded-full text-[11px] font-technical font-black uppercase tracking-[0.3em] shadow-xl hover:scale-105 active:scale-95 transition-all"
                >
                  Create Account
                </button>
                <button className="bg-transparent border-2 border-on-primary/30 text-on-primary px-10 py-5 rounded-full text-[11px] font-technical font-black uppercase tracking-[0.3em] hover:bg-on-primary/10 transition-all">
                  Consult Faculty
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Hompage;
