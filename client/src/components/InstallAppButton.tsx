import React from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Download } from 'lucide-react';

interface InstallAppButtonProps {
  isCollapsed?: boolean;
}

const InstallAppButton: React.FC<InstallAppButtonProps> = ({ isCollapsed }) => {
  const { isInstallable, handleInstall } = usePWAInstall();

  if (!isInstallable) return null;

  return (
    <button
      onClick={handleInstall}
      className={`flex items-center justify-center gap-3 w-full py-4 rounded-full transition-all duration-500 shadow-lg shadow-primary/20
        bg-linear-to-r from-primary to-primary-container text-on-primary hover:scale-[1.02] active:scale-[0.98] group relative overflow-hidden`}
    >
      <Download size={18} className="group-hover:animate-bounce relative z-10" />
      {!isCollapsed && <span className="text-[10px] font-technical uppercase tracking-[0.2em] font-black relative z-10">Install Journal</span>}
      <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
    </button>
  );
};

export default InstallAppButton;
