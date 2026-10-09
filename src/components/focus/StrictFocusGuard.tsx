"use client";

import React, { useEffect, useState, useRef } from "react";
import { useGameStore } from "@/lib/game/useGameStore";
import { useTranslation } from "@/lib/i18n/translations";
import { Flame, ShieldAlert, Sparkles } from "lucide-react";

const GRACE_PERIOD_SECONDS = 10;

export function StrictFocusGuard() {
  const { t } = useTranslation();
  const activeSession = useGameStore((state) => state.activeSession);
  const abandonFocus = useGameStore((state) => state.abandonFocus);
  const notify = useGameStore((state) => state.notify);
  const setTabBlurred = useGameStore((state) => state.setTabBlurred);

  const [isWarningActive, setIsWarningActive] = useState(false);
  const [countdown, setCountdown] = useState(GRACE_PERIOD_SECONDS);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const isWarningActiveRef = useRef(false);

  const isSessionFinished = Boolean(
    activeSession &&
    !activeSession.is_stopwatch &&
    Date.now() >= new Date(activeSession.expected_end_at).getTime() - 1000
  );

  const isStrictMode = Boolean(
    activeSession &&
    activeSession.status === "active" &&
    activeSession.strict_mode &&
    !activeSession.is_paused &&
    !isSessionFinished
  );

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
            notify(t.strictGuard.failedNotify, "error");
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
        notify(t.strictGuard.savedNotify, "success");
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

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleWindowBlur);
    window.addEventListener("focus", handleWindowFocus);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleWindowBlur);
      window.removeEventListener("focus", handleWindowFocus);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isStrictMode, abandonFocus, notify, setTabBlurred, t]);

  if (!isWarningActive || !isStrictMode) return null;

  /*
   * Apple Alert Glass Style
   */
  const alertGlassStyle: React.CSSProperties = {
    background:
      "linear-gradient(180deg, rgba(255, 255, 255, 0.3) 0%, rgba(65, 18, 24, 0.5) 24%, rgba(28, 8, 12, 0.88) 100%)",
    backdropFilter: "blur(34px) saturate(190%) contrast(104%)",
    WebkitBackdropFilter: "blur(34px) saturate(190%) contrast(104%)",
    border: "1px solid rgba(255, 255, 255, 0.4)",
    boxShadow:
      "inset 0 1.5px 1.5px 0 rgba(255, 255, 255, 0.8), inset 0 -1px 1px 0 rgba(0, 0, 0, 0.35), 0 24px 60px rgba(0, 0, 0, 0.45)",
  };

  return (
    <div
      className="fixed inset-0 z-[120] pointer-events-auto flex items-center justify-center p-4 bg-black/35 backdrop-blur-xs animate-in fade-in duration-200 select-none"
      style={{
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', var(--font-geist-sans), sans-serif",
      }}
    >
      <div
        style={alertGlassStyle}
        className="max-w-sm w-full p-6 rounded-[34px] text-white text-center flex flex-col items-center gap-3.5 relative overflow-hidden shadow-2xl"
      >
        {/* Top Refraction Sheen */}
        <div className="absolute inset-x-0 top-0 h-10 bg-gradient-to-b from-white/25 to-transparent pointer-events-none rounded-t-[34px]" />

        {/* Minimal Apple Alert Orb */}
        <div className="relative mt-1">
          <div className="w-16 h-16 rounded-full bg-gradient-to-b from-white/25 to-rose-500/20 border border-white/40 flex items-center justify-center shadow-[inset_0_1px_2px_rgba(255,255,255,0.7)]">
            <Flame className="w-7 h-7 text-amber-300 stroke-[2.2] animate-pulse drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]" />
          </div>
        </div>

        {/* Header & Body Text */}
        <div className="space-y-1.5 relative z-10 px-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/12 border border-white/25 text-amber-200 text-[11px] font-semibold tracking-tight shadow-xs">
            <span>{t.strictGuard.alertBadge}</span>
          </div>
          <h2 className="text-xl font-bold tracking-tight text-white drop-shadow-sm">
            {t.strictGuard.alertTitle}
          </h2>
          <p className="text-[12px] text-white/80 leading-relaxed max-w-xs mx-auto">
            {t.strictGuard.alertDesc}
          </p>
        </div>

        {/* Clean Large Apple Countdown */}
        <div className="py-1 relative z-10">
          <div className="text-[52px] font-bold font-mono tracking-tight text-white tabular-nums leading-none drop-shadow-[0_2px_6px_rgba(0,0,0,0.35)]">
            {countdown}
          </div>
          <span className="block text-[10px] text-white/60 tracking-wider font-semibold uppercase mt-1">
            {t.strictGuard.secondsRemaining}
          </span>
        </div>

        {/* Primary Action Button */}
        <button
          onClick={() => {
            if (timerRef.current) {
              clearInterval(timerRef.current);
              timerRef.current = null;
            }
            isWarningActiveRef.current = false;
            setIsWarningActive(false);
            setTabBlurred(false);
            notify(t.strictGuard.savedNotify, "success");
          }}
          className="w-full py-3.5 px-4 rounded-2xl bg-white text-[#0f2e1e] hover:bg-white/95 font-bold text-[13px] tracking-tight shadow-xs active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer relative z-10"
        >
          <ShieldAlert className="w-4 h-4 stroke-[2.4]" />
          <span>{t.strictGuard.resumeBtn}</span>
        </button>
      </div>
    </div>
  );
}
