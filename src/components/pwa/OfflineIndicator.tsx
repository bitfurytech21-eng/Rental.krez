import React from 'react';
import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../../hooks/usePWAInstall';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-4 left-4 z-[110] flex items-center gap-2 rounded-xl border border-[#c59b4c]/40 bg-[#213138] px-3.5 py-2 text-xs font-medium text-[#f5f0ea] shadow-xl"
    >
      <WifiOff className="w-3.5 h-3.5 text-[#c59b4c] shrink-0" />
      <span>Offline mode — cached data shown</span>
    </div>
  );
};
