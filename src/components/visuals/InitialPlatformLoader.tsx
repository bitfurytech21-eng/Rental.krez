import React, { useState, useEffect } from 'react';
import { LuminousEclipseRing } from './LuminousEclipseRing';
import { ShieldCheck, Lock, Sparkles } from 'lucide-react';

interface InitialPlatformLoaderProps {
  onComplete?: () => void;
  forceShow?: boolean;
}

export const InitialPlatformLoader: React.FC<InitialPlatformLoaderProps> = ({
  onComplete,
  forceShow = false,
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState("INITIALIZING SPV VAULT...");
  const [isFadingOut, setIsFadingOut] = useState(false);

  useEffect(() => {
    // Check if website has already played initial loading screen in this session
    try {
      if (!forceShow && typeof window !== 'undefined' && sessionStorage.getItem('lagence_loader_seen') === 'true') {
        setIsVisible(false);
        if (onComplete) onComplete();
        return;
      }
    } catch {}

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        const next = prev + Math.floor(Math.random() * 8) + 4;
        return next > 100 ? 100 : next;
      });
    }, 90);

    return () => clearInterval(interval);
  }, [forceShow, onComplete]);

  useEffect(() => {
    if (progress < 30) {
      setStatusText("INITIALIZING REGULATED SPV VAULT...");
    } else if (progress < 65) {
      setStatusText("AUTHENTICATING CAIXABANK ESCROW METRICS...");
    } else if (progress < 90) {
      setStatusText("DECRYPTING RICS APPRAISAL DATA ROOM...");
    } else {
      setStatusText("WELCOME TO L'AGENCE PLATFORM");
    }

    if (progress >= 100) {
      const timer = setTimeout(() => {
        setIsFadingOut(true);
        try {
          if (typeof window !== 'undefined') {
            sessionStorage.setItem('lagence_loader_seen', 'true');
          }
        } catch {}
        const finishTimer = setTimeout(() => {
          setIsVisible(false);
          if (onComplete) onComplete();
        }, 700);
        return () => clearTimeout(finishTimer);
      }, 400);

      return () => clearTimeout(timer);
    }
  }, [progress, onComplete]);

  if (!isVisible) return null;

  return (
    <div 
      className={`fixed inset-0 z-[100] bg-[#070A09] flex flex-col items-center justify-center text-white overflow-hidden transition-opacity duration-700 ease-out ${
        isFadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      {/* Background radial glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#55BDE8]/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="relative flex flex-col items-center justify-center space-y-8 z-10 px-4 text-center">
        {/* Glowing Halo Ring Artwork matching IMG_7729.jpeg */}
        <LuminousEclipseRing size={320} className="scale-100 sm:scale-110">
          <div className="flex flex-col items-center justify-center space-y-2">
            <img 
              src="/assets/aistudio/IMG_7234_bd44519a.jpeg" 
              alt="L'Agence Logo" 
              className="w-12 h-12 rounded-2xl object-cover border border-white/20 shadow-xl animate-pulse"
              style={{ filter: 'brightness(1.35) contrast(1.22) saturate(1.1)' }}
            />
            <div className="font-mono text-2xl font-black text-white tracking-widest">
              {progress}%
            </div>
            <div className="inline-flex items-center gap-1 text-[9px] font-mono font-bold uppercase tracking-wider text-[#55BDE8] bg-[#55BDE8]/10 px-2.5 py-0.5 rounded-full border border-[#55BDE8]/25">
              <ShieldCheck className="w-3 h-3 text-[#55BDE8]" />
              <span>SPV SECURE</span>
            </div>
          </div>
        </LuminousEclipseRing>

        {/* Progress Text Details */}
        <div className="space-y-3 max-w-sm mx-auto">
          <div className="h-1 w-48 mx-auto bg-white/10 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-[#55BDE8] via-[#43C98B] to-[#F5F5F2] transition-all duration-150 ease-out rounded-full"
              style={{ width: `${progress}%` }}
            />
          </div>

          <p className="text-[11px] font-mono tracking-widest text-[#A5A6A5] uppercase font-medium animate-pulse">
            {statusText}
          </p>
        </div>
      </div>

      {/* Footer Brand Credentials */}
      <div className="absolute bottom-8 text-[10px] font-mono text-slate-500 tracking-wider uppercase flex items-center gap-2">
        <Lock className="w-3 h-3 text-[#43C98B]" />
        <span>L'AGENCE | KRETZ & DE SPAIN · REGULATED SPV PLATFORM</span>
      </div>
    </div>
  );
};
