import React from "react";
import { GoogleCalendarButton } from "../ui/GoogleCalenderButton";
import { ArrowLeft, CalendarRange, Shield } from "lucide-react";

const GoogleCalendarModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center p-4 z-100">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        onClick={onClose}
      ></div>

      {/* Modal */}
      <div className="relative w-full max-w-md bg-white dark:bg-[#2d1e16] rounded-xl shadow-2xl overflow-hidden border border-slate-200 dark:border-white/10 z-10">
        {/* Header */}
        <div className="flex items-center p-4 border-b border-slate-100 dark:border-white/5">
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full text-slate-600 dark:text-slate-400"
          >
            <span className="material-symbols-outlined">
              <ArrowLeft className=""/>
            </span>
          </button>
        </div>

        <div className="px-8 pt-10 pb-12 flex flex-col items-center">
          {/* Icon */}
          <div className="mb-8">
            <div className="relative flex items-center justify-center w-24 h-24 bg-white dark:bg-white/5 rounded-2xl shadow-sm border border-slate-100 dark:border-white/10 overflow-hidden">
              <span className=" text-[64px]">
                <CalendarRange size={50} className="text-blue-700"/>
              </span>
            </div>
          </div>

          {/* Content */}
          <div className="text-center mb-10">
            <h2 className="text-slate-900 dark:text-slate-100 text-2xl font-bold mb-3">
              Sync with Google Calendar
            </h2>
            <p className="text-slate-600 dark:text-slate-400 text-base leading-relaxed">
              Stay on track by syncing your study schedule, mock tests, and exam
              deadlines directly to your personal calendar.
            </p>
          </div>

          {/* Buttons */}
          <div className=" w-full space-y-2 gap-3">
              <GoogleCalendarButton />
            {/* Maybe Later */}
            <button
              onClick={onClose}
              className="w-full cursor-pointer hover:bg-slate-200 h-12 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 font-medium rounded-xl transition-all"
            >
              Maybe Later
            </button>
          </div>

          {/* Footer */}
          <div className="mt-8 flex items-center gap-2 px-4 py-2 bg-slate-50 dark:bg-white/5 rounded-full border border-slate-100 dark:border-white/10">
            <span className="material-symbols-outlined text-blue-500 text-sm">
              <Shield size={15}/>
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Secure Google OAuth Connection
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GoogleCalendarModal;
