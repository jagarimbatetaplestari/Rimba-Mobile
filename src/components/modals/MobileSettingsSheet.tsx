"use client";

import React, { useState, useEffect } from "react";
import { useAuthStore } from "@/lib/auth/useAuthStore";
import { useGameStore } from "@/lib/game/useGameStore";
import { soundManager } from "@/lib/audio/sounds";
import { musicPlayer, RIMBA_PLAYLIST } from "@/lib/audio/musicPlayer";
import { usePreferencesStore } from "@/lib/settings/usePreferencesStore";
import {
  hapticLight,
  hapticMedium,
  hapticSuccess,
  hapticWarning,
  isNativeMobile,
  openDeviceAppSettings,
} from "@/lib/mobile/nativeBridge";
import {
  scheduleDailyStreakReminder,
  cancelDailyStreakReminder,
  checkOrRequestNotificationPermission,
  triggerTestNotification,
} from "@/lib/mobile/notificationManager";
import { LocalNotifications } from "@capacitor/local-notifications";
import {
  downloadSaveDataBackup,
  createIslandSnapshot,
} from "@/lib/game/backupManager";
import { createInitialSaveData, saveSaveData } from "@/lib/game/storage";
import { SoundscapeModal } from "@/components/modals/SoundscapeModal";
import { RestoreDataModal } from "@/components/modals/RestoreDataModal";
import { SnapshotsHistoryModal } from "@/components/modals/SnapshotsHistoryModal";
import { LegalModal } from "@/components/modals/LegalModal";
import { AvatarPickerModal } from "@/components/modals/AvatarPickerModal";
import { RangerAvatar } from "@/components/ui/RangerAvatar";
import { uploadGameSaveToCloud } from "@/lib/supabase/cloudSync";
import { useTranslation } from "@/lib/i18n/translations";
import { usePwaInstall } from "@/lib/mobile/usePwaInstall";
import {
  BIOME_CATALOG,
  CELESTIAL_ISLAND_LEVEL_REQUIRED,
  detectRealWorldSeasonBiome,
} from "@/lib/game/config";
import { getLevelFromXp } from "@/lib/game/levelRules";
import {
  Music,
  Volume2,
  VolumeX,
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
  Shield,
  ShieldAlert,
  ShieldCheck,
  FileText,
  Cloud,
  RefreshCw,
  Globe,
  Compass,
  Check,
  Lock,
  Sparkles,
  Calendar,
  Camera,
  Image as ImageIcon,
  ExternalLink,
  Sun,
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
  const { canInstall, promptInstall } = usePwaInstall();

  const profile = saveData?.profile || { xp: 0, goldCached: 0 };
  const isPro = saveData?.subscription?.isPro ?? false;
  const currentLevel = getLevelFromXp(profile?.xp || 0);

  const activeBiome = useGameStore((state) => state.activeBiome);
  const setActiveBiome = useGameStore((state) => state.setActiveBiome);
  const isBiomeUnlocked = useGameStore((state) => state.isBiomeUnlocked);
  const isAutoSeason = useGameStore((state) => state.isAutoSeason);
  const setAutoSeason = useGameStore((state) => state.setAutoSeason);
  const devFastMode = useGameStore((state) => state.devFastMode);
  const currentSeasonBiome = detectRealWorldSeasonBiome();

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
  const [showLegalModal, setShowLegalModal] = useState(false);
  const [legalTab, setLegalTab] = useState<"privacy" | "terms">("privacy");
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [notifPermState, setNotifPermState] = useState<"granted" | "denied" | "prompt">("prompt");
  const [testNotifSent, setTestNotifSent] = useState(false);
  const [isTestingNotif, setIsTestingNotif] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setCurrentView("main");
      if (typeof window !== "undefined") {
        if (isNativeMobile()) {
          LocalNotifications.checkPermissions()
            .then((status) => {
              if (status.display === "granted") {
                setNotifPermState("granted");
                prefs.setHasNotificationPermission(true);
              } else if (status.display === "denied") {
                setNotifPermState("denied");
                prefs.setHasNotificationPermission(false);
              } else {
                setNotifPermState("prompt");
              }
            })
            .catch(() => {});
        } else if ("Notification" in window) {
          if (Notification.permission === "granted") {
            setNotifPermState("granted");
            prefs.setHasNotificationPermission(true);
          } else if (Notification.permission === "denied") {
            setNotifPermState("denied");
            prefs.setHasNotificationPermission(false);
          } else {
            setNotifPermState("prompt");
          }
        }
      }
    }
  }, [isOpen]);

  const handleTestNotification = async () => {
    soundManager.playPop();
    hapticMedium();
    setIsTestingNotif(true);
    const granted = await checkOrRequestNotificationPermission();
    if (granted) {
      setNotifPermState("granted");
      const sent = await triggerTestNotification();
      setIsTestingNotif(false);
      if (sent) {
        setTestNotifSent(true);
        soundManager.playComplete();
        hapticSuccess();
        setTimeout(() => setTestNotifSent(false), 5000);
      }
    } else {
      setIsTestingNotif(false);
      setNotifPermState("denied");
      soundManager.playError();
      hapticWarning();
    }
  };

  const handleOpenSystemSettings = async () => {
    soundManager.playPop();
    hapticLight();
    const opened = await openDeviceAppSettings();
    if (!opened) {
      alert(
        lang === "en"
          ? "To adjust permissions, open device Settings -> Rimba -> enable Notifications, Photos, or Camera."
          : "Untuk mengubah izin, buka menu Pengaturan HP Anda -> Rimba -> aktifkan Notifikasi, Foto, atau Kamera."
      );
    }
  };

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
        className="fixed inset-0 z-[100] h-[100dvh] w-full overflow-y-auto overscroll-contain no-scrollbar select-none antialiased font-urbanist text-[#0D3528] pointer-events-auto bg-[#FAFAF7]"
        role="dialog"
        aria-modal="true"
      >
        <div className="w-full max-w-md mx-auto px-5 safe-modal-content space-y-4">
          {/* HEADER NAV */}
          <div className="flex items-center justify-between py-1">
            {currentView === "storage" ? (
              <button
                type="button"
                onClick={() => {
                  hapticLight();
                  setCurrentView("main");
                }}
                className="flex items-center gap-1.5 text-[15px] font-semibold text-[#0D3528] transition-colors cursor-pointer active:scale-95 py-1"
              >
                <ChevronLeft className="w-5 h-5 stroke-[2]" />
                <span>{t.settings.title}</span>
              </button>
            ) : (
              <div className="flex items-center gap-2.5">
                <h2 className="text-[23px] font-semibold tracking-normal text-[#0D3528]">
                  {t.settings.title}
                </h2>
                <span className="rounded-full bg-[#E4F4ED] border border-[#BCE5D3] px-3 py-0.5 text-[11.5px] font-medium text-[#14664D]">
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
              className="flex h-9 w-9 items-center justify-center rounded-full bg-[#0D3528]/5 border border-[#0D3528]/10 text-[#0D3528] shadow-xs active:scale-90 transition-transform hover:bg-[#0D3528]/10 cursor-pointer"
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
                <p className="px-1 text-[12px] font-medium uppercase tracking-[0.12em] text-[#4C7567] flex items-center gap-1.5">
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
                <p className="px-1 text-[12px] font-medium uppercase tracking-[0.12em] text-[#4C7567]">
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

                {/* Rimba Pro / Sanctuary Pass Banner */}
                <button
                  type="button"
                  onClick={() => {
                    hapticLight();
                    if (typeof window !== "undefined") {
                      window.dispatchEvent(
                        new CustomEvent("rimba:open_paywall", {
                          detail: { source: "settings" },
                        })
                      );
                    }
                  }}
                  className="w-full p-3.5 rounded-3xl border border-white/80 bg-gradient-to-r from-amber-400/20 via-emerald-400/15 to-white/95 text-[#0D3528] shadow-lg shadow-[#0E3B2D]/10 backdrop-blur-xl flex items-center justify-between transition-all active:scale-[0.98] cursor-pointer text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-center shrink-0 shadow-xs">
                      <Sparkles className="w-5 h-5 fill-slate-950" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[13.5px] font-bold text-[#0D3528]">
                          {isPro ? "Rimba Pro Active" : "Rimba Pro Pass"}
                        </span>
                        <span className="text-[9.5px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 shadow-2xs">
                          {isPro ? "Pro ✨" : "Upgrade"}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#4C7567] mt-0.5">
                        {isPro
                          ? (lang === "en" ? "5 Island Slots • Real Trees Pledged" : "Kapasitas 5 Pulau • Pohon Nyata Terdaftar")
                          : (lang === "en" ? "Unlock 5 islands, peace of mind & real trees" : "Buka 5 pulau, proteksi libur, dan tanam pohon nyata")}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-[#4C7567]/70" />
                </button>
              </div>

              {/* ====================================================
                  2. SUARA & GETARAN (BENTO TOP)
                  ==================================================== */}
              {/* ====================================================
                  2. SUARA & GETARAN (AUDIO & HAPTICS)
                  ==================================================== */}
              <div className="space-y-2">
                <p className="px-1 text-[12px] font-medium uppercase tracking-[0.12em] text-[#4C7567]">
                  {t.settings.soundSection}
                </p>

                {/* Master Audio Switch */}
                <div className="rounded-3xl border border-white/70 bg-gradient-to-b from-white/95 via-white/95 to-white/90 p-3.5 shadow-lg shadow-[#0E3B2D]/10 backdrop-blur-xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-[#E4F4ED] border border-[#BCE5D3] flex items-center justify-center text-[#187557] shrink-0">
                      {prefs.masterAudioEnabled ? (
                        <Volume2 className="w-4 h-4 stroke-[2]" />
                      ) : (
                        <VolumeX className="w-4 h-4 stroke-[2]" />
                      )}
                    </div>
                    <div className="text-left">
                      <p className="text-[13px] font-semibold text-[#0D3528]">
                        {t.settings.masterAudioTitle}
                      </p>
                      <p className="text-[11px] text-[#4C7567] font-normal">
                        {t.settings.masterAudioDesc}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={prefs.masterAudioEnabled}
                    onClick={() => {
                      hapticLight();
                      const next = !prefs.masterAudioEnabled;
                      prefs.setMasterAudioEnabled(next);
                      if (!next) {
                        musicPlayer.stop();
                      } else {
                        if (prefs.ambientMusicEnabled) {
                          musicPlayer.setVolume(
                            (prefs.ambientMusicVolume || 50) / 100,
                          );
                          musicPlayer.togglePlay();
                        }
                      }
                    }}
                    className={`relative w-11 h-6 shrink-0 rounded-full p-0.5 transition-colors duration-200 cursor-pointer ${
                      prefs.masterAudioEnabled
                        ? "bg-[#187557]"
                        : "bg-[#0D3528]/15"
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full bg-white shadow-xs transition-transform duration-200 ${
                        prefs.masterAudioEnabled
                          ? "translate-x-5"
                          : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>

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
                          prefs.ambientMusicEnabled && prefs.masterAudioEnabled
                            ? "bg-[#187557]"
                            : "bg-[#0D3528]/15"
                        }`}
                      >
                        <div
                          className={`w-5 h-5 rounded-full bg-white shadow-xs transition-transform duration-200 ${
                            prefs.ambientMusicEnabled && prefs.masterAudioEnabled
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
                            prefs.soundFxEnabled && prefs.masterAudioEnabled
                              ? "bg-[#187557]"
                              : "bg-[#0D3528]/15"
                          }`}
                        >
                          <div
                            className={`w-4 h-4 rounded-full bg-white shadow-xs transition-transform duration-200 ${
                              prefs.soundFxEnabled && prefs.masterAudioEnabled
                                ? "translate-x-4"
                                : "translate-x-0"
                            }`}
                          />
                        </button>
                      </div>

                      {/* SFX Volume Slider */}
                      <div className="flex items-center gap-1.5 pt-2 w-full min-w-0 overflow-hidden">
                        <Volume2 className="h-3 w-3 shrink-0 text-[#4C7567] stroke-[1.8]" />
                        <div className="flex-1 min-w-0 flex items-center">
                          <input
                            type="range"
                            min="0"
                            max="100"
                            value={prefs.soundFxVolume ?? 80}
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              prefs.setSoundFxVolume(val);
                            }}
                            className="w-full min-w-0 h-1 accent-[#187557] bg-[#0D3528]/10 rounded-full cursor-pointer appearance-none"
                            style={{ width: "100%", minWidth: 0 }}
                          />
                        </div>
                        <span className="shrink-0 text-[10px] font-medium text-[#4C7567] tabular-nums">
                          {prefs.soundFxVolume ?? 80}%
                        </span>
                      </div>
                    </div>

                    {/* Getaran Haptik */}
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

                      {/* Haptic Intensity Pills */}
                      <div className="grid grid-cols-3 gap-1 pt-2">
                        {(["light", "medium", "heavy"] as const).map((lvl) => (
                          <button
                            key={lvl}
                            type="button"
                            onClick={() => {
                              prefs.setHapticIntensity(lvl);
                              if (lvl === "light") hapticLight();
                              else if (lvl === "medium") hapticMedium();
                              else hapticSuccess();
                            }}
                            className={`py-1 rounded-xl text-[10.5px] font-semibold transition-all cursor-pointer ${
                              prefs.hapticIntensity === lvl
                                ? "bg-[#187557] text-white shadow-2xs"
                                : "bg-[#0D3528]/6 text-[#4C7567] hover:bg-[#0D3528]/10"
                            }`}
                          >
                            {lvl === "light"
                              ? lang === "en" ? "Light" : "Ringan"
                              : lvl === "medium"
                              ? lang === "en" ? "Med" : "Sedang"
                              : lang === "en" ? "Strong" : "Kuat"}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* ====================================================
                  TEMA SUAKA & BIOMA (Progressive Themes)
                  ==================================================== */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between px-1">
                  <p className="text-[12px] font-medium uppercase tracking-[0.12em] text-[#4C7567]">
                    {lang === "en" ? "Island Theme & Biome" : "Tema Suaka (Bioma)"}
                  </p>
                  <span className="text-[11px] font-medium text-[#14664D] bg-[#E4F4ED] px-2.5 py-0.5 rounded-full border border-[#BCE5D3]">
                    {BIOME_CATALOG.find((b) => b.id === activeBiome)?.icon}{" "}
                    {lang === "en"
                      ? BIOME_CATALOG.find((b) => b.id === activeBiome)?.nameEn
                      : BIOME_CATALOG.find((b) => b.id === activeBiome)?.name}
                  </span>
                </div>

                <div className="rounded-3xl border border-white/70 bg-gradient-to-b from-white/95 via-white/95 to-white/90 p-4 shadow-lg shadow-[#0E3B2D]/10 backdrop-blur-xl space-y-3">
                  {/* Selector Grid for Unlocked Biomes */}
                  <div className="grid grid-cols-4 gap-1.5 p-1 rounded-2xl bg-[#0D3528]/6">
                    {BIOME_CATALOG.map((biome) => {
                      const isUnlocked = isBiomeUnlocked(biome.id);
                      const isActive = activeBiome === biome.id;

                      return (
                        <button
                          key={biome.id}
                          type="button"
                          onClick={() => {
                            if (!isUnlocked) {
                              soundManager.playError();
                              hapticWarning();
                              return;
                            }
                            soundManager.playComplete();
                            hapticSuccess();
                            setActiveBiome(biome.id, true);
                          }}
                          className={`flex flex-col items-center py-2 px-1 rounded-xl transition-all cursor-pointer relative ${
                            isActive
                              ? "bg-white shadow-xs text-[#0D3528] font-bold"
                              : isUnlocked
                                ? "text-[#4C7567] hover:text-[#0D3528] font-medium"
                                : "text-stone-400 opacity-50 cursor-not-allowed"
                          }`}
                        >
                          <span className="text-base">{biome.icon}</span>
                          <span className="text-[11px] mt-0.5 truncate max-w-[64px]">
                            {lang === "en" ? biome.nameEn.split(" ")[0] : biome.name.split(" ")[0]}
                          </span>
                          {!isUnlocked && (
                            <span className="text-[9px] text-stone-400 font-normal">
                              Lv.{biome.levelRequired}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Auto-Season Toggle in Settings */}
                  <div className="flex items-center justify-between pt-1 border-t border-[#0D3528]/8">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-[#187557] stroke-[1.8]" />
                      <div className="text-left">
                        <p className="text-[12.5px] font-semibold text-[#0D3528]">
                          {lang === "en" ? "Sync Real-World Season" : "Ikuti Musim Nyata (Auto-Season)"}
                        </p>
                        <p className="text-[10.5px] text-[#4C7567] font-normal">
                          {lang === "en"
                            ? "Automatically sets island biome based on global season"
                            : "Sesuaikan tema pulau otomatis berdasarkan bulan kalender"}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      role="switch"
                      aria-checked={isAutoSeason}
                      onClick={() => {
                        hapticLight();
                        setAutoSeason(!isAutoSeason);
                      }}
                      className={`relative w-11 h-6 shrink-0 rounded-full p-0.5 transition-colors duration-200 cursor-pointer ${
                        isAutoSeason ? "bg-[#187557]" : "bg-[#0D3528]/15"
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded-full bg-white shadow-xs transition-transform duration-200 ${
                          isAutoSeason ? "translate-x-5" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>

              {/* ====================================================
                  3. KUALITAS GRAFIS & BATERAI
                  ==================================================== */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between px-1">
                  <p className="text-[12px] font-medium uppercase tracking-[0.12em] text-[#4C7567]">
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
                  4. IZIN & AKSES PERANGKAT (DEVICE PERMISSIONS & PRIVACY)
                  ==================================================== */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between px-1">
                  <p className="text-[12px] font-medium uppercase tracking-[0.12em] text-[#4C7567] flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>{t.settings.permissionsSection}</span>
                  </p>
                  <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100/90 px-2.5 py-0.5 rounded-full border border-emerald-300 shadow-2xs">
                    iOS & Android
                  </span>
                </div>

                <div className="rounded-3xl border border-white/70 bg-gradient-to-b from-white/95 via-white/95 to-white/90 p-4 shadow-lg shadow-[#0E3B2D]/10 backdrop-blur-xl space-y-3">
                  {/* Row 1: Izin Notifikasi */}
                  <div className="flex flex-col gap-2 pb-3 border-b border-[#0D3528]/8">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5 min-w-0 pr-2">
                        <div className="w-8 h-8 rounded-xl bg-[#E4F4ED] border border-[#BCE5D3] flex items-center justify-center text-[#187557] shrink-0">
                          <Bell className="w-4 h-4 stroke-[2]" />
                        </div>
                        <div className="text-left min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-[13px] font-semibold text-[#0D3528]">
                              {t.settings.notifTitle}
                            </span>
                            <span
                              className={`text-[9.5px] font-bold px-2 py-0.5 rounded-full border ${
                                notifPermState === "granted"
                                  ? "bg-emerald-50 text-emerald-800 border-emerald-200/80"
                                  : "bg-amber-50 text-amber-800 border-amber-200/80"
                              }`}
                            >
                              {notifPermState === "granted"
                                ? t.settings.permGranted
                                : t.settings.permDenied}
                            </span>
                          </div>
                          <p className="text-[11px] text-[#4C7567] font-normal mt-0.5 truncate">
                            {t.settings.notifDesc}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        role="switch"
                        aria-checked={prefs.notifyDailyReminder}
                        onClick={() =>
                          handleToggleDailyReminder(!prefs.notifyDailyReminder)
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

                    {/* Sub-row: Waktu Pengingat & Tombol Uji Notifikasi */}
                    <div className="flex items-center justify-between pt-1 gap-2 flex-wrap">
                      <label className="relative flex items-center gap-1.5 rounded-full border border-white/90 bg-white/80 px-3 py-1 text-[11px] font-medium text-[#0D3528] shadow-2xs cursor-pointer hover:border-[#187557]/40 transition-colors">
                        <Clock className="h-3 w-3 shrink-0 text-[#187557] stroke-[1.8]" />
                        <span className="text-[#4C7567]">{t.settings.timeLabel}:</span>
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

                      <button
                        type="button"
                        disabled={isTestingNotif}
                        onClick={handleTestNotification}
                        className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#187557]/10 hover:bg-[#187557]/15 border border-[#187557]/20 text-[#187557] text-[11px] font-semibold active:scale-95 transition-all cursor-pointer"
                      >
                        <Bell className="w-3 h-3 stroke-[2]" />
                        <span>{isTestingNotif ? "Mengirim..." : t.settings.notifTestBtn}</span>
                      </button>
                    </div>

                    {testNotifSent && (
                      <p className="text-[10.5px] text-emerald-700 font-medium bg-emerald-50 px-2.5 py-1 rounded-xl border border-emerald-200/70 animate-in fade-in">
                        ✨ {t.settings.notifTestSuccess}
                      </p>
                    )}
                  </div>

                  {/* Row 2: Izin Kamera & Galeri Foto */}
                  <div className="flex flex-col gap-2 pb-3 border-b border-[#0D3528]/8">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5 min-w-0 pr-2">
                        <div className="w-8 h-8 rounded-xl bg-[#E4F4ED] border border-[#BCE5D3] flex items-center justify-center text-[#187557] shrink-0">
                          <Camera className="w-4 h-4 stroke-[2]" />
                        </div>
                        <div className="text-left min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-[13px] font-semibold text-[#0D3528]">
                              {t.settings.cameraTitle}
                            </span>
                            <span className="text-[9.5px] font-bold px-2 py-0.5 rounded-full border bg-emerald-50 text-emerald-800 border-emerald-200/80">
                              {t.settings.permGranted}
                            </span>
                          </div>
                          <p className="text-[11px] text-[#4C7567] font-normal mt-0.5">
                            {t.settings.cameraDesc} &amp; {t.settings.photoGalleryDesc}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-end pt-0.5">
                      <button
                        type="button"
                        onClick={() => {
                          hapticLight();
                          soundManager.playPop();
                          setShowAvatarPicker(true);
                        }}
                        className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white hover:bg-black/5 border border-[#0D3528]/15 text-[#0D3528] text-[11px] font-semibold shadow-2xs active:scale-95 transition-all cursor-pointer"
                      >
                        <ImageIcon className="w-3.5 h-3.5 text-[#187557] stroke-[2]" />
                        <span>{t.settings.avatarTestBtn}</span>
                        <ChevronRight className="w-3 h-3 text-[#4C7567]" />
                      </button>
                    </div>
                  </div>

                  {/* Row 3: Layar Tetap Menyala (Screen Wake Lock) */}
                  <div className="flex items-center justify-between pb-3 border-b border-[#0D3528]/8">
                    <div className="flex items-center gap-2.5 min-w-0 pr-2">
                      <div className="w-8 h-8 rounded-xl bg-[#E4F4ED] border border-[#BCE5D3] flex items-center justify-center text-[#187557] shrink-0">
                        <Sun className="w-4 h-4 stroke-[2]" />
                      </div>
                      <div className="text-left min-w-0">
                        <p className="text-[13px] font-semibold text-[#0D3528]">
                          {t.settings.wakeLockTitle}
                        </p>
                        <p className="text-[11px] text-[#4C7567] font-normal mt-0.5">
                          {t.settings.wakeLockDesc}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      role="switch"
                      aria-checked={prefs.keepScreenAwake}
                      onClick={() => {
                        hapticLight();
                        prefs.setKeepScreenAwake(!prefs.keepScreenAwake);
                      }}
                      className={`relative w-11 h-6 shrink-0 rounded-full p-0.5 transition-colors duration-200 cursor-pointer ${
                        prefs.keepScreenAwake
                          ? "bg-[#187557]"
                          : "bg-[#0D3528]/15"
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded-full bg-white shadow-xs transition-transform duration-200 ${
                          prefs.keepScreenAwake
                            ? "translate-x-5"
                            : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>

                  {/* Row 4: Pintasan Pengaturan Sistem HP */}
                  <div className="pt-1 flex items-center justify-between">
                    <div className="text-left pr-2">
                      <p className="text-[12px] font-semibold text-[#0D3528]">
                        {t.settings.openAppSettingsBtn}
                      </p>
                      <p className="text-[10.5px] text-[#4C7567] font-normal mt-0.5 leading-tight">
                        {t.settings.openAppSettingsHint}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleOpenSystemSettings}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-[#187557] hover:bg-[#136147] text-white text-[11px] font-semibold shrink-0 shadow-xs active:scale-95 transition-all cursor-pointer"
                    >
                      <span>Buka</span>
                      <ExternalLink className="w-3 h-3 stroke-[2.2]" />
                    </button>
                  </div>
                </div>
              </div>

              {/* ====================================================
                  5. CADANGAN & PENYIMPANAN DATA (CLOUD & LOCAL STORAGE)
                  ==================================================== */}
              <div className="space-y-1.5">
                <p className="px-1 text-[12px] font-medium uppercase tracking-[0.12em] text-[#4C7567]">
                  {t.settings.backupRestore}
                </p>

                <div className="grid grid-cols-2 gap-3 w-full">
                  {/* Bento Kiri: Cadangan & Pemulihan */}
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

                  {/* Bento Kanan: Sinkronisasi Cloud Langsung */}
                  <button
                    type="button"
                    disabled={isSyncingCloud}
                    onClick={handleManualCloudSync}
                    className="group flex flex-col justify-between rounded-3xl border border-white/70 bg-gradient-to-b from-white/95 via-white/95 to-white/90 p-4 text-left shadow-lg shadow-[#0E3B2D]/10 backdrop-blur-xl transition-all active:scale-[0.98] cursor-pointer min-w-0"
                  >
                    <div className="flex items-center justify-between w-full">
                      <Cloud className="h-4 w-4 text-[#187557] shrink-0 stroke-[1.8]" />
                      <RefreshCw
                        className={`h-4 w-4 text-[#4C7567]/70 stroke-[1.8] ${
                          isSyncingCloud ? "animate-spin text-[#187557]" : ""
                        }`}
                      />
                    </div>

                    <div className="mt-3">
                      <p className="text-[13.5px] font-semibold text-[#0D3528]">
                        {isSyncingCloud ? t.settings.syncing : t.settings.syncNow}
                      </p>
                      <p className="mt-1 text-[11.5px] leading-snug text-[#4C7567] font-normal">
                        {user && !user.isGuest
                          ? t.settings.cloudConnected
                          : t.settings.guestLocalOnly}
                      </p>
                    </div>
                  </button>
                </div>

                {syncMessage && (
                  <p className="text-[11px] text-center font-medium text-emerald-800 bg-emerald-100/80 px-3 py-1.5 rounded-2xl border border-emerald-300 shadow-2xs mt-1 animate-in fade-in">
                    {syncMessage}
                  </p>
                )}
              </div>

              {/* ====================================================
                  5. TENTANG & LEGAL (PRIVACY & TERMS)
                  ==================================================== */}
              <div className="space-y-1.5 pt-1">
                <p className="px-1 text-[12px] font-medium uppercase tracking-[0.12em] text-[#4C7567]">
                  {lang === "en" ? "About & Legal" : "Tentang & Legal"}
                </p>

                <div className="rounded-3xl border border-white/70 bg-gradient-to-b from-white/95 via-white/95 to-white/90 p-1.5 shadow-lg shadow-[#0E3B2D]/10 backdrop-blur-xl divide-y divide-[#0D3528]/8">
                  {/* Kebijakan Privasi */}
                  <button
                    type="button"
                    onClick={() => {
                      hapticLight();
                      soundManager.playPop();
                      setLegalTab("privacy");
                      setShowLegalModal(true);
                    }}
                    className="w-full flex items-center justify-between p-3 text-left hover:bg-black/5 rounded-2xl transition-all cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-[#E4F4ED] border border-[#BCE5D3] flex items-center justify-center text-[#187557]">
                        <Shield className="w-4 h-4 stroke-[2]" />
                      </div>
                      <div>
                        <p className="text-[13px] font-semibold text-[#0D3528]">
                          {lang === "en" ? "Privacy Policy" : "Kebijakan Privasi"}
                        </p>
                        <p className="text-[11px] text-[#4C7567] font-normal">
                          {lang === "en"
                            ? "Local-first sovereignty & data protection"
                            : "Kedaulatan data lokal & keamanan"}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-[#4C7567]/70 stroke-[1.8]" />
                  </button>

                  {/* Syarat & Ketentuan */}
                  <button
                    type="button"
                    onClick={() => {
                      hapticLight();
                      soundManager.playPop();
                      setLegalTab("terms");
                      setShowLegalModal(true);
                    }}
                    className="w-full flex items-center justify-between p-3 text-left hover:bg-black/5 rounded-2xl transition-all cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-[#E4F4ED] border border-[#BCE5D3] flex items-center justify-center text-[#187557]">
                        <FileText className="w-4 h-4 stroke-[2]" />
                      </div>
                      <div>
                        <p className="text-[13px] font-semibold text-[#0D3528]">
                          {lang === "en" ? "Terms of Service" : "Syarat & Ketentuan"}
                        </p>
                        <p className="text-[11px] text-[#4C7567] font-normal">
                          {lang === "en"
                            ? "App guidelines & virtual assets"
                            : "Aturan suaka & aset virtual"}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-[#4C7567]/70 stroke-[1.8]" />
                  </button>

                  {/* Pasang PWA di Layar Utama */}
                  {canInstall && (
                    <button
                      type="button"
                      onClick={async () => {
                        hapticSuccess();
                        soundManager.playPop();
                        await promptInstall();
                      }}
                      className="w-full flex items-center justify-between p-3 text-left bg-gradient-to-r from-[#187557]/10 via-emerald-500/10 to-teal-500/10 hover:from-[#187557]/20 hover:to-emerald-500/20 rounded-2xl transition-all cursor-pointer border border-[#187557]/25 shadow-xs"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-[#187557] text-white flex items-center justify-center shadow-xs">
                          <Download className="w-4 h-4 stroke-[2.2]" />
                        </div>
                        <div>
                          <p className="text-[13px] font-bold text-[#0D3528]">
                            {lang === "en"
                              ? "Install Rimba App"
                              : "Pasang Aplikasi Rimba"}
                          </p>
                          <p className="text-[11px] text-[#4C7567] font-normal">
                            {lang === "en"
                              ? "Full screen & instant offline launch"
                              : "Layar penuh & buka instan offline"}
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-[#187557] stroke-[2]" />
                    </button>
                  )}

                  {/* Versi Aplikasi */}
                  <div className="flex items-center justify-between px-3 py-2 text-xs">
                    <span className="text-[#4C7567] font-medium">
                      Rimba Mobile
                    </span>
                    <span className="font-semibold text-[#187557] bg-[#E4F4ED] px-2 py-0.5 rounded-full border border-[#BCE5D3] text-[10.5px]">
                      v0.2.0 (Stable)
                    </span>
                  </div>
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
            className="fixed inset-0 z-[115] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150 pointer-events-auto"
          >
            <div className="relative z-10 w-full max-w-[290px] rounded-3xl border border-white bg-white p-5 space-y-4 shadow-2xl text-center animate-in zoom-in-95 duration-150 font-urbanist text-[#0D3528]">
              <div className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-200 mx-auto flex items-center justify-center text-amber-700">
                <AlertTriangle className="w-5 h-5 stroke-[1.8]" />
              </div>
              <div>
                <h3 className="text-[15px] font-semibold text-[#0D3528] tracking-tight">
                  {lang === "en" ? "Confirm Island Reset" : "Konfirmasi Atur Ulang"}
                </h3>
                <p className="text-[12px] text-[#4C7567] mt-1 leading-relaxed font-normal">
                  {lang === "en" ? (
                    <>
                      Type the word{" "}
                      <span className="font-semibold text-rose-600">RESET</span>{" "}
                      to reset the sanctuary island layout.
                    </>
                  ) : (
                    <>
                      Ketik kata{" "}
                      <span className="font-semibold text-rose-600">RESET</span>{" "}
                      untuk mereset tata letak pulau suaka.
                    </>
                  )}
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
                  {t.common.cancel}
                </button>
                <button
                  type="button"
                  onClick={handleExecuteReset}
                  disabled={confirmInput.trim().toUpperCase() !== "RESET"}
                  className="py-2.5 rounded-full bg-rose-600 hover:bg-rose-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium text-xs active:scale-95 transition-all shadow-xs cursor-pointer"
                >
                  {lang === "en" ? "Reset Island" : "Reset Pulau"}
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
            className="fixed inset-0 z-[115] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150 pointer-events-auto"
          >
            <div className="relative z-10 w-full max-w-[300px] rounded-3xl border border-white bg-white p-5 space-y-4 shadow-2xl text-center animate-in zoom-in-95 duration-150 font-urbanist text-[#0D3528]">
              <div className="w-11 h-11 rounded-2xl bg-rose-50 border border-rose-200 mx-auto flex items-center justify-center text-rose-600">
                <ShieldAlert className="w-5 h-5 stroke-[1.8]" />
              </div>
              <div>
                <h3 className="text-[15px] font-semibold text-rose-900 tracking-tight">
                  {lang === "en" ? "Delete Account & Sanctuary Data" : "Hapus Akun & Data Suaka"}
                </h3>
                <p className="text-[11.5px] text-rose-700/85 mt-1 leading-relaxed font-normal">
                  {lang === "en"
                    ? "This action is permanent. All focus history, sanctuary trees, coins, and account data will be wiped from this device."
                    : "Tindakan ini permanen. Seluruh riwayat fokus, pohon suaka, koin, dan data akun akan dihapus dari perangkat ini."}
                </p>
                <p className="text-[11.5px] text-[#4C7567] mt-1.5 leading-relaxed font-normal">
                  {lang === "en" ? (
                    <>
                      Type the word{" "}
                      <span className="font-semibold text-rose-600">DELETE</span>{" "}
                      to confirm.
                    </>
                  ) : (
                    <>
                      Ketik kata{" "}
                      <span className="font-semibold text-rose-600">HAPUS</span>{" "}
                      untuk konfirmasi.
                    </>
                  )}
                </p>
              </div>
              <input
                type="text"
                value={deleteAccountInput}
                onChange={(e) => setDeleteAccountInput(e.target.value)}
                placeholder={lang === "en" ? "DELETE" : "HAPUS"}
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
                  {t.common.cancel}
                </button>
                <button
                  type="button"
                  onClick={handleExecuteDeleteAccount}
                  disabled={
                    deleteAccountInput.trim().toUpperCase() !== "HAPUS" &&
                    deleteAccountInput.trim().toUpperCase() !== "DELETE"
                  }
                  className="py-2.5 rounded-full bg-rose-600 hover:bg-rose-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium text-xs active:scale-95 transition-all shadow-xs cursor-pointer"
                >
                  {lang === "en" ? "Delete All" : "Hapus Semua"}
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
        <LegalModal
          isOpen={showLegalModal}
          initialTab={legalTab}
          onClose={() => setShowLegalModal(false)}
        />
        <AvatarPickerModal
          isOpen={showAvatarPicker}
          onClose={() => setShowAvatarPicker(false)}
          currentAvatarUrl={user?.avatarUrl || profile?.avatarUrl}
        />
      </div>
    </>
  );
}
