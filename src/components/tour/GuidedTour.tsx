"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Sparkles,
  Tag,
  Clock3,
  Play,
  User,
  Hammer,
  BookOpen,
  Headphones,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Check,
  X,
} from "lucide-react";
import { useTourStore } from "@/lib/tour/useTourStore";
import { useTranslation } from "@/lib/i18n/translations";
import { soundManager } from "@/lib/audio/sounds";
import { hapticLight, hapticSuccess } from "@/lib/mobile/nativeBridge";

interface TourStep {
  id: string;
  targetSelector: string;
  fallbackSelector?: string;
  icon: React.ComponentType<{ className?: string }>;
  titleId: string;
  titleEn: string;
  descId: string;
  descEn: string;
  requireDropdown?: "profile" | "settings" | null;
}

const TOUR_STEPS: TourStep[] = [
  {
    id: "welcome-island",
    targetSelector: '[data-tour="sanctuary-island"]',
    icon: Sparkles,
    titleId: "Selamat Datang di Rimba",
    titleEn: "Welcome to Rimba",
    descId:
      "Suaka pulau 3D ini bertumbuh seiring ketenangan dan waktu fokusmu. Setiap sesi penuh kesadaran akan menumbuhkan pohon virtual di sini.",
    descEn:
      "This 3D sanctuary island flourishes with your mindful focus. Each completed session plants and nurtures virtual trees here.",
  },
  {
    id: "cockpit-category",
    targetSelector: '[data-tour="cockpit-category"]',
    icon: Tag,
    titleId: "Kategori & Spesies Bibit",
    titleEn: "Categories & Seed Species",
    descId:
      "Pilih label aktivitas (Belajar, Bekerja, Membaca) dan spesies pohon suaka yang ingin kamu tanam di sesi ini.",
    descEn:
      "Choose your activity tag (Study, Work, Reading) and the tree species you want to plant for this session.",
  },
  {
    id: "cockpit-timer",
    targetSelector: '[data-tour="cockpit-timer"]',
    icon: Clock3,
    titleId: "Durasi & Mode Fokus Penuh",
    titleEn: "Duration & Strict Mode",
    descId:
      "Tentukan durasi fokus dari 15 hingga 120 menit, atau mode Stopwatch. Aktifkan Mode Fokus Penuh jika ingin melatih ketahanan tanpa jeda.",
    descEn:
      "Set your focus target from 15 to 120 minutes, or use Stopwatch mode. Turn on Strict Mode for uninterrupted deep work.",
  },
  {
    id: "cockpit-start",
    targetSelector: '[data-tour="cockpit-start"]',
    icon: Play,
    titleId: "Mulai Sesi Fokus",
    titleEn: "Start Focus Session",
    descId:
      "Sentuh tombol ini untuk menanam bibit dan memulai timer. Saat fokus berjalan, jaga layar atau biarkan suara alam menemani.",
    descEn:
      "Tap here to plant your sapling and begin the countdown. Let the soothing nature ambience guide your deep work.",
  },
  {
    id: "hud-header",
    targetSelector: '[data-tour="hud-header"]',
    icon: User,
    titleId: "Profil & Kedaulatan Suaka",
    titleEn: "Profile & Sanctuary Stats",
    descId:
      "Pantau level penjaga, statistik waktu fokus harian, dan akumulasi Soul yang kamu kumpulkan dari setiap sesi.",
    descEn:
      "Track your ranger level, daily focus streaks, and Soul harvested from your mindful sessions.",
  },
  {
    id: "hud-workshop",
    targetSelector: '[data-tour="hud-workshop"]',
    fallbackSelector: '[data-tour="hud-header"]',
    icon: Hammer,
    titleId: "Bengkel Alam & Perluas Lahan",
    titleEn: "Nature Workshop & Expansion",
    descId:
      "Gunakan Soul untuk menghias pulau dengan sungai, bebatuan, dan lentera, atau memperluas grid lahan saat pulau mulai penuh.",
    descEn:
      "Use your earned Soul to decorate the sanctuary with rivers, rocks, and lanterns, or expand your land grid when space runs out.",
    requireDropdown: "profile",
  },
  {
    id: "hud-journal",
    targetSelector: '[data-tour="hud-journal"]',
    fallbackSelector: '[data-tour="hud-header"]',
    icon: BookOpen,
    titleId: "Jurnal & Misi Harian",
    titleEn: "Journal & Daily Quests",
    descId:
      "Buka jurnal untuk melihat riwayat refleksi, mencatat jurnal harian, dan klaim bonus Peti Sapu Bersih dari misi harian.",
    descEn:
      "Open your journal to review past reflections and claim Sweep Chest rewards (+30 Soul & +60 XP) from daily quests.",
    requireDropdown: "profile",
  },
  {
    id: "hud-audio",
    targetSelector: '[data-tour="hud-audio"]',
    fallbackSelector: '[data-tour="hud-settings"]',
    icon: Headphones,
    titleId: "Audio Alam & Widget iOS",
    titleEn: "Soundscapes & iOS Widgets",
    descId:
      "Nyalakan 15 trek suara alam dan pasang widget Rimba di Lock Screen & Home Screen iPhone untuk memantau suaka secara sekilas.",
    descEn:
      "Play 15 ambient nature soundscapes and add Rimba widgets to your Lock Screen & Home Screen to track your sanctuary at a glance.",
  },
  {
    id: "ready-focus",
    targetSelector: '[data-tour="sanctuary-island"]',
    icon: CheckCircle2,
    titleId: "Suaka Siap Dimulai",
    titleEn: "Your Sanctuary Awaits",
    descId:
      "Kamu siap memulai perjalanan fokusmu. Kamu selalu bisa membuka Panduan Permainan lengkap kapan saja melalui menu Pengaturan.",
    descEn:
      "You are ready for your focus journey. You can always revisit the detailed Gameplay Guide anytime from Settings.",
  },
];

