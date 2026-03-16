import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Coffee, BookOpen, Bell, Settings } from 'lucide-react';

export default function FocusTimer() {
  const [minutes, setMinutes] = useState(25);
  const [seconds, setSeconds] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [mode, setMode] = useState<'FOCUS' | 'BREAK'>('FOCUS');
  const [completedSessions, setCompletedSessions] = useState(0);
  
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (isActive) {
      timerRef.current = setInterval(() => {
        if (seconds > 0) {
          setSeconds(seconds - 1);
        } else if (minutes > 0) {
          setMinutes(minutes - 1);
          setSeconds(59);
        } else {
          // Timer finished
          handleTimerExpiry();
        }
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isActive, minutes, seconds]);

  const handleTimerExpiry = () => {
    setIsActive(false);
    if (mode === 'FOCUS') {
      setCompletedSessions(prev => prev + 1);
      setMode('BREAK');
      setMinutes(5);
      setSeconds(0);
      // Optional: Play sound or notification
    } else {
      setMode('FOCUS');
      setMinutes(25);
      setSeconds(0);
    }
  };

  const toggleTimer = () => setIsActive(!isActive);

  const resetTimer = () => {
    setIsActive(false);
    setMode('FOCUS');
    setMinutes(25);
    setSeconds(0);
  };

  const setTime = (mins: number) => {
    setIsActive(false);
    setMinutes(mins);
    setSeconds(0);
  };

  const progress = mode === 'FOCUS' 
    ? ((25 - minutes) * 60 + (60 - seconds)) / (25 * 60) * 100 
    : ((5 - minutes) * 60 + (60 - seconds)) / (5 * 60) * 100;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden relative group transition-all duration-300 hover:shadow-blue-500/10 hover:border-blue-500/30">
      <div className="absolute top-0 right-0 p-6">
        <button className="text-slate-400 hover:text-[#1a57db] transition-colors">
          <Settings size={20} />
        </button>
      </div>

      <div className="flex flex-col items-center text-center space-y-6">
        <div className="flex items-center gap-2 px-4 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-full text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
          {mode === 'FOCUS' ? (
            <>
              <BookOpen size={12} className="text-[#1a57db]" />
              Deep Work Session
            </>
          ) : (
            <>
              <Coffee size={12} className="text-emerald-500" />
              Rest & Recharge
            </>
          )}
        </div>

        <div className="relative size-48 flex items-center justify-center">
          {/* Progress Ring Background */}
          <svg className="absolute size-full -rotate-90">
            <circle
              cx="96"
              cy="96"
              r="88"
              fill="transparent"
              stroke="currentColor"
              strokeWidth="8"
              className="text-slate-100 dark:text-slate-800"
            />
            <circle
              cx="96"
              cy="96"
              r="88"
              fill="transparent"
              stroke="currentColor"
              strokeWidth="8"
              strokeDasharray={553}
              strokeDashoffset={553 - (553 * Math.min(progress, 100)) / 100}
              strokeLinecap="round"
              className={`${mode === 'FOCUS' ? 'text-[#1a57db]' : 'text-emerald-500'} transition-all duration-1000`}
            />
          </svg>
          
          <div className="z-10 bg-white dark:bg-slate-900 size-40 rounded-full flex flex-col items-center justify-center shadow-inner">
            <span className="text-5xl font-black tracking-tighter tabular-nums text-slate-900 dark:text-white">
              {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button 
            onClick={resetTimer}
            className="p-4 bg-slate-100 dark:bg-slate-800 rounded-2xl text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-all hover:scale-105 active:scale-95 shadow-sm"
          >
            <RotateCcw size={20} />
          </button>
          
          <button 
            onClick={toggleTimer}
            className={`p-6 ${isActive ? 'bg-amber-500 shadow-amber-500/20' : 'bg-[#1a57db] shadow-blue-500/20'} text-white rounded-[2.5rem] shadow-2xl hover:scale-110 active:scale-90 transition-all duration-300 group`}
          >
            {isActive ? <Pause size={32} fill="white" /> : <Play size={32} fill="white" className="ml-1" />}
          </button>

          <button className="p-4 bg-slate-100 dark:bg-slate-800 rounded-2xl text-slate-500 hover:text-[#1a57db] transition-all hover:scale-105 active:scale-95 shadow-sm">
            <Bell size={20} />
          </button>
        </div>

        <div className="pt-4 flex flex-col items-center gap-4 w-full">
            <div className="flex justify-center gap-2 w-full">
                <button 
                    onClick={() => setTime(25)}
                    className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${minutes === 25 && mode === 'FOCUS' ? 'bg-[#1a57db] text-white' : 'bg-slate-50 dark:bg-slate-800 text-slate-400'}`}
                >
                    25:00
                </button>
                <button 
                    onClick={() => setTime(15)}
                    className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${minutes === 15 ? 'bg-[#1a57db] text-white' : 'bg-slate-50 dark:bg-slate-800 text-slate-400'}`}
                >
                    15:00
                </button>
                <button 
                    onClick={() => setTime(50)}
                    className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${minutes === 50 ? 'bg-[#1a57db] text-white' : 'bg-slate-50 dark:bg-slate-800 text-slate-400'}`}
                >
                    50:00
                </button>
            </div>

            <div className="w-full h-px bg-slate-100 dark:bg-slate-800" />
            
            <div className="flex items-center gap-2 text-slate-500">
                <Trophy size={14} className="text-amber-500" />
                <span className="text-xs font-bold">{completedSessions} Sessions Completed Today</span>
            </div>
        </div>
      </div>
    </div>
  );
}

const Trophy = ({ size, className }: { size: number, className: string }) => (
    <svg 
        width={size} 
        height={size} 
        viewBox="0 0 24 24" 
        fill="none" 
        stroke="currentColor" 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        className={className}
    >
        <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
        <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
        <path d="M4 22h16" />
        <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
        <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
        <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
    </svg>
);
