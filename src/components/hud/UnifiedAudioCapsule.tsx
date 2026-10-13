"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  soundscapeManager,
  SOUNDSCAPES_LIST,
  SoundscapeType,
} from "@/lib/audio/soundscapes";
import {
  musicPlayer,
  MusicPlayerState,
} from "@/lib/audio/musicPlayer";
import { soundManager } from "@/lib/audio/sounds";
import { hapticLight } from "@/lib/mobile/nativeBridge";
import { useTranslation } from "@/lib/i18n/translations";
import { Volume2, VolumeX, Music, Waves } from "lucide-react";

export interface UnifiedAudioCapsuleProps {
  onOpenSoundscapes?: () => void;
  isNight?: boolean;
  isOfflinePillShown?: boolean;
}

export function UnifiedAudioCapsule({
  onOpenSoundscapes,
  isNight = false,
  isOfflinePillShown = false,
}: UnifiedAudioCapsuleProps) {
  const { lang } = useTranslation();

  const [soundscapeTrack, setSoundscapeTrack] = useState<SoundscapeType>(() =>
    soundscapeManager.getCurrentTrack()
  );
  const [musicState, setMusicState] = useState<MusicPlayerState>(() =>
    musicPlayer.getState()
  );
  const [isMasterMuted, setIsMasterMuted] = useState<boolean>(() =>
    soundscapeManager.getIsMuted() && musicPlayer.getState().isMuted
  );

  useEffect(() => {
    // 1. Listen for nature soundscape change
    const handleSoundscapeChange = (e: Event) => {
      const track = (e as CustomEvent<SoundscapeType>).detail;
      setSoundscapeTrack(track);
      setIsMasterMuted(
        soundscapeManager.getIsMuted() && musicPlayer.getState().isMuted
      );
    };

    // 2. Listen for lo-fi / ambient music player update
    const handleMusicUpdate = (e: Event) => {
      const state = (e as CustomEvent<MusicPlayerState>).detail;
      setMusicState({ ...state });
      setIsMasterMuted(
        soundscapeManager.getIsMuted() && state.isMuted
      );
    };

    window.addEventListener("rimba:soundscape_change", handleSoundscapeChange);
    window.addEventListener("rimba:music_update", handleMusicUpdate);

    return () => {
      window.removeEventListener(
        "rimba:soundscape_change",
        handleSoundscapeChange
      );
      window.removeEventListener("rimba:music_update", handleMusicUpdate);
    };
  }, []);

  const isSoundscapeActive = soundscapeTrack !== "off";
  const isMusicActive = musicState.isPlaying && Boolean(musicState.currentTrack);
  const isAudioActive = isSoundscapeActive || isMusicActive;

  const soundscapeMeta = useMemo(() => {
    if (!isSoundscapeActive) return null;
    return SOUNDSCAPES_LIST.find((s) => s.id === soundscapeTrack) || null;
  }, [soundscapeTrack, isSoundscapeActive]);

  if (!isAudioActive) {
    return null;
  }

  const handleToggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    hapticLight();
    soundManager.playPop();

    const targetMuted = !isMasterMuted;

    if (isSoundscapeActive) {
      if (soundscapeManager.getIsMuted() !== targetMuted) {
        soundscapeManager.toggleMute();
      }
    }
    if (isMusicActive) {
      if (musicState.isMuted !== targetMuted) {
        musicPlayer.toggleMute();
      }
    }

    setIsMasterMuted(targetMuted);
  };

  const handleOpenAudioModal = () => {
    hapticLight();
    soundManager.playPop();
    onOpenSoundscapes?.();
  };

  // Text title construction
  let displayTitle = "";
  let displayEmoji = "";

  if (isSoundscapeActive && isMusicActive) {
    const sName = soundscapeMeta?.name.split(" ")[0] || "Alam";
    displayEmoji = soundscapeMeta?.icon || "🌧️";
    displayTitle = `${sName} + ${musicState.currentTrack?.title || "Music"}`;
  } else if (isSoundscapeActive) {
    displayEmoji = soundscapeMeta?.icon || "🍃";
    displayTitle = soundscapeMeta?.name || (lang === "en" ? "Nature Sound" : "Suara Alam");
  } else if (isMusicActive) {
    displayEmoji = "🎵";
    displayTitle = musicState.currentTrack?.title || (lang === "en" ? "Focus Lo-Fi" : "Musik Fokus");
  }

  const glassStyle: React.CSSProperties = {
    background: isNight
      ? "linear-gradient(180deg, rgba(255, 255, 255, 0.20) 0%, rgba(20, 45, 32, 0.85) 100%)"
      : "linear-gradient(180deg, rgba(255, 255, 255, 0.92) 0%, rgba(230, 245, 238, 0.88) 100%)",
    backdropFilter: "blur(20px) saturate(160%)",
    WebkitBackdropFilter: "blur(20px) saturate(160%)",
    border: isNight
      ? "1px solid rgba(255, 255, 255, 0.22)"
      : "1px solid rgba(255, 255, 255, 0.75)",
    boxShadow: isNight
      ? "0 8px 24px -4px rgba(0, 0, 0, 0.4), inset 0 1px 0 0 rgba(255, 255, 255, 0.3)"
      : "0 6px 18px -4px rgba(16, 50, 32, 0.15), inset 0 1px 0 0 rgba(255, 255, 255, 0.9)",
  };

  return (
    <div
      className={`absolute left-1/2 -translate-x-1/2 z-30 pointer-events-auto transition-all duration-300 animate-in fade-in slide-in-from-top-2 ${
        isOfflinePillShown ? "top-[82px]" : "top-[50px]"
      }`}
    >
      <div
        role="button"
        tabIndex={0}
        onClick={handleOpenAudioModal}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            handleOpenAudioModal();
          }
        }}
        style={glassStyle}
        className="h-[32px] pl-2.5 pr-1.5 rounded-full flex items-center gap-2 cursor-pointer active:scale-95 transition-all select-none group"
        title={lang === "en" ? "Click to open Audio Player" : "Klik untuk membuka Pemutar Audio"}
        aria-label={lang === "en" ? `Audio playing: ${displayTitle}` : `Audio aktif: ${displayTitle}`}
      >
        {/* Animated Equalizer Waveform or Muted Indicator */}
        {!isMasterMuted ? (
          <div
            className="flex items-end gap-[1.5px] h-3 px-0.5 shrink-0"
            aria-hidden="true"
          >
            <span className="w-[2px] h-2 bg-emerald-500 rounded-full animate-pulse" />
            <span className="w-[2px] h-3 bg-emerald-400 rounded-full animate-pulse [animation-delay:150ms]" />
            <span className="w-[2px] h-2.5 bg-emerald-500 rounded-full animate-pulse [animation-delay:300ms]" />
          </div>
        ) : (
          <span className="text-xs shrink-0 select-none opacity-60">🔇</span>
        )}

        {/* Emoji & Track Name */}
        <div className="flex items-center gap-1 min-w-0">
          <span className="text-[12px] leading-none shrink-0">{displayEmoji}</span>
          <span
            className={`text-[11px] font-semibold truncate max-w-[125px] tracking-tight ${
              isNight ? "text-white" : "text-[#143525]"
            } ${isMasterMuted ? "opacity-60" : ""}`}
          >
            {displayTitle}
          </span>
        </div>

        {/* Quick Master Mute / Unmute Button */}
        <button
          type="button"
          onClick={handleToggleMute}
          className={`w-6 h-6 rounded-full flex items-center justify-center transition-colors shrink-0 ${
            isNight
              ? "bg-white/10 hover:bg-white/20 text-white"
              : "bg-[#143525]/8 hover:bg-[#143525]/15 text-[#143525]"
          }`}
          title={
            isMasterMuted
              ? lang === "en" ? "Unmute Audio" : "Bunyikan Suara"
              : lang === "en" ? "Mute Audio" : "Senyapkan Suara"
          }
          aria-label={
            isMasterMuted
              ? lang === "en" ? "Unmute Audio" : "Bunyikan Suara"
              : lang === "en" ? "Mute Audio" : "Senyapkan Suara"
          }
        >
          {isMasterMuted ? (
            <VolumeX className="w-3.5 h-3.5 text-rose-500 stroke-[2.2]" />
          ) : (
            <Volume2 className="w-3.5 h-3.5 stroke-[2.2]" />
          )}
        </button>
      </div>
    </div>
  );
}
