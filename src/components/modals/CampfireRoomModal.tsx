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
}: CampfireRoomModalProps) {
  const { t, language } = useTranslation();
  const user = useAuthStore((state) => state.user);
  const notify = useGameStore((state) => state.notify);

  const currentRoom = useCampfireStore((state) => state.currentRoom);
  const myParticipantId = useCampfireStore((state) => state.myParticipantId);
  const createRoom = useCampfireStore((state) => state.createRoom);
  const joinRoom = useCampfireStore((state) => state.joinRoom);
  const startRoomFocus = useCampfireStore((state) => state.startRoomFocus);
  const leaveRoom = useCampfireStore((state) => state.leaveRoom);
  const setRoomMode = useCampfireStore((state) => state.setRoomMode);
  const reportParticipant = useCampfireStore((state) => state.reportParticipant);
  const blockParticipant = useCampfireStore((state) => state.blockParticipant);
  const isLoading = useCampfireStore((state) => state.isLoading);
  const isConnected = useCampfireStore((state) => state.isRealtimeConnected);
  const error = useCampfireStore((state) => state.error);
  const [safetyTarget, setSafetyTarget] = useState<string | null>(null);
  const [safetyAction, setSafetyAction] = useState<'report' | 'block'>('report');
  const [reportReason, setReportReason] = useState('Abusive name or room content');

  const [activeTab, setActiveTab] = useState<"create" | "join">("create");
  const [selectedDuration, setSelectedDuration] = useState<number>(25);
  const [selectedAnimal, setSelectedAnimal] = useState<CampfireAnimal>("fox");
  const [selectedMode, setSelectedMode] =
    useState<CampfireMode>("shared_destiny");
  const [roomCodeInput, setRoomCodeInput] = useState<string>("");
  const [isCopied, setIsCopied] = useState<boolean>(false);

  const previousStatus = React.useRef(currentRoom?.status);
  // Close only on a new canonical start, keeping safety controls available when reopened.
  React.useEffect(() => {
    const active = useGameStore.getState().activeSession;
    if (isOpen && previousStatus.current === 'lobby' && currentRoom?.status === 'active'
      && active?.campfire_room_code === currentRoom.code) {
      onClose();
    }
    previousStatus.current = currentRoom?.status;
  }, [isOpen, currentRoom?.status, onClose]);

  if (!isOpen) return null;

  const rangerName = user?.name?.trim() || t.common.guestName;
  const canUseCampfire = Boolean(user && !user.isGuest);
  const isHost = currentRoom?.participants.find(p => p.id === myParticipantId)?.isHost === true;
  const errorText = language === 'en' && error ? ({
    'Akses Campfire dibatasi. Hubungi dukungan melalui profil.': 'Campfire access is restricted. Contact support through your profile.',
    'Nama ruang atau profil tidak sesuai. Ubah nama profil, lalu coba lagi.': 'The room or profile name is not allowed. Update your profile name and try again.',
    'Masuk ke akun terverifikasi untuk menggunakan Campfire.': 'Sign in to a verified account to use Campfire.',
    'Hanya host yang dapat memulai atau mengubah mode.': 'Only the host can start or change the mode.',
    'Ruang berubah. Tunggu pembaruan, lalu coba lagi.': 'The room changed. Wait for an update and try again.',
    'Batas ruang atau permintaan tercapai. Coba lagi nanti.': 'Room or request limit reached. Try again later.',
    'Ruang tidak tersedia atau akses tidak diizinkan.': 'The room is unavailable or access is not allowed.',
    'Campfire belum dapat terhubung. Periksa koneksi dan coba lagi.': 'Campfire could not connect. Check your connection and try again.',
  } as Record<string, string>)[error] ?? 'Campfire could not connect. Please try again.' : error;

  const handleCreate = async () => {
    soundManager.playPop();
    const ok = await createRoom(
      rangerName,
      selectedDuration,
      selectedAnimal,
      "oak",
      selectedMode,
      `${t.campfire.title} - ${rangerName}`,
    );
    if (ok) { hapticSuccess(); notify(t.campfire.toastCreated, "success"); }
  };

  const handleJoin = async () => {
    const raw = roomCodeInput.trim().toLowerCase();
    if (!/^[a-f0-9]{32}$/.test(raw)) {
      notify(language === 'en' ? 'Enter the full 32-character invite code.' : 'Masukkan kode undangan lengkap 32 karakter.', 'error');
      return;
    }
    soundManager.playPop();
    hapticMedium();
    const ok = await joinRoom(raw, rangerName, selectedAnimal, "oak");
    if (ok) {
      notify(
        t.campfire.toastJoined.replace("{code}", raw),
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

  const handleStartTogether = async () => {
    if (!currentRoom) return;
    // The store starts gameplay only after accepting a server snapshot.
    if (await startRoomFocus()) { soundManager.playComplete(); hapticSuccess(); }
  };

  return (
    <div
      className="fixed inset-0 z-[100] h-[100dvh] w-full overflow-y-auto overscroll-contain no-scrollbar select-none antialiased font-urbanist text-[#0D3528] pointer-events-auto bg-[#FAFAF7]"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-md mx-auto px-5 safe-modal-content space-y-4">
        {/* HEADER NAV */}
        <div className="flex items-center justify-between py-1">
          <div className="flex items-center gap-2.5">
            <h2 className="text-[23px] font-semibold tracking-normal text-[#0D3528] flex items-center gap-2">
              <span>{t.campfire.title}</span>
            </h2>
            <span className="rounded-full bg-amber-50 border border-amber-200/80 px-3 py-0.5 text-[11.5px] font-medium text-amber-800 flex items-center gap-1">
              <Flame className="w-3.5 h-3.5 text-amber-600 fill-amber-600" />
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
            className="flex h-9 w-9 items-center justify-center rounded-full bg-[#0D3528]/5 border border-[#0D3528]/10 text-[#0D3528] shadow-xs active:scale-90 transition-transform hover:bg-[#0D3528]/10 cursor-pointer"
            aria-label={t.common.close}
          >
            <X className="h-4 w-4 stroke-[2]" />
          </button>
        </div>

        {!canUseCampfire && <p role="status" className="rounded-2xl bg-amber-50 p-3 text-sm text-amber-950">
          {language === 'en' ? 'Sign in through your profile to create or join a Campfire. Available to all accounts.' : 'Masuk melalui profil untuk membuat atau bergabung Campfire. Tersedia untuk semua akun.'}
        </p>}
        {errorText && <p role="alert" className="rounded-2xl bg-red-50 p-3 text-sm text-red-900">{errorText}</p>}
        {isLoading && <p role="status" className="text-sm text-[#14664D]">{language === 'en' ? 'Connecting…' : 'Menghubungkan…'}</p>}
        {currentRoom && !isConnected && <p role="status" className="text-sm text-amber-900">
          {language === 'en' ? 'Connection interrupted. Showing the last confirmed room; retrying automatically.' : 'Koneksi terputus. Menampilkan ruang terakhir terkonfirmasi; mencoba kembali otomatis.'}
        </p>}

        {/* ======================================================== */}
        {/* ACTIVE ROOM CIRCLE                                       */}
        {/* ======================================================== */}
        {currentRoom ? (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="rounded-3xl border border-white/70 bg-gradient-to-b from-white/95 via-white/95 to-white/90 p-5 shadow-lg shadow-[#0E3B2D]/10 backdrop-blur-xl space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold break-words max-w-[15rem]">{currentRoom.name}</p>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#187557] px-2 py-0.5 rounded-md bg-[#E4F4ED] border border-[#BCE5D3]">
                    {t.campfire.roomCodeLabel}
                  </span>
                  <h3 className="text-[14px] font-extrabold text-[#0D3528] tracking-tight mt-1 flex items-center gap-2 min-w-0">
                    <span className="break-all">{currentRoom.code}</span>
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
                  <Flame
                    className={`w-9 h-9 ${
                      currentRoom.status === "severed"
                        ? "text-slate-400 fill-slate-400 opacity-60"
                        : "text-amber-400 fill-amber-400 animate-bounce duration-1000"
                    }`}
                  />
                </div>

                <p className="relative z-10 text-[13px] font-bold text-amber-200 mt-2">
                  {currentRoom.status === "active"
                    ? t.campfire.statusActive
                    : currentRoom.status === "completed"
                      ? (language === "en" ? "Session Completed!" : "Sesi Telah Selesai!")
                      : currentRoom.status === "severed"
                        ? (language === "en" ? "Campfire Extinguished" : "Api Unggun Telah Padam")
                        : t.campfire.statusWaiting}
                </p>
                <p className="relative z-10 text-[11px] text-amber-200/70 font-medium">
                  {currentRoom.status === "severed"
                    ? (language === "en"
                        ? 'This shared session has ended.'
                        : 'Sesi bersama telah berakhir.')
                    : t.campfire.roomMeta
                        .replace("{mins}", String(currentRoom.durationMinutes))
                        .replace("{count}", String(currentRoom.participants.length))}
                </p>
              </div>

              {/* Shared Blessing Note */}
              <div className="p-3 rounded-2xl bg-[#E4F4ED]/60 border border-[#BCE5D3]/70 text-[11.5px] text-[#14664D] leading-relaxed flex items-start gap-2">
                <Sparkles className="w-4 h-4 shrink-0 text-[#187557] mt-0.5" />
                <span>
                  <strong>{t.campfire.bonusTitle}</strong> {t.campfire.bonusDesc}
                  {' '}{language === 'en' ? 'Group bonuses require an online confirmed session. Base focus rewards remain available offline.' : 'Bonus bersama memerlukan sesi terkonfirmasi online. Hadiah fokus dasar tetap tersedia offline.'}
                </span>
              </div>
            </div>

            {/* Participants List */}
            <div className="space-y-2">
              <h4 className="text-[13.5px] font-semibold text-[#0D3528] px-1">
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
                      className="rounded-2xl border border-white/70 bg-white/95 p-3 shadow-xs flex flex-wrap gap-2 items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{animalObj?.icon || "🦊"}</span>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[13px] font-bold text-[#0D3528] break-words max-w-[10rem]">
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
                        {p.status === 'completed' ? (language === 'en' ? 'Completed' : 'Selesai')
                          : p.status === 'abandoned' ? (language === 'en' ? 'Left focus' : 'Berhenti fokus')
                          : p.status === 'focusing' ? t.campfire.statusFocusing : t.campfire.statusReady}
                      </span>
                      {p.id !== myParticipantId && <div className="flex gap-3 w-full border-t border-[#0D3528]/10 pt-1">
                        <button type="button" disabled={isLoading} className="text-xs underline py-2 px-2 disabled:opacity-50"
                          onClick={() => { setSafetyTarget(p.id); setSafetyAction('report'); }}>
                          {language === 'en' ? 'Report' : 'Laporkan'}
                        </button>
                        <button type="button" disabled={isLoading} className="text-xs underline py-2 px-2 disabled:opacity-50"
                          onClick={() => { setSafetyTarget(p.id); setSafetyAction('block'); }}>
                          {language === 'en' ? 'Block' : 'Blokir'}
                        </button>
                      </div>}
                    </div>
                  );
                })}
              </div>
            </div>

            {safetyTarget && currentRoom.participants.some(p => p.id === safetyTarget) &&
              <div className="rounded-2xl border border-[#BCE5D3] p-4 space-y-3 bg-white" aria-label={language === 'en' ? 'Participant safety' : 'Keamanan peserta'}>
                <p className="text-sm font-semibold">{safetyAction === 'report'
                  ? (language === 'en' ? 'Report this participant or room content' : 'Laporkan peserta atau konten ruang ini')
                  : (language === 'en' ? 'Block this participant? You will leave this room and cannot share rooms with them.' : 'Blokir peserta ini? Kamu akan keluar dari ruang dan tidak dapat berbagi ruang dengannya.')}</p>
                {safetyAction === 'report' && <select aria-label={language === 'en' ? 'Report reason' : 'Alasan laporan'}
                  value={reportReason} onChange={e => setReportReason(e.target.value)} className="w-full rounded-xl border p-3 text-sm bg-white">
                  <option value="Abusive name or room content">{language === 'en' ? 'Abusive name or room content' : 'Nama atau konten ruang tidak pantas'}</option>
                  <option value="Harassment or threats">{language === 'en' ? 'Harassment or threats' : 'Pelecehan atau ancaman'}</option>
                  <option value="Spam or disruptive behavior">{language === 'en' ? 'Spam or disruptive behavior' : 'Spam atau perilaku mengganggu'}</option>
                </select>}
                <div className="flex flex-wrap gap-2">
                  <button type="button" disabled={isLoading} className="rounded-full bg-[#187557] text-white py-2 px-4 text-sm disabled:opacity-50"
                    onClick={async () => {
                      const ok = safetyAction === 'report' ? await reportParticipant(safetyTarget, reportReason) : await blockParticipant(safetyTarget);
                      if (ok) {
                        notify(safetyAction === 'report' ? (language === 'en' ? 'Report sent for review.' : 'Laporan dikirim untuk ditinjau.')
                          : (language === 'en' ? 'Participant blocked.' : 'Peserta diblokir.'), 'success');
                        setSafetyTarget(null);
                      }
                    }}>{safetyAction === 'report' ? (language === 'en' ? 'Send report' : 'Kirim laporan') : (language === 'en' ? 'Block and leave' : 'Blokir dan keluar')}</button>
                  <button type="button" className="py-2 px-4 text-sm" onClick={() => setSafetyTarget(null)}>{language === 'en' ? 'Cancel' : 'Batal'}</button>
                </div>
              </div>}

            {isHost && currentRoom.status === 'lobby' && <label className="block space-y-1 text-sm">
              <span>{t.campfire.modeLabel}</span>
              <select value={currentRoom.mode} disabled={isLoading || !isConnected}
                onChange={event => { void setRoomMode(event.target.value as CampfireMode); }} className="w-full p-3 rounded-2xl border bg-white">
                <option value="shared_destiny">{t.campfire.modeSharedTitle}</option>
                <option value="gentle_circle">{t.campfire.modeGentleTitle}</option>
              </select>
            </label>}

            {/* Action Buttons */}
            <div className="space-y-2 pt-2">
              {currentRoom.status === "completed" || currentRoom.status === "severed" ? (
                <button
                  type="button"
                  onClick={() => {
                    soundManager.playPop();
                    hapticLight();
                    useCampfireStore.getState().clearLocalRoom();
                  }}
                  className="w-full py-3.5 px-4 rounded-full bg-gradient-to-r from-[#187557] via-[#208b68] to-[#2BB688] hover:opacity-95 text-white font-bold text-[14px] shadow-lg shadow-[#187557]/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Flame className="w-4 h-4 fill-white" />
                  <span>
                    {language === "en" ? "Create or Join New Room" : "Buat atau Gabung Ruang Baru"}
                  </span>
                </button>
              ) : (
                <>
                  {(() => {
                    const myParticipant = currentRoom.participants.find(
                      (p) => p.id === myParticipantId
                    );
                    const isHost = myParticipant?.isHost === true;

                    return (
                      <button
                        type="button"
                        onClick={handleStartTogether}
                        disabled={!isHost || isLoading || currentRoom.status !== 'lobby' || !isConnected}
                        className={`w-full py-3.5 px-4 rounded-full font-bold text-[14px] shadow-lg active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer ${
                          isHost
                            ? "bg-gradient-to-r from-[#187557] via-[#208b68] to-[#2BB688] hover:opacity-95 text-white shadow-[#187557]/20"
                            : "bg-gradient-to-r from-emerald-700 via-emerald-800 to-teal-800 hover:opacity-95 text-white shadow-emerald-900/20"
                        }`}
                      >
                        {isHost ? (
                          <>
                            <Flame className="w-4 h-4 fill-white" />
                            <span>
                              {currentRoom.status === 'active' ? (language === 'en' ? 'Focus in progress' : 'Fokus berlangsung') : t.campfire.startTogetherBtn.replace(
                                "{mins}",
                                String(currentRoom.durationMinutes),
                              )}
                            </span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4 text-emerald-300" />
                            <span>
                              {language === "en"
                                ? 'Waiting for the host to start'
                                : 'Menunggu host memulai'}
                            </span>
                          </>
                        )}
                      </button>
                    );
                  })()}

                  <button
                    type="button"
                    disabled={isLoading}
                    onClick={() => {
                      soundManager.playPop();
                      hapticLight();
                      leaveRoom();
                    }}
                    className="w-full py-2.5 px-4 rounded-full text-[#4C7567] hover:text-[#0D3528] font-medium text-[12px] active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50"
                  >
                    {t.campfire.leaveRoomBtn}
                  </button>
                </>
              )}
            </div>
          </div>
        ) : (
          /* ======================================================== */
          /* LOBBY CREATOR / JOINER                                   */
          /* ======================================================== */
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="rounded-full p-1 border border-[#0D3528]/10 bg-[#0D3528]/5 shadow-xs grid grid-cols-2 gap-1">
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
                    : "text-[#4C7567] hover:text-[#0D3528] font-medium"
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
                    : "text-[#4C7567] hover:text-[#0D3528] font-medium"
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
                    disabled={isLoading || !canUseCampfire}
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
                    aria-label={t.campfire.codeInputLabel}
                    placeholder="0123456789abcdef0123456789abcdef"
                    maxLength={32}
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    value={roomCodeInput}
                    onChange={(e) => setRoomCodeInput(e.target.value.toLowerCase())}
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
                    disabled={isLoading || !canUseCampfire}
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
