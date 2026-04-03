import React, { useState, useEffect } from 'react';
import { Share, PlusSquare, X } from 'lucide-react';

/**
 * IOSInstallPrompt - A premium, non-intrusive notification specifically for iOS/macOS Safari users,
 * guiding them to install the PWA as Apple does not support a native installation prompt.
 */
export const IOSInstallPrompt = () => {
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    // Detect iOS (iPhone, iPad, iPod)
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    
    // Check if the browser is Safari (non-Chrome/non-Firefox)
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    
    // Detect if already in standalone mode (installed as PWA)
    const isStandalone = 
      (window.navigator as any).standalone === true || 
      window.matchMedia('(display-mode: standalone)').matches;

    // Only show if on iOS, using Safari (ideally), and not already installed
    if (isIOS && !isStandalone) {
      // Check for persistent dismissal (e.g., using localStorage for longer persistence or sessionStorage for session-only)
      const isDismissed = localStorage.getItem('ios-pwa-prompt-dismissed-v1');
      if (!isDismissed) {
        // Delay the prompt slightly for a better user experience
        const timer = setTimeout(() => setShowPrompt(true), 3000);
        return () => clearTimeout(timer);
      }
    }
  }, []);

  const handleDismiss = () => {
    setShowPrompt(false);
    // Persist dismissal to avoid annoying the user on every page load
    localStorage.setItem('ios-pwa-prompt-dismissed-v1', 'true');
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-6 left-4 right-4 z-9999 animate-buttery-slide">
      <div className="glass rounded-2xl border border-primary/20 shadow-ambient-lg p-5 relative overflow-hidden group">
        <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
        
        {/* Close Button */}
        <button 
          onClick={handleDismiss}
          className="absolute top-3 right-3 p-1.5 text-on-surface-variant/40 hover:text-primary hover:bg-primary/10 rounded-full transition-all"
          aria-label="Close"
        >
          <X size={18} />
        </button>

        <div className="flex items-start gap-4">
          <div className="bg-primary/10 p-3 rounded-xl text-primary shrink-0">
            <PlusSquare size={24} />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-on-surface flex items-center gap-1.5">
              Install Arumind
              <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-medium">Recommended</span>
            </h3>
            <p className="text-xs text-on-surface-variant mt-1 leading-relaxed">
              Experience the Digital Greenhouse as a full-screen, focused application.
            </p>
            
            <div className="mt-4 flex flex-col gap-2.5">
              <div className="flex items-center gap-3 text-xs text-on-surface-variant bg-surface-container-low/50 p-2.5 rounded-xl border border-outline-variant">
                <span className="flex items-center justify-center w-6 h-6 bg-surface text-on-surface rounded-full text-[10px] font-bold border border-outline-variant shadow-sm">1</span>
                <span>Tap the <Share size={14} className="inline mx-0.5 text-primary rotate-[-4deg]" /> icon in Safari's bottom bar.</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-on-surface-variant bg-surface-container-low/50 p-2.5 rounded-xl border border-outline-variant">
                <span className="flex items-center justify-center w-6 h-6 bg-surface text-on-surface rounded-full text-[10px] font-bold border border-outline-variant shadow-sm">2</span>
                <span>Scroll down and tap <b>'Add to Home Screen'</b>.</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
