"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import {
  ArrowLeft,
  Check,
  Bell,
  Droplets,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useGameStore } from "@/lib/game/useGameStore";
import { soundManager } from "@/lib/audio/sounds";
import {
  musicPlayer,
  RIMBA_PLAYLIST,
  MusicPlayerState,
} from "@/lib/audio/musicPlayer";
import {
  hapticLight,
  hapticMedium,
  hapticSuccess,
} from "@/lib/mobile/nativeBridge";
import { useTranslation } from "@/lib/i18n/translations";

interface MobileOnboardingModalProps {
  isOpen: boolean;
  onComplete: () => void;
}

const ONBOARDING_BACKGROUNDS = [
  {
    step: 0,
    src: "/onboarding-1-valley.webp",
    alt: "Lembah Kabut Hening",
  },
  {
    step: 1,
    src: "/onboarding-2-canopy.webp",
    alt: "Kanopi Menembus Langit",
  },
  {
    step: 2,
    src: "/onboarding-3-cathedral.webp",
    alt: "Katedral Hutan Purba",
  },
  {
    step: 3,
    src: "/onboarding-4-resilience.webp",
    alt: "Cemara Keteguhan Tebing",
  },
  {
    step: 4,
    src: "/onboarding-5-twilight.webp",
    alt: "Senja Kawanan Burung Pulang",
  },
  {
    step: 5,
    src: "/onboarding-6-lake.webp",
    alt: "Danau Cermin Suaka",
  },
];


