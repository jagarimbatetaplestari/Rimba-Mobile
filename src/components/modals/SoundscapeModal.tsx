"use client";

import React, { useState, useEffect } from "react";
import {
  soundscapeManager,
  SOUNDSCAPES_LIST,
  SoundscapeType,
} from "@/lib/audio/soundscapes";
import {
  musicPlayer,
  RIMBA_PLAYLIST,
  MusicTrack,
  MusicPlayerState,
} from "@/lib/audio/musicPlayer";
import { soundManager } from "@/lib/audio/sounds";
import { hapticLight, hapticMedium } from "@/lib/mobile/nativeBridge";
import {
  X,
  Volume2,
  VolumeX,
  Check,
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Music2,
  Wind,
  Square,
} from "lucide-react";

interface SoundscapeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type ActiveTab = "music" | "nature";
type MusicFilterCategory = "all" | "jazz" | "chill" | "ambient";

export function SoundscapeModal({ isOpen, onClose }: SoundscapeModalProps) {
  const [activeTab, setActiveTab] = useState<ActiveTab>("music");
  const [musicCategory, setMusicCategory] =
    useState<MusicFilterCategory>("all");

  // Nature Soundscape state
  const [activeNatureTrack, setActiveNatureTrack] = useState<SoundscapeType>(
    soundscapeManager.getCurrentTrack(),
  );
  const [natureVolume, setNatureVolume] = useState<number>(
    soundscapeManager.getVolume(),
  );
  const [natureMuted, setNatureMuted] = useState<boolean>(
    soundscapeManager.getIsMuted(),
  );

  // Music Player state
  const [musicState, setMusicState] = useState<MusicPlayerState>(
    musicPlayer.getState(),
  );

  useEffect(() => {
    const handleMusicUpdate = (e: Event) => {
      const detail = (e as CustomEvent<MusicPlayerState>).detail;
      setMusicState({ ...detail });
    };

    window.addEventListener("rimba:music_update", handleMusicUpdate);
    return () => {
      window.removeEventListener("rimba:music_update", handleMusicUpdate);
    };
  }, []);

  const handleSelectNatureTrack = (trackId: SoundscapeType) => {
    soundManager.playPop();
    hapticLight();
    if (activeNatureTrack === trackId) {
      soundscapeManager.stop();
      setActiveNatureTrack("off");
    } else {
      soundscapeManager.play(trackId);
      setActiveNatureTrack(trackId);
    }
  };

  const handleNatureVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setNatureVolume(val);
    soundscapeManager.setVolume(val);
  };

  const handleToggleNatureMute = () => {
    soundManager.playPop();
    hapticLight();
    const isMuted = soundscapeManager.toggleMute();
    setNatureMuted(isMuted);
  };

  const handleSelectMusicTrack = (track: MusicTrack) => {
    soundManager.playPop();
    hapticLight();
    musicPlayer.playTrack(track);
  };

  const handleToggleMusicPlay = () => {
    soundManager.playPop();
    hapticMedium();
    musicPlayer.togglePlay();
  };

  const handleMusicNext = () => {
    soundManager.playPop();
    hapticLight();
    musicPlayer.next();
  };

  const handleMusicPrev = () => {
    soundManager.playPop();
    hapticLight();
    musicPlayer.prev();
  };

  const handleMusicVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    musicPlayer.setVolume(val);
  };

  const handleToggleMusicMute = () => {
    soundManager.playPop();
    hapticLight();
    musicPlayer.toggleMute();
  };

  const handleStopAll = () => {
    soundManager.playPop();
    hapticMedium();
    soundscapeManager.stop();
    setActiveNatureTrack("off");
    musicPlayer.stop();
  };

  const filteredPlaylist = RIMBA_PLAYLIST.filter((track) => {
    if (musicCategory === "all") return true;
    return track.category === musicCategory;
  });

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto no-scrollbar select-none antialiased"
      style={{
        background:
          "linear-gradient(180deg, #d4e7dc 0%, #c5dfd1 45%, #b4d3c2 100%)",
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', var(--font-geist-sans), sans-serif",
      }}
    >
      {/* Top Ambient Glow */}
      <div
        className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-lg h-72 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% -10%, rgba(255, 255, 255, 0.5), transparent 70%)",
        }}
      />

      {/* Main Content Container */}
      <div className="relative z-10 w-full max-w-md mx-auto px-4 sm:px-5 pt-[max(env(safe-area-inset-top,1rem),1.25rem)] pb-[max(calc(env(safe-area-inset-bottom,0px)+2.5rem),3rem)] space-y-4">
        {/* Navigation Header */}
        <div className="flex items-center justify-between pt-1 pb-1">
          <div className="flex items-baseline gap-2">
            <h2 className="text-[21px] font-semibold tracking-tight text-[#143525]">
              Sanctum Audio
            </h2>
            <span className="text-[12.5px] font-normal text-[#456b57]">
              Suara Alam & Musik
            </span>
          </div>

          <button
            type="button"
            onClick={() => {
              hapticLight();
              onClose();
            }}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-white/80 bg-white/60 hover:bg-white/80 text-[#143525] transition-transform active:scale-90 cursor-pointer shadow-2xs"
            aria-label="Tutup"
          >
            <X className="h-4 w-4 stroke-[2.2]" />
          </button>
        </div>

        {/* Segmented Control Switch */}
        <div className="rounded-full p-1 border border-white/85 bg-white/60 shadow-2xs grid grid-cols-2 gap-1">
          <button
            type="button"
            onClick={() => {
              soundManager.playPop();
              hapticLight();
              setActiveTab("music");
            }}
            className={`py-2 px-3 rounded-full text-[12.5px] font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === "music"
                ? "bg-white text-[#143525] shadow-xs"
                : "text-[#456b57] hover:text-[#143525]"
            }`}
          >
            <Music2 className="w-3.5 h-3.5" />
            <span>Musik Lo-Fi</span>
            {musicState.isPlaying && (
              <span className="w-2 h-2 rounded-full bg-[#1e5638] animate-pulse" />
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              soundManager.playPop();
              hapticLight();
              setActiveTab("nature");
            }}
            className={`py-2 px-3 rounded-full text-[12.5px] font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === "nature"
                ? "bg-white text-[#143525] shadow-xs"
                : "text-[#456b57] hover:text-[#143525]"
            }`}
          >
            <Wind className="w-3.5 h-3.5" />
            <span>Suara Alam</span>
            {activeNatureTrack !== "off" && (
              <span className="w-2 h-2 rounded-full bg-[#1e5638] animate-pulse" />
            )}
          </button>
        </div>

        {/* TAB 1: MUSIK LO-FI */}
        {activeTab === "music" && (
          <div className="space-y-4 animate-in fade-in duration-200">
            {/* Now Playing Bento Card */}
            <div>
              <p className="px-1 pb-1.5 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-[#2f5542]/75">
                Sedang Diputar
              </p>

              <div className="rounded-[24px] border border-white/85 bg-white/75 p-4 shadow-[0_8px_24px_rgba(20,50,30,0.05)] space-y-3.5 min-w-0 overflow-hidden">
                <div className="flex items-center justify-between min-w-0 gap-3">
                  <div className="min-w-0 flex-1 text-left">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#456b57] block">
                      {musicState.currentTrack?.categoryLabel ||
                        "Rimba Tunes"}
                    </span>
                    <span className="text-[14.5px] font-semibold text-[#143525] tracking-tight truncate block mt-0.5">
                      {musicState.currentTrack?.title ||
                        "Belum ada lagu diputar"}
                    </span>
                  </div>

                  {/* Player Controls */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={handleMusicPrev}
                      className="h-8 w-8 rounded-full bg-black/5 hover:bg-black/10 text-[#143525] flex items-center justify-center transition-all active:scale-90 cursor-pointer"
                      title="Sebelumnya"
                    >
                      <SkipBack className="w-3.5 h-3.5 fill-current" />
                    </button>

                    <button
                      type="button"
                      onClick={handleToggleMusicPlay}
                      className="h-10 w-10 rounded-full bg-[#1e5638] hover:bg-[#16442e] text-white flex items-center justify-center shadow-xs active:scale-95 transition-all cursor-pointer"
                      title={musicState.isPlaying ? "Jeda" : "Putar"}
                    >
                      {musicState.isPlaying ? (
                        <Pause className="w-4 h-4 fill-current" />
                      ) : (
                        <Play className="w-4 h-4 fill-current translate-x-0.5" />
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={handleMusicNext}
                      className="h-8 w-8 rounded-full bg-black/5 hover:bg-black/10 text-[#143525] flex items-center justify-center transition-all active:scale-90 cursor-pointer"
                      title="Selanjutnya"
                    >
                      <SkipForward className="w-3.5 h-3.5 fill-current" />
                    </button>
                  </div>
                </div>

                {/* Volume Slider: Locked inside bounds */}
                <div className="flex items-center gap-2 pt-1 border-t border-[#143525]/8 w-full min-w-0 overflow-hidden">
                  <button
                    type="button"
                    onClick={handleToggleMusicMute}
                    className="text-[#456b57] hover:text-[#143525] transition-colors shrink-0 cursor-pointer"
                  >
                    {musicState.isMuted ? (
                      <VolumeX className="w-4 h-4 text-rose-600" />
                    ) : (
                      <Volume2 className="w-4 h-4" />
                    )}
                  </button>

                  <div className="flex-1 min-w-0 flex items-center">
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.02"
                      value={musicState.isMuted ? 0 : musicState.volume}
                      onChange={handleMusicVolumeChange}
                      className="w-full min-w-0 h-1 accent-[#1e5638] bg-[#143525]/15 rounded-full cursor-pointer appearance-none"
                      style={{ width: "100%", minWidth: 0 }}
                    />
                  </div>

                  <span className="shrink-0 text-[10px] font-mono text-[#456b57] tabular-nums w-7 text-right">
                    {Math.round(
                      (musicState.isMuted ? 0 : musicState.volume) * 100,
                    )}
                    %
                  </span>
                </div>
              </div>
            </div>

            {/* Playlist Section */}
            <div className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-[#2f5542]/75">
                  Daftar Putar
                </p>

                {/* Filter Pills */}
                <div className="flex items-center gap-1">
                  {(
                    ["all", "jazz", "chill", "ambient"] as MusicFilterCategory[]
                  ).map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => {
                        soundManager.playPop();
                        hapticLight();
                        setMusicCategory(cat);
                      }}
                      className={`px-2.5 py-0.5 rounded-full text-[10.5px] font-semibold capitalize transition-all cursor-pointer ${
                        musicCategory === cat
                          ? "bg-[#1e5638] text-white shadow-2xs"
                          : "bg-white/60 text-[#456b57] hover:bg-white/80"
                      }`}
                    >
                      {cat === "all" ? "Semua" : cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tracks List */}
              <div className="space-y-2">
                {filteredPlaylist.map((track) => {
                  const isCurrent = musicState.currentTrack?.id === track.id;
                  const isTrackPlaying = isCurrent && musicState.isPlaying;

                  return (
                    <button
                      key={track.id}
                      type="button"
                      onClick={() => handleSelectMusicTrack(track)}
                      className={`w-full p-3 rounded-[20px] flex items-center justify-between text-left transition-all active:scale-[0.98] cursor-pointer ${
                        isCurrent
                          ? "border-2 border-[#1e5638] bg-white shadow-xs"
                          : "border border-white/85 bg-white/75 hover:bg-white/90 shadow-2xs"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0 pr-2">
                        <div
                          className={`w-8.5 h-8.5 rounded-full flex items-center justify-center shrink-0 ${
                            isCurrent
                              ? "bg-[#1e5638] text-white"
                              : "bg-black/5 text-[#143525]"
                          }`}
                        >
                          {isTrackPlaying ? (
                            <Volume2 className="w-3.5 h-3.5 animate-pulse" />
                          ) : (
                            <Play className="w-3.5 h-3.5 fill-current translate-x-0.5" />
                          )}
                        </div>

                        <div className="min-w-0">
                          <p
                            className={`text-[13px] truncate tracking-tight ${
                              isCurrent
                                ? "font-bold text-[#143525]"
                                : "font-semibold text-[#143525]"
                            }`}
                          >
                            {track.title}
                          </p>
                          <p className="text-[11px] text-[#456b57] truncate">
                            Rimba Lo-Fi · {track.categoryLabel}
                          </p>
                        </div>
                      </div>

                      <span className="text-[11px] font-mono text-[#456b57] shrink-0 tabular-nums">
                        {track.durationEstimate}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: SUARA ALAM */}
        {activeTab === "nature" && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div>
              <p className="px-1 pb-1.5 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-[#2f5542]/75">
                Pilih Atmosfer Alam
              </p>

              <div className="grid grid-cols-2 gap-2.5">
                {SOUNDSCAPES_LIST.map((sc) => {
                  const isActive = activeNatureTrack === sc.id;

                  return (
                    <button
                      key={sc.id}
                      type="button"
                      onClick={() => handleSelectNatureTrack(sc.id)}
                      className={`p-3.5 rounded-[22px] text-left flex flex-col justify-between transition-all active:scale-[0.98] cursor-pointer min-h-[96px] ${
                        isActive
                          ? "border-2 border-[#1e5638] bg-white shadow-xs"
                          : "border border-white/85 bg-white/75 hover:bg-white/90 shadow-2xs"
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="text-2xl leading-none">{sc.icon}</span>
                        {isActive && (
                          <div className="h-5 w-5 rounded-full bg-[#1e5638] text-white flex items-center justify-center">
                            <Check className="w-3 h-3 stroke-[2.8]" />
                          </div>
                        )}
                      </div>

                      <div className="mt-2 min-w-0">
                        <p
                          className={`text-[13px] truncate ${
                            isActive
                              ? "font-bold text-[#143525]"
                              : "font-semibold text-[#143525]"
                          }`}
                        >
                          {sc.name}
                        </p>
                        <p className="text-[10.5px] text-[#456b57] leading-tight mt-0.5 line-clamp-2">
                          {sc.description}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Nature Volume Slider */}
            {activeNatureTrack !== "off" && (
              <div className="rounded-[24px] border border-white/85 bg-white/75 p-3.5 shadow-[0_8px_24px_rgba(20,50,30,0.05)] space-y-2 min-w-0 overflow-hidden">
                <div className="flex items-center justify-between text-[12px] font-semibold text-[#143525]">
                  <span>Volume Suara Alam</span>
                  <span className="font-mono text-[#1e5638] tabular-nums">
                    {Math.round((natureMuted ? 0 : natureVolume) * 100)}%
                  </span>
                </div>

                <div className="flex items-center gap-2 w-full min-w-0 overflow-hidden">
                  <button
                    type="button"
                    onClick={handleToggleNatureMute}
                    className="text-[#456b57] hover:text-[#143525] transition-colors shrink-0 cursor-pointer"
                  >
                    {natureMuted ? (
                      <VolumeX className="w-4 h-4 text-rose-600" />
                    ) : (
                      <Volume2 className="w-4 h-4" />
                    )}
                  </button>

                  <div className="flex-1 min-w-0 flex items-center">
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.02"
                      value={natureMuted ? 0 : natureVolume}
                      onChange={handleNatureVolumeChange}
                      className="w-full min-w-0 h-1 accent-[#1e5638] bg-[#143525]/15 rounded-full cursor-pointer appearance-none"
                      style={{ width: "100%", minWidth: 0 }}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Global Stop All Audio Button */}
        {(activeNatureTrack !== "off" || musicState.isPlaying) && (
          <div className="pt-1">
            <button
              type="button"
              onClick={handleStopAll}
              className="w-full py-3 rounded-[22px] flex items-center justify-center gap-2 text-[12.5px] font-semibold text-rose-700 bg-rose-50/70 border border-rose-200/80 active:scale-[0.98] transition-all cursor-pointer shadow-2xs"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
              <span>Hentikan Seluruh Audio</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
