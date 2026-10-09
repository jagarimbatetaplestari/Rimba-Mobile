"use client";

import React, { useState } from "react";
import {
  X,
  Flame,
  Users,
  Copy,
  Check,
  Share2,
  Sparkles,
  ShieldCheck,
} from "lucide-react";
import { useCampfireStore, CampfireAnimal, CampfireMode } from "@/lib/game/campfireStore";
import { useGameStore } from "@/lib/game/useGameStore";
import { useAuthStore } from "@/lib/auth/useAuthStore";
import { soundManager } from "@/lib/audio/sounds";
import {
  hapticLight,
  hapticMedium,
  hapticSuccess,
} from "@/lib/mobile/nativeBridge";
import { useTranslation } from "@/lib/i18n/translations";

interface CampfireRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartFocusSession?: (minutes: number, taskNote: string) => void;
}

const ANIMAL_ICONS: { id: CampfireAnimal; icon: string }[] = [
  { id: "fox", icon: "🦊" },
  { id: "bunny", icon: "🐰" },
  { id: "koala", icon: "🐨" },
  { id: "bird", icon: "🐦" },
  { id: "bee", icon: "🐝" },
];

export function CampfireRoomModal({
  isOpen,
  onClose,
  onStartFocusSession,
}: CampfireRoomModalProps) {
  const { t, language } = useTranslation();
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
  const [selectedMode, setSelectedMode] =
    useState<CampfireMode>("shared_destiny");
  const [roomCodeInput, setRoomCodeInput] = useState<string>("");
  const [isCopied, setIsCopied] = useState<boolean>(false);

  if (!isOpen) return null;

  const rangerName = user?.name?.trim() || t.common.guestName;

  const handleCreate = () => {
    soundManager.playPop();
    hapticSuccess();
    createRoom(
      rangerName,
      selectedDuration,
      selectedAnimal,
      "oak",
      selectedMode,
      `${t.campfire.title} - ${rangerName}`,
    );
    notify(t.campfire.toastCreated, "success");
  };

  const handleJoin = () => {
    if (!roomCodeInput.trim()) {
      notify(t.campfire.toastEmptyCode, "error");
      return;
    }
    soundManager.playPop();
    hapticMedium();
    const ok = joinRoom(roomCodeInput, rangerName, selectedAnimal, "oak");
    if (ok) {
      notify(
        t.campfire.toastJoined.replace("{code}", roomCodeInput.toUpperCase()),
        "success",
      );
      setRoomCodeInput("");
    }
  };

  const handleCopyCode = async (code: string) => {
    soundManager.playPop();
    hapticLight();
    try {
      await navigator.clipboard.writeText(code);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
      notify(t.campfire.toastCopied, "success");
    } catch {
      notify(`${t.campfire.roomCodeLabel}: ${code}`, "info");
    }
  };

  const handleShareCode = async (code: string) => {
    soundManager.playPop();
    hapticLight();
    const shareText =
      language === "en"
        ? `🔥 Join my Focus Together room on Rimba! Enter code [${code}] to grow trees together. #RimbaApp`
        : `🔥 Yuk fokus bareng di Rimba! Masukkan kode ruang [${code}] di aplikasi Rimba untuk tanam pohon bareng. #RimbaApp`;
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: t.campfire.title,
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

    const companionNames = currentRoom.participants
      .filter((p) => p.name !== rangerName)
      .map((p) => p.name);

    const defaultNote =
      language === "en"
        ? `Focus Together (${currentRoom.code})`
        : `Fokus Bareng (${currentRoom.code})`;

    if (onStartFocusSession) {
      onStartFocusSession(currentRoom.durationMinutes, defaultNote);
    } else {
      startFocus(
        currentRoom.durationMinutes * 60,
        "Fokus",
        false,
        "oak",
        defaultNote,
      );
    }

    const active = useGameStore.getState().activeSession;
    if (active) {
      useGameStore.setState({
        activeSession: {
          ...active,
          campfire_room_code: currentRoom.code,
          is_shared_destiny: currentRoom.mode === "shared_destiny",
          companions: companionNames,
        },
      });
    }

    onClose();
    notify(
      language === "en"
        ? "🌲 Group focus started! Stay focused together."
        : "🌲 Sesi Fokus Bareng dimulai! Yuk jaga fokus bersama.",
      "success",
    );
  };

  return (
    <div
      className="fixed inset-0 z-[100] h-[100dvh] w-full overflow-y-auto overscroll-contain no-scrollbar select-none antialiased font-urbanist text-[#0D3528] pointer-events-auto"
      style={{
        background:
          "radial-gradient(130% 90% at 50% -5%, #38B28B 0%, #289874 34%, #1C7459 70%, #165643 100%)",
      }}
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-md mx-auto px-5 safe-modal-content space-y-4">
        {/* HEADER NAV */}
        <div className="flex items-center justify-between py-1">
          <div className="flex items-center gap-2.5">
            <h2 className="text-[23px] font-semibold tracking-normal text-white drop-shadow-xs flex items-center gap-2">
              <span>{t.campfire.title}</span>
            </h2>
            <span className="rounded-full bg-amber-400/25 border border-amber-300/40 px-3 py-0.5 text-[11.5px] font-medium text-amber-100 backdrop-blur-md flex items-center gap-1">
              <Flame className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />
              <span>{t.campfire.badge}</span>
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
            aria-label={t.common.close}
          >
            <X className="h-4 w-4 stroke-[2]" />
          </button>
        </div>

        {/* ======================================================== */}
        {/* ACTIVE ROOM CIRCLE                                       */}
        {/* ======================================================== */}
        {currentRoom ? (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="rounded-3xl border border-white/70 bg-gradient-to-b from-white/95 via-white/95 to-white/90 p-5 shadow-lg shadow-[#0E3B2D]/10 backdrop-blur-xl space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#187557] px-2 py-0.5 rounded-md bg-[#E4F4ED] border border-[#BCE5D3]">
                    {t.campfire.roomCodeLabel}
                  </span>
                  <h3 className="text-[22px] font-extrabold text-[#0D3528] tracking-tight mt-1 flex items-center gap-2">
                    <span>{currentRoom.code}</span>
                    <button
                      type="button"
                      onClick={() => handleCopyCode(currentRoom.code)}
                      className="text-[#187557] hover:text-[#126046] active:scale-90 transition-transform cursor-pointer"
                      title={t.common.share}
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
                  <span>{t.campfire.inviteFriends}</span>
                </button>
              </div>

              {/* Animated Campfire Core */}
              <div className="py-6 rounded-2xl bg-gradient-to-b from-amber-950/90 to-[#0c2419] border border-amber-500/30 text-center relative overflow-hidden flex flex-col items-center justify-center">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(245,158,11,0.25)_0%,transparent_70%)] animate-pulse" />

                <div className="relative z-10 w-16 h-16 rounded-full bg-amber-500/20 border border-amber-400/40 flex items-center justify-center shadow-lg shadow-amber-500/20 my-1">
                  <Flame className="w-9 h-9 text-amber-400 fill-amber-400 animate-bounce duration-1000" />
                </div>

                <p className="relative z-10 text-[13px] font-bold text-amber-200 mt-2">
                  {currentRoom.status === "active"
                    ? t.campfire.statusActive
                    : t.campfire.statusWaiting}
                </p>
                <p className="relative z-10 text-[11px] text-amber-200/70 font-medium">
                  {t.campfire.roomMeta
                    .replace("{mins}", String(currentRoom.durationMinutes))
                    .replace("{count}", String(currentRoom.participants.length))}
                </p>
              </div>

              {/* Shared Blessing Note */}
              <div className="p-3 rounded-2xl bg-[#E4F4ED]/60 border border-[#BCE5D3]/70 text-[11.5px] text-[#14664D] leading-relaxed flex items-start gap-2">
                <Sparkles className="w-4 h-4 shrink-0 text-[#187557] mt-0.5" />
                <span>
                  <strong>{t.campfire.bonusTitle}</strong> {t.campfire.bonusDesc}
                </span>
              </div>
            </div>

            {/* Participants List */}
            <div className="space-y-2">
              <h4 className="text-[13.5px] font-semibold text-white drop-shadow-xs px-1">
                {t.campfire.participantsHeader.replace(
                  "{count}",
                  String(currentRoom.participants.length),
                )}
              </h4>

              <div className="grid grid-cols-1 gap-2">
                {currentRoom.participants.map((p) => {
                  const animalObj = ANIMAL_ICONS.find((a) => a.id === p.animal);
                  const animalLabel =
                    t.campfire.animals[p.animal] || t.campfire.animals.fox;
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
                                {t.campfire.hostBadge}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-[#4C7567]">
                            {animalLabel}
                          </p>
                        </div>
                      </div>

                      <span className="px-2.5 py-1 rounded-full bg-[#E4F4ED] text-[#14664D] text-[10.5px] font-semibold border border-[#BCE5D3]">
                        {p.status === "focusing"
                          ? t.campfire.statusFocusing
                          : t.campfire.statusReady}
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
                <span>
                  {t.campfire.startTogetherBtn.replace(
                    "{mins}",
                    String(currentRoom.durationMinutes),
                  )}
                </span>
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
                {t.campfire.leaveRoomBtn}
              </button>
            </div>
          </div>
        ) : (
          /* ======================================================== */
          /* LOBBY CREATOR / JOINER                                   */
          /* ======================================================== */
          <div className="space-y-4 animate-in fade-in duration-200">
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
                {t.campfire.tabCreate}
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
                {t.campfire.tabJoin}
              </button>
            </div>

            {activeTab === "create" ? (
              /* TAB 1: CREATE ROOM */
              <div className="rounded-3xl border border-white/70 bg-gradient-to-b from-white/95 via-white/95 to-white/90 p-5 shadow-lg shadow-[#0E3B2D]/10 backdrop-blur-xl space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-amber-50 border border-amber-200/80 text-amber-600 flex items-center justify-center shadow-xs">
                    <Flame className="w-6 h-6 stroke-[1.8] fill-amber-500/30" />
                  </div>
                  <div>
                    <h3 className="text-[15px] font-bold text-[#0D3528] tracking-tight">
                      {t.campfire.createTitle}
                    </h3>
                    <p className="text-[11.5px] text-[#4C7567] font-normal">
                      {t.campfire.createDesc}
                    </p>
                  </div>
                </div>

                {/* Duration */}
                <div className="space-y-1.5 pt-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-[#4C7567]">
                    {t.campfire.durationLabel}
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
                        {mins} {t.common.Minutes}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Companion Animal */}
                <div className="space-y-1.5 pt-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-[#4C7567]">
                    {t.campfire.animalLabel}
                  </label>
                  <div className="grid grid-cols-5 gap-1.5">
                    {ANIMAL_ICONS.map((a) => (
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
                          {t.campfire.animals[a.id]}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Room Mode */}
                <div className="space-y-1.5 pt-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-[#4C7567]">
                    {t.campfire.modeLabel}
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        soundManager.playPop();
                        hapticLight();
                        setSelectedMode("shared_destiny");
                      }}
                      className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                        selectedMode === "shared_destiny"
                          ? "bg-amber-50/90 border-amber-400 text-amber-950 shadow-xs ring-1 ring-amber-400/50"
                          : "bg-white/70 border-[#0D3528]/10 text-[#0D3528] hover:bg-white"
                      }`}
                    >
                      <div className="flex items-center gap-1.5 font-bold text-[12px] text-amber-900">
                        <Flame className="w-3.5 h-3.5 fill-amber-500 text-amber-600" />
                        <span>{t.campfire.modeSharedTitle}</span>
                      </div>
                      <p className="text-[10px] text-amber-950/70 mt-1 leading-snug">
                        {t.campfire.modeSharedDesc}
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        soundManager.playPop();
                        hapticLight();
                        setSelectedMode("gentle_circle");
                      }}
                      className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                        selectedMode === "gentle_circle"
                          ? "bg-[#E4F4ED] border-[#187557] text-[#0D3528] shadow-xs ring-1 ring-[#187557]/40"
                          : "bg-white/70 border-[#0D3528]/10 text-[#0D3528] hover:bg-white"
                      }`}
                    >
                      <div className="flex items-center gap-1.5 font-bold text-[12px] text-[#187557]">
                        <ShieldCheck className="w-3.5 h-3.5 text-[#187557]" />
                        <span>{t.campfire.modeGentleTitle}</span>
                      </div>
                      <p className="text-[10px] text-[#4C7567] mt-1 leading-snug">
                        {t.campfire.modeGentleDesc}
                      </p>
                    </button>
                  </div>
                </div>

                {/* Create Button */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleCreate}
                    className="w-full py-3.5 px-4 rounded-full bg-gradient-to-r from-[#187557] via-[#208b68] to-[#2BB688] hover:opacity-95 text-white font-bold text-[13.5px] shadow-md shadow-[#187557]/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Flame className="w-4 h-4 fill-white" />
                    <span>{t.campfire.createBtn}</span>
                  </button>
                </div>
              </div>
            ) : (
              /* TAB 2: JOIN ROOM */
              <div className="rounded-3xl border border-white/70 bg-gradient-to-b from-white/95 via-white/95 to-white/90 p-5 shadow-lg shadow-[#0E3B2D]/10 backdrop-blur-xl space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-emerald-50 border border-emerald-200/80 text-[#187557] flex items-center justify-center shadow-xs">
                    <Users className="w-6 h-6 stroke-[1.8]" />
                  </div>
                  <div>
                    <h3 className="text-[15px] font-bold text-[#0D3528] tracking-tight">
                      {t.campfire.joinTitle}
                    </h3>
                    <p className="text-[11.5px] text-[#4C7567] font-normal">
                      {t.campfire.joinDesc}
                    </p>
                  </div>
                </div>

                {/* Code Input */}
                <div className="space-y-1.5 pt-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-[#4C7567]">
                    {t.campfire.codeInputLabel}
                  </label>
                  <input
                    type="text"
                    placeholder={t.campfire.codeInputPlaceholder}
                    value={roomCodeInput}
                    onChange={(e) => setRoomCodeInput(e.target.value.toUpperCase())}
                    className="w-full py-3 px-4 rounded-2xl border border-[#0D3528]/15 bg-white text-[15px] font-extrabold tracking-wider text-[#0D3528] placeholder:text-[#4C7567]/50 placeholder:font-normal focus:outline-none focus:ring-2 focus:ring-[#187557] uppercase text-center"
                  />
                </div>

                {/* Companion Animal */}
                <div className="space-y-1.5 pt-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-[#4C7567]">
                    {t.campfire.animalLabel}
                  </label>
                  <div className="grid grid-cols-5 gap-1.5">
                    {ANIMAL_ICONS.map((a) => (
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
                          {t.campfire.animals[a.id]}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Join Button */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleJoin}
                    className="w-full py-3.5 px-4 rounded-full bg-gradient-to-r from-[#187557] via-[#208b68] to-[#2BB688] hover:opacity-95 text-white font-bold text-[13.5px] shadow-md shadow-[#187557]/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Users className="w-4 h-4 stroke-[2.2]" />
                    <span>{t.campfire.joinBtn}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
