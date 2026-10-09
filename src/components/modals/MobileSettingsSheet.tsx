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
import { uploadGameSaveToCloud } from "@/lib/supabase/cloudSync";
import { useTranslation } from "@/lib/i18n/translations";
import {
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
  Cloud,
  RefreshCw,
  Globe,
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
  const { t, lang, setLanguage } = useTranslation();

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
      setSyncMessage(
        lang === "en"
          ? "Currently in Guest Mode. Sign in to enable Cloud Sync."
          : "Akun masih mode tamu. Masuk untuk mengaktifkan cloud sync.",
      );
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
      setSyncMessage(
        lang === "en"
          ? "Island progress synced to Cloud!"
          : "Progres pulau tersinkronkan ke Cloud!",
      );
    } else {
      soundManager.playError();
      hapticWarning();
      setSyncMessage(
        lang === "en"
          ? "Sync failed. Please check your internet connection."
          : "Gagal sinkronisasi. Periksa koneksi internet.",
      );
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
        `Snapshot Before Reset (${new Date().toLocaleDateString(lang === "en" ? "en-US" : "id-ID")})`,
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
    const validConfirm =
      deleteAccountInput.trim().toUpperCase() === "HAPUS" ||
      deleteAccountInput.trim().toUpperCase() === "DELETE";
    if (validConfirm) {
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
            {currentView === "storage" ? (
              <button
                type="button"
                onClick={() => {
                  hapticLight();
                  setCurrentView("main");
                }}
                className="flex items-center gap-1.5 text-[15px] font-semibold text-white transition-colors cursor-pointer active:scale-95 py-1 drop-shadow-xs"
              >
                <ChevronLeft className="w-5 h-5 stroke-[2]" />
                <span>{t.settings.title}</span>
              </button>
            ) : (
              <div className="flex items-center gap-2.5">
                <h2 className="text-[23px] font-semibold tracking-normal text-white drop-shadow-xs">
                  {t.settings.title}
                </h2>
                <span className="rounded-full bg-white/20 border border-white/25 px-3 py-0.5 text-[11.5px] font-medium text-emerald-50 backdrop-blur-md">
                  {t.settings.subtitle}
                </span>
              </div>
            )}

            <button
              type="button"
              onClick={() => {
                hapticLight();
                onClose();
              }}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 border border-white/30 text-white shadow-sm backdrop-blur-md active:scale-90 transition-transform hover:bg-white/30 cursor-pointer"
              aria-label={t.common.close}
            >
              <X className="h-4 w-4 stroke-[2]" />
            </button>
          </div>

          {currentView === "main" ? (
            <div className="space-y-4">
              {/* ====================================================
                  0. BAHASA / LANGUAGE SWITCHER
                  ==================================================== */}
              <div className="space-y-1.5">
                <p className="px-1 text-[12px] font-medium uppercase tracking-[0.12em] text-white/90 drop-shadow-xs flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5" />
                  <span>{t.settings.languageSection}</span>
                </p>

                <div className="rounded-3xl border border-white/70 bg-gradient-to-b from-white/95 via-white/95 to-white/90 p-2 shadow-lg shadow-[#0E3B2D]/10 backdrop-blur-xl grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      soundManager.playPop();
                      hapticLight();
                      setLanguage("id");
                    }}
                    className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-2xl text-[13px] font-semibold transition-all cursor-pointer ${
                      lang === "id"
                        ? "bg-[#187557] text-white shadow-xs"
                        : "text-[#0D3528] hover:bg-[#0D3528]/5"
                    }`}
                  >
                    <span>🇮🇩</span>
                    <span>Bahasa Indonesia</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      soundManager.playPop();
                      hapticLight();
                      setLanguage("en");
                    }}
                    className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-2xl text-[13px] font-semibold transition-all cursor-pointer ${
                      lang === "en"
                        ? "bg-[#187557] text-white shadow-xs"
                        : "text-[#0D3528] hover:bg-[#0D3528]/5"
                    }`}
                  >
                    <span>🇬🇧</span>
                    <span>English</span>
                  </button>
                </div>
              </div>

              {/* ====================================================
                  1. PROFIL & AKUN
                  ==================================================== */}
              <div className="space-y-1.5">
                <p className="px-1 text-[12px] font-medium uppercase tracking-[0.12em] text-white/90 drop-shadow-xs">
                  {t.settings.accountSection}
                </p>

                <button
                  type="button"
                  onClick={handleProfileClick}
                  className="group flex w-full items-center justify-between rounded-3xl border border-white/70 bg-gradient-to-b from-white/95 via-white/95 to-white/90 p-4 shadow-lg shadow-[#0E3B2D]/10 backdrop-blur-xl transition-all active:scale-[0.98] cursor-pointer"
                >
                  <div className="flex items-center gap-3.5 min-w-0 pr-2">
                    <RangerAvatar
                      avatarUrl={user?.avatarUrl || profile?.avatarUrl}
                      name={user?.name || profile?.name}
                      size="md"
                      borderClassName="border-2 border-white shadow-xs"
                    />

                    <div className="min-w-0 text-left">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-[15.5px] font-semibold tracking-wide text-[#0D3528]">
                          {user?.name || profile?.name || t.common.guestName}
                        </span>
                        <span className="shrink-0 rounded-full border border-[#BCE5D3] bg-[#E4F4ED] px-2.5 py-0.5 text-[10.5px] font-medium text-[#14664D]">
                          {t.common.level} {currentLevel}
                        </span>
                      </div>
                      <p className="truncate text-[12px] text-[#4C7567] font-normal mt-0.5">
                        {user?.email || t.common.localSave}
                      </p>
                    </div>
                  </div>

                  <ChevronRight className="h-4 w-4 shrink-0 text-[#4C7567]/70 transition-transform group-hover:translate-x-0.5 stroke-[1.8]" />
                </button>
              </div>

              {/* ====================================================
                  2. SUARA & GETARAN (BENTO TOP)
                  ==================================================== */}
              <div className="space-y-1.5">
                <p className="px-1 text-[12px] font-medium uppercase tracking-[0.12em] text-white/90 drop-shadow-xs">
                  {t.settings.soundSection}
                </p>

                <div className="grid grid-cols-2 gap-3 w-full">
                  {/* Musik Latar */}
                  <div className="flex flex-col justify-between rounded-3xl border border-white/70 bg-gradient-to-b from-white/95 via-white/95 to-white/90 p-4 shadow-lg shadow-[#0E3B2D]/10 backdrop-blur-xl overflow-hidden min-w-0">
                    <div className="flex items-center justify-between">
                      <Music className="h-4 w-4 text-[#187557] shrink-0 stroke-[1.8]" />
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
                            ? "bg-[#187557]"
                            : "bg-[#0D3528]/15"
                        }`}
                      >
                        <div
                          className={`w-5 h-5 rounded-full bg-white shadow-xs transition-transform duration-200 ${
                            prefs.ambientMusicEnabled
                              ? "translate-x-5"
                              : "translate-x-0"
                          }`}
                        />
                      </button>
                    </div>

                    <div className="my-2.5 text-left min-w-0">
                      <p className="text-[13.5px] font-semibold text-[#0D3528] truncate">
                        {t.settings.bgMusic}
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          hapticLight();
                          setShowSoundscapePicker(true);
                        }}
                        className="mt-0.5 flex items-center gap-0.5 text-[11.5px] text-[#4C7567] hover:text-[#0D3528] transition-colors cursor-pointer text-left w-full min-w-0 font-normal"
                      >
                        <span className="truncate">{currentTrack.title}</span>
                        <ChevronRight className="h-3 w-3 shrink-0 opacity-70 stroke-[1.8]" />
                      </button>
                    </div>

                    {/* Volume Slider */}
                    <div className="flex items-center gap-1.5 pt-1 w-full min-w-0 overflow-hidden">
                      <Volume2 className="h-3.5 w-3.5 shrink-0 text-[#4C7567] stroke-[1.8]" />
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
                          className="w-full min-w-0 h-1 accent-[#187557] bg-[#0D3528]/10 rounded-full cursor-pointer appearance-none"
                          style={{ width: "100%", minWidth: 0 }}
                        />
                      </div>
                      <span className="shrink-0 text-[10.5px] font-medium text-[#4C7567] tabular-nums">
                        {prefs.ambientMusicVolume ?? 10}%
                      </span>
                    </div>
                  </div>

                  {/* Efek Suara & Getaran Stack */}
                  <div className="flex flex-col gap-3 min-w-0">
                    {/* Efek Suara */}
                    <div className="flex flex-col justify-between rounded-3xl border border-white/70 bg-gradient-to-b from-white/95 via-white/95 to-white/90 p-3.5 shadow-lg shadow-[#0E3B2D]/10 backdrop-blur-xl min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-[13px] font-semibold text-[#0D3528] truncate">
                          {t.settings.soundFx}
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
                            prefs.soundFxEnabled
                              ? "bg-[#187557]"
                              : "bg-[#0D3528]/15"
                          }`}
                        >
                          <div
                            className={`w-4 h-4 rounded-full bg-white shadow-xs transition-transform duration-200 ${
                              prefs.soundFxEnabled
                                ? "translate-x-4"
                                : "translate-x-0"
                            }`}
                          />
                        </button>
                      </div>
                      <p className="pt-1 text-[11px] leading-tight text-[#4C7567] font-normal">
                        {t.settings.soundFxDesc}
                      </p>
                    </div>

                    {/* Getaran */}
                    <div className="flex flex-col justify-between rounded-3xl border border-white/70 bg-gradient-to-b from-white/95 via-white/95 to-white/90 p-3.5 shadow-lg shadow-[#0E3B2D]/10 backdrop-blur-xl min-w-0">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 min-w-0 pr-1">
                          <Smartphone className="h-3.5 w-3.5 shrink-0 text-[#187557] stroke-[1.8]" />
                          <p className="text-[13px] font-semibold text-[#0D3528] truncate">
                            {t.settings.haptics}
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
                            prefs.hapticsEnabled
                              ? "bg-[#187557]"
                              : "bg-[#0D3528]/15"
                          }`}
                        >
                          <div
                            className={`w-4 h-4 rounded-full bg-white shadow-xs transition-transform duration-200 ${
                              prefs.hapticsEnabled
                                ? "translate-x-4"
                                : "translate-x-0"
                            }`}
                          />
                        </button>
                      </div>
                      <p className="pt-1 text-[11px] leading-tight text-[#4C7567] font-normal">
                        {t.settings.hapticsDesc}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* ====================================================
                  3. KUALITAS GRAFIS & BATERAI
                  ==================================================== */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between px-1">
                  <p className="text-[12px] font-medium uppercase tracking-[0.12em] text-white/90 drop-shadow-xs">
                    {t.settings.graphicsSection}
                  </p>
                  <span className="text-[11px] font-medium text-[#14664D] bg-[#E4F4ED] px-2.5 py-0.5 rounded-full border border-[#BCE5D3]">
                    {prefs.graphicsQuality === "eco"
                      ? "Eco 🍃"
                      : prefs.graphicsQuality === "balanced"
                        ? `${t.settings.balancedLabel} ⚖️`
                        : "Ultra 🌲"}
                  </span>
                </div>

                <div className="rounded-3xl border border-white/70 bg-gradient-to-b from-white/95 via-white/95 to-white/90 p-4 shadow-lg shadow-[#0E3B2D]/10 backdrop-blur-xl space-y-2.5">
                  <div className="grid grid-cols-3 gap-1.5 p-1 rounded-2xl bg-[#0D3528]/6">
                    {[
                      {
                        id: "eco",
                        label: "Eco",
                        icon: "🍃",
                        detail: t.settings.ecoDesc,
                      },
                      {
                        id: "balanced",
                        label: t.settings.balancedLabel,
                        icon: "⚖️",
                        detail: t.settings.balancedDesc,
                      },
                      {
                        id: "ultra",
                        label: "Ultra",
                        icon: "🌲",
                        detail: t.settings.ultraDesc,
                      },
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
                              ? "bg-white shadow-xs text-[#0D3528]"
                              : "text-[#4C7567] hover:text-[#0D3528]"
                          }`}
                        >
                          <span className="text-sm">{preset.icon}</span>
                          <span className="text-[12px] font-semibold mt-0.5">
                            {preset.label}
                          </span>
                          <span className="text-[10px] text-[#4C7567] font-normal">
                            {preset.detail}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-[11.5px] leading-relaxed text-[#4C7567] px-1 text-center font-normal">
                    {prefs.graphicsQuality === "eco" && t.settings.ecoDetail}
                    {prefs.graphicsQuality === "balanced" &&
                      t.settings.balancedDetail}
                    {prefs.graphicsQuality === "ultra" && t.settings.ultraDetail}
                  </p>
                </div>
              </div>

              {/* ====================================================
                  4. PENGINGAT & DATA (BENTO BOTTOM 2-KOLOM)
                  ==================================================== */}
              <div className="space-y-1.5">
                <p className="px-1 text-[12px] font-medium uppercase tracking-[0.12em] text-white/90 drop-shadow-xs">
                  {t.settings.reminderDataSection}
                </p>

                <div className="grid grid-cols-2 gap-3 w-full">
                  {/* Bento Kiri: Pengingat Harian */}
                  <div className="flex flex-col justify-between rounded-3xl border border-white/70 bg-gradient-to-b from-white/95 via-white/95 to-white/90 p-4 shadow-lg shadow-[#0E3B2D]/10 backdrop-blur-xl min-w-0">
                    <div>
                      <div className="flex items-center justify-between">
                        <Bell className="h-4 w-4 text-[#187557] shrink-0 stroke-[1.8]" />
                        <button
                          type="button"
                          role="switch"
                          aria-checked={prefs.notifyDailyReminder}
                          onClick={() =>
                            handleToggleDailyReminder(
                              !prefs.notifyDailyReminder,
                            )
                          }
                          className={`relative w-11 h-6 shrink-0 rounded-full p-0.5 transition-colors duration-200 cursor-pointer ${
                            prefs.notifyDailyReminder
                              ? "bg-[#187557]"
                              : "bg-[#0D3528]/15"
                          }`}
                        >
                          <div
                            className={`w-5 h-5 rounded-full bg-white shadow-xs transition-transform duration-200 ${
                              prefs.notifyDailyReminder
                                ? "translate-x-5"
                                : "translate-x-0"
                            }`}
                          />
                        </button>
                      </div>

                      <div className="mt-2.5 text-left">
                        <p className="text-[13.5px] font-semibold text-[#0D3528]">
                          {t.settings.dailyReminder}
                        </p>
                        <p className="text-[11.5px] leading-snug text-[#4C7567] font-normal mt-0.5">
                          {t.settings.dailyReminderDesc}
                        </p>
                      </div>
                    </div>

                    <label className="relative mt-3 flex items-center justify-between rounded-full border border-white/90 bg-white/80 px-3 py-1 text-[11.5px] font-medium text-[#0D3528] shadow-2xs cursor-pointer hover:border-[#187557]/40 transition-colors">
                      <span className="flex items-center gap-1 text-[11px] text-[#4C7567] font-normal">
                        <Clock className="h-3 w-3 shrink-0 stroke-[1.8]" />
                        {t.settings.timeLabel}
                      </span>
                      <span className="font-semibold tabular-nums text-[#0D3528]">
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
                    className="group flex flex-col justify-between rounded-3xl border border-white/70 bg-gradient-to-b from-white/95 via-white/95 to-white/90 p-4 text-left shadow-lg shadow-[#0E3B2D]/10 backdrop-blur-xl transition-all active:scale-[0.98] cursor-pointer min-w-0"
                  >
                    <div className="flex items-center justify-between w-full">
                      <Database className="h-4 w-4 text-[#187557] shrink-0 stroke-[1.8]" />
                      <ChevronRight className="h-4 w-4 text-[#4C7567]/70 transition-transform group-hover:translate-x-0.5 stroke-[1.8]" />
                    </div>

                    <div className="mt-3">
                      <p className="text-[13.5px] font-semibold text-[#0D3528]">
                        {t.settings.backupRestore}
                      </p>
                      <p className="mt-1 text-[11.5px] leading-snug text-[#4C7567] font-normal">
                        {t.settings.backupRestoreDesc}
                      </p>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* ====================================================
                SUB-VIEW: PENYIMPANAN & CADANGAN SUAKA
                ==================================================== */
            <div className="space-y-3.5 animate-in fade-in slide-in-from-right-3 duration-200">
              <div className="p-4 rounded-3xl border border-white/70 bg-gradient-to-b from-white/95 via-white/95 to-white/90 text-[12px] text-[#4C7567] leading-relaxed shadow-lg shadow-[#0E3B2D]/10 backdrop-blur-xl font-normal">
                {t.settings.storageInfo}
              </div>

              {/* Supabase Cloud Sync Card */}
              <div className="p-4 rounded-3xl border border-white/70 bg-gradient-to-b from-white/95 via-white/95 to-white/90 space-y-3 shadow-lg shadow-[#0E3B2D]/10 backdrop-blur-xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-[#E4F4ED] border border-[#BCE5D3] flex items-center justify-center text-[#187557]">
                      <Cloud className="w-4.5 h-4.5 stroke-[1.8]" />
                    </div>
                    <div>
                      <h4 className="text-[13.5px] font-semibold text-[#0D3528]">
                        Supabase Cloud Sync
                      </h4>
                      <p className="text-[11.5px] text-[#4C7567] font-normal">
                        {user && !user.isGuest
                          ? t.settings.cloudConnected
                          : t.settings.guestLocalOnly}
                      </p>
                    </div>
                  </div>

                  <span
                    className={`text-[10.5px] font-medium px-2.5 py-0.5 rounded-full border ${
                      user && !user.isGuest
                        ? "bg-[#E4F4ED] border-[#BCE5D3] text-[#14664D]"
                        : "bg-amber-50 border-amber-200/70 text-amber-800"
                    }`}
                  >
                    {user && !user.isGuest ? "Online" : "Local"}
                  </span>
                </div>

                {syncMessage && (
                  <div className="text-[11.5px] p-2.5 rounded-2xl bg-[#E4F4ED] border border-[#BCE5D3] text-[#14664D] font-medium animate-in fade-in">
                    {syncMessage}
                  </div>
                )}

                <button
                  type="button"
                  disabled={isSyncingCloud}
                  onClick={handleManualCloudSync}
                  className="w-full py-2.5 px-3 rounded-full border border-white/80 bg-white text-[#0D3528] hover:bg-[#E4F4ED]/50 text-[12px] font-medium flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-xs cursor-pointer"
                >
                  <RefreshCw
                    className={`w-3.5 h-3.5 stroke-[2] ${
                      isSyncingCloud
                        ? "animate-spin text-[#187557]"
                        : "text-[#187557]"
                    }`}
                  />
                  <span>
                    {isSyncingCloud
                      ? t.settings.syncing
                      : user && !user.isGuest
                        ? t.settings.syncNow
                        : t.settings.connectAccount}
                  </span>
                </button>
              </div>

              {/* Aksi Backup & Restore */}
              <div className="space-y-2.5">
                <button
                  type="button"
                  onClick={handleExportBackup}
                  className="flex w-full items-center justify-between rounded-3xl border border-white/70 bg-gradient-to-b from-white/95 via-white/95 to-white/90 p-4 text-left shadow-lg shadow-[#0E3B2D]/10 backdrop-blur-xl transition-all active:scale-[0.98] cursor-pointer"
                >
                  <div className="flex items-center gap-3 min-w-0 pr-2">
                    <Download className="h-4 w-4 text-[#187557] shrink-0 stroke-[1.8]" />
                    <div>
                      <p className="text-[13.5px] font-semibold text-[#0D3528]">
                        {t.settings.exportJsonTitle}
                      </p>
                      <p className="text-[11.5px] text-[#4C7567] font-normal">
                        {t.settings.exportJsonDesc}
                      </p>
                    </div>
                  </div>
                  <span className="text-[11px] font-medium px-3 py-1 rounded-full bg-[#E4F4ED] border border-[#BCE5D3] text-[#14664D]">
                    {t.settings.downloadBtn}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    hapticLight();
                    setShowSnapshotsModal(true);
                  }}
                  className="flex w-full items-center justify-between rounded-3xl border border-white/70 bg-gradient-to-b from-white/95 via-white/95 to-white/90 p-4 text-left shadow-lg shadow-[#0E3B2D]/10 backdrop-blur-xl transition-all active:scale-[0.98] cursor-pointer"
                >
                  <div className="flex items-center gap-3 min-w-0 pr-2">
                    <History className="h-4 w-4 text-[#187557] shrink-0 stroke-[1.8]" />
                    <div>
                      <p className="text-[13.5px] font-semibold text-[#0D3528]">
                        {t.settings.snapshotsTitle}
                      </p>
                      <p className="text-[11.5px] text-[#4C7567] font-normal">
                        {t.settings.snapshotsDesc}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-[#4C7567]/70 stroke-[1.8]" />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    hapticLight();
                    setShowRestoreModal(true);
                  }}
                  className="flex w-full items-center justify-between rounded-3xl border border-white/70 bg-gradient-to-b from-white/95 via-white/95 to-white/90 p-4 text-left shadow-lg shadow-[#0E3B2D]/10 backdrop-blur-xl transition-all active:scale-[0.98] cursor-pointer"
                >
                  <div className="flex items-center gap-3 min-w-0 pr-2">
                    <RotateCcw className="h-4 w-4 text-[#187557] shrink-0 stroke-[1.8]" />
                    <div>
                      <p className="text-[13.5px] font-semibold text-[#0D3528]">
                        {t.settings.restoreFileTitle}
                      </p>
                      <p className="text-[11.5px] text-[#4C7567] font-normal">
                        {t.settings.restoreFileDesc}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-[#4C7567]/70 stroke-[1.8]" />
                </button>
              </div>

              {/* Zona Bahaya */}
              <div className="pt-2 space-y-2.5">
                <p className="px-1 text-[11px] font-medium uppercase tracking-[0.14em] text-rose-100 drop-shadow-xs">
                  {t.settings.dangerZone}
                </p>

                {/* Reset Island Layout */}
                <button
                  type="button"
                  onClick={() => {
                    hapticWarning();
                    setIsResetConfirmOpen(true);
                  }}
                  className="flex w-full items-center justify-between rounded-3xl border border-white/70 bg-gradient-to-b from-white/95 via-white/95 to-white/90 p-4 text-left shadow-lg shadow-[#0E3B2D]/10 backdrop-blur-xl transition-all active:scale-[0.98] cursor-pointer"
                >
                  <div className="flex items-center gap-3 min-w-0 pr-2">
                    <Trash2 className="h-4 w-4 text-emerald-700 shrink-0 stroke-[1.8]" />
                    <div>
                      <p className="text-[13.5px] font-semibold text-emerald-900">
                        {t.settings.resetIslandTitle}
                      </p>
                      <p className="text-[11.5px] text-emerald-800/80 font-normal">
                        {t.settings.resetIslandDesc}
                      </p>
                    </div>
                  </div>
                  <span className="text-[10.5px] font-medium px-2.5 py-0.5 rounded-full bg-red-200/80 text-red-900">
                    Reset
                  </span>
                </button>

                {/* Permanent Account Deletion */}
                <button
                  type="button"
                  onClick={() => {
                    hapticWarning();
                    setIsDeleteAccountOpen(true);
                  }}
                  className="flex w-full items-center justify-between rounded-3xl  bg-red-700/90 p-4 text-left transition-all active:scale-[0.98] cursor-pointer shadow-xs"
                >
                  <div className="flex items-center gap-3 min-w-0 pr-2">
                    <ShieldAlert className="h-4 w-4 text-white shrink-0 stroke-[1.8]" />
                    <div>
                      <p className="text-[13.5px] font-semibold text-white">
                        {t.settings.deleteAccountTitle}
                      </p>
                      <p className="text-[11.5px] text-white/85 font-normal">
                        {t.settings.deleteAccountDesc}
                      </p>
                    </div>
                  </div>
                  <span className="text-[10.5px] font-semibold px-2.5 py-0.5 rounded-full bg-rose-200 text-red">
                    {t.settings.deleteBtn}
                  </span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Konfirmasi Reset Pulau */}
        {isResetConfirmOpen && (
          <div
            onClick={(e) => {
              if (e.target === e.currentTarget) setIsResetConfirmOpen(false);
            }}
            className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150 pointer-events-auto"
          >
            <div className="relative z-10 w-full max-w-[290px] rounded-3xl border border-white bg-white p-5 space-y-4 shadow-2xl text-center animate-in zoom-in-95 duration-150 font-urbanist text-[#0D3528]">
              <div className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-200 mx-auto flex items-center justify-center text-amber-700">
                <AlertTriangle className="w-5 h-5 stroke-[1.8]" />
              </div>
              <div>
                <h3 className="text-[15px] font-semibold text-[#0D3528] tracking-tight">
                  Konfirmasi Atur Ulang
                </h3>
                <p className="text-[12px] text-[#4C7567] mt-1 leading-relaxed font-normal">
                  Ketik kata{" "}
                  <span className="font-semibold text-rose-600">RESET</span>{" "}
                  untuk mereset tata letak pulau suaka.
                </p>
              </div>
              <input
                type="text"
                value={confirmInput}
                onChange={(e) => setConfirmInput(e.target.value)}
                placeholder="RESET"
                className="w-full px-3 py-2 rounded-xl bg-[#0D3528]/5 border border-[#0D3528]/15 text-[#0D3528] font-semibold text-center text-xs tracking-widest focus:outline-none focus:border-rose-500 uppercase"
                autoFocus
              />
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setIsResetConfirmOpen(false);
                    setConfirmInput("");
                  }}
                  className="py-2.5 rounded-full bg-white border border-[#0D3528]/15 text-[#4C7567] font-medium text-xs active:scale-95 transition-all cursor-pointer hover:bg-black/5"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleExecuteReset}
                  disabled={confirmInput.trim().toUpperCase() !== "RESET"}
                  className="py-2.5 rounded-full bg-rose-600 hover:bg-rose-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium text-xs active:scale-95 transition-all shadow-xs cursor-pointer"
                >
                  Reset Pulau
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Konfirmasi Hapus Akun & Data (Apple 5.1.1(v)) */}
        {isDeleteAccountOpen && (
          <div
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setIsDeleteAccountOpen(false);
                setDeleteAccountInput("");
              }
            }}
            className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150 pointer-events-auto"
          >
            <div className="relative z-10 w-full max-w-[300px] rounded-3xl border border-white bg-white p-5 space-y-4 shadow-2xl text-center animate-in zoom-in-95 duration-150 font-urbanist text-[#0D3528]">
              <div className="w-11 h-11 rounded-2xl bg-rose-50 border border-rose-200 mx-auto flex items-center justify-center text-rose-600">
                <ShieldAlert className="w-5 h-5 stroke-[1.8]" />
              </div>
              <div>
                <h3 className="text-[15px] font-semibold text-rose-900 tracking-tight">
                  Hapus Akun & Data Suaka
                </h3>
                <p className="text-[11.5px] text-rose-700/85 mt-1 leading-relaxed font-normal">
                  Tindakan ini permanen. Seluruh riwayat fokus, pohon suaka,
                  koin, dan data akun akan dihapus dari perangkat ini.
                </p>
                <p className="text-[11.5px] text-[#4C7567] mt-1.5 leading-relaxed font-normal">
                  Ketik kata{" "}
                  <span className="font-semibold text-rose-600">HAPUS</span>{" "}
                  untuk konfirmasi.
                </p>
              </div>
              <input
                type="text"
                value={deleteAccountInput}
                onChange={(e) => setDeleteAccountInput(e.target.value)}
                placeholder="HAPUS"
                className="w-full px-3 py-2 rounded-xl bg-[#0D3528]/5 border border-rose-300 text-rose-700 font-semibold text-center text-xs tracking-widest focus:outline-none focus:border-rose-600 uppercase"
                autoFocus
              />
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setIsDeleteAccountOpen(false);
                    setDeleteAccountInput("");
                  }}
                  className="py-2.5 rounded-full bg-white border border-[#0D3528]/15 text-[#4C7567] font-medium text-xs active:scale-95 transition-all cursor-pointer hover:bg-black/5"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleExecuteDeleteAccount}
                  disabled={deleteAccountInput.trim().toUpperCase() !== "HAPUS"}
                  className="py-2.5 rounded-full bg-rose-600 hover:bg-rose-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium text-xs active:scale-95 transition-all shadow-xs cursor-pointer"
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
    </>
  );
}
