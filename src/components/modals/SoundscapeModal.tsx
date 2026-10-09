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

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

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
    <>
      {/* Tipografi Urbanist yang Halus & Modern */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Urbanist:wght@400;500;600;700&display=swap');
        .font-urbanist {
          font-family: 'Urbanist', -apple-system, BlinkMacSystemFont, sans-serif !important;
        }
      `}</style>

      <div
        className="fixed inset-0 z-50 overflow-y-auto no-scrollbar select-none antialiased font-urbanist text-[#0D3528]"
        style={{
          background:
            "radial-gradient(130% 90% at 50% -5%, #38B28B 0%, #289874 34%, #1C7459 70%, #165643 100%)",
        }}
        role="dialog"
        aria-modal="true"
      >
        <div className="w-full max-w-md mx-auto px-5 pt-[max(env(safe-area-inset-top,1.25rem),1.25rem)] pb-[max(calc(env(safe-area-inset-bottom,0px)+2.5rem),3rem)] space-y-4">
          {/* HEADER NAV */}
          <div className="flex items-center justify-between py-1">
            <div className="flex items-center gap-2.5">
              <h2 className="text-[23px] font-semibold tracking-normal text-white drop-shadow-xs">
                Sanctum Audio
              </h2>
              <span className="rounded-full bg-white/20 border border-white/25 px-3 py-0.5 text-[11.5px] font-medium text-emerald-50 backdrop-blur-md">
                Suara Alam & Musik
              </span>
            </div>

            <button
              type="button"
              onClick={() => {
                hapticLight();
                onClose();
              }}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 border border-white/30 text-white shadow-sm backdrop-blur-md active:scale-90 transition-transform hover:bg-white/30 cursor-pointer"
              aria-label="Tutup"
            >
              <X className="h-4 w-4 stroke-[2]" />
            </button>
          </div>

          {/* SEGMENTED CONTROL SWITCH (Floating Capsule Glass) */}
          <div className="rounded-full p-1 border border-white/25 bg-white/20 backdrop-blur-md shadow-xs grid grid-cols-2 gap-1">
            <button
              type="button"
              onClick={() => {
                soundManager.playPop();
                hapticLight();
                setActiveTab("music");
              }}
              className={`py-2 px-3 rounded-full text-[12px] flex items-center justify-center gap-2 transition-all cursor-pointer ${
                activeTab === "music"
                  ? "bg-white text-[#0D3528] shadow-sm font-semibold"
                  : "text-emerald-50/80 hover:text-white font-medium"
              }`}
            >
              <Music2 className="w-3.5 h-3.5 stroke-[1.8]" />
              <span>Musik Lo-Fi</span>
              {musicState.isPlaying && (
                <span className="w-2 h-2 rounded-full bg-[#187557] animate-pulse" />
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                soundManager.playPop();
                hapticLight();
                setActiveTab("nature");
              }}
              className={`py-2 px-3 rounded-full text-[12px] flex items-center justify-center gap-2 transition-all cursor-pointer ${
                activeTab === "nature"
                  ? "bg-white text-[#0D3528] shadow-sm font-semibold"
                  : "text-emerald-50/80 hover:text-white font-medium"
              }`}
            >
              <Wind className="w-3.5 h-3.5 stroke-[1.8]" />
              <span>Suara Alam</span>
              {activeNatureTrack !== "off" && (
                <span className="w-2 h-2 rounded-full bg-[#187557] animate-pulse" />
              )}
            </button>
          </div>

          {/* ====================================================
              TAB 1: MUSIK LO-FI
              ==================================================== */}
          {activeTab === "music" && (
            <div className="space-y-4 animate-in fade-in duration-200">
              {/* Now Playing Bento Card */}
              <div className="space-y-1.5">
                <p className="px-1 text-[12px] font-medium uppercase tracking-[0.12em] text-white/90 drop-shadow-xs">
                  Sedang Diputar
                </p>

                <div className="rounded-3xl border border-white/70 bg-gradient-to-b from-white/95 via-white/95 to-white/90 p-5 shadow-lg shadow-[#0E3B2D]/10 backdrop-blur-xl space-y-4 min-w-0 overflow-hidden">
                  <div className="flex items-center justify-between min-w-0 gap-3">
                    <div className="min-w-0 flex-1 text-left">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-[#14664D] bg-[#E4F4ED] border border-[#BCE5D3] px-2 py-0.5 rounded-md inline-block">
                        {musicState.currentTrack?.categoryLabel ||
                          "Rimba Tunes"}
                      </span>
                      <span className="text-[15.5px] font-semibold text-[#0D3528] tracking-tight truncate block mt-1">
                        {musicState.currentTrack?.title ||
                          "Belum ada lagu diputar"}
                      </span>
                    </div>

                    {/* Player Controls */}
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={handleMusicPrev}
                        className="h-8.5 w-8.5 rounded-full bg-[#0D3528]/5 hover:bg-[#0D3528]/10 text-[#0D3528] flex items-center justify-center transition-all active:scale-90 cursor-pointer"
                        title="Sebelumnya"
                      >
                        <SkipBack className="w-3.5 h-3.5 fill-current" />
                      </button>

                      <button
                        type="button"
                        onClick={handleToggleMusicPlay}
                        className="h-10 w-10 rounded-full bg-[#187557] hover:bg-[#126046] text-white flex items-center justify-center shadow-xs active:scale-95 transition-all cursor-pointer"
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
                        className="h-8.5 w-8.5 rounded-full bg-[#0D3528]/5 hover:bg-[#0D3528]/10 text-[#0D3528] flex items-center justify-center transition-all active:scale-90 cursor-pointer"
                        title="Selanjutnya"
                      >
                        <SkipForward className="w-3.5 h-3.5 fill-current" />
                      </button>
                    </div>
                  </div>

                  {/* Volume Slider */}
                  <div className="flex items-center gap-2 pt-2 border-t border-[#0D3528]/8 w-full min-w-0 overflow-hidden">
                    <button
                      type="button"
                      onClick={handleToggleMusicMute}
                      className="text-[#4C7567] hover:text-[#0D3528] transition-colors shrink-0 cursor-pointer"
                    >
                      {musicState.isMuted ? (
                        <VolumeX className="w-4 h-4 text-rose-600 stroke-[1.8]" />
                      ) : (
                        <Volume2 className="w-4 h-4 text-[#187557] stroke-[1.8]" />
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
                        className="w-full min-w-0 h-1 accent-[#187557] bg-[#0D3528]/10 rounded-full cursor-pointer appearance-none"
                        style={{ width: "100%", minWidth: 0 }}
                      />
                    </div>

                    <span className="shrink-0 text-[11px] font-medium text-[#4C7567] tabular-nums w-8 text-right">
                      {Math.round(
                        (musicState.isMuted ? 0 : musicState.volume) * 100,
                      )}
                      %
                    </span>
                  </div>
                </div>
              </div>

              {/* Playlist Section */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between px-1">
                  <p className="text-[12px] font-medium uppercase tracking-[0.12em] text-white/90 drop-shadow-xs">
                    Daftar Putar
                  </p>

                  {/* Filter Pills */}
                  <div className="flex items-center gap-1.5">
                    {(
                      [
                        "all",
                        "jazz",
                        "chill",
                        "ambient",
                      ] as MusicFilterCategory[]
                    ).map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => {
                          soundManager.playPop();
                          hapticLight();
                          setMusicCategory(cat);
                        }}
                        className={`px-3 py-0.5 rounded-full text-[11px] font-medium capitalize transition-all cursor-pointer ${
                          musicCategory === cat
                            ? "bg-white text-[#0D3528] shadow-xs"
                            : "bg-white/20 text-emerald-50 hover:bg-white/30 backdrop-blur-md border border-white/20"
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
                        className={`w-full p-3.5 rounded-2xl flex items-center justify-between text-left transition-all active:scale-[0.98] cursor-pointer ${
                          isCurrent
                            ? "border border-[#187557]/40 bg-[#E4F4ED]/80 shadow-xs"
                            : "border border-white/70 bg-gradient-to-b from-white/95 via-white/95 to-white/90 hover:bg-white shadow-sm"
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0 pr-2">
                          <div
                            className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                              isCurrent
                                ? "bg-[#187557] text-white"
                                : "bg-[#0D3528]/5 text-[#0D3528]"
                            }`}
                          >
                            {isTrackPlaying ? (
                              <Volume2 className="w-4 h-4 animate-pulse stroke-[1.8]" />
                            ) : (
                              <Play className="w-3.5 h-3.5 fill-current translate-x-0.5" />
                            )}
                          </div>

                          <div className="min-w-0">
                            <p
                              className={`text-[13.5px] truncate tracking-tight ${
                                isCurrent
                                  ? "font-semibold text-[#0D3528]"
                                  : "font-medium text-[#0D3528]"
                              }`}
                            >
                              {track.title}
                            </p>
                            <p className="text-[11.5px] text-[#4C7567] truncate font-normal mt-0.5">
                              Rimba Lo-Fi · {track.categoryLabel}
                            </p>
                          </div>
                        </div>

                        <span className="text-[11.5px] text-[#4C7567] shrink-0 tabular-nums font-normal">
                          {track.durationEstimate}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ====================================================
              TAB 2: SUARA ALAM
              ==================================================== */}
          {activeTab === "nature" && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="space-y-1.5">
                <p className="px-1 text-[12px] font-medium uppercase tracking-[0.12em] text-white/90 drop-shadow-xs">
                  Pilih Atmosfer Alam
                </p>

                <div className="grid grid-cols-2 gap-3">
                  {SOUNDSCAPES_LIST.map((sc) => {
                    const isActive = activeNatureTrack === sc.id;

                    return (
                      <button
                        key={sc.id}
                        type="button"
                        onClick={() => handleSelectNatureTrack(sc.id)}
                        className={`p-4 rounded-3xl text-left flex flex-col justify-between transition-all active:scale-[0.98] cursor-pointer min-h-[104px] ${
                          isActive
                            ? "border border-[#187557]/40 bg-[#E4F4ED]/80 shadow-md"
                            : "border border-white/70 bg-gradient-to-b from-white/95 via-white/95 to-white/90 hover:bg-white shadow-lg shadow-[#0E3B2D]/10 backdrop-blur-xl"
                        }`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span className="text-2xl leading-none">
                            {sc.icon}
                          </span>
                          {isActive && (
                            <div className="h-5 w-5 rounded-full bg-[#187557] text-white flex items-center justify-center shadow-xs">
                              <Check className="w-3 h-3 stroke-[2.5]" />
                            </div>
                          )}
                        </div>

                        <div className="mt-2.5 min-w-0">
                          <p
                            className={`text-[13.5px] truncate ${
                              isActive
                                ? "font-semibold text-[#0D3528]"
                                : "font-medium text-[#0D3528]"
                            }`}
                          >
                            {sc.name}
                          </p>
                          <p className="text-[11px] text-[#4C7567] leading-relaxed mt-0.5 line-clamp-2 font-normal">
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
                <div className="rounded-3xl border border-white/70 bg-gradient-to-b from-white/95 via-white/95 to-white/90 p-4 shadow-lg shadow-[#0E3B2D]/10 backdrop-blur-xl space-y-2.5 min-w-0 overflow-hidden">
                  <div className="flex items-center justify-between text-[12.5px] font-semibold text-[#0D3528]">
                    <span>Volume Suara Alam</span>
                    <span className="font-medium text-[#187557] tabular-nums">
                      {Math.round((natureMuted ? 0 : natureVolume) * 100)}%
                    </span>
                  </div>

                  <div className="flex items-center gap-2 w-full min-w-0 overflow-hidden">
                    <button
                      type="button"
                      onClick={handleToggleNatureMute}
                      className="text-[#4C7567] hover:text-[#0D3528] transition-colors shrink-0 cursor-pointer"
                    >
                      {natureMuted ? (
                        <VolumeX className="w-4 h-4 text-rose-600 stroke-[1.8]" />
                      ) : (
                        <Volume2 className="w-4 h-4 text-[#187557] stroke-[1.8]" />
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
                        className="w-full min-w-0 h-1 accent-[#187557] bg-[#0D3528]/10 rounded-full cursor-pointer appearance-none"
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
                className="w-full py-3 rounded-full flex items-center justify-center gap-2 text-[12px] font-medium text-rose-700 bg-rose-50 border border-rose-200/80 active:scale-[0.98] transition-all cursor-pointer shadow-xs"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
                <span>Hentikan Seluruh Audio</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
