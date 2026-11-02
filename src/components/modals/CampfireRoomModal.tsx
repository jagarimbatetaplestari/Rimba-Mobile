"use client";

import React, { useState, useMemo } from "react";
import {
  X,
  Flame,
  Users,
  Copy,
  Check,
  Share2,
  Sparkles,
  ShieldCheck,
  QrCode,
  Clock,
  ClipboardPaste,
  Minus,
  Plus,
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
import { supabase } from "@/lib/supabase/client";
import { NatureLineIcon } from "@/components/common/NatureLineIcon";

interface CampfireRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenModeration?: () => void;
}

const ANIMAL_ICONS: { id: CampfireAnimal; icon: string }[] = [
  { id: "fox", icon: "🦊" },
  { id: "bunny", icon: "🐰" },
  { id: "koala", icon: "🐨" },
  { id: "bird", icon: "🐦" },
  { id: "bee", icon: "🐝" },
];

const DURATION_PRESETS = [15, 25, 30, 45, 60, 90];

/**
 * Deterministic 21x21 QR-style matrix generator for a 32-char hex room code.
 * Renders standard 7x7 finder patterns in the three corners, timing patterns,
 * and encodes the 128-bit room code + checksum across the payload modules.
 */
function buildCampfireQrMatrix(code: string): boolean[][] {
  const size = 21;
  const grid: boolean[][] = Array.from({ length: size }, () =>
    Array(size).fill(false)
  );
  const reserved: boolean[][] = Array.from({ length: size }, () =>
    Array(size).fill(false)
  );

  const placeFinder = (row0: number, col0: number) => {
    for (let r = -1; r <= 7; r++) {
      for (let c = -1; c <= 7; c++) {
        const rr = row0 + r;
        const cc = col0 + c;
        if (rr < 0 || rr >= size || cc < 0 || cc >= size) continue;
        reserved[rr][cc] = true;
        const inOuter =
          r >= 0 && r <= 6 && c >= 0 && c <= 6 && (r === 0 || r === 6 || c === 0 || c === 6);
        const inInner = r >= 2 && r <= 4 && c >= 2 && c <= 4;
        grid[rr][cc] = inOuter || inInner;
      }
    }
  };

  placeFinder(0, 0);
  placeFinder(0, size - 7);
  placeFinder(size - 7, 0);

  // Timing patterns
  for (let i = 8; i < size - 8; i++) {
    reserved[6][i] = true;
    reserved[i][6] = true;
    grid[6][i] = i % 2 === 0;
    grid[i][6] = i % 2 === 0;
  }

  // Extract bits from hex code + repeated hash for full density
  const clean = (code || "0".repeat(32)).replace(/[^a-f0-9]/gi, "").padEnd(32, "0");
  const bits: boolean[] = [];
  for (let i = 0; i < clean.length; i++) {
    const nibble = parseInt(clean[i], 16) || 0;
    bits.push(Boolean(nibble & 8), Boolean(nibble & 4), Boolean(nibble & 2), Boolean(nibble & 1));
  }

  let bitIdx = 0;
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (reserved[r][c]) continue;
      const b = bits[bitIdx % bits.length];
      const mask = (r + c) % 2 === 0;
      grid[r][c] = b !== mask;
      bitIdx++;
    }
  }

  return grid;
}

