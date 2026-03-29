import React, { useEffect, useState } from 'react';
import { Target, Zap, Shield } from 'lucide-react';

interface SplashScreenProps {
  isVisible: boolean;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ isVisible }) => {
  const [shouldRender, setShouldRender] = useState(isVisible);
  const [animationClass, setAnimationClass] = useState('opacity-100');

  useEffect(() => {
    if (!isVisible) {
      setAnimationClass('opacity-0 pointer-events-none scale-105 blur-xl');
      const timer = setTimeout(() => setShouldRender(false), 1200);
      return () => clearTimeout(timer);
    } else {
      setShouldRender(true);
      setAnimationClass('opacity-100 scale-100 blur-0');
    }
  }, [isVisible]);

  if (!shouldRender) return null;

  return (
    <div className={`fixed inset-0 z-9999 bg-surface flex flex-col items-center justify-center transition-all duration-1000 ease-botanical overflow-hidden ${animationClass}`}>
      {/* Botanical Background Aura */}
      <div className="absolute inset-0 bg-linear-to-tr from-primary/5 via-surface to-secondary/5 opacity-50" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[120px] animate-pulse-slow" />
      
      {/* Central Manifestation */}
      <div className="relative z-10 flex flex-col items-center gap-10">
        <div className="relative group">
          {/* Animated Rings */}
          <div className="absolute -inset-8 bg-primary/10 rounded-full animate-ping opacity-20" />
          <div className="absolute -inset-16 bg-primary/5 rounded-full animate-pulse-slow opacity-10" />
          
          {/* Logo Hexagon Manifest */}
          <div className="size-32 bg-white dark:bg-surface-container-low rounded-[2.5rem] shadow-ambient flex items-center justify-center border border-on-surface/5 animate-reveal transform hover:rotate-12 transition-transform duration-1000">
             <Target className="size-16 text-primary animate-splash-bloom" />
          </div>
        </div>

        {/* Textual Identity */}
        <div className="text-center space-y-3 animate-reveal" style={{ animationDelay: '0.2s' }}>
          <h1 className="text-4xl font-black tracking-tighter text-on-surface">
            ARU<span className="text-primary">.EDU</span>
          </h1>
          <div className="flex items-center gap-4 justify-center">
             <div className="h-px w-8 bg-on-surface/10" />
             <p className="text-[10px] font-technical font-black uppercase tracking-[0.4em] text-on-surface-variant opacity-40">
               Digital Greenhouse
             </p>
             <div className="h-px w-8 bg-on-surface/10" />
          </div>
        </div>

        {/* Technical Progress Ritual */}
        <div className="mt-12 flex flex-col items-center gap-6 animate-reveal" style={{ animationDelay: '0.4s' }}>
           <div className="flex gap-10">
             <div className="flex flex-col items-center gap-2 opacity-20">
                <Zap className="size-4" />
                <span className="text-[8px] font-technical font-black uppercase tracking-widest">Hydrating</span>
             </div>
             <div className="flex flex-col items-center gap-2 opacity-20">
                <Shield className="size-4" />
                <span className="text-[8px] font-technical font-black uppercase tracking-widest">Authorized</span>
             </div>
           </div>
           
           {/* Minimal Progress Bar */}
           <div className="w-48 h-1 bg-on-surface/5 rounded-full overflow-hidden">
             <div className="h-full bg-primary/40 rounded-full animate-splash-progress" />
           </div>
        </div>
      </div>

      {/* Footer Branding */}
      <div className="absolute bottom-12 text-center opacity-20 animate-reveal" style={{ animationDelay: '0.6s' }}>
        <p className="text-[9px] font-technical font-black uppercase tracking-[0.2em]">
          Ecosystem Version 1.0 <span className="mx-2">•</span> 2024
        </p>
      </div>
    </div>
  );
};
