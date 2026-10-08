'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useGameStore } from '@/lib/game/useGameStore';
import { AlertOctagon, Flame, ShieldAlert } from 'lucide-react';

const GRACE_PERIOD_SECONDS = 10;

export function StrictFocusGuard() {
  const activeSession = useGameStore((state) => state.activeSession);
  const abandonFocus = useGameStore((state) => state.abandonFocus);
  const notify = useGameStore((state) => state.notify);
  const setTabBlurred = useGameStore((state) => state.setTabBlurred);

  const [isWarningActive, setIsWarningActive] = useState(false);
  const [countdown, setCountdown] = useState(GRACE_PERIOD_SECONDS);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const isWarningActiveRef = useRef(false);

  const isStrictMode = Boolean(activeSession && activeSession.status === 'active' && activeSession.strict_mode);

  useEffect(() => {
    if (!isStrictMode) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      if (isWarningActiveRef.current) {
        isWarningActiveRef.current = false;
        setIsWarningActive(false);
        setTabBlurred(false);
      }
      return;
    }

    const triggerWarning = () => {
      if (isWarningActiveRef.current) return;
      isWarningActiveRef.current = true;
      setIsWarningActive(true);
      setTabBlurred(true);
      setCountdown(GRACE_PERIOD_SECONDS);

      if (timerRef.current) clearInterval(timerRef.current);

      timerRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            if (timerRef.current) {
              clearInterval(timerRef.current);
              timerRef.current = null;
            }
            isWarningActiveRef.current = false;
            setIsWarningActive(false);
            setTabBlurred(false);
            abandonFocus();
            notify('Sesi gagal! Mode Ketat mendeteksi kamu meninggalkan Rimba. Bibit pohon layu.', 'error');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    };

    const clearWarning = (returnedInTime: boolean) => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      if (isWarningActiveRef.current && returnedInTime) {
        notify('🌱 Kamu kembali tepat waktu! Pohonmu selamat. Tetap fokus!', 'success');
      }
      isWarningActiveRef.current = false;
      setIsWarningActive(false);
      setTabBlurred(false);
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        triggerWarning();
      } else {
        clearWarning(true);
      }
    };

    const handleWindowBlur = () => {
      triggerWarning();
    };

    const handleWindowFocus = () => {
      clearWarning(true);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    window.addEventListener('focus', handleWindowFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      window.removeEventListener('focus', handleWindowFocus);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isStrictMode, abandonFocus, notify, setTabBlurred]);

  if (!isWarningActive || !isStrictMode) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
      <div className="max-w-sm w-full p-6 rounded-3xl bg-rose-950/90 border-2 border-rose-500/80 shadow-2xl text-white text-center space-y-4">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-rose-500/20 flex items-center justify-center text-rose-400 animate-pulse">
          <AlertOctagon className="w-9 h-9" />
        </div>

        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/30 text-rose-300 text-xs font-bold uppercase tracking-wider">
            <Flame className="w-3.5 h-3.5 text-amber-400" />
            <span>Peringatan Mode Ketat</span>
          </div>
          <h2 className="text-xl font-black text-rose-100">
            Kamu Meninggalkan Rimba!
          </h2>
          <p className="text-xs text-rose-200/80 leading-relaxed">
            Kembali ke tab ini sekarang sebelum hitung mundur habis, atau bibit pohonmu akan layu tanpa hadiah!
          </p>
        </div>

        {/* Big Countdown Number */}
        <div className="py-2">
          <span className="text-5xl font-black font-mono text-amber-400 drop-shadow-md">
            {countdown}
          </span>
          <span className="block text-[11px] text-rose-300 uppercase tracking-widest mt-1">
            Detik Tersisa
          </span>
        </div>

        <button
          onClick={() => {
            if (timerRef.current) {
              clearInterval(timerRef.current);
              timerRef.current = null;
            }
            isWarningActiveRef.current = false;
            setIsWarningActive(false);
            setTabBlurred(false);
            notify('🌱 Kamu kembali tepat waktu! Pohonmu selamat.', 'success');
          }}
          className="w-full py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-bold text-sm shadow-lg shadow-emerald-900/40 active:scale-95 transition-all flex items-center justify-center gap-2"
        >
          <ShieldAlert className="w-4 h-4" />
          <span>Saya Kembali & Tetap Fokus!</span>
        </button>
      </div>
    </div>
  );
}
