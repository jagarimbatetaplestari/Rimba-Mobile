'use client';

import React, { useEffect } from 'react';
import { RefreshCw, Compass } from 'lucide-react';
import { hapticLight } from '@/lib/mobile/nativeBridge';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error for diagnostics
    console.error('[Rimba Sanctuary Error Boundary]:', error);
  }, [error]);

  const handleReset = () => {
    try {
      hapticLight();
    } catch {
      // ignore
    }
    reset();
  };

  const handleReload = () => {
    try {
      hapticLight();
    } catch {
      // ignore
    }
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center p-6 bg-[#051F18] text-[#FAFAF7] select-none">
      {/* Background radial aura */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(40,116,86,0.22)_0%,transparent_70%)] pointer-events-none" />

      {/* Content Card */}
      <div className="relative z-10 max-w-sm w-full flex flex-col items-center text-center p-8 rounded-3xl bg-[#0A261E]/80 backdrop-blur-xl border border-white/10 shadow-2xl">
        {/* Zen Icon */}
        <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-6 shadow-inner">
          <Compass className="w-8 h-8 animate-pulse text-emerald-300" />
        </div>

        {/* Title */}
        <h2 className="text-xl font-bold tracking-tight text-white mb-2">
          Suaka Beristirahat Sejenak
        </h2>

        {/* Description */}
        <p className="text-sm text-emerald-100/70 leading-relaxed mb-6">
          Ketenangan suakamu tetap aman tersimpan. Ketuk tombol di bawah untuk menyegarkan kembali taman fokusmu.
        </p>

        {/* Action Buttons */}
        <div className="w-full space-y-3">
          <button
            onClick={handleReset}
            className="w-full py-3.5 px-5 rounded-2xl bg-[#E8B84B] hover:bg-[#D4A338] active:scale-[0.98] text-[#0A261E] font-semibold text-sm shadow-lg flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            Coba Pulihkan Sesi
          </button>

          <button
            onClick={handleReload}
            className="w-full py-3 px-5 rounded-2xl bg-white/5 hover:bg-white/10 active:scale-[0.98] text-white/80 text-xs font-medium border border-white/10 transition-all cursor-pointer"
          >
            Muat Ulang Seluruh Suaka
          </button>
        </div>
      </div>
    </div>
  );
}
