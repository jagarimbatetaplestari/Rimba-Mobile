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

const DISTRACTION_TAGS = [
  { id: "social", label: "Media Sosial & Linimasa" },
  { id: "notif", label: "Pesan & Notifikasi" },
  { id: "overthinking", label: "Keraguan & Overthinking" },
  { id: "video", label: "Video Pendek" },
  { id: "work", label: "Riuh Tuntutan Harian" },
];

const INTENT_OPTIONS = [
  "Pikiran Tenang",
  "Belajar Mendalam",
  "Fokus Berkarya",
  "Rehat Sadar",
];

export function MobileOnboardingModal({
  isOpen,
  onComplete,
}: MobileOnboardingModalProps) {
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

  // Slide 6: Starter intent
  const [selectedIntent, setSelectedIntent] = useState<string>("Pikiran Tenang");

  // Music ambient state ("Embun Pagi Rimba")
  const [isMusicPlaying, setIsMusicPlaying] = useState<boolean>(false);

  // Check notification status on mount
  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "granted") {
        setHasNotifPermission(true);
      }
    }
  }, []);

  // Ambient audio playback: Play "Embun Pagi Rimba" during onboarding
  useEffect(() => {
    if (!isOpen) return;

    const embunTrack =
      RIMBA_PLAYLIST.find((t) => t.id === "amb_1") ||
      RIMBA_PLAYLIST.find((t) => t.title.toLowerCase().includes("embun pagi")) ||
      RIMBA_PLAYLIST[0];

    const tryStartAudio = () => {
      if (!embunTrack) return;
      musicPlayer.setVolume(0.4);
      musicPlayer.playTrack(embunTrack);
      setIsMusicPlaying(true);
    };

    // Attempt direct start
    tryStartAudio();

    // Listen to updates from musicPlayer
    const handleMusicUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<MusicPlayerState>;
      if (customEvent.detail) {
        setIsMusicPlaying(customEvent.detail.isPlaying && !customEvent.detail.isMuted);
      }
    };
    window.addEventListener("rimba:music_update", handleMusicUpdate);

    // If browser blocked autoplay without prior gesture, start on first touch/pointerdown
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

  // Slide 3: 4-second breathing cycle loop
  useEffect(() => {
    if (step !== 2) return;
    const interval = setInterval(() => {
      setBreathPhase((prev) => (prev === "inhale" ? "exhale" : "inhale"));
    }, 4000);
    return () => clearInterval(interval);
  }, [step]);

  if (!isOpen) return null;

  const toggleAudio = () => {
    hapticLight();
    const embunTrack =
      RIMBA_PLAYLIST.find((t) => t.id === "amb_1") ||
      RIMBA_PLAYLIST.find((t) => t.title.toLowerCase().includes("embun pagi")) ||
      RIMBA_PLAYLIST[0];

    const state = musicPlayer.getState();
    if (state.isPlaying) {
      musicPlayer.togglePlay();
      setIsMusicPlaying(false);
    } else {
      if (embunTrack) {
        musicPlayer.setVolume(0.4);
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
    // Persist name if leaving slide 2
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
          notify("Sapaan hening Rimba aktif.", "success");
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
    startFocus(10 * 60, "Fokus", false, undefined, selectedIntent);
    notify(
      "Sesi 10 Menit dimulai. Selamat merawat ketenangan di Rimba.",
      "info",
    );
  };

  const handleCompleteWithoutFocus = () => {
    hapticMedium();
    if (userName.trim()) {
      setProfileName(userName.trim());
    }
    onComplete();
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-between items-center px-6 bg-[#040D08] text-white overflow-hidden select-none antialiased pt-[max(env(safe-area-inset-top,1.5rem),1.5rem)] pb-[max(env(safe-area-inset-bottom,1.5rem),1.5rem)] pointer-events-auto">
      {/* 1. Cinematic Crossfading Background Art Layer */}
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
        {ONBOARDING_BACKGROUNDS.map((bg) => (
          <div
            key={bg.step}
            className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
              bg.step === step
                ? "opacity-100 scale-100"
                : "opacity-0 scale-105 pointer-events-none"
            }`}
          >
            <Image
              src={bg.src}
              alt={bg.alt}
              fill
              priority={bg.step <= 1}
              className="object-cover object-center filter brightness-[0.98] contrast-[1.02]"
            />
          </div>
        ))}

        {/* Ambient Top Shadow */}
        <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/80 via-black/35 to-transparent pointer-events-none" />

        {/* Deep Bottom Ambient Scrim (Leaves top & center open for photographic art) */}
        <div className="absolute inset-x-0 bottom-0 h-[65vh] bg-gradient-to-t from-black/95 via-black/60 via-45% to-transparent pointer-events-none" />
      </div>

      {/* 2. Top Header: Minimal Step Indicator, Audio Pill & Navigation */}
      <div className="relative z-10 w-full max-w-sm flex items-center justify-between pt-1">
        <div className="flex items-center gap-2">
          {step > 0 && (
            <button
              type="button"
              onClick={() => {
                hapticLight();
                setStep((prev) => Math.max(0, prev - 1));
              }}
              className="w-7 h-7 rounded-full bg-black/30 backdrop-blur-md border border-white/20 flex items-center justify-center text-white/80 hover:text-white mr-1 active:scale-95 cursor-pointer"
              title="Kembali"
              aria-label="Kembali ke langkah sebelumnya"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
            </button>
          )}

          <span className="text-[11px] tracking-wider text-white font-medium">
            0{step + 1} <span className="text-white/40">/ 06</span>
          </span>

          <div className="flex items-center gap-1 ml-1.5">
            {[0, 1, 2, 3, 4, 5].map((idx) => (
              <div
                key={idx}
                className={`h-1 rounded-full transition-all duration-300 ${
                  idx === step
                    ? "w-4 bg-white shadow-[0_0_6px_rgba(255,255,255,0.7)]"
                    : "w-1 bg-white/30"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Right Header: Audio Pill & Lewati */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleAudio}
            className={`flex items-center gap-1.5 py-1 px-2.5 rounded-full backdrop-blur-md border text-[11px] transition-all cursor-pointer ${
              isMusicPlaying
                ? "bg-white/20 border-white/30 text-white shadow-[0_0_10px_rgba(255,255,255,0.2)]"
                : "bg-black/30 border-white/15 text-white/60 hover:text-white"
            }`}
            title={isMusicPlaying ? "Heningkan Audio" : "Putar Embun Pagi Rimba"}
            aria-label="Kontrol musik latar"
          >
            {isMusicPlaying ? (
              <>
                <Volume2 className="w-3 h-3 text-white animate-pulse" />
                <span className="text-[10px] font-light hidden sm:inline">Embun Pagi</span>
              </>
            ) : (
              <>
                <VolumeX className="w-3 h-3" />
                <span className="text-[10px] font-light hidden sm:inline">Audio</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleCompleteWithoutFocus}
            className="text-xs text-white/70 hover:text-white transition-colors py-1 px-3 rounded-full bg-black/30 backdrop-blur-md border border-white/15 active:scale-95 cursor-pointer"
          >
            Lewati
          </button>
        </div>
      </div>

      {/* 3. Core Content Body (Editorial, Breathable, Asymmetric) */}
      <div className="relative z-10 w-full max-w-sm flex-1 flex flex-col justify-end pb-3 space-y-4">
        {/* ======================================================== */}
        {/* SLIDE 1: TITIK NOL (Lembah Kabut - Refleksi Riuh)        */}
        {/* ======================================================== */}
        {step === 0 && (
          <div className="w-full space-y-3.5 text-left animate-in fade-in duration-300">
            <div className="space-y-1">
              <span className="text-[10px] tracking-wider text-white/50 uppercase font-medium">
                01 · Hening Lembah
              </span>
              <h1 className="font-serif italic text-[29px] sm:text-[33px] font-normal tracking-tight text-white leading-tight">
                Di sela deru dunia, apa yang paling sering menyita pikiranmu?
              </h1>
              <p className="text-xs text-white/75 leading-relaxed font-light pt-0.5">
                Sentuh hal yang kerap mengusikmu. Mengenalinya adalah awal dari ketenangan.
              </p>
            </div>

            {/* Organic Floating Pills (Card-Free) */}
            <div className="flex flex-wrap gap-2 pt-1">
              {DISTRACTION_TAGS.map((opt) => {
                const active = selectedDistractions.includes(opt.id);
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => handleToggleDistraction(opt.id)}
                    className={`px-3.5 py-2 rounded-full text-xs transition-all active:scale-95 cursor-pointer flex items-center gap-1.5 ${
                      active
                        ? "bg-white text-slate-900 font-medium shadow-[0_2px_12px_rgba(255,255,255,0.3)]"
                        : "bg-black/35 hover:bg-black/45 text-white/80 border border-white/15 backdrop-blur-md"
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
        {/* SLIDE 2: IDENTITAS (Kanopi Hutan - Input Nama Organik)   */}
        {/* ======================================================== */}
        {step === 1 && (
          <div className="w-full space-y-4 text-left animate-in fade-in duration-300">
            <div className="space-y-1">
              <span className="text-[10px] tracking-wider text-white/50 uppercase font-medium">
                02 · Jejak Langkah
              </span>
              <h1 className="font-serif italic text-[29px] sm:text-[33px] font-normal tracking-tight text-white leading-tight">
                Bagaimana Rimba memanggilmu?
              </h1>
              <p className="text-xs text-white/75 leading-relaxed font-light pt-0.5">
                Sebuah nama untuk mengakar dan menandai tanah suakamu.
              </p>
            </div>

            {/* Editorial Single Line Underline Form (Card-Free) */}
            <div className="pt-2 pb-1 space-y-2">
              <div className="relative border-b-2 border-white/30 focus-within:border-white transition-all pb-2">
                <input
                  type="text"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  placeholder="Tulis namamu..."
                  className="w-full bg-transparent text-xl font-serif italic text-white placeholder-white/30 focus:outline-none tracking-wide"
                  maxLength={24}
                  autoComplete="name"
                />
              </div>
              <p className="text-[11px] text-white/50 font-light">
                Nama ini akan terukir di suaka dan merawat pohon pertamamu.
              </p>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* SLIDE 3: TARIKAN NAPAS (Katedral Hutan - Penyelarasan)   */}
        {/* ======================================================== */}
        {step === 2 && (
          <div className="w-full space-y-5 text-left animate-in fade-in duration-300 flex flex-col items-start">
            {/* Ethereal Breath Synchronizer floating directly inside cathedral god rays */}
            <div className="w-full flex flex-col items-center justify-center py-4 select-none pointer-events-none">
              <div className="relative flex items-center justify-center">
                {/* Outer Pulsing Aura Ring */}
                <div
                  className={`w-36 h-36 rounded-full border transition-all duration-[4000ms] ease-in-out ${
                    breathPhase === "inhale"
                      ? "scale-125 border-white/35 shadow-[0_0_35px_rgba(255,255,255,0.25)]"
                      : "scale-90 border-white/10 shadow-[0_0_10px_rgba(255,255,255,0.05)]"
                  }`}
                />

                {/* Inner Glowing Core */}
                <div
                  className={`absolute w-24 h-24 rounded-full border border-white/25 flex flex-col items-center justify-center transition-all duration-[4000ms] ease-in-out ${
                    breathPhase === "inhale"
                      ? "scale-110 bg-white/20 shadow-[0_0_25px_rgba(255,255,255,0.3)] backdrop-blur-md"
                      : "scale-85 bg-white/5 backdrop-blur-sm"
                  }`}
                >
                  <span className="text-[11px] font-light text-white tracking-widest uppercase transition-opacity duration-700">
                    {breathPhase === "inhale" ? "Tarik Napas" : "Hembuskan"}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] tracking-wider text-white/50 uppercase font-medium">
                03 · Tarikan Napas Pertama
              </span>
              <h1 className="font-serif italic text-[29px] sm:text-[33px] font-normal tracking-tight text-white leading-tight">
                Hadir seutuhnya di saat ini.
              </h1>
              <p className="text-xs text-white/75 leading-relaxed font-light pt-0.5">
                Rasakan sejuknya udara hutan memenuhi dadamu, lalu hembuskan segala beban yang kamu bawa hari ini.
              </p>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* SLIDE 4: KETEGUHAN BATIN (Cemara Tebing - Memaafkan Diri) */}
        {/* ======================================================== */}
        {step === 3 && (
          <div className="w-full space-y-3.5 text-left animate-in fade-in duration-300">
            <div className="space-y-1">
              <span className="text-[10px] tracking-wider text-white/50 uppercase font-medium">
                04 · Keteguhan Batin
              </span>
              <h1 className="font-serif italic text-[29px] sm:text-[33px] font-normal tracking-tight text-white leading-tight">
                Pohon tidak pernah tergesa untuk tumbuh.
              </h1>
            </div>

            <div className="space-y-2.5 pt-0.5">
              <p className="text-xs text-white/80 leading-relaxed font-light">
                Jika suatu hari kamu lelah dan ritmemu sempat terputus, Rimba tidak pernah menghukummu.
              </p>

              <div className="flex items-center gap-2.5 pt-1">
                <div className="w-7 h-7 rounded-full bg-white/10 border border-white/20 flex items-center justify-center shrink-0">
                  <Droplets className="w-3.5 h-3.5 text-white" />
                </div>
                <span className="text-xs text-white/90 font-medium">
                  Embun Pelindung menjaga pulaumu hingga kamu siap kembali.
                </span>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* SLIDE 5: RITME BERPULANG (Senja Rimba - Jeda & Istirahat)  */}
        {/* ======================================================== */}
        {step === 4 && (
          <div className="w-full space-y-3.5 text-left animate-in fade-in duration-300">
            <div className="space-y-1">
              <span className="text-[10px] tracking-wider text-white/50 uppercase font-medium">
                05 · Ritme Berpulang
              </span>
              <h1 className="font-serif italic text-[29px] sm:text-[33px] font-normal tracking-tight text-white leading-tight">
                Matahari tahu kapan harus terbenam.
              </h1>
              <p className="text-xs text-white/75 leading-relaxed font-light pt-0.5">
                Burung tahu kapan harus berpulang ke sarang. Kamu pun berhak untuk berhenti sejenak dan beristirahat.
              </p>
            </div>

            {/* Minimalist Floating Bell Capsule (Card-Free) */}
            <div className="pt-1.5">
              <button
                type="button"
                onClick={handleRequestNotifications}
                className="inline-flex items-center gap-2.5 px-4 py-2.5 rounded-full bg-black/35 hover:bg-black/45 active:bg-black/55 border border-white/20 text-xs text-white backdrop-blur-md transition-all active:scale-95 cursor-pointer"
              >
                <Bell className="w-3.5 h-3.5 text-white/80" />
                <span>
                  {hasNotifPermission
                    ? "Sapaan hening aktif saat senja"
                    : "Sapa aku dengan lembut saat tiba waktu hening"}
                </span>
              </button>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* SLIDE 6: TELAGA HENING (Danau Cermin - Memulai Pribadi)   */}
        {/* ======================================================== */}
        {step === 5 && (
          <div className="w-full space-y-3.5 text-left animate-in fade-in duration-300">
            <div className="space-y-1">
              <span className="text-[10px] tracking-wider text-white/50 uppercase font-medium">
                06 · Telaga Hening
              </span>
              <h1 className="font-serif italic text-[29px] sm:text-[33px] font-normal tracking-tight text-white leading-tight">
                {userName.trim() ? `${userName.trim()}, suakamu` : "Suakamu"} telah menanti.
              </h1>
              <p className="text-xs text-white/75 leading-relaxed font-light pt-0.5">
                Air telaga yang tenang mampu memantulkan seluruh semesta. Duduklah dengan nyaman, dan mari kita mulai.
              </p>
            </div>

            {/* Organic Floating Intent Chips (Card-Free) */}
            <div className="space-y-1.5 pt-1">
              <span className="text-[11px] text-white/50 block font-light">
                Pilih niat pertamamu:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {INTENT_OPTIONS.map((intent) => {
                  const active = selectedIntent === intent;
                  return (
                    <button
                      key={intent}
                      type="button"
                      onClick={() => {
                        hapticLight();
                        setSelectedIntent(intent);
                      }}
                      className={`px-3 py-1.5 rounded-full text-xs transition-all active:scale-95 cursor-pointer ${
                        active
                          ? "bg-white text-slate-900 font-medium shadow-[0_2px_10px_rgba(255,255,255,0.25)]"
                          : "bg-black/35 hover:bg-black/45 text-white/75 border border-white/15 backdrop-blur-md"
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

      {/* 4. Bottom Control Deck (Pure Liquid Clear Glass Button) */}
      <div className="relative z-10 w-full max-w-sm space-y-2 pt-1">
        {step < 5 && (
          <button
            type="button"
            onClick={handleNextStep}
            className="w-full py-3.5 px-6 rounded-2xl font-medium text-xs text-white bg-black/25 hover:bg-black/35 active:bg-black/45 backdrop-blur-md border border-white/20 shadow-[0_8px_24px_rgba(0,0,0,0.25),inset_0_1px_0_rgba(255,255,255,0.2)] transition-all active:scale-[0.98] flex items-center justify-center cursor-pointer"
          >
            Lanjutkan
          </button>
        )}

        {step === 5 && (
          <div className="space-y-2">
            <button
              type="button"
              onClick={handleStartFirstSession}
              className="w-full py-3.5 px-6 rounded-2xl font-medium text-xs text-white bg-black/25 hover:bg-black/35 active:bg-black/45 backdrop-blur-md border border-white/20 shadow-[0_8px_24px_rgba(0,0,0,0.25),inset_0_1px_0_rgba(255,255,255,0.2)] transition-all active:scale-[0.98] flex items-center justify-center cursor-pointer"
            >
              Mulai 10 Menit Pertama
            </button>

            <button
              type="button"
              onClick={handleCompleteWithoutFocus}
              className="w-full py-2 text-xs font-light text-white/70 hover:text-white transition-colors text-center cursor-pointer"
            >
              Jelajahi Suaka Terlebih Dahulu
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
