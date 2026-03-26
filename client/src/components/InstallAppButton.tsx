import React from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Download } from 'lucide-react';

const InstallAppButton: React.FC = () => {
  const { isInstallable, handleInstall } = usePWAInstall();

  console.log('InstallAppButton: isInstallable =', isInstallable);

  if (!isInstallable) {
    return null;
  }

  return (
    <button
      onClick={handleInstall}
      className="flex items-center justify-center gap-2 w-full py-1.5 bg-[#1a57db] text-white text-xs font-bold rounded-lg hover:bg-[#1a57db]/90 transition-all duration-200 shadow-sm"
    >
      <Download size={18} />
      <span>Install App</span>
    </button>
  );
};

export default InstallAppButton;
