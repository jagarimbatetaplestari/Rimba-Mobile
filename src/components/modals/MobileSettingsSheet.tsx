"use client";

import React, { useState, useEffect } from "react";
import { useAuthStore } from "@/lib/auth/useAuthStore";
import { useGameStore } from "@/lib/game/useGameStore";
import { soundManager } from "@/lib/audio/sounds";
import { musicPlayer, RIMBA_PLAYLIST } from "@/lib/audio/musicPlayer";
import { usePreferencesStore } from "@/lib/settings/usePreferencesStore";
import {
  hapticLight,
  hapticSuccess,
  hapticWarning,
} from "@/lib/mobile/nativeBridge";
import {
  scheduleDailyStreakReminder,
  cancelDailyStreakReminder,
} from "@/lib/mobile/notificationManager";
import {
  downloadSaveDataBackup,
  createIslandSnapshot,
} from "@/lib/game/backupManager";
import { createInitialSaveData, saveSaveData } from "@/lib/game/storage";
import { SoundscapeModal } from "@/components/modals/SoundscapeModal";
import { RestoreDataModal } from "@/components/modals/RestoreDataModal";
import { SnapshotsHistoryModal } from "@/components/modals/SnapshotsHistoryModal";
import { RangerAvatar } from "@/components/ui/RangerAvatar";
import { uploadGameSaveToCloud, smartSyncOnLogin, getLastSyncedAt } from "@/lib/supabase/cloudSync";
import {
  User,
  Music,
  Volume2,
  Smartphone,
  Bell,
  Clock,
  Download,
  RotateCcw,
  History,
  AlertTriangle,
  ChevronRight,
  ChevronLeft,
  Database,
  Trash2,
  ShieldAlert,
  Sparkles,
  Cloud,
  RefreshCw,
  X,
} from "lucide-react";

export interface MobileSettingsSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenProfile?: () => void;
}