export function MobileOnboardingModal({
  isOpen,
  onComplete,
}: MobileOnboardingModalProps) {
  const { t, lang } = useTranslation();
  const ob = t.onboarding;

  const setDistractionSource = useGameStore(
    (state) => state.setDistractionSource,
  );
  const setProfileName = useGameStore((state) => state.setProfileName);
  const existingProfileName = useGameStore(
    (state) => state.saveData?.profile?.name || "",
  );
  const startFocus = useGameStore((state) => state.startFocus);
  const notify = useGameStore((state) => state.notify);

  const [step, setStep] = useState<number>(0);

  // Slide 1: Multi-select distraction tags
  const [selectedDistractions, setSelectedDistractions] = useState<string[]>([
    "social",
  ]);

  // Slide 2: Organic user name input
  const [userName, setUserName] = useState<string>(existingProfileName);

  // Slide 3: Breathing phase synchronization
  const [breathPhase, setBreathPhase] = useState<"inhale" | "exhale">("inhale");

  // Slide 5: Notification state
  const [hasNotifPermission, setHasNotifPermission] = useState<boolean>(false);

  // Slide 6: Starter intent index
  const [selectedIntentIndex, setSelectedIntentIndex] = useState<number>(0);
  const selectedIntent =
    ob.slide5.intents[selectedIntentIndex] || ob.slide5.intents[0];

  // Music ambient state
  const [isMusicPlaying, setIsMusicPlaying] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "granted") {
        setHasNotifPermission(true);
      }
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const embunTrack =
      RIMBA_PLAYLIST.find((t) => t.id === "amb_1") ||
      RIMBA_PLAYLIST.find((t) =>
        t.title.toLowerCase().includes("embun pagi"),
      ) ||
      RIMBA_PLAYLIST[0];

    const tryStartAudio = () => {
      if (!embunTrack) return;
      musicPlayer.setVolume(0.35);
      musicPlayer.playTrack(embunTrack);
      setIsMusicPlaying(true);
    };

    tryStartAudio();

    const handleMusicUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<MusicPlayerState>;
      if (customEvent.detail) {
        setIsMusicPlaying(
          customEvent.detail.isPlaying && !customEvent.detail.isMuted,
        );
      }
    };
    window.addEventListener("rimba:music_update", handleMusicUpdate);

    const handleFirstGesture = () => {
      const state = musicPlayer.getState();
      if (!state.isPlaying) {
        tryStartAudio();
      }
      window.removeEventListener("pointerdown", handleFirstGesture);
    };
    window.addEventListener("pointerdown", handleFirstGesture, { once: true });

    return () => {
      window.removeEventListener("rimba:music_update", handleMusicUpdate);
      window.removeEventListener("pointerdown", handleFirstGesture);
    };
  }, [isOpen]);

  useEffect(() => {
    if (step !== 2) return;
    const interval = setInterval(() => {
      setBreathPhase((prev) => (prev === "inhale" ? "exhale" : "inhale"));
    }, 4500);
    return () => clearInterval(interval);
  }, [step]);

  if (!isOpen) return null;

  const toggleAudio = () => {
    hapticLight();
    const embunTrack =
      RIMBA_PLAYLIST.find((t) => t.id === "amb_1") ||
      RIMBA_PLAYLIST.find((t) =>
        t.title.toLowerCase().includes("embun pagi"),
      ) ||
      RIMBA_PLAYLIST[0];

    const state = musicPlayer.getState();
    if (state.isPlaying) {
      musicPlayer.togglePlay();
      setIsMusicPlaying(false);
    } else {
      if (embunTrack) {
        musicPlayer.setVolume(0.35);
        musicPlayer.playTrack(embunTrack);
        setIsMusicPlaying(true);
      }
    }
  };

  const handleToggleDistraction = (id: string) => {
    hapticLight();
    setSelectedDistractions((prev) => {
      let next: string[];
      if (prev.includes(id)) {
        if (prev.length === 1) return prev;
        next = prev.filter((item) => item !== id);
      } else {
        next = [...prev, id];
      }
      setDistractionSource(next.join(","));
      return next;
    });
  };

  const handleNextStep = () => {
    hapticLight();
    if (step === 1 && userName.trim()) {
      setProfileName(userName.trim());
    }
    setStep((prev) => Math.min(5, prev + 1));
  };

  const handleRequestNotifications = async () => {
    hapticLight();
    if (typeof window !== "undefined" && "Notification" in window) {
      try {
        const res = await Notification.requestPermission();
        if (res === "granted") {
          setHasNotifPermission(true);
          notify(ob.notifPermSuccess, "success");
        }
      } catch {
        // Ignore
      }
    }
  };

  const handleStartFirstSession = () => {
    hapticSuccess();
    soundManager.playStart();
    if (userName.trim()) {
      setProfileName(userName.trim());
    }
    onComplete();
    const focusTag = lang === "en" ? "Focus" : "Fokus";
    startFocus(10 * 60, focusTag, false, undefined, selectedIntent);
    notify(ob.sessionStartedToast, "info");
  };

  const handleCompleteWithoutFocus = () => {
    hapticMedium();
    if (userName.trim()) {
      setProfileName(userName.trim());
    }
    onComplete();
  };

  return (
    <div
      className="fixed inset-0 z-[110] h-[100dvh] w-full flex flex-col justify-between items-center px-6 bg-[#040D08] text-white overflow-hidden select-none antialiased pointer-events-auto"
      style={{
        paddingTop: "max(calc(env(safe-area-inset-top, 0px) + 16px), 28px)",
        paddingBottom: "max(calc(env(safe-area-inset-bottom, 0px) + 16px), 24px)",
        fontFamily:
          "var(--font-urbanist), 'Urbanist', -apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      {/* 1. Cinematic Background Layer Tanpa Bayangan Pekat */}
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
        {ONBOARDING_BACKGROUNDS.map((bg) => (
          <div
            key={bg.step}
            className={`absolute inset-0 transition-opacity duration-1000 ease-out ${
              bg.step === step ? "opacity-100" : "opacity-0 pointer-events-none"
            }`}
          >
            <Image
              src={bg.src}
              alt={ob.bgAlts[bg.step] || bg.alt}
              fill
              priority={bg.step <= 1}
              className="object-cover object-center brightness-[0.98] contrast-[1.01]"
            />
          </div>
        ))}

        {/* Ambient Top Vignette Halus */}
        <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-black/40 to-transparent pointer-events-none" />

        {/* Ambient Bawah Ringan (hanya cukup untuk kontras teks) */}
        <div className="absolute inset-x-0 bottom-0 h-[42vh] bg-gradient-to-t from-black/65 via-black/25 to-transparent pointer-events-none" />
      </div>

      {/* 2. Top Header: Bersih & Ringan */}
      <div className="relative z-10 w-full max-w-sm flex items-center justify-between pt-1">
        <div className="flex items-center gap-2">
          {step > 0 && (
            <button
              type="button"
              onClick={() => {
                hapticLight();
                setStep((prev) => Math.max(0, prev - 1));
              }}
              className="w-7 h-7 rounded-full bg-white/15 hover:bg-white/20 backdrop-blur-md border border-white/25 flex items-center justify-center text-white/90 hover:text-white mr-1 transition-colors cursor-pointer"
              title={ob.stepBackTitle}
              aria-label={ob.stepBackAria}
            >
              <ArrowLeft className="w-3.5 h-3.5" />
            </button>
          )}

          <span className="text-[11px] tracking-widest text-white/80 font-medium drop-shadow-[0_1px_2px_rgba(0,0,0,0.3)]">
            0{step + 1} <span className="text-white/40">/ 06</span>
          </span>

          <div className="flex items-center gap-1.5 ml-2">
            {[0, 1, 2, 3, 4, 5].map((idx) => (
              <div
                key={idx}
                className={`h-1 rounded-full transition-all duration-500 ${
                  idx === step ? "w-4 bg-white" : "w-1 bg-white/30"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Header Kanan: Frosted Glass Audio Pill & Lewati */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleAudio}
            className={`flex items-center gap-1.5 py-1 px-3 rounded-full backdrop-blur-md border text-[11px] transition-colors cursor-pointer ${
              isMusicPlaying
                ? "bg-white/25 border-white/40 text-white"
                : "bg-white/12 border-white/20 text-white/80 hover:text-white"
            }`}
            title={isMusicPlaying ? ob.audioMute : ob.audioPlay}
            aria-label={t.hud.menuSoundscape}
          >
            {isMusicPlaying ? (
              <>
                <Volume2 className="w-3.5 h-3.5 text-white" />
                <span className="text-[10.5px] font-medium hidden sm:inline text-white">
                  {ob.audioTrackName}
                </span>
              </>
            ) : (
              <>
                <VolumeX className="w-3.5 h-3.5" />
                <span className="text-[10.5px] font-normal hidden sm:inline text-white/80">
                  {ob.audioMutedLabel}
                </span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleCompleteWithoutFocus}
            className="text-xs text-white/80 hover:text-white transition-colors py-1 px-3 rounded-full bg-white/12 hover:bg-white/18 backdrop-blur-md border border-white/20 cursor-pointer"
          >
            {ob.skip}
          </button>
        </div>
      </div>

      {/* 3. Core Philosophical Content */}
      <div className="relative z-10 w-full max-w-sm flex-1 flex flex-col justify-end pb-3 space-y-4">
        {/* ======================================================== */}
        {/* SLIDE 1: HENING LEMBAH                                   */}
        {/* ======================================================== */}
        {step === 0 && (
          <div className="w-full space-y-3.5 text-left animate-in fade-in duration-300">
            <div className="space-y-1">
              <span className="text-[10.5px] tracking-widest text-white/60 uppercase font-medium drop-shadow-[0_1px_2px_rgba(0,0,0,0.3)]">
                {ob.slide0.badge}
              </span>
              <h1 className="font-serif italic text-[28px] sm:text-[32px] font-normal tracking-tight text-white leading-tight drop-shadow-[0_2px_4px_rgba(0,0,0,0.35)]">
                {ob.slide0.title}
              </h1>
              <p className="text-[12.5px] text-white/85 leading-relaxed font-light pt-0.5 drop-shadow-[0_1px_2px_rgba(0,0,0,0.3)]">
                {ob.slide0.subtitle}
              </p>
            </div>

            {/* Frosted Glass Tags Tanpa Shadow Berat */}
            <div className="flex flex-wrap gap-2 pt-1">
              {ob.slide0.tags.map((opt) => {
                const active = selectedDistractions.includes(opt.id);
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => handleToggleDistraction(opt.id)}
                    className={`px-3.5 py-2 rounded-full text-xs backdrop-blur-md transition-colors cursor-pointer flex items-center gap-1.5 border ${
                      active
                        ? "bg-white text-neutral-900 font-semibold border-white"
                        : "bg-white/14 hover:bg-white/20 text-white border-white/25"
                    }`}
                  >
                    {active && <Check className="w-3 h-3 stroke-[3]" />}
                    <span>{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* SLIDE 2: IDENTITAS                                       */}
        {/* ======================================================== */}
        {step === 1 && (
          <div className="w-full space-y-4 text-left animate-in fade-in duration-300">
            <div className="space-y-1">
              <span className="text-[10.5px] tracking-widest text-white/60 uppercase font-medium drop-shadow-[0_1px_2px_rgba(0,0,0,0.3)]">
                {ob.slide1.badge}
              </span>
              <h1 className="font-serif italic text-[28px] sm:text-[32px] font-normal tracking-tight text-white leading-tight drop-shadow-[0_2px_4px_rgba(0,0,0,0.35)]">
                {ob.slide1.title}
              </h1>
              <p className="text-[12.5px] text-white/85 leading-relaxed font-light pt-0.5 drop-shadow-[0_1px_2px_rgba(0,0,0,0.3)]">
                {ob.slide1.subtitle}
              </p>
            </div>

            <div className="pt-2 pb-1 space-y-2">
              <div className="relative border-b border-white/40 focus-within:border-white transition-colors pb-1.5">
                <input
                  type="text"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  placeholder={ob.slide1.placeholder}
                  className="w-full bg-transparent text-xl font-serif italic text-white placeholder-white/40 focus:outline-none tracking-wide"
                  maxLength={24}
                  autoComplete="name"
                />
              </div>
              <p className="text-[11px] text-white/60 font-light">
                {ob.slide1.hint}
              </p>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* SLIDE 3: TARIKAN NAPAS                                   */}
        {/* ======================================================== */}
        {step === 2 && (
          <div className="w-full space-y-5 text-left animate-in fade-in duration-300 flex flex-col items-start">
            <div className="w-full flex flex-col items-center justify-center py-5 select-none pointer-events-none">
              <div className="relative flex items-center justify-center w-36 h-36">
                <div
                  className={`absolute inset-0 rounded-full border transition-all duration-[4500ms] ease-in-out ${
                    breathPhase === "inhale"
                      ? "scale-110 border-white/40 opacity-90"
                      : "scale-90 border-white/20 opacity-40"
                  }`}
                />

                <div
                  className={`w-24 h-24 rounded-full border backdrop-blur-md flex flex-col items-center justify-center transition-all duration-[4500ms] ease-in-out ${
                    breathPhase === "inhale"
                      ? "scale-105 bg-white/20 border-white/50"
                      : "scale-90 bg-white/10 border-white/25"
                  }`}
                >
                  <span className="text-[11px] font-medium text-white tracking-widest uppercase transition-opacity duration-700">
                    {breathPhase === "inhale"
                      ? ob.slide2.inhale
                      : ob.slide2.exhale}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-[10.5px] tracking-widest text-white/60 uppercase font-medium drop-shadow-[0_1px_2px_rgba(0,0,0,0.3)]">
                {ob.slide2.badge}
              </span>
              <h1 className="font-serif italic text-[28px] sm:text-[32px] font-normal tracking-tight text-white leading-tight drop-shadow-[0_2px_4px_rgba(0,0,0,0.35)]">
                {ob.slide2.title}
              </h1>
              <p className="text-[12.5px] text-white/85 leading-relaxed font-light pt-0.5 drop-shadow-[0_1px_2px_rgba(0,0,0,0.3)]">
                {ob.slide2.subtitle}
              </p>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* SLIDE 4: KETEGUHAN BATIN                                 */}
        {/* ======================================================== */}
        {step === 3 && (
          <div className="w-full space-y-3.5 text-left animate-in fade-in duration-300">
            <div className="space-y-1">
              <span className="text-[10.5px] tracking-widest text-white/60 uppercase font-medium drop-shadow-[0_1px_2px_rgba(0,0,0,0.3)]">
                {ob.slide3.badge}
              </span>
              <h1 className="font-serif italic text-[28px] sm:text-[32px] font-normal tracking-tight text-white leading-tight drop-shadow-[0_2px_4px_rgba(0,0,0,0.35)]">
                {ob.slide3.title}
              </h1>
            </div>

            <div className="space-y-2.5 pt-0.5">
              <p className="text-[12.5px] text-white/85 leading-relaxed font-light drop-shadow-[0_1px_2px_rgba(0,0,0,0.3)]">
                {ob.slide3.desc}
              </p>

              <div className="flex items-center gap-3 pt-1">
                <div className="w-7 h-7 rounded-full bg-white/15 backdrop-blur-md border border-white/25 flex items-center justify-center shrink-0">
                  <Droplets className="w-3.5 h-3.5 text-white" />
                </div>
                <span className="text-xs text-white font-medium drop-shadow-[0_1px_2px_rgba(0,0,0,0.3)]">
                  {ob.slide3.feature}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* SLIDE 5: RITME BERPULANG                                 */}
        {/* ======================================================== */}
        {step === 4 && (
          <div className="w-full space-y-3.5 text-left animate-in fade-in duration-300">
            <div className="space-y-1">
              <span className="text-[10.5px] tracking-widest text-white/60 uppercase font-medium drop-shadow-[0_1px_2px_rgba(0,0,0,0.3)]">
                {ob.slide4.badge}
              </span>
              <h1 className="font-serif italic text-[28px] sm:text-[32px] font-normal tracking-tight text-white leading-tight drop-shadow-[0_2px_4px_rgba(0,0,0,0.35)]">
                {ob.slide4.title}
              </h1>
              <p className="text-[12.5px] text-white/85 leading-relaxed font-light pt-0.5 drop-shadow-[0_1px_2px_rgba(0,0,0,0.3)]">
                {ob.slide4.desc}
              </p>
            </div>

            <div className="pt-1.5">
              <button
                type="button"
                onClick={handleRequestNotifications}
                className="inline-flex items-center gap-2.5 px-4 py-2.5 rounded-full bg-white/14 hover:bg-white/20 border border-white/25 text-xs text-white backdrop-blur-md transition-colors cursor-pointer"
              >
                <Bell className="w-3.5 h-3.5 text-white" />
                <span>
                  {hasNotifPermission
                    ? ob.slide4.notifActive
                    : ob.slide4.notifBtn}
                </span>
              </button>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* SLIDE 6: TELAGA HENING                                   */}
        {/* ======================================================== */}
        {step === 5 && (
          <div className="w-full space-y-3.5 text-left animate-in fade-in duration-300">
            <div className="space-y-1">
              <span className="text-[10.5px] tracking-widest text-white/60 uppercase font-medium drop-shadow-[0_1px_2px_rgba(0,0,0,0.3)]">
                {ob.slide5.badge}
              </span>
              <h1 className="font-serif italic text-[28px] sm:text-[32px] font-normal tracking-tight text-white leading-tight drop-shadow-[0_2px_4px_rgba(0,0,0,0.35)]">
                {userName.trim()
                  ? ob.slide5.titleWithName.replace("{name}", userName.trim())
                  : ob.slide5.titleWithoutName}
              </h1>
              <p className="text-[12.5px] text-white/85 leading-relaxed font-light pt-0.5 drop-shadow-[0_1px_2px_rgba(0,0,0,0.3)]">
                {ob.slide5.subtitle}
              </p>
            </div>

            {/* Frosted Intent Chips */}
            <div className="space-y-1.5 pt-1">
              <span className="text-[11px] text-white/60 block font-light">
                {ob.slide5.intentLabel}
              </span>
              <div className="flex flex-wrap gap-1.5">
                {ob.slide5.intents.map((intent, idx) => {
                  const active = selectedIntentIndex === idx;
                  return (
                    <button
                      key={intent}
                      type="button"
                      onClick={() => {
                        hapticLight();
                        setSelectedIntentIndex(idx);
                      }}
                      className={`px-3 py-1.5 rounded-full text-xs backdrop-blur-md transition-colors cursor-pointer border ${
                        active
                          ? "bg-white text-neutral-900 font-semibold border-white"
                          : "bg-white/14 hover:bg-white/20 text-white border-white/25"
                      }`}
                    >
                      {intent}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 4. Bottom Control Deck (Jernih, Tanpa Shadow Kotak Hitam) */}
      <div className="relative z-10 w-full max-w-sm space-y-2 pt-1">
        {step < 5 && (
          <button
            type="button"
            onClick={handleNextStep}
            className="w-full py-3.5 px-6 rounded-2xl font-semibold text-xs tracking-wide text-white bg-white/16 hover:bg-white/24 backdrop-blur-md border border-white/15 transition-colors flex items-center justify-center cursor-pointer"
          >
            {ob.continueBtn}
          </button>
        )}

        {step === 5 && (
          <div className="space-y-2">
            <button
              type="button"
              onClick={handleStartFirstSession}
              className="w-full py-3.5 px-6 rounded-2xl font-semibold text-xs tracking-wide text-white bg-white/25 hover:bg-white/35 backdrop-blur-md border border-white/40 transition-colors flex items-center justify-center cursor-pointer"
            >
              {ob.startFirstSession}
            </button>

            <button
              type="button"
              onClick={handleCompleteWithoutFocus}
              className="w-full py-2 text-xs font-normal text-white/75 hover:text-white transition-colors text-center cursor-pointer"
            >
              {ob.enterWithoutTimer}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