interface TargetRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function GuidedTour() {
  const isTourActive = useTourStore((s) => s.isTourActive);
  const currentStepIndex = useTourStore((s) => s.currentStepIndex);
  const nextStep = useTourStore((s) => s.nextStep);
  const prevStep = useTourStore((s) => s.prevStep);
  const skipTour = useTourStore((s) => s.skipTour);
  const completeTour = useTourStore((s) => s.completeTour);

  const { language } = useTranslation();
  const isEn = language === "en";

  const [targetRect, setTargetRect] = useState<TargetRect | null>(null);
  const [windowDimensions, setWindowDimensions] = useState({ width: 0, height: 0 });

  const currentStep = TOUR_STEPS[currentStepIndex] || null;
  const isLastStep = currentStepIndex === TOUR_STEPS.length - 1;

  // Sync window dimensions
  useEffect(() => {
    if (typeof window === "undefined") return;
    const updateSize = () => {
      setWindowDimensions({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };
    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  // Update target rect on step change or resize
  const updateTargetRect = useCallback(() => {
    if (typeof window === "undefined" || !currentStep) {
      setTargetRect(null);
      return;
    }

    // Step 1 and last step represent the whole island overview
    if (currentStep.id === "welcome-island" || currentStep.id === "ready-focus") {
      setTargetRect(null);
      return;
    }

    let el = document.querySelector(currentStep.targetSelector);
    if (!el && currentStep.fallbackSelector) {
      el = document.querySelector(currentStep.fallbackSelector);
    }

    if (el) {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        setTargetRect({
          x: rect.left,
          y: rect.top,
          width: rect.width,
          height: rect.height,
        });
        return;
      }
    }
    setTargetRect(null);
  }, [currentStep]);

  useEffect(() => {
    if (!isTourActive) return;

    // Notify header dropdown if step requires it
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("rimba:tour_dropdown", {
          detail: { dropdown: currentStep?.requireDropdown ?? null },
        })
      );
    }

    const timer = setTimeout(updateTargetRect, 80);
    window.addEventListener("resize", updateTargetRect);
    window.addEventListener("scroll", updateTargetRect, true);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", updateTargetRect);
      window.removeEventListener("scroll", updateTargetRect, true);
    };
  }, [isTourActive, currentStepIndex, currentStep, updateTargetRect]);

