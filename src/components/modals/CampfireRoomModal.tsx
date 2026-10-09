"use client";

import React, { useState } from "react";
import {
  X,
  Flame,
  Users,
  Copy,
  Check,
  Share2,
  Clock,
  Sparkles,
  ShieldCheck,
  AlertCircle,
} from "lucide-react";
import { useCampfireStore, CampfireAnimal } from "@/lib/game/campfireStore";
import { useGameStore } from "@/lib/game/useGameStore";
import { useAuthStore } from "@/lib/auth/useAuthStore";
import { soundManager } from "@/lib/audio/sounds";
import {
  hapticLight,
  hapticMedium,
  hapticSuccess,
} from "@/lib/mobile/nativeBridge";

interface CampfireRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartFocusSession?: (minutes: number, taskNote: string) => void;
}

const ANIMALS: { id: CampfireAnimal; label: string; icon: string }[] = [
  { id: "fox", label: "Rubah Cerdik", icon: "🦊" },
  { id: "bunny", label: "Kelinci Lembah", icon: "🐰" },
  { id: "koala", label: "Koala Teduh", icon: "🐨" },
  { id: "bird", label: "Burung Kicau", icon: "🐦" },
  { id: "bee", label: "Lebah Madu", icon: "🐝" },
];

export function CampfireRoomModal({
  isOpen,
  onClose,
  onStartFocusSession,
}: CampfireRoomModalProps) {
  const user = useAuthStore((state) => state.user);
  const notify = useGameStore((state) => state.notify);
  const startFocus = useGameStore((state) => state.startFocus);

  const currentRoom = useCampfireStore((state) => state.currentRoom);
  const createRoom = useCampfireStore((state) => state.createRoom);
  const joinRoom = useCampfireStore((state) => state.joinRoom);
  const startRoomFocus = useCampfireStore((state) => state.startRoomFocus);
  const leaveRoom = useCampfireStore((state) => state.leaveRoom);

  const [activeTab, setActiveTab] = useState<"create" | "join">("create");
  const [selectedDuration, setSelectedDuration] = useState<number>(25);
  const [selectedAnimal, setSelectedAnimal] = useState<CampfireAnimal>("fox");
  const [roomCodeInput, setRoomCodeInput] = useState<string>("");
  const [isCopied, setIsCopied] = useState<boolean>(false);

  if (!isOpen) return null;

  const rangerName = user?.name?.trim() || "Penjaga";

  const handleCreate = () => {
    soundManager.playPop();
    hapticSuccess();
    createRoom(
      rangerName,
      selectedDuration,
      selectedAnimal,
      "oak",
      `Bilik Hening ${rangerName}`
    );
    notify("🔥 Api unggun suaka dinyalakan! Bagikan kode ke kawanmu.", "success");
  };

  const handleJoin = () => {
    if (!roomCodeInput.trim()) {
      notify("Masukkan kode bilik kawan terlebih dahulu.", "error");
      return;
    }
    soundManager.playPop();
    hapticMedium();
    const ok = joinRoom(roomCodeInput, rangerName, selectedAnimal, "oak");
    if (ok) {
      notify(`✨ Berhasil duduk di lingkaran bilik ${roomCodeInput}!`, "success");
      setRoomCodeInput("");
    } else {
      notify("Kode bilik tidak ditemukan.", "error");
    }
  };

  const handleCopyCode = async (code: string) => {
    soundManager.playPop();
    hapticLight();
    try {
      await navigator.clipboard.writeText(code);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
      notify("📋 Kode bilik disalin!", "success");
    } catch {
      notify(`Kode bilik: ${code}`, "info");
    }
  };

  const handleShareCode = async (code: string) => {
    soundManager.playPop();
    hapticLight();
    const shareText = `🔥 Mari duduk melingkar di Bilik Hening Rimba bersamaku! Masukkan kode [${code}] di aplikasi Rimba Mobile untuk fokus bersama. #RimbaApp`;
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: "Bilik Hening Rimba",
          text: shareText,
        });
        return;
      } catch {}
    }
    handleCopyCode(code);
  };

  const handleStartTogether = () => {
    if (!currentRoom) return;
    soundManager.playComplete();
    hapticSuccess();
    startRoomFocus();

    // Trigger parent or store focus timer
    if (onStartFocusSession) {
      onStartFocusSession(
        currentRoom.durationMinutes,
        `Bilik Api Unggun (${currentRoom.code})`
      );
    } else {
      startFocus(
        currentRoom.durationMinutes * 60,
        "Fokus",
        false,
        "oak",
        `Bilik Api Unggun (${currentRoom.code})`
      );
    }
    onClose();
    notify("🌲 Sesi Hening Bersama dimulai! Jaga keheningan suaka.", "success");
  };

  return (
    <>
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
              <h2 className="text-[23px] font-semibold tracking-normal text-white drop-shadow-xs flex items-center gap-2">
                <span>Bilik Hening</span>
              </h2>
              <span className="rounded-full bg-amber-400/25 border border-amber-300/40 px-3 py-0.5 text-[11.5px] font-medium text-amber-100 backdrop-blur-md flex items-center gap-1">
                <Flame className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />
                <span>Api Unggun</span>
              </span>
            </div>

            <button
              type="button"
              onClick={() => {
                soundManager.playPop();
                hapticLight();
                onClose();
              }}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 border border-white/30 text-white shadow-sm backdrop-blur-md active:scale-90 transition-transform hover:bg-white/30 cursor-pointer"
              aria-label="Tutup"
            >
              <X className="h-4 w-4 stroke-[2]" />
            </button>
          </div>

          {/* ======================================================== */}
          {/* JIKA SUDAH BERADA DI DALAM BILIK (ACTIVE ROOM CIRCLE)   */}
          {/* ======================================================== */}
          {currentRoom ? (
            <div className="space-y-4 animate-in fade-in duration-200">
              {/* Room Hero Card */}
              <div className="rounded-3xl border border-white/70 bg-gradient-to-b from-white/95 via-white/95 to-white/90 p-5 shadow-lg shadow-[#0E3B2D]/10 backdrop-blur-xl space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#187557] px-2 py-0.5 rounded-md bg-[#E4F4ED] border border-[#BCE5D3]">
                      Kode Bilik
                    </span>
                    <h3 className="text-[22px] font-extrabold text-[#0D3528] tracking-tight mt-1 flex items-center gap-2">
                      <span>{currentRoom.code}</span>
                      <button
                        type="button"
                        onClick={() => handleCopyCode(currentRoom.code)}
                        className="text-[#187557] hover:text-[#126046] active:scale-90 transition-transform cursor-pointer"
                        title="Salin kode"
                      >
                        {isCopied ? (
                          <Check className="w-4 h-4 stroke-[2.4]" />
                        ) : (
                          <Copy className="w-4 h-4 stroke-[2]" />
                        )}
                      </button>
                    </h3>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleShareCode(currentRoom.code)}
                    className="flex items-center gap-1.5 h-9 px-3 rounded-full bg-[#187557] hover:bg-[#126046] text-white text-[11.5px] font-medium shadow-xs active:scale-95 transition-all cursor-pointer"
                  >
                    <Share2 className="w-3.5 h-3.5 stroke-[2]" />
                    <span>Ajak Kawan</span>
                  </button>
                </div>

                {/* Animated Campfire Core */}
                <div className="py-6 rounded-2xl bg-gradient-to-b from-amber-950/90 to-[#0c2419] border border-amber-500/30 text-center relative overflow-hidden flex flex-col items-center justify-center">
                  <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(245,158,11,0.25)_0%,transparent_70%)] animate-pulse" />
                  
                  {/* Flame Visual */}
                  <div className="relative z-10 w-16 h-16 rounded-full bg-amber-500/20 border border-amber-400/40 flex items-center justify-center shadow-lg shadow-amber-500/20 my-1">
                    <Flame className="w-9 h-9 text-amber-400 fill-amber-400 animate-bounce duration-1000" />
                  </div>

                  <p className="relative z-10 text-[13px] font-bold text-amber-200 mt-2">
                    {currentRoom.status === "active"
                      ? "Keheningan Bersama Berlangsung"
                      : "Api Unggun Telah Menyala"}
                  </p>
                  <p className="relative z-10 text-[11px] text-amber-200/70 font-medium">
                    {currentRoom.durationMinutes} Menit Fokus · {currentRoom.participants.length} Kawan Melingkar
                  </p>
                </div>

                {/* Shared Blessing Note */}
                <div className="p-3 rounded-2xl bg-[#E4F4ED]/60 border border-[#BCE5D3]/70 text-[11.5px] text-[#14664D] leading-relaxed flex items-start gap-2">
                  <Sparkles className="w-4 h-4 shrink-0 text-[#187557] mt-0.5" />
                  <span>
                    <strong>Berkat Api Unggun:</strong> Jika semua kawan berhasil menuntaskan sesi tanpa menyerah, seluruh bilik menerima bonus <strong>+25% Soul</strong> & pohon suaka mekar bersama!
                  </span>
                </div>
              </div>

              {/* Participants List */}
              <div className="space-y-2">
                <h4 className="text-[13.5px] font-semibold text-white drop-shadow-xs px-1">
                  Kawan di Sekeliling Api ({currentRoom.participants.length})
                </h4>

                <div className="grid grid-cols-1 gap-2">
                  {currentRoom.participants.map((p) => {
                    const animalObj = ANIMALS.find((a) => a.id === p.animal);
                    return (
                      <div
                        key={p.id}
                        className="rounded-2xl border border-white/70 bg-white/95 p-3 shadow-xs flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{animalObj?.icon || "🦊"}</span>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-[13px] font-bold text-[#0D3528]">
                                {p.name}
                              </span>
                              {p.isHost && (
                                <span className="text-[9.5px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200">
                                  Tuan Bilik
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-[#4C7567]">
                              {animalObj?.label || "Satwa Rimba"}
                            </p>
                          </div>
                        </div>

                        <span className="px-2.5 py-1 rounded-full bg-[#E4F4ED] text-[#14664D] text-[10.5px] font-semibold border border-[#BCE5D3]">
                          {p.status === "focusing" ? "Hening" : "Siap"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-2">
                <button
                  type="button"
                  onClick={handleStartTogether}
                  className="w-full py-3.5 px-4 rounded-full bg-gradient-to-r from-[#187557] via-[#208b68] to-[#2BB688] hover:opacity-95 text-white font-bold text-[14px] shadow-lg shadow-[#187557]/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Flame className="w-4 h-4 fill-white" />
                  <span>Mulai Hening Serempak ({currentRoom.durationMinutes}m)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    soundManager.playPop();
                    hapticLight();
                    leaveRoom();
                  }}
                  className="w-full py-2.5 px-4 rounded-full text-white/80 hover:text-white font-medium text-[12px] active:scale-[0.98] transition-all cursor-pointer"
                >
                  Tinggalkan Bilik
                </button>
              </div>
            </div>
          ) : (
            /* ======================================================== */
            /* JIKA BELUM ADA BILIK (LOBBY CREATOR / JOINER)             */
            /* ======================================================== */
            <div className="space-y-4 animate-in fade-in duration-200">
              {/* Segmented Switcher */}
              <div className="rounded-full p-1 border border-white/25 bg-white/20 backdrop-blur-md shadow-xs grid grid-cols-2 gap-1">
                <button
                  type="button"
                  onClick={() => {
                    soundManager.playPop();
                    hapticLight();
                    setActiveTab("create");
                  }}
                  className={`py-2 rounded-full text-[12px] transition-all cursor-pointer text-center ${
                    activeTab === "create"
                      ? "bg-white text-[#0D3528] shadow-sm font-semibold"
                      : "text-emerald-50/80 hover:text-white font-medium"
                  }`}
                >
                  Nyalakan Api (Buat Bilik)
                </button>

                <button
                  type="button"
                  onClick={() => {
                    soundManager.playPop();
                    hapticLight();
                    setActiveTab("join");
                  }}
                  className={`py-2 rounded-full text-[12px] transition-all cursor-pointer text-center ${
                    activeTab === "join"
                      ? "bg-white text-[#0D3528] shadow-sm font-semibold"
                      : "text-emerald-50/80 hover:text-white font-medium"
                  }`}
                >
                  Duduk Melingkar (Gabung)
                </button>
              </div>

              {activeTab === "create" ? (
                /* TAB 1: BUAT BILIK */
                <div className="rounded-3xl border border-white/70 bg-gradient-to-b from-white/95 via-white/95 to-white/90 p-5 shadow-lg shadow-[#0E3B2D]/10 backdrop-blur-xl space-y-4">
                  {/* Intro */}
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-amber-50 border border-amber-200/80 text-amber-600 flex items-center justify-center shadow-xs">
                      <Flame className="w-6 h-6 stroke-[1.8] fill-amber-500/30" />
                    </div>
                    <div>
                      <h3 className="text-[15px] font-bold text-[#0D3528] tracking-tight">
                        Nyalakan Api Suaka
                      </h3>
                      <p className="text-[11.5px] text-[#4C7567] font-normal">
                        Kawan dapat masuk menggunakan kode bilik unikmu.
                      </p>
                    </div>
                  </div>

                  {/* Durasi Pilihan */}
                  <div className="space-y-1.5 pt-1">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-[#4C7567]">
                      Durasi Hening Bersama:
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {[25, 45, 60].map((mins) => (
                        <button
                          key={mins}
                          type="button"
                          onClick={() => {
                            soundManager.playPop();
                            hapticLight();
                            setSelectedDuration(mins);
                          }}
                          className={`py-2.5 rounded-2xl text-[12.5px] font-bold border transition-all cursor-pointer ${
                            selectedDuration === mins
                              ? "bg-[#187557] text-white border-[#187557] shadow-xs"
                              : "bg-white/80 text-[#0D3528] border-[#0D3528]/10 hover:bg-white"
                          }`}
                        >
                          {mins} Menit
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Pilih Satwa Roh */}
                  <div className="space-y-1.5 pt-1">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-[#4C7567]">
                      Pilih Satwa Roh Pendampingmu:
                    </label>
                    <div className="grid grid-cols-5 gap-1.5">
                      {ANIMALS.map((a) => (
                        <button
                          key={a.id}
                          type="button"
                          onClick={() => {
                            soundManager.playPop();
                            hapticLight();
                            setSelectedAnimal(a.id);
                          }}
                          className={`p-2 rounded-2xl border flex flex-col items-center gap-1 transition-all cursor-pointer ${
                            selectedAnimal === a.id
                              ? "bg-[#E4F4ED] border-[#187557] shadow-xs scale-105"
                              : "bg-white/70 border-[#0D3528]/10 hover:bg-white"
                          }`}
                        >
                          <span className="text-2xl">{a.icon}</span>
                          <span className="text-[9.5px] font-semibold text-[#0D3528] truncate max-w-full">
                            {a.label.split(" ")[0]}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Tombol Buat Bilik */}
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={handleCreate}
                      className="w-full py-3.5 px-4 rounded-full bg-gradient-to-r from-[#187557] via-[#208b68] to-[#2BB688] hover:opacity-95 text-white font-bold text-[13.5px] shadow-md shadow-[#187557]/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Flame className="w-4 h-4 fill-white" />
                      <span>Nyalakan Api Unggun (Buat Bilik)</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* TAB 2: GABUNG BILIK */
                <div className="rounded-3xl border border-white/70 bg-gradient-to-b from-white/95 via-white/95 to-white/90 p-5 shadow-lg shadow-[#0E3B2D]/10 backdrop-blur-xl space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-emerald-50 border border-emerald-200/80 text-[#187557] flex items-center justify-center shadow-xs">
                      <Users className="w-6 h-6 stroke-[1.8]" />
                    </div>
                    <div>
                      <h3 className="text-[15px] font-bold text-[#0D3528] tracking-tight">
                        Masuk Lingkaran Api
                      </h3>
                      <p className="text-[11.5px] text-[#4C7567] font-normal">
                        Masukkan kode yang diberikan oleh kawan suakamu.
                      </p>
                    </div>
                  </div>

                  {/* Input Kode */}
                  <div className="space-y-1.5 pt-1">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-[#4C7567]">
                      Kode Bilik Kawan:
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: RIMBA-888"
                      value={roomCodeInput}
                      onChange={(e) => setRoomCodeInput(e.target.value.toUpperCase())}
                      className="w-full py-3 px-4 rounded-2xl border border-[#0D3528]/15 bg-white text-[15px] font-extrabold tracking-wider text-[#0D3528] placeholder:text-[#4C7567]/50 placeholder:font-normal focus:outline-none focus:ring-2 focus:ring-[#187557] uppercase text-center"
                    />
                  </div>

                  {/* Pilih Satwa Roh */}
                  <div className="space-y-1.5 pt-1">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-[#4C7567]">
                      Satwa Roh Pendampingmu:
                    </label>
                    <div className="grid grid-cols-5 gap-1.5">
                      {ANIMALS.map((a) => (
                        <button
                          key={a.id}
                          type="button"
                          onClick={() => {
                            soundManager.playPop();
                            hapticLight();
                            setSelectedAnimal(a.id);
                          }}
                          className={`p-2 rounded-2xl border flex flex-col items-center gap-1 transition-all cursor-pointer ${
                            selectedAnimal === a.id
                              ? "bg-[#E4F4ED] border-[#187557] shadow-xs scale-105"
                              : "bg-white/70 border-[#0D3528]/10 hover:bg-white"
                          }`}
                        >
                          <span className="text-2xl">{a.icon}</span>
                          <span className="text-[9.5px] font-semibold text-[#0D3528] truncate max-w-full">
                            {a.label.split(" ")[0]}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Tombol Gabung */}
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={handleJoin}
                      className="w-full py-3.5 px-4 rounded-full bg-gradient-to-r from-[#187557] via-[#208b68] to-[#2BB688] hover:opacity-95 text-white font-bold text-[13.5px] shadow-md shadow-[#187557]/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Users className="w-4 h-4 stroke-[2.2]" />
                      <span>Duduk Melingkar Sekarang</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