export function CampfireRoomModal({
  isOpen,
  onClose,
  onOpenModeration,
}: CampfireRoomModalProps) {
  const { t, language } = useTranslation();
  const user = useAuthStore((state) => state.user);
  const [moderatorAccess, setModeratorAccess] = useState<{ owner: string | null; allowed: boolean }>({ owner: null, allowed: false });
  React.useEffect(() => {
    let closed = false;
    const owner = user?.id;
    setModeratorAccess({ owner: owner ?? null, allowed: false });
    if (isOpen && owner && !user?.isGuest) {
      void supabase.rpc('campfire_moderator_status_v1').then(({ data, error }) => {
        if (!closed && useAuthStore.getState().user?.id === owner) {
          setModeratorAccess({ owner, allowed: !error && data === true });
        }
      }, () => {});
    }
    return () => { closed = true; };
  }, [isOpen, user?.id, user?.isGuest]);
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
  const [safetyAction, setSafetyAction] = useState<"report" | "block">("report");
  const [reportReason, setReportReason] = useState("Abusive name or room content");

  const [activeTab, setActiveTab] = useState<"create" | "join">("create");
  const [selectedDuration, setSelectedDuration] = useState<number>(25);
  const [selectedAnimal, setSelectedAnimal] = useState<CampfireAnimal>("fox");
  const [selectedMode, setSelectedMode] =
    useState<CampfireMode>("shared_destiny");
  const [roomCodeInput, setRoomCodeInput] = useState<string>("");
  const [isCopied, setIsCopied] = useState<boolean>(false);

  const qrMatrix = useMemo(
    () => (currentRoom?.code ? buildCampfireQrMatrix(currentRoom.code) : []),
    [currentRoom?.code]
  );

  const previousStatus = React.useRef(currentRoom?.status);
  // Close only on a new canonical start, keeping safety controls available when reopened.
  React.useEffect(() => {
    const active = useGameStore.getState().activeSession;
    if (
      isOpen &&
      previousStatus.current === "lobby" &&
      currentRoom?.status === "active" &&
      active?.campfire_room_code === currentRoom.code
    ) {
      onClose();
    }
    previousStatus.current = currentRoom?.status;
  }, [isOpen, currentRoom?.status, onClose]);

  if (!isOpen) return null;

  const rangerName = user?.name?.trim() || t.common.guestName;
  const canUseCampfire = Boolean(user && !user.isGuest);
  const isHost =
    currentRoom?.participants.find((p) => p.id === myParticipantId)?.isHost ===
    true;
  const errorText =
    language === "en" && error
      ? (({
          "Akses Campfire dibatasi. Hubungi dukungan melalui profil.":
            "Campfire access is restricted. Contact support through your profile.",
          "Nama ruang atau profil tidak sesuai. Ubah nama profil, lalu coba lagi.":
            "The room or profile name is not allowed. Update your profile name and try again.",
          "Masuk ke akun terverifikasi untuk menggunakan Campfire.":
            "Sign in to a verified account to use Campfire.",
          "Hanya host yang dapat memulai atau mengubah mode.":
            "Only the host can start or change the mode.",
          "Ruang berubah. Tunggu pembaruan, lalu coba lagi.":
            "The room changed. Wait for an update and try again.",
          "Batas ruang atau permintaan tercapai. Coba lagi nanti.":
            "Room or request limit reached. Try again later.",
          "Ruang tidak tersedia atau akses tidak diizinkan.":
            "The room is unavailable or access is not allowed.",
          "Campfire belum dapat terhubung. Periksa koneksi dan coba lagi.":
            "Campfire could not connect. Check your connection and try again.",
        } as Record<string, string>)[error] ??
        "Campfire could not connect. Please try again.")
      : error;

  const extractInviteCode = (input: string): string => {
    const match = input.toLowerCase().match(/[a-f0-9]{32}/);
    return match ? match[0] : input.trim().toLowerCase();
  };

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
    if (ok) {
      hapticSuccess();
      notify(t.campfire.toastCreated, "success");
    }
  };

  const handleJoin = async (overrideCode?: string) => {
    const raw = extractInviteCode(overrideCode ?? roomCodeInput);
    if (!/^[a-f0-9]{32}$/.test(raw)) {
      notify(
        language === "en"
          ? "Paste or scan a valid Campfire invite code."
          : "Tempel atau pindai kode undangan Campfire yang valid.",
        "error"
      );
      return;
    }
    soundManager.playPop();
    hapticMedium();
    const ok = await joinRoom(raw, rangerName, selectedAnimal, "oak");
    if (ok) {
      notify(
        t.campfire.toastJoined.replace(
          "{code}",
          `#${raw.slice(0, 4).toUpperCase()}…${raw.slice(-4).toUpperCase()}`
        ),
        "success"
      );
      setRoomCodeInput("");
    }
  };

  const handlePasteAndJoin = async () => {
    soundManager.playPop();
    hapticLight();
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText();
        const extracted = extractInviteCode(text);
        if (/^[a-f0-9]{32}$/.test(extracted)) {
          setRoomCodeInput(extracted);
          await handleJoin(extracted);
          return;
        }
      }
      notify(
        language === "en"
          ? "No valid Campfire invite found in clipboard."
          : "Tidak ada kode undangan Campfire di papan klip.",
        "info"
      );
    } catch {
      notify(
        language === "en"
          ? "Tap and paste the invite code into the box below."
          : "Tempel kode undangan ke kolom di bawah.",
        "info"
      );
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
        ? `🔥 Join my Focus Together room on Rimba!\nInvite Code: ${code}\n#RimbaApp`
        : `🔥 Yuk fokus bareng di Rimba!\nKode Undangan: ${code}\n#RimbaApp`;
    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
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
    if (await startRoomFocus()) {
      soundManager.playComplete();
      hapticSuccess();
    }
  };

  const shortRoomTag = currentRoom?.code
    ? `#${currentRoom.code.slice(0, 4).toUpperCase()}·${currentRoom.code.slice(-4).toUpperCase()}`
    : "";

  return (
    <div
      className="fixed inset-0 z-[100] h-[100dvh] w-full overflow-y-auto overscroll-contain no-scrollbar select-none antialiased font-urbanist text-[#0D3528] pointer-events-auto bg-gradient-to-b from-[#E6F1EC] via-[#EEF6F2] to-[#E3EFE9]"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-md md:max-w-xl mx-auto px-5 safe-modal-content space-y-4">
        {/* STICKY SAFE-AREA HEADER NAV */}
        <div className="safe-sticky-modal-header flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <h2 className="text-[20px] font-bold tracking-tight text-[#0D3528] leading-snug">
              {t.campfire.title}
            </h2>
            <span className="rounded-full bg-[#E4F4ED] border border-[#BCE5D3] px-2.5 py-0.5 text-[10.5px] font-semibold text-[#14664D] flex items-center gap-1 whitespace-nowrap shrink-0">
              <Flame className="w-3.5 h-3.5 text-[#187557] fill-[#187557] shrink-0" />
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

        {onOpenModeration && moderatorAccess.allowed && moderatorAccess.owner === user?.id && !user?.isGuest && (
          <button type="button" onClick={onOpenModeration} className="w-full min-h-12 rounded-2xl border border-[#187557]/20 bg-white/85 px-4 py-3 flex items-center gap-3 text-left text-[#0D3528]">
            <ShieldCheck className="w-5 h-5 shrink-0" aria-hidden="true" />
            <span className="font-semibold text-sm">{language === 'en' ? 'Review Campfire reports' : 'Tinjau laporan Campfire'}</span>
          </button>
        )}

        {!canUseCampfire && (
          <p role="status" className="rounded-2xl bg-[#E4F4ED] border border-[#BCE5D3] p-3 text-xs font-medium text-[#0D3528]">
            {language === "en"
              ? "Sign in through your profile to create or join a Campfire. Available to all accounts."
              : "Masuk melalui profil untuk membuat atau bergabung Campfire. Tersedia untuk semua akun."}
          </p>
        )}
        {errorText && (
          <p role="alert" className="rounded-2xl bg-red-50 border border-red-200 p-3 text-xs font-medium text-red-900">
            {errorText}
          </p>
        )}
        {isLoading && (
          <p role="status" className="text-xs font-medium text-[#14664D]">
            {language === "en" ? "Connecting…" : "Menghubungkan…"}
          </p>
        )}
        {currentRoom && !isConnected && (
          <p role="status" className="text-xs font-medium text-amber-900 bg-amber-50 p-2.5 rounded-2xl border border-amber-200">
            {language === "en"
              ? "Connection interrupted. Showing last confirmed room; retrying automatically."
              : "Koneksi terputus. Menampilkan ruang terakhir terkonfirmasi; mencoba kembali otomatis."}
          </p>
        )}

        {/* ======================================================== */}
        {/* ACTIVE ROOM CIRCLE                                       */}
        {/* ======================================================== */}
        {currentRoom ? (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="rounded-3xl border border-[#BCE5D3] bg-white p-5 shadow-lg shadow-[#0E3B2D]/10 backdrop-blur-xl space-y-4">
              {/* Top QR & Room Pass Card (Replaces long 32-char text) */}
              <div className="flex items-center justify-between gap-3 p-3.5 rounded-2xl bg-gradient-to-br from-[#F4FAF7] to-[#E6F4EE] border border-[#BCE5D3]">
                <div className="flex items-center gap-3.5 min-w-0">
                  {/* Crisp SVG QR Pass */}
                  <div
                    onClick={() => handleCopyCode(currentRoom.code)}
                    className="w-20 h-20 rounded-2xl bg-white p-2 border border-[#BCE5D3] shadow-sm shrink-0 cursor-pointer active:scale-95 transition-transform flex items-center justify-center"
                    title={language === "en" ? "Tap to copy invite code" : "Ketuk untuk salin kode undangan"}
                  >
                    <svg
                      viewBox="0 0 21 21"
                      className="w-full h-full"
                      shapeRendering="crispEdges"
                      aria-label="Campfire Room QR Code"
                    >
                      {qrMatrix.map((row, rIdx) =>
                        row.map((cell, cIdx) =>
                          cell ? (
                            <rect
                              key={`${rIdx}_${cIdx}`}
                              x={cIdx}
                              y={rIdx}
                              width={1}
                              height={1}
                              fill="#0D3528"
                            />
                          ) : null
                        )
                      )}
                    </svg>
                  </div>

                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-[#187557] px-2 py-0.5 rounded-full bg-white border border-[#BCE5D3] whitespace-nowrap">
                        <QrCode className="w-3 h-3" />
                        <span>{language === "en" ? "QR Pass" : "QR Ruang"}</span>
                      </span>
                      <span className="text-[11px] font-bold font-mono text-[#0D3528] bg-white/80 px-2 py-0.5 rounded-full border border-[#0D3528]/10 whitespace-nowrap">
                        {shortRoomTag}
                      </span>
                    </div>

                    <p className="text-[14px] font-bold text-[#0D3528] truncate">
                      {currentRoom.name}
                    </p>

                    <div className="flex items-center gap-2 pt-0.5">
                      <button
                        type="button"
                        onClick={() => handleCopyCode(currentRoom.code)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white hover:bg-[#E4F4ED] text-[#0D3528] border border-[#0D3528]/15 text-[11px] font-semibold active:scale-95 transition-all cursor-pointer"
                      >
                        {isCopied ? (
                          <>
                            <Check className="w-3 h-3 text-[#187557] stroke-[2.4]" />
                            <span className="text-[#187557]">{language === "en" ? "Copied" : "Tersalin"}</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3 text-[#4C7567]" />
                            <span>{language === "en" ? "Copy Invite" : "Salin Kode"}</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleShareCode(currentRoom.code)}
                        className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[#187557] hover:bg-[#126046] text-white text-[11px] font-semibold shadow-2xs active:scale-95 transition-all cursor-pointer"
                      >
                        <Share2 className="w-3 h-3 stroke-[2.2]" />
                        <span>{t.campfire.inviteFriends}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Animated Campfire Core */}
              <div className="py-5 px-4 rounded-2xl bg-gradient-to-b from-[#0F2E22] to-[#081C14] border border-emerald-500/25 text-center relative overflow-hidden flex flex-col items-center justify-center">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(43,182,136,0.22)_0%,transparent_70%)] animate-pulse" />

                <div className="relative z-10 w-14 h-14 rounded-full bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                  <Flame
                    className={`w-8 h-8 ${
                      currentRoom.status === "severed"
                        ? "text-slate-400 fill-slate-400 opacity-60"
                        : "text-emerald-300 fill-emerald-300 animate-bounce duration-1000"
                    }`}
                  />
                </div>

                <p className="relative z-10 text-[13px] font-bold text-white mt-2">
                  {currentRoom.status === "active"
                    ? t.campfire.statusActive
                    : currentRoom.status === "completed"
                      ? language === "en"
                        ? "Session Completed!"
                        : "Sesi Telah Selesai!"
                      : currentRoom.status === "severed"
                        ? language === "en"
                          ? "Campfire Extinguished"
                          : "Api Unggun Telah Padam"
                        : t.campfire.statusWaiting}
                </p>
                <p className="relative z-10 text-[11.5px] text-emerald-200/85 font-medium mt-0.5">
                  {currentRoom.status === "severed"
                    ? language === "en"
                      ? "This shared session has ended."
                      : "Sesi bersama telah berakhir."
                    : t.campfire.roomMeta
                        .replace("{mins}", String(currentRoom.durationMinutes))
                        .replace("{count}", String(currentRoom.participants.length))}
                </p>
              </div>

              {/* Concise Shared Blessing Pill */}
              <div className="p-3 rounded-2xl bg-[#E4F4ED]/60 border border-[#BCE5D3]/70 text-[11.5px] text-[#14664D] flex items-center gap-2">
                <Sparkles className="w-4 h-4 shrink-0 text-[#187557]" />
                <span>
                  <strong>{t.campfire.bonusTitle}</strong> {t.campfire.bonusDesc}
                </span>
              </div>
            </div>

            {/* Participants List */}
            <div className="space-y-2">
              <h4 className="text-[13px] font-semibold text-[#0D3528] px-1">
                {t.campfire.participantsHeader.replace(
                  "{count}",
                  String(currentRoom.participants.length)
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
                      <div className="flex items-center gap-3 min-w-0">
                        <NatureLineIcon name={animalObj?.icon || "🦊"} className="w-6 h-6 shrink-0" />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[13px] font-bold text-[#0D3528] truncate max-w-[10rem]">
                              {p.name}
                            </span>
                            {p.isHost && (
                              <span className="text-[9.5px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-[#E4F4ED] text-[#14664D] border border-[#BCE5D3] shrink-0 whitespace-nowrap">
                                {t.campfire.hostBadge}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-[#4C7567] truncate">
                            {animalLabel}
                          </p>
                        </div>
                      </div>

                      <span className="px-2.5 py-1 rounded-full bg-[#E4F4ED] text-[#14664D] text-[10.5px] font-semibold border border-[#BCE5D3] whitespace-nowrap shrink-0">
                        {p.status === "completed"
                          ? language === "en"
                            ? "Completed"
                            : "Selesai"
                          : p.status === "abandoned"
                            ? language === "en"
                              ? "Left focus"
                              : "Berhenti fokus"
                            : p.status === "focusing"
                              ? t.campfire.statusFocusing
                              : t.campfire.statusReady}
                      </span>
                      {p.id !== myParticipantId && (
                        <div className="flex gap-3 w-full border-t border-[#0D3528]/10 pt-1">
                          <button
                            type="button"
                            disabled={isLoading}
                            className="text-xs underline py-1 px-2 disabled:opacity-50"
                            onClick={() => {
                              setSafetyTarget(p.id);
                              setSafetyAction("report");
                            }}
                          >
                            {language === "en" ? "Report" : "Laporkan"}
                          </button>
                          <button
                            type="button"
                            disabled={isLoading}
                            className="text-xs underline py-1 px-2 disabled:opacity-50"
                            onClick={() => {
                              setSafetyTarget(p.id);
                              setSafetyAction("block");
                            }}
                          >
                            {language === "en" ? "Block" : "Blokir"}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {safetyTarget &&
              currentRoom.participants.some((p) => p.id === safetyTarget) && (
                <div
                  className="rounded-2xl border border-[#BCE5D3] p-4 space-y-3 bg-white"
                  aria-label={
                    language === "en" ? "Participant safety" : "Keamanan peserta"
                  }
                >
                  <p className="text-sm font-semibold">
                    {safetyAction === "report"
                      ? language === "en"
                        ? "Report this participant or room content"
                        : "Laporkan peserta atau konten ruang ini"
                      : language === "en"
                        ? "Block this participant? You will leave this room and cannot share rooms with them."
                        : "Blokir peserta ini? Kamu akan keluar dari ruang dan tidak dapat berbagi ruang dengannya."}
                  </p>
                  {safetyAction === "report" && (
                    <select
                      aria-label={
                        language === "en" ? "Report reason" : "Alasan laporan"
                      }
                      value={reportReason}
                      onChange={(e) => setReportReason(e.target.value)}
                      className="w-full rounded-xl border p-3 text-sm bg-white"
                    >
                      <option value="Abusive name or room content">
                        {language === "en"
                          ? "Abusive name or room content"
                          : "Nama atau konten ruang tidak pantas"}
                      </option>
                      <option value="Harassment or threats">
                        {language === "en"
                          ? "Harassment or threats"
                          : "Pelecehan atau ancaman"}
                      </option>
                      <option value="Spam or disruptive behavior">
                        {language === "en"
                          ? "Spam or disruptive behavior"
                          : "Spam atau perilaku mengganggu"}
                      </option>
                    </select>
                  )}
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={isLoading}
                      className="rounded-full bg-[#187557] text-white py-2 px-4 text-sm disabled:opacity-50"
                      onClick={async () => {
                        const ok =
                          safetyAction === "report"
                            ? await reportParticipant(safetyTarget, reportReason)
                            : await blockParticipant(safetyTarget);
                        if (ok) {
                          notify(
                            safetyAction === "report"
                              ? language === "en"
                                ? "Report sent for review."
                                : "Laporan dikirim untuk ditinjau."
                              : language === "en"
                                ? "Participant blocked."
                                : "Peserta diblokir.",
                            "success"
                          );
                          setSafetyTarget(null);
                        }
                      }}
                    >
                      {safetyAction === "report"
                        ? language === "en"
                          ? "Send report"
                          : "Kirim laporan"
                        : language === "en"
                          ? "Block and leave"
                          : "Blokir dan keluar"}
                    </button>
                    <button
                      type="button"
                      className="py-2 px-4 text-sm"
                      onClick={() => setSafetyTarget(null)}
                    >
                      {language === "en" ? "Cancel" : "Batal"}
                    </button>
                  </div>
                </div>
              )}

            {isHost && currentRoom.status === "lobby" && (
              <label className="block space-y-1 text-xs font-semibold text-[#4C7567]">
                <span>{t.campfire.modeLabel}</span>
                <select
                  value={currentRoom.mode}
                  disabled={isLoading || !isConnected}
                  onChange={(event) => {
                    void setRoomMode(event.target.value as CampfireMode);
                  }}
                  className="w-full p-3 rounded-2xl border border-[#BCE5D3] bg-white text-[#0D3528] text-xs font-semibold"
                >
                  <option value="shared_destiny">
                    {t.campfire.modeSharedTitle}
                  </option>
                  <option value="gentle_circle">
                    {t.campfire.modeGentleTitle}
                  </option>
                </select>
              </label>
            )}

            {/* Action Buttons */}
            <div className="space-y-2 pt-1">
              {currentRoom.status === "completed" ||
              currentRoom.status === "severed" ? (
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
                    {language === "en"
                      ? "Create or Join New Room"
                      : "Buat atau Gabung Ruang Baru"}
                  </span>
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={handleStartTogether}
                    disabled={
                      !isHost ||
                      isLoading ||
                      currentRoom.status !== "lobby" ||
                      !isConnected
                    }
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
                          {currentRoom.status === "active"
                            ? language === "en"
                              ? "Focus in progress"
                              : "Fokus berlangsung"
                            : t.campfire.startTogetherBtn.replace(
                                "{mins}",
                                String(currentRoom.durationMinutes)
                              )}
                        </span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 text-emerald-300" />
                        <span>
                          {language === "en"
                            ? "Waiting for the host to start"
                            : "Menunggu host memulai"}
                        </span>
                      </>
                    )}
                  </button>

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
              <div className="rounded-3xl border border-[#BCE5D3] bg-white p-5 shadow-lg shadow-[#0E3B2D]/10 backdrop-blur-xl space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-[#E4F4ED] border border-[#BCE5D3] text-[#187557] flex items-center justify-center shadow-xs shrink-0">
                    <Flame className="w-6 h-6 stroke-[1.8] fill-[#187557]/20" />
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

                {/* FULL TIME / DURATION SELECTION MODE */}
                <div className="space-y-2.5 pt-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-[#4C7567] flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-[#187557]" />
                      <span>{t.campfire.durationLabel}</span>
                    </label>
                    <span className="text-[12px] font-extrabold text-[#187557] bg-[#E4F4ED] border border-[#BCE5D3] px-2.5 py-0.5 rounded-full tabular-nums">
                      {selectedDuration} {t.common.Minutes}
                    </span>
                  </div>

                  {/* 6 Preset Pills (15m, 25m, 30m, 45m, 60m, 90m) */}
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                    {DURATION_PRESETS.map((mins) => (
                      <button
                        key={mins}
                        type="button"
                        onClick={() => {
                          soundManager.playPop();
                          hapticLight();
                          setSelectedDuration(mins);
                        }}
                        className={`py-2 rounded-2xl text-[12px] font-bold border transition-all cursor-pointer tabular-nums ${
                          selectedDuration === mins
                            ? "bg-[#187557] text-white border-[#187557] shadow-xs"
                            : "bg-white/80 text-[#0D3528] border-[#0D3528]/10 hover:bg-white"
                        }`}
                      >
                        {mins}m
                      </button>
                    ))}
                  </div>

                  {/* Custom Fine-Tune Slider + Stepper (10m – 120m) */}
                  <div className="flex items-center gap-2.5 p-2.5 rounded-2xl bg-[#0D3528]/[0.03] border border-[#0D3528]/8">
                    <button
                      type="button"
                      onClick={() => {
                        soundManager.playPop();
                        hapticLight();
                        setSelectedDuration((d) => Math.max(10, d - 5));
                      }}
                      className="w-8 h-8 rounded-xl bg-white border border-[#0D3528]/10 flex items-center justify-center text-[#0D3528] active:scale-90 transition-transform cursor-pointer shrink-0"
                      aria-label="-5m"
                    >
                      <Minus className="w-3.5 h-3.5 stroke-[2.4]" />
                    </button>

                    <input
                      type="range"
                      min={10}
                      max={120}
                      step={5}
                      value={selectedDuration}
                      onChange={(e) => {
                        hapticLight();
                        setSelectedDuration(Number(e.target.value));
                      }}
                      className="flex-1 h-1.5 bg-[#0D3528]/15 rounded-full appearance-none cursor-pointer accent-[#187557]"
                      aria-label={t.campfire.durationLabel}
                    />

                    <button
                      type="button"
                      onClick={() => {
                        soundManager.playPop();
                        hapticLight();
                        setSelectedDuration((d) => Math.min(120, d + 5));
                      }}
                      className="w-8 h-8 rounded-xl bg-white border border-[#0D3528]/10 flex items-center justify-center text-[#0D3528] active:scale-90 transition-transform cursor-pointer shrink-0"
                      aria-label="+5m"
                    >
                      <Plus className="w-3.5 h-3.5 stroke-[2.4]" />
                    </button>
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
                        <NatureLineIcon name={a.icon} className="w-6 h-6" />
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
                          ? "bg-[#E4F4ED] border-[#187557] text-[#0D3528] shadow-xs ring-1 ring-[#187557]/40"
                          : "bg-white/70 border-[#0D3528]/10 text-[#0D3528] hover:bg-white"
                      }`}
                    >
                      <div className="flex items-center gap-1.5 font-bold text-[12px] text-[#0D3528]">
                        <Flame className="w-3.5 h-3.5 fill-[#187557] text-[#187557] shrink-0" />
                        <span className="truncate">{t.campfire.modeSharedTitle}</span>
                      </div>
                      <p className="text-[10px] text-[#4C7567] mt-1 leading-snug line-clamp-2">
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
                        <ShieldCheck className="w-3.5 h-3.5 text-[#187557] shrink-0" />
                        <span className="truncate">{t.campfire.modeGentleTitle}</span>
                      </div>
                      <p className="text-[10px] text-[#4C7567] mt-1 leading-snug line-clamp-2">
                        {t.campfire.modeGentleDesc}
                      </p>
                    </button>
                  </div>
                </div>

                {/* Create Button */}
                <div className="pt-1">
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
              <div className="rounded-3xl border border-[#BCE5D3] bg-white p-5 shadow-lg shadow-[#0E3B2D]/10 backdrop-blur-xl space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-emerald-50 border border-emerald-200/80 text-[#187557] flex items-center justify-center shadow-xs shrink-0">
                    <QrCode className="w-6 h-6 stroke-[1.8]" />
                  </div>
                  <div>
                    <h3 className="text-[15px] font-bold text-[#0D3528] tracking-tight">
                      {t.campfire.joinTitle}
                    </h3>
                    <p className="text-[11.5px] text-[#4C7567] font-normal">
                      {language === "en"
                        ? "Paste an invite link or code shared from a friend's QR Pass"
                        : "Tempel tautan atau kode undangan dari QR Ruang temanmu"}
                    </p>
                  </div>
                </div>

                {/* 1-Tap Paste Invite Button + Compact Input */}
                <div className="space-y-2 pt-1">
                  <button
                    type="button"
                    onClick={handlePasteAndJoin}
                    disabled={isLoading || !canUseCampfire}
                    className="w-full py-3 px-4 rounded-2xl bg-[#E4F4ED] hover:bg-[#D5EFE3] border border-[#BCE5D3] text-[#0D3528] font-bold text-[12.5px] flex items-center justify-center gap-2 active:scale-[0.98] transition-all cursor-pointer"
                  >
                    <ClipboardPaste className="w-4 h-4 text-[#187557]" />
                    <span>
                      {language === "en"
                        ? "Paste Invite from Clipboard & Join"
                        : "Tempel Undangan dari Papan Klip & Gabung"}
                    </span>
                  </button>

                  <div className="relative">
                    <input
                      type="text"
                      aria-label={t.campfire.codeInputLabel}
                      placeholder={
                        language === "en"
                          ? "Or paste invite code here…"
                          : "Atau tempel kode undangan di sini…"
                      }
                      autoCapitalize="none"
                      autoCorrect="off"
                      spellCheck={false}
                      value={roomCodeInput}
                      onChange={(e) =>
                        setRoomCodeInput(extractInviteCode(e.target.value))
                      }
                      className="w-full py-2.5 px-4 rounded-2xl border border-[#0D3528]/15 bg-white text-[13px] font-mono font-bold tracking-wide text-[#0D3528] placeholder:text-[#4C7567]/50 placeholder:font-sans placeholder:font-normal focus:outline-none focus:ring-2 focus:ring-[#187557] text-center"
                    />
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
                        <NatureLineIcon name={a.icon} className="w-6 h-6" />
                        <span className="text-[9.5px] font-semibold text-[#0D3528] truncate max-w-full">
                          {t.campfire.animals[a.id]}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Join Button */}
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => void handleJoin()}
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