  // Clean up dropdown when tour ends or skips
  useEffect(() => {
    if (!isTourActive && typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("rimba:tour_dropdown", {
          detail: { dropdown: null },
        })
      );
    }
  }, [isTourActive]);

  const handleNext = () => {
    soundManager.playPop();
    hapticLight();
    if (isLastStep) {
      soundManager.playComplete();
      hapticSuccess();
      completeTour();
    } else {
      nextStep();
    }
  };

  const handlePrev = () => {
    soundManager.playPop();
    hapticLight();
    prevStep();
  };

  const handleSkip = () => {
    soundManager.playPop();
    hapticLight();
    skipTour();
  };

  if (!isTourActive || !currentStep) return null;

  const StepIcon = currentStep.icon;
  const padding = 8;
  const spotlightBox = targetRect
    ? {
        x: Math.max(4, targetRect.x - padding),
        y: Math.max(4, targetRect.y - padding),
        width: targetRect.width + padding * 2,
        height: targetRect.height + padding * 2,
        rx: 18,
      }
    : null;

  // Determine card placement relative to target
  let cardPositionStyle: React.CSSProperties = {
    bottom: "max(calc(env(safe-area-inset-bottom, 0px) + 24px), 32px)",
  };

  if (targetRect && windowDimensions.height > 0) {
    const isTargetInUpperHalf = targetRect.y < windowDimensions.height * 0.45;
    if (isTargetInUpperHalf) {
      // Place card below target
      cardPositionStyle = {
        top: Math.min(
          windowDimensions.height - 240,
          Math.max(80, targetRect.y + targetRect.height + 20)
        ),
      };
    } else {
      // Place card above target
      cardPositionStyle = {
        bottom: Math.min(
          windowDimensions.height - 80,
          Math.max(24, windowDimensions.height - targetRect.y + 20)
        ),
      };
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={isEn ? "Rimba Guided Tour" : "Panduan Interaktif Rimba"}
      className="fixed inset-0 z-[115] pointer-events-auto select-none animate-in fade-in duration-200"
    >
      {/* SVG Spotlight Mask Cutout */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <mask id="rimba-tour-mask">
            <rect width="100%" height="100%" fill="white" />
            {spotlightBox && (
              <rect
                x={spotlightBox.x}
                y={spotlightBox.y}
                width={spotlightBox.width}
                height={spotlightBox.height}
                rx={spotlightBox.rx}
                ry={spotlightBox.rx}
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect
          width="100%"
          height="100%"
          fill="rgba(4, 18, 12, 0.76)"
          mask="url(#rimba-tour-mask)"
        />
        {/* Pulsing Highlight Rim around target */}
        {spotlightBox && (
          <rect
            x={spotlightBox.x}
            y={spotlightBox.y}
            width={spotlightBox.width}
            height={spotlightBox.height}
            rx={spotlightBox.rx}
            ry={spotlightBox.rx}
            fill="none"
            stroke="rgba(52, 211, 153, 0.75)"
            strokeWidth="2.5"
            className="animate-pulse"
          />
        )}
      </svg>

      {/* Interactive Tooltip Card (Apple Liquid Glass) */}
      <div
        style={{
          ...cardPositionStyle,
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', var(--font-geist-sans), sans-serif",
        }}
        className="fixed left-4 right-4 max-w-[390px] mx-auto z-10 animate-in fade-in slide-in-from-bottom-2 duration-300"
      >
        <div
          style={{
            background:
              "linear-gradient(135deg, rgba(14, 46, 32, 0.92) 0%, rgba(8, 28, 20, 0.94) 100%)",
            boxShadow:
              "0 20px 50px rgba(0, 0, 0, 0.55), inset 0 1.5px 2px rgba(255, 255, 255, 0.35)",
          }}
          className="w-full p-5 rounded-[28px] border border-white/25 backdrop-blur-2xl text-white flex flex-col gap-3.5 relative overflow-hidden"
        >
          {/* Top Specular Sheen */}
          <div className="absolute inset-x-4 top-0 h-[35%] bg-gradient-to-b from-white/20 to-transparent rounded-t-[28px] pointer-events-none" />

          {/* Header Row: Step Icon, Title & Skip */}
          <div className="flex items-center justify-between gap-2 relative z-10">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center shrink-0 shadow-sm">
                <StepIcon className="w-4 h-4 text-emerald-300 stroke-[2.2]" />
              </div>
              <h3 className="text-[15px] font-bold tracking-tight text-white drop-shadow-sm truncate">
                {isEn ? currentStep.titleEn : currentStep.titleId}
              </h3>
            </div>

            <button
              type="button"
              onClick={handleSkip}
              className="text-[11px] font-semibold text-white/70 hover:text-white px-2.5 py-1 rounded-full bg-white/10 hover:bg-white/15 border border-white/15 transition-all cursor-pointer flex items-center gap-1 shrink-0"
              aria-label={isEn ? "Skip tour" : "Lewati panduan"}
            >
              <span>{isEn ? "Skip" : "Lewati"}</span>
              <X className="w-3 h-3 stroke-[2.2]" />
            </button>
          </div>

          {/* Description Text */}
          <p className="text-xs text-white/90 leading-relaxed font-light tracking-wide relative z-10">
            {isEn ? currentStep.descEn : currentStep.descId}
          </p>

          {/* Footer Controls: Step Counter & Navigation */}
          <div className="flex items-center justify-between pt-1 relative z-10 border-t border-white/10">
            {/* Step Counter Pill */}
            <span className="text-[11px] font-medium text-emerald-200/90 font-mono tracking-wider">
              {currentStepIndex + 1} / {TOUR_STEPS.length}
            </span>

            {/* Next / Back Buttons */}
            <div className="flex items-center gap-2">
              {currentStepIndex > 0 && (
                <button
                  type="button"
                  onClick={handlePrev}
                  className="px-3 py-1.5 rounded-full bg-white/12 hover:bg-white/20 border border-white/20 text-xs font-semibold text-white/90 transition-all cursor-pointer flex items-center gap-1 active:scale-95"
                >
                  <ChevronLeft className="w-3.5 h-3.5 stroke-[2.2]" />
                  <span>{isEn ? "Back" : "Kembali"}</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleNext}
                className="px-4 py-1.5 rounded-full bg-emerald-500 hover:bg-emerald-400 text-[#072418] font-bold text-xs shadow-md shadow-emerald-500/25 border border-emerald-300/40 transition-all cursor-pointer flex items-center gap-1 active:scale-95"
              >
                <span>{isLastStep ? (isEn ? "Finish" : "Selesai") : (isEn ? "Next" : "Lanjut")}</span>
                {isLastStep ? (
                  <Check className="w-3.5 h-3.5 stroke-[2.6]" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 stroke-[2.6]" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