export function MobileSettingsSheet({
  isOpen,
  onClose,
  onOpenProfile,
}: MobileSettingsSheetProps) {
  const { user } = useAuthStore();
  const saveData = useGameStore((state) => state.saveData);
  const prefs = usePreferencesStore();

  const profile = saveData?.profile || { xp: 0, goldCached: 0 };
  const currentLevel = Math.floor((profile?.xp || 0) / 100) + 1;

  const [currentView, setCurrentView] = useState<"main" | "storage">("main");
  const [showSoundscapePicker, setShowSoundscapePicker] = useState(false);
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [showSnapshotsModal, setShowSnapshotsModal] = useState(false);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [confirmInput, setConfirmInput] = useState("");
  const [isDeleteAccountOpen, setIsDeleteAccountOpen] = useState(false);
  const [deleteAccountInput, setDeleteAccountInput] = useState("");
  const [isSyncingCloud, setIsSyncingCloud] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) setCurrentView("main");
  }, [isOpen]);

  const handleManualCloudSync = async () => {
    if (!user || user.isGuest) {
      soundManager.playPop();
      hapticLight();
      setSyncMessage("Akun masih mode tamu. Masuk untuk mengaktifkan cloud sync.");
      return;
    }
    setIsSyncingCloud(true);
    setSyncMessage(null);
    soundManager.playPop();
    hapticLight();
    const success = await uploadGameSaveToCloud(saveData);
    setIsSyncingCloud(false);
    if (success) {
      soundManager.playComplete();
      hapticSuccess();
      setSyncMessage("Progres suaka tersinkronkan ke Supabase Cloud!");
    } else {
      soundManager.playError();
      hapticWarning();
      setSyncMessage("Gagal sinkronisasi. Periksa koneksi internet.");
    }
  };

  const handleExportBackup = () => {
    soundManager.playComplete();
    hapticSuccess();
    downloadSaveDataBackup(saveData);
  };

  const handleToggleDailyReminder = (enabled: boolean) => {
    hapticLight();
    prefs.setNotifyDailyReminder(enabled);
    if (enabled) {
      scheduleDailyStreakReminder(prefs.dailyReminderTime || "20:00", 1);
    } else {
      cancelDailyStreakReminder();
    }
  };

  const handleDailyReminderTimeChange = (time: string) => {
    prefs.setDailyReminderTime(time);
    if (prefs.notifyDailyReminder) {
      scheduleDailyStreakReminder(time, 1);
    }
  };

  const handleExecuteReset = () => {
    if (confirmInput.trim().toUpperCase() === "RESET") {
      soundManager.playError();
      hapticWarning();

      createIslandSnapshot(
        saveData,
        `Snapshot Sebelum Reset (${new Date().toLocaleDateString("id-ID")})`,
      );

      const initial = createInitialSaveData();
      const preserved = {
        ...initial,
        focus_sessions: saveData.focus_sessions || [],
      };
      saveSaveData(preserved);
      useGameStore.setState({
        saveData: preserved,
        activeSession: null,
        selectedTool: null,
      });

      setIsResetConfirmOpen(false);
      setConfirmInput("");
      onClose();
    }
  };

  const handleExecuteDeleteAccount = () => {
    if (deleteAccountInput.trim().toUpperCase() === "HAPUS") {
      soundManager.playError();
      hapticWarning();
      useAuthStore.getState().deleteAccountAndData();
      useGameStore.getState().resetWorld();
      setIsDeleteAccountOpen(false);
      setDeleteAccountInput("");
      onClose();
      if (typeof window !== "undefined") {
        window.location.reload();
      }
    }
  };

  const currentTrack =
    RIMBA_PLAYLIST.find((t) => t.id === prefs.selectedSoundscapeId) ||
    RIMBA_PLAYLIST[0];

  const handleProfileClick = () => {
    hapticLight();
    if (onOpenProfile) {
      onOpenProfile();
    } else {
      window.dispatchEvent(new CustomEvent("rimba:open_profile"));
      onClose();
    }
  };

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
      {/* Top Ambient Light Glow */}
      <div
        className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-lg h-72 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% -10%, rgba(255, 255, 255, 0.5), transparent 70%)",
        }}
      />

      {/* Full Page Content Container */}
      <div className="relative z-10 w-full max-w-md mx-auto px-4 sm:px-5 pt-[max(env(safe-area-inset-top,1rem),1.25rem)] pb-[max(calc(env(safe-area-inset-bottom,0px)+2.5rem),3rem)] space-y-4">
        {/* Navigation Header */}
        <div className="flex items-center justify-between pt-1 pb-1">
          {currentView === "storage" ? (
            <button
              type="button"
              onClick={() => {
                hapticLight();
                setCurrentView("main");
              }}
              className="flex items-center gap-1.5 text-[15px] font-semibold text-[#143525] transition-colors cursor-pointer active:scale-95 py-1"
            >
              <ChevronLeft className="w-5 h-5 stroke-[2.2]" />
              <span>Pengaturan</span>
            </button>
          ) : (
            <div className="flex items-baseline gap-2">
              <h2 className="text-[21px] font-semibold tracking-tight text-[#143525]">
                Pengaturan
              </h2>
              <span className="text-[12.5px] font-normal text-[#456b57]">
                Preferensi Suaka
              </span>
            </div>
          )}

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

        {currentView === "main" ? (
          <div className="space-y-4">
            {/* ====================================================
                1. PROFIL & AKUN
                ==================================================== */}
            <div>
              <p className="px-1 pb-1.5 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-[#2f5542]/75">
                Profil & Akun
              </p>

              <button
                type="button"
                onClick={handleProfileClick}
                className="group flex w-full items-center justify-between rounded-[24px] border border-white/85 bg-white/75 p-3 px-3.5 shadow-[0_8px_24px_rgba(20,50,30,0.05)] transition-all active:scale-[0.98] cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0 pr-2">
                  <RangerAvatar
                    avatarUrl={user?.avatarUrl || profile?.avatarUrl}
                    name={user?.name || profile?.name}
                    size="md"
                    borderClassName="border border-white/80"
                  />

                  <div className="min-w-0 text-left">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-[14.5px] font-semibold tracking-tight text-[#143525]">
                        {user?.name || profile?.name || "Tamu Rimba"}
                      </span>
                      <span className="shrink-0 rounded-full border border-[#c4b693]/40 bg-[#d6cbaf]/50 px-2 py-0.5 text-[10px] font-semibold text-[#69572c]">
                        Level {currentLevel}
                      </span>
                    </div>
                    <p className="truncate text-[11.5px] text-[#456b57]">
                      {user?.email || "Penyimpanan Lokal (Offline-First)"}
                    </p>
                  </div>
                </div>

                <ChevronRight className="h-4 w-4 shrink-0 text-[#456b57]/60 transition-transform group-hover:translate-x-0.5" />
              </button>
            </div>

            {/* ====================================================
                2. SUARA & GETARAN (BENTO TOP)
                ==================================================== */}
            <div>
              <p className="px-1 pb-1.5 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-[#2f5542]/75">
                Suara & Getaran
              </p>

              <div className="grid grid-cols-2 gap-2.5 w-full">
                {/* Musik Latar (Tall Bento Card) */}
                <div className="flex flex-col justify-between rounded-[24px] border border-white/85 bg-white/75 p-3.5 shadow-[0_8px_24px_rgba(20,50,30,0.05)] overflow-hidden min-w-0">
                  <div className="flex items-center justify-between">
                    <Music className="h-4 w-4 text-[#143525] shrink-0" />
                    <button
                      type="button"
                      role="switch"
                      aria-checked={prefs.ambientMusicEnabled}
                      onClick={() => {
                        hapticLight();
                        const next = !prefs.ambientMusicEnabled;
                        prefs.setAmbientMusicEnabled(next);
                        if (!next) {
                          musicPlayer.stop();
                        } else {
                          musicPlayer.setVolume(
                            (prefs.ambientMusicVolume || 50) / 100,
                          );
                          musicPlayer.togglePlay();
                        }
                      }}
                      className={`relative w-11 h-6 shrink-0 rounded-full p-0.5 transition-colors duration-200 cursor-pointer ${
                        prefs.ambientMusicEnabled
                          ? "bg-[#1e5638]"
                          : "bg-black/15"
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                          prefs.ambientMusicEnabled
                            ? "translate-x-5"
                            : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>

                  <div className="my-2.5 text-left min-w-0">
                    <p className="text-[13.5px] font-semibold text-[#143525] truncate">
                      Musik Latar
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        hapticLight();
                        setShowSoundscapePicker(true);
                      }}
                      className="mt-0.5 flex items-center gap-0.5 text-[11.5px] text-[#456b57] hover:text-[#143525] transition-colors cursor-pointer text-left w-full min-w-0"
                    >
                      <span className="truncate">{currentTrack.title}</span>
                      <ChevronRight className="h-3 w-3 shrink-0 opacity-70" />
                    </button>
                  </div>

                  {/* Volume Slider: Locked inside bounds */}
                  <div className="flex items-center gap-1.5 pt-1 w-full min-w-0 overflow-hidden">
                    <Volume2 className="h-3.5 w-3.5 shrink-0 text-[#456b57]" />
                    <div className="flex-1 min-w-0 flex items-center">
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={prefs.ambientMusicVolume ?? 10}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          prefs.setAmbientMusicVolume(val);
                          musicPlayer.setVolume(val / 100);
                        }}
                        className="w-full min-w-0 h-1 accent-[#1e5638] bg-[#143525]/15 rounded-full cursor-pointer appearance-none"
                        style={{ width: "100%", minWidth: 0 }}
                      />
                    </div>
                    <span className="shrink-0 text-[10px] font-mono text-[#456b57] tabular-nums">
                      {prefs.ambientMusicVolume ?? 10}%
                    </span>
                  </div>
                </div>

                {/* Stacked Bento Cards: Efek Suara & Getaran */}
                <div className="flex flex-col gap-2.5 min-w-0">
                  {/* Efek Suara */}
                  <div className="flex flex-col justify-between rounded-[22px] border border-white/85 bg-white/75 p-3 shadow-[0_8px_24px_rgba(20,50,30,0.05)] min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-[13px] font-semibold text-[#143525] truncate">
                        Efek Suara
                      </p>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={prefs.soundFxEnabled}
                        onClick={() => {
                          hapticLight();
                          const next = !prefs.soundFxEnabled;
                          prefs.setSoundFxEnabled(next);
                          if (next) soundManager.playPop();
                        }}
                        className={`relative w-9 h-5 shrink-0 rounded-full p-0.5 transition-colors duration-200 cursor-pointer ${
                          prefs.soundFxEnabled ? "bg-[#1e5638]" : "bg-black/15"
                        }`}
                      >
                        <div
                          className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                            prefs.soundFxEnabled
                              ? "translate-x-4"
                              : "translate-x-0"
                          }`}
                        />
                      </button>
                    </div>
                    <p className="pt-1 text-[10.5px] leading-tight text-[#456b57]">
                      Suara interaktif & lonceng fokus
                    </p>
                  </div>

                  {/* Getaran */}
                  <div className="flex flex-col justify-between rounded-[22px] border border-white/85 bg-white/75 p-3 shadow-[0_8px_24px_rgba(20,50,30,0.05)] min-w-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 min-w-0 pr-1">
                        <Smartphone className="h-3.5 w-3.5 shrink-0 text-[#143525]" />
                        <p className="text-[13px] font-semibold text-[#143525] truncate">
                          Getaran
                        </p>
                      </div>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={prefs.hapticsEnabled}
                        onClick={() => {
                          const next = !prefs.hapticsEnabled;
                          prefs.setHapticsEnabled(next);
                          if (next) hapticSuccess();
                        }}
                        className={`relative w-9 h-5 shrink-0 rounded-full p-0.5 transition-colors duration-200 cursor-pointer ${
                          prefs.hapticsEnabled ? "bg-[#1e5638]" : "bg-black/15"
                        }`}
                      >
                        <div
                          className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                            prefs.hapticsEnabled
                              ? "translate-x-4"
                              : "translate-x-0"
                          }`}
                        />
                      </button>
                    </div>
                    <p className="pt-1 text-[10.5px] leading-tight text-[#456b57]">
                      Umpan balik sentuhan haptic
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* ====================================================
                3. KUALITAS GRAFIS & BATERAI
                ==================================================== */}
            <div>
              <div className="flex items-center justify-between px-1 pb-1.5">
                <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-[#2f5542]/75">
                  Kualitas Grafis & Baterai
                </p>
                <span className="text-[10.5px] font-semibold text-[#1e5638] bg-white/70 px-2 py-0.5 rounded-full border border-white/80">
                  {prefs.graphicsQuality === "eco"
                    ? "Eco 🍃"
                    : prefs.graphicsQuality === "balanced"
                    ? "Seimbang ⚖️"
                    : "Ultra 🌲"}
                </span>
              </div>

              <div className="rounded-[24px] border border-white/85 bg-white/75 p-3 shadow-[0_8px_24px_rgba(20,50,30,0.05)] space-y-2">
                <div className="grid grid-cols-3 gap-1.5 p-1 rounded-2xl bg-[#143525]/[0.05]">
                  {[
                    { id: "eco", label: "Eco", icon: "🍃", detail: "Hemat Daya" },
                    { id: "balanced", label: "Seimbang", icon: "⚖️", detail: "Standar 60fps" },
                    { id: "ultra", label: "Ultra", icon: "🌲", detail: "Visual Penuh" },
                  ].map((preset) => {
                    const isActive = prefs.graphicsQuality === preset.id;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => {
                          hapticLight();
                          prefs.setGraphicsQuality(preset.id as any);
                        }}
                        className={`flex flex-col items-center py-2 px-1 rounded-xl transition-all cursor-pointer ${
                          isActive
                            ? "bg-white shadow-[0_2px_8px_rgba(20,50,30,0.12)] text-[#143525]"
                            : "text-[#456b57] hover:text-[#143525]"
                        }`}
                      >
                        <span className="text-sm">{preset.icon}</span>
                        <span className="text-[11.5px] font-bold mt-0.5">{preset.label}</span>
                        <span className="text-[9.5px] text-[#456b57]/80">{preset.detail}</span>
                      </button>
                    );
                  })}
                </div>
                <p className="text-[10.5px] leading-snug text-[#456b57] px-1 text-center">
                  {prefs.graphicsQuality === "eco" &&
                    "3.000 rumput • Bayangan dimatikan • Sangat hemat baterai & perangkat ringan."}
                  {prefs.graphicsQuality === "balanced" &&
                    "6.000 rumput • Bayangan lembut • Rekomendasi seimbang performa & visual."}
                  {prefs.graphicsQuality === "ultra" &&
                    "9.000 rumput • Bayangan 1024px presisi • Pengalaman visual diorama suaka terlengkap."}
                </p>
              </div>
            </div>

            {/* ====================================================
                4. PENGINGAT & DATA (BENTO BOTTOM 2-KOLOM SIMETRIS)
                ==================================================== */}
            <div>
              <p className="px-1 pb-1.5 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-[#2f5542]/75">
                Pengingat & Data
              </p>

              <div className="grid grid-cols-2 gap-2.5 w-full">
                {/* Bento Kiri: Pengingat Harian */}
                <div className="flex flex-col justify-between rounded-[24px] border border-white/85 bg-white/75 p-3.5 shadow-[0_8px_24px_rgba(20,50,30,0.05)] min-w-0">
                  <div>
                    <div className="flex items-center justify-between">
                      <Bell className="h-4 w-4 text-[#143525] shrink-0" />
                      <button
                        type="button"
                        role="switch"
                        aria-checked={prefs.notifyDailyReminder}
                        onClick={() =>
                          handleToggleDailyReminder(!prefs.notifyDailyReminder)
                        }
                        className={`relative w-11 h-6 shrink-0 rounded-full p-0.5 transition-colors duration-200 cursor-pointer ${
                          prefs.notifyDailyReminder
                            ? "bg-[#1e5638]"
                            : "bg-black/15"
                        }`}
                      >
                        <div
                          className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                            prefs.notifyDailyReminder
                              ? "translate-x-5"
                              : "translate-x-0"
                          }`}
                        />
                      </button>
                    </div>

                    <div className="mt-2.5 text-left">
                      <p className="text-[13.5px] font-semibold text-[#143525]">
                        Pengingat Harian
                      </p>
                      <p className="text-[11px] leading-snug text-[#456b57]">
                        Lindungi streak fokus
                      </p>
                    </div>
                  </div>

                  <label className="relative mt-3 flex items-center justify-between rounded-full border border-white/90 bg-white/80 px-2.5 py-1 text-[11px] font-medium text-[#143525] shadow-2xs cursor-pointer hover:border-[#1e5638]/40 transition-colors">
                    <span className="flex items-center gap-1 text-[10.5px] text-[#456b57]">
                      <Clock className="h-3 w-3 shrink-0" />
                      Waktu
                    </span>
                    <span className="font-semibold tabular-nums">
                      {prefs.dailyReminderTime || "20:00"} &rsaquo;
                    </span>
                    <input
                      type="time"
                      value={prefs.dailyReminderTime || "20:00"}
                      onChange={(e) =>
                        handleDailyReminderTimeChange(e.target.value)
                      }
                      className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                    />
                  </label>
                </div>

                {/* Bento Kanan: Cadangan & Pemulihan */}
                <button
                  type="button"
                  onClick={() => {
                    hapticLight();
                    setCurrentView("storage");
                  }}
                  className="group flex flex-col justify-between rounded-[24px] border border-white/85 bg-white/75 p-3.5 text-left shadow-[0_8px_24px_rgba(20,50,30,0.05)] transition-all active:scale-[0.98] cursor-pointer min-w-0"
                >
                  <div className="flex items-center justify-between w-full">
                    <Database className="h-4 w-4 text-[#143525] shrink-0" />
                    <ChevronRight className="h-4 w-4 text-[#456b57]/60 transition-transform group-hover:translate-x-0.5" />
                  </div>

                  <div className="mt-4">
                    <p className="text-[13.5px] font-semibold text-[#143525]">
                      Cadangan & Pemulihan
                    </p>
                    <p className="mt-1 text-[11px] leading-snug text-[#456b57]">
                      Unduh JSON, riwayat snapshot, & pulihkan
                    </p>
                  </div>
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Sub-View: Penyimpanan & Cadangan Suaka */
          <div className="space-y-3 animate-in fade-in slide-in-from-right-3 duration-200">
            <div className="p-3.5 rounded-[22px] border border-white/85 bg-white/70 text-[11.5px] text-[#456b57] leading-relaxed shadow-2xs">
              Seluruh progres pulau, spesies tanaman, dan riwayat fokus
              tersimpan secara lokal di perangkat Anda.
            </div>

            {/* Supabase Cloud Sync Card */}
            <div className="p-3.5 rounded-[22px] border border-white/85 bg-white/80 space-y-2.5 shadow-2xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-emerald-500/15 flex items-center justify-center text-emerald-800">
                    <Cloud className="w-4 h-4 stroke-[2.2]" />
                  </div>
                  <div>
                    <h4 className="text-[13px] font-semibold text-[#143525]">
                      Supabase Cloud Sync
                    </h4>
                    <p className="text-[10.5px] text-[#456b57]">
                      {user && !user.isGuest
                        ? "Penyimpanan awan terhubung"
                        : "Mode Tamu (Hanya Tersimpan Lokal)"}
                    </p>
                  </div>
                </div>

                <span
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                    user && !user.isGuest
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-amber-100 text-amber-800"
                  }`}
                >
                  {user && !user.isGuest ? "Online" : "Lokal"}
                </span>
              </div>

              {syncMessage && (
                <div className="text-[11px] p-2 rounded-xl bg-[#bfdac8]/30 text-[#143525] font-medium animate-in fade-in">
                  {syncMessage}
                </div>
              )}

              <button
                type="button"
                disabled={isSyncingCloud}
                onClick={handleManualCloudSync}
                className="w-full py-2 px-3 rounded-full border border-emerald-800/15 bg-white text-[#143525] hover:bg-emerald-50 text-[12px] font-semibold flex items-center justify-center gap-2 transition-all active:scale-98 shadow-xs cursor-pointer"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 stroke-[2.2] ${
                    isSyncingCloud ? "animate-spin text-emerald-700" : ""
                  }`}
                />
                <span>
                  {isSyncingCloud
                    ? "Menyinkronkan ke Cloud..."
                    : user && !user.isGuest
                    ? "Sinkronkan Sekarang"
                    : "Hubungkan Akun"}
                </span>
              </button>
            </div>

            <div className="space-y-2">
              <button
                type="button"
                onClick={handleExportBackup}
                className="flex w-full items-center justify-between rounded-[22px] border border-white/85 bg-white/75 p-3.5 text-left shadow-2xs transition-all active:scale-[0.98] cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0 pr-2">
                  <Download className="h-4 w-4 text-[#143525] shrink-0" />
                  <div>
                    <p className="text-[13px] font-semibold text-[#143525]">
                      Unduh Cadangan JSON
                    </p>
                    <p className="text-[11px] text-[#456b57]">
                      Simpan file salinan suaka ke perangkat
                    </p>
                  </div>
                </div>
                <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-[#bfdac8]/40 text-[#143525]">
                  Unduh
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  hapticLight();
                  setShowSnapshotsModal(true);
                }}
                className="flex w-full items-center justify-between rounded-[22px] border border-white/85 bg-white/75 p-3.5 text-left shadow-2xs transition-all active:scale-[0.98] cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0 pr-2">
                  <History className="h-4 w-4 text-[#143525] shrink-0" />
                  <div>
                    <p className="text-[13px] font-semibold text-[#143525]">
                      Riwayat Snapshot Pulau
                    </p>
                    <p className="text-[11px] text-[#456b57]">
                      Titik pemulihan tata letak suaka
                    </p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-[#456b57]/60" />
              </button>

              <button
                type="button"
                onClick={() => {
                  hapticLight();
                  setShowRestoreModal(true);
                }}
                className="flex w-full items-center justify-between rounded-[22px] border border-white/85 bg-white/75 p-3.5 text-left shadow-2xs transition-all active:scale-[0.98] cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0 pr-2">
                  <RotateCcw className="h-4 w-4 text-[#143525] shrink-0" />
                  <div>
                    <p className="text-[13px] font-semibold text-[#143525]">
                      Pulihkan Data dari File
                    </p>
                    <p className="text-[11px] text-[#456b57]">
                      Muat ulang dari file cadangan JSON
                    </p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-[#456b57]/60" />
              </button>
            </div>

            {/* Danger Zone */}
            <div className="pt-2 space-y-2">
              <p className="px-1 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-rose-700/80">
                Zona Bahaya & Kepatuhan
              </p>

              {/* Reset Island Layout */}
              <button
                type="button"
                onClick={() => {
                  hapticWarning();
                  setIsResetConfirmOpen(true);
                }}
                className="flex w-full items-center justify-between rounded-[22px] border border-amber-200/80 bg-amber-50/70 p-3.5 text-left transition-all active:scale-[0.98] cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0 pr-2">
                  <Trash2 className="h-4 w-4 text-amber-700 shrink-0" />
                  <div>
                    <p className="text-[13px] font-semibold text-amber-800">
                      Atur Ulang Tata Letak Pulau
                    </p>
                    <p className="text-[11px] text-amber-700/80">
                      Bersihkan pulau & mulai tata letak baru (riwayat tersimpan)
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                  Reset
                </span>
              </button>

              {/* Permanent Account & Data Deletion (Apple Guideline 5.1.1(v)) */}
              <button
                type="button"
                onClick={() => {
                  hapticWarning();
                  setIsDeleteAccountOpen(true);
                }}
                className="flex w-full items-center justify-between rounded-[22px] border border-rose-300 bg-rose-50/90 p-3.5 text-left transition-all active:scale-[0.98] cursor-pointer shadow-2xs"
              >
                <div className="flex items-center gap-3 min-w-0 pr-2">
                  <ShieldAlert className="h-4 w-4 text-rose-600 shrink-0" />
                  <div>
                    <p className="text-[13px] font-semibold text-rose-700">
                      Hapus Akun & Seluruh Data
                    </p>
                    <p className="text-[11px] text-rose-600/85">
                      Hapus permanen akun, sesi, & suaka (Apple 5.1.1(v))
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-200 text-rose-800 uppercase tracking-wider">
                  Hapus
                </span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Danger Confirmation Modal */}
      {isResetConfirmOpen && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsResetConfirmOpen(false);
          }}
          className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-md animate-in fade-in duration-150 pointer-events-auto"
        >
          <div className="relative z-10 w-full max-w-[280px] rounded-[26px] border border-white/80 bg-[#f4f8f5] p-5 space-y-4 shadow-2xl text-center animate-in zoom-in-95 duration-150">
            <div className="w-10 h-10 rounded-full bg-rose-100/70 border border-rose-200 mx-auto flex items-center justify-center text-rose-600">
              <AlertTriangle className="w-4 h-4 stroke-[2.2]" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#143525] tracking-tight">
                Konfirmasi Atur Ulang
              </h3>
              <p className="text-[11px] text-[#456b57] mt-1 leading-relaxed">
                Ketik kata{" "}
                <span className="font-bold text-rose-600 font-mono">RESET</span>{" "}
                untuk mereset pulau suaka.
              </p>
            </div>
            <input
              type="text"
              value={confirmInput}
              onChange={(e) => setConfirmInput(e.target.value)}
              placeholder="RESET"
              className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-[#143525] font-mono font-bold text-center text-xs tracking-widest focus:outline-none focus:border-rose-500 uppercase"
              autoFocus
            />
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setIsResetConfirmOpen(false);
                  setConfirmInput("");
                }}
                className="py-2.5 rounded-xl bg-white border border-slate-200 text-[#456b57] font-semibold text-xs active:scale-95 transition-all cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleExecuteReset}
                disabled={confirmInput.trim().toUpperCase() !== "RESET"}
                className="py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold text-xs active:scale-95 transition-all shadow-sm cursor-pointer"
              >
                Reset Pulau
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Permanent Account Deletion Modal (Apple App Store Guideline 5.1.1(v)) */}
      {isDeleteAccountOpen && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setIsDeleteAccountOpen(false);
              setDeleteAccountInput("");
            }
          }}
          className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md animate-in fade-in duration-150 pointer-events-auto"
        >
          <div className="relative z-10 w-full max-w-[300px] rounded-[26px] border border-white/80 bg-[#fff5f5] p-5 space-y-4 shadow-2xl text-center animate-in zoom-in-95 duration-150">
            <div className="w-11 h-11 rounded-full bg-rose-100 border border-rose-300 mx-auto flex items-center justify-center text-rose-600">
              <ShieldAlert className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-rose-950 tracking-tight">
                Hapus Akun & Data Suaka
              </h3>
              <p className="text-[11px] text-rose-800/80 mt-1.5 leading-relaxed">
                Tindakan ini permanen. Seluruh riwayat fokus, pohon suaka, koin getah, dan sesi akun akan dimusnahkan secara lokal dari perangkat ini.
              </p>
              <p className="text-[11px] text-[#143525] mt-2 leading-relaxed">
                Ketik kata{" "}
                <span className="font-bold text-rose-600 font-mono">HAPUS</span>{" "}
                untuk konfirmasi penghapusan permanen.
              </p>
            </div>
            <input
              type="text"
              value={deleteAccountInput}
              onChange={(e) => setDeleteAccountInput(e.target.value)}
              placeholder="HAPUS"
              className="w-full px-3 py-2 rounded-xl bg-white border border-rose-300 text-rose-700 font-mono font-bold text-center text-xs tracking-widest focus:outline-none focus:border-rose-600 uppercase"
              autoFocus
            />
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setIsDeleteAccountOpen(false);
                  setDeleteAccountInput("");
                }}
                className="py-2.5 rounded-xl bg-white border border-slate-200 text-[#456b57] font-semibold text-xs active:scale-95 transition-all cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleExecuteDeleteAccount}
                disabled={deleteAccountInput.trim().toUpperCase() !== "HAPUS"}
                className="py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold text-xs active:scale-95 transition-all shadow-sm cursor-pointer"
              >
                Hapus Semua
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sub-modals */}
      <SoundscapeModal
        isOpen={showSoundscapePicker}
        onClose={() => setShowSoundscapePicker(false)}
      />
      <RestoreDataModal
        isOpen={showRestoreModal}
        onClose={() => setShowRestoreModal(false)}
      />
      <SnapshotsHistoryModal
        isOpen={showSnapshotsModal}
        onClose={() => setShowSnapshotsModal(false)}
      />
    </div>
  );
}
