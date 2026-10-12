'use client';

import React, { useState, useEffect } from 'react';
import { Download, X, Sparkles } from 'lucide-react';
import { usePwaInstall } from '@/lib/mobile/usePwaInstall';
import { useTranslation } from '@/lib/i18n/translations';
import { soundManager } from '@/lib/audio/sounds';
import { hapticLight, hapticSuccess } from '@/lib/mobile/nativeBridge';

export function PwaInstallBanner() {
  const { canInstall, promptInstall } = usePwaInstall();
  const { lang } = useTranslation();
  const [isDismissed, setIsDismissed] = useState(true);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const dismissed = sessionStorage.getItem('rimba_pwa_banner_dismissed');
    if (!dismissed && canInstall) {
      // Delay display slightly so it doesn't pop up abruptly on the first second of visit
      const timer = setTimeout(() => {
        setIsDismissed(false);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [canInstall]);

  if (!canInstall || isDismissed) {
    return null;
  }

  const handleDismiss = () => {
    soundManager.playPop();
    hapticLight();
    setIsDismissed(true);
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('rimba_pwa_banner_dismissed', 'true');
    }
  };

  const handleInstallClick = async () => {
    hapticSuccess();
    soundManager.playPop();
    const success = await promptInstall();
    if (success) {
      setIsDismissed(true);
    }
  };

  const isEn = lang === 'en';

  return (
    <div className="fixed bottom-20 inset-x-4 z-40 flex justify-center pointer-events-none animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="w-full max-w-[390px] rounded-2xl p-3.5 bg-gradient-to-r from-[#0d3524]/95 via-[#0e3b28]/95 to-[#134932]/95 text-white shadow-xl shadow-black/30 border border-emerald-400/25 backdrop-blur-xl flex items-center justify-between gap-3 pointer-events-auto">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-300 shrink-0 shadow-inner">
            <Sparkles className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div className="min-w-0">
            <h4 className="text-xs font-bold text-white tracking-tight truncate">
              {isEn ? 'Install Rimba to Home Screen' : 'Pasang Rimba di Layar Utama'}
            </h4>
            <p className="text-[10.5px] text-emerald-100/75 truncate font-normal">
              {isEn ? 'Full-screen diorama & offline garden' : 'Layar penuh tanpa browser & suaka offline'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={handleInstallClick}
            className="h-8 px-3 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-[#09261a] font-bold text-[11px] flex items-center gap-1.5 active:scale-95 transition-all shadow-sm cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 stroke-[2.4]" />
            <span>{isEn ? 'Install' : 'Pasang'}</span>
          </button>
          <button
            type="button"
            onClick={handleDismiss}
            className="w-7 h-7 rounded-xl flex items-center justify-center text-emerald-200/60 hover:text-white hover:bg-white/10 active:scale-90 transition-all cursor-pointer"
            aria-label="Tutup"
          >
            <X className="w-3.5 h-3.5 stroke-[2]" />
          </button>
        </div>
      </div>
    </div>
  );
}
