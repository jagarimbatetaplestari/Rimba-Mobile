"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useGameStore } from "@/lib/game/useGameStore";
import { useAuthStore } from "@/lib/auth/useAuthStore";
import { GAME_CONFIG, detectLocalTimeOfDay } from "@/lib/game/config";
import { CanvasWrapper } from "@/components/canvas/CanvasWrapper";
import { MobileHeaderHUD } from "@/components/hud/MobileHeaderHUD";
import { MobileFocusCard } from "@/components/focus/MobileFocusCard";
import { NatureWorkshopSheet } from "@/components/workshop/NatureWorkshopSheet";
import { ObjectInspectModal } from "@/components/workshop/ObjectInspectModal";
import { FaunaDialogPopover } from "@/components/feedback/FaunaDialogPopover";
import { NotificationToast } from "@/components/feedback/NotificationToast";
import { StrictFocusGuard } from "@/components/focus/StrictFocusGuard";
import {
  SanctuaryJournalModal,
  JournalTab,
} from "@/components/modals/SanctuaryJournalModal";
import { ShareSnapshotModal } from "@/components/modals/ShareSnapshotModal";
import { SoundscapeModal } from "@/components/modals/SoundscapeModal";
import { DevDebugDrawer } from "@/components/feedback/DevDebugDrawer";
import { ZenFocusOverlay } from "@/components/focus/ZenFocusOverlay";
import { MobileOnboardingModal } from "@/components/modals/MobileOnboardingModal";
import {
  MobileProfileModal,
  ProfileTab,
} from "@/components/modals/MobileProfileModal";
import { MobileStatisticsModal } from "@/components/modals/MobileStatisticsModal";
import { MobileLeaderboardModal } from "@/components/modals/MobileLeaderboardModal";
import { MobileSettingsSheet } from "@/components/modals/MobileSettingsSheet";
import { syncMobileStatusBar } from "@/lib/mobile/nativeBridge";
import { setupBackgroundGuard } from "@/lib/mobile/backgroundTimerGuard";
import { getDailyQuestStatus } from "@/lib/game/quests";
import { evaluateAchievements } from "@/lib/game/achievements";
import { LoadingSanctuary } from "@/components/feedback/LoadingSanctuary";
import { toLocalDateString, calculateAnalytics } from "@/lib/game/analytics";
import {
  scheduleDailyStreakReminder,
  cancelDailyStreakReminder,
} from "@/lib/mobile/notificationManager";
import { usePreferencesStore } from "@/lib/settings/usePreferencesStore";

export default function RimbaDioramaApp() {
  const init = useGameStore((state) => state.init);
  const checkReclamation = useGameStore((state) => state.checkReclamation);
  const isInitialized = useGameStore((state) => state.isInitialized);
  const activeSession = useGameStore((state) => state.activeSession);
  const isTimeAuto = useGameStore((state) => state.isTimeAuto);
  const isZenMode = useGameStore((state) => state.isZenMode);
  const setZenMode = useGameStore((state) => state.setZenMode);
  const saveData = useGameStore((state) => state.saveData);

  // Unified Progression & Journal Modal State
  const [isJournalOpen, setIsJournalOpen] = useState(false);
  const [journalInitialTab, setJournalInitialTab] =
    useState<JournalTab>("quests");

  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isSoundscapeOpen, setIsSoundscapeOpen] = useState(false);
  const [isDevOpen, setIsDevOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [profileInitialTab, setProfileInitialTab] =
    useState<ProfileTab>("profile");
  const [isStatisticsOpen, setIsStatisticsOpen] = useState(false);
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isZenDimmed, setIsZenDimmed] = useState(false);

  // Smooth Crossfade Loading Overlay state
  const [showLoadingOverlay, setShowLoadingOverlay] = useState(true);
  const [isFadingOutLoading, setIsFadingOutLoading] = useState(false);

  useEffect(() => {
    if (isInitialized && showLoadingOverlay) {
      setIsFadingOutLoading(true);
      const timer = setTimeout(() => {
        setShowLoadingOverlay(false);
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [isInitialized, showLoadingOverlay]);

  // Unconditional Hard Failsafe: NEVER stay stuck on loading screen longer than 800ms
  useEffect(() => {
    const hardTimer = setTimeout(() => {
      setIsFadingOutLoading(true);
      const dismissTimer = setTimeout(() => {
        setShowLoadingOverlay(false);
      }, 350);
      return () => clearTimeout(dismissTimer);
    }, 800);
    return () => clearTimeout(hardTimer);
  }, []);

  // Auto-Zen Mode: Automatically activate immersive Zen Mode after 5s of cursor inactivity during active focus
  useEffect(() => {
    if (!activeSession) {
      if (isZenMode) setZenMode(false);
      setIsZenDimmed((prev) => (prev ? false : prev));
      return;
    }

    let dimTimeoutId: NodeJS.Timeout;
    let lastMoveMs = 0;

    const resetInactivity = () => {
      const now = Date.now();
      if (now - lastMoveMs < 300) return;
      lastMoveMs = now;

      setIsZenDimmed(false);
      clearTimeout(dimTimeoutId);

      // Peripheral dim at 15s of calm stillness (awakes instantly on touch)
      dimTimeoutId = setTimeout(() => {
        setIsZenDimmed(true);
      }, 15000);
    };

    // Initial 15s calm countdown
    dimTimeoutId = setTimeout(() => {
      setIsZenDimmed(true);
    }, 15000);

    window.addEventListener("pointermove", resetInactivity, { passive: true });
    window.addEventListener("keydown", resetInactivity);
    window.addEventListener("touchstart", resetInactivity, { passive: true });

    return () => {
      clearTimeout(dimTimeoutId);
      window.removeEventListener("pointermove", resetInactivity);
      window.removeEventListener("keydown", resetInactivity);
      window.removeEventListener("touchstart", resetInactivity);
    };
  }, [activeSession, isZenMode, setZenMode]);

  // Auto-sync timeOfDay every 60s when isTimeAuto is enabled
  useEffect(() => {
    if (!isTimeAuto) return;
    const syncTime = () => {
      const detected = detectLocalTimeOfDay();
      if (useGameStore.getState().timeOfDay !== detected) {
        useGameStore.setState({ timeOfDay: detected });
      }
    };
    const interval = setInterval(syncTime, 60000);
    return () => clearInterval(interval);
  }, [isTimeAuto]);

  // Initialize store, reclamation interval check, and background timer guard
  useEffect(() => {
    try {
      init();
      useAuthStore.getState().initAuth();
    } catch (err) {
      console.error("[Rimba] Failed during init():", err);
      useGameStore.setState({ isInitialized: true });
    }

    const safetyTimer = setTimeout(() => {
      if (!useGameStore.getState().isInitialized) {
        useGameStore.setState({ isInitialized: true });
      }
    }, 400);

    let interval: NodeJS.Timeout | null = null;
    try {
      interval = setInterval(() => {
        try {
          checkReclamation();
        } catch (e) {
          console.warn("[Rimba] checkReclamation error:", e);
        }
      }, GAME_CONFIG.reclamation.checkIntervalMs);
    } catch (err) {
      console.warn("[Rimba] interval setup error:", err);
    }

    let cleanupGuard = () => {};
    try {
      cleanupGuard = setupBackgroundGuard();
    } catch (err) {
      console.warn("[Rimba] setupBackgroundGuard error:", err);
    }

    return () => {
      clearTimeout(safetyTimer);
      if (interval) clearInterval(interval);
      cleanupGuard();
    };
  }, [init, checkReclamation]);

  // Smart Daily Streak Reminder: If user hasn't focused today, schedule evening reminder; if already focused, cancel reminder
  useEffect(() => {
    if (!isInitialized) return;

    try {
      const todayStr = toLocalDateString(new Date());
      const hasFocusedToday = (saveData.focus_sessions || []).some((s) => {
        if (!s.completed_at) return false;
        return toLocalDateString(new Date(s.completed_at)) === todayStr;
      });

      const analytics = calculateAnalytics(
        saveData.focus_sessions || [],
        new Date(),
        saveData.used_shield_dates || [],
      );
      const currentStreak = Math.max(1, analytics.currentStreak);
      const prefs = usePreferencesStore.getState();

      if (hasFocusedToday) {
        cancelDailyStreakReminder();
      } else {
        scheduleDailyStreakReminder(
          prefs.dailyReminderTime || "20:00",
          currentStreak,
        );
      }
    } catch (err) {
      console.warn("[Rimba] Smart streak reminder check error:", err);
    }
  }, [isInitialized, saveData.focus_sessions, saveData.used_shield_dates]);

  const timeOfDay = useGameStore((state) => state.timeOfDay);
  const isDay = timeOfDay === "day";
  const isSunset = timeOfDay === "sunset";
  const isNight = timeOfDay === "night";

  // First-time onboarding check & evaluation triggers
  useEffect(() => {
    if (typeof window !== "undefined") {
      const checkOnboarding = () => {
        const urlParams = new URLSearchParams(window.location.search);
        const forceOnboarding = urlParams.get("onboarding") === "true";
        const completed = localStorage.getItem("rimba_onboarding_completed");

        if (forceOnboarding || !completed) {
          setIsOnboardingOpen(true);
        }
      };

      checkOnboarding();

      const handleOpenOnboarding = () => {
        setIsOnboardingOpen(true);
      };

      window.addEventListener("rimba:open_onboarding", handleOpenOnboarding);
      (
        window as unknown as { openRimbaOnboarding?: () => void }
      ).openRimbaOnboarding = () => {
        setIsOnboardingOpen(true);
      };

      const handleOpenSettings = () => {
        setIsSettingsOpen(true);
      };
      window.addEventListener("rimba:open_settings", handleOpenSettings);
      (
        window as unknown as { openRimbaSettings?: () => void }
      ).openRimbaSettings = () => {
        setIsSettingsOpen(true);
      };

      const handleOpenProfile = () => {
        setIsProfileOpen(true);
      };
      window.addEventListener("rimba:open_profile", handleOpenProfile);
      (
        window as unknown as { openRimbaProfile?: () => void }
      ).openRimbaProfile = () => {
        setIsProfileOpen(true);
      };

      const handleOpenLeaderboard = () => {
        setIsLeaderboardOpen(true);
      };
      window.addEventListener("rimba:open_leaderboard", handleOpenLeaderboard);
      (
        window as unknown as { openRimbaLeaderboard?: () => void }
      ).openRimbaLeaderboard = () => {
        setIsLeaderboardOpen(true);
      };

      const handleOpenJournal = () => {
        setJournalInitialTab("quests");
        setIsJournalOpen(true);
      };
      window.addEventListener("rimba:open_journal", handleOpenJournal);

      const handleOpenStats = () => {
        setIsStatisticsOpen(true);
      };
      window.addEventListener("rimba:open_stats", handleOpenStats);

      return () => {
        window.removeEventListener(
          "rimba:open_onboarding",
          handleOpenOnboarding,
        );
        window.removeEventListener("rimba:open_settings", handleOpenSettings);
        window.removeEventListener("rimba:open_profile", handleOpenProfile);
        window.removeEventListener(
          "rimba:open_leaderboard",
          handleOpenLeaderboard,
        );
        window.removeEventListener("rimba:open_journal", handleOpenJournal);
        window.removeEventListener("rimba:open_stats", handleOpenStats);
      };
    }
  }, []);

  // Sync mobile status bar with atmosphere (day/night)
  useEffect(() => {
    syncMobileStatusBar(isNight);
  }, [isNight]);

  // Compute claimable quests and achievements for mobile dock badge
  const claimableCount = useMemo(() => {
    const quests = getDailyQuestStatus(saveData);
    const achs = evaluateAchievements(saveData);
    return quests.claimableCount + achs.unclaimedCount;
  }, [saveData]);

  const handleEnterZen = useCallback(() => {
    setZenMode(true);
  }, [setZenMode]);

  const mainThemeClass = isNight
    ? "night-mode text-slate-100"
    : isSunset
      ? "text-amber-50"
      : "text-[#1c5339]";

  return (
    <main
      className={`relative w-screen h-screen h-[100dvh] overflow-hidden select-none font-sans antialiased transition-colors duration-1000 ${mainThemeClass}`}
    >
      {/* ====================================================
          MODERN AMBIENT HORIZON BACKDROP (Zero-Jank GPU Accelerated)
          ==================================================== */}
      <div
        className="absolute inset-0 z-0 pointer-events-none overflow-hidden"
        aria-hidden="true"
      >
        {/* 1. Day Ambient Horizon (Morning Dew Sage with Sun Ray Shafts - Foto 1 Style) */}
        <div
          className={`absolute inset-0 transition-opacity duration-1000 ${
            isDay ? "opacity-100" : "opacity-0"
          }`}
          style={{
            background:
              "radial-gradient(135% 125% at 85% 10%, #D8ECDD 0%, #A9D1AD 30%, #76A680 66%, #527A59 100%)",
          }}
        >
          {/* Luminous Sun Origin Ambient Flare */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "radial-gradient(circle at 86% 10%, rgba(255, 255, 235, 0.72) 0%, rgba(255, 255, 255, 0.28) 28%, transparent 62%)",
            }}
          />
          {/* Island Pedestal Depth Vignette */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "radial-gradient(ellipse at 50% 55%, rgba(255, 255, 255, 0.14) 0%, transparent 68%)",
            }}
          />
        </div>

        {/* 2. Sunset Ambient Horizon */}
        <div
          className={`absolute inset-0 transition-opacity duration-1000 ${
            isSunset ? "opacity-100" : "opacity-0"
          }`}
          style={{
            background:
              "radial-gradient(135% 125% at 85% 12%, #FFE4CE 0%, #F19B82 32%, #95658B 68%, #312347 100%)",
          }}
        >
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "radial-gradient(circle at 84% 14%, rgba(255, 235, 210, 0.5) 0%, rgba(241, 155, 130, 0.18) 32%, transparent 65%)",
            }}
          />
        </div>

        {/* 3. Night Ambient Horizon (Midnight Velvet Sapphire & Deep Emerald) */}
        <div
          className={`absolute inset-0 transition-opacity duration-1000 ${
            isNight ? "opacity-100" : "opacity-0"
          }`}
          style={{
            background:
              "radial-gradient(135% 125% at 85% 12%, #294D58 0%, #1D3A3F 38%, #152B30 72%, #0E1F22 100%)",
          }}
        >
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "radial-gradient(circle at 82% 14%, rgba(212, 245, 230, 0.4) 0%, rgba(134, 215, 185, 0.14) 34%, transparent 64%)",
            }}
          />
        </div>

        {/* 4. God Rays / Sun Shafts streaming from upper-right down across diorama (Foto 1 Style) */}
        <div
          className="absolute inset-0 pointer-events-none overflow-hidden animate-god-ray"
          style={{
            opacity: isDay ? 0.85 : isSunset ? 0.6 : 0.22,
            transition: "opacity 1s ease",
          }}
        >
          <div
            className="absolute -top-[20%] -right-[20%] w-[160%] h-[160%]"
            style={{
              background:
                "repeating-linear-gradient(-52deg, rgba(255, 255, 235, 0.22) 0px, rgba(255, 255, 235, 0.22) 50px, rgba(255, 255, 255, 0.0) 90px, rgba(255, 255, 235, 0.14) 155px, rgba(255, 255, 255, 0.0) 235px, rgba(255, 255, 235, 0.18) 310px, rgba(255, 255, 255, 0.0) 390px)",
              maskImage:
                "radial-gradient(circle at 86% 12%, black 20%, rgba(0,0,0,0.55) 55%, transparent 88%)",
              WebkitMaskImage:
                "radial-gradient(circle at 86% 12%, black 20%, rgba(0,0,0,0.55) 55%, transparent 88%)",
            }}
          />
        </div>

        {/* 5. Dynamic Moving Light Motes & Fireflies (Foto 1 Living Drift) */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {[
            {
              id: 1,
              left: "12%",
              bottom: "4%",
              size: 3.2,
              driftX: 34,
              duration: 11,
              delay: 0,
              opacity: 0.8,
            },
            {
              id: 2,
              left: "22%",
              bottom: "2%",
              size: 2.2,
              driftX: -26,
              duration: 14,
              delay: 2.2,
              opacity: 0.65,
            },
            {
              id: 3,
              left: "35%",
              bottom: "10%",
              size: 4.2,
              driftX: 42,
              duration: 9.5,
              delay: 1.1,
              opacity: 0.9,
            },
            {
              id: 4,
              left: "48%",
              bottom: "6%",
              size: 2.0,
              driftX: -18,
              duration: 16,
              delay: 4.5,
              opacity: 0.55,
            },
            {
              id: 5,
              left: "62%",
              bottom: "12%",
              size: 3.6,
              driftX: 30,
              duration: 12,
              delay: 3.1,
              opacity: 0.85,
            },
            {
              id: 6,
              left: "76%",
              bottom: "4%",
              size: 4.5,
              driftX: -36,
              duration: 10,
              delay: 0.8,
              opacity: 0.95,
            },
            {
              id: 7,
              left: "88%",
              bottom: "15%",
              size: 2.6,
              driftX: 20,
              duration: 13,
              delay: 5.0,
              opacity: 0.7,
            },
            {
              id: 8,
              left: "16%",
              bottom: "28%",
              size: 3.0,
              driftX: -28,
              duration: 12.5,
              delay: 6.2,
              opacity: 0.75,
            },
            {
              id: 9,
              left: "30%",
              bottom: "22%",
              size: 2.2,
              driftX: 35,
              duration: 15,
              delay: 7.4,
              opacity: 0.6,
            },
            {
              id: 10,
              left: "68%",
              bottom: "32%",
              size: 4.0,
              driftX: -22,
              duration: 11.2,
              delay: 1.8,
              opacity: 0.85,
            },
            {
              id: 11,
              left: "82%",
              bottom: "25%",
              size: 3.2,
              driftX: 25,
              duration: 13.8,
              delay: 4.0,
              opacity: 0.8,
            },
            {
              id: 12,
              left: "44%",
              bottom: "38%",
              size: 2.4,
              driftX: -30,
              duration: 14.5,
              delay: 8.5,
              opacity: 0.7,
            },
            {
              id: 13,
              left: "72%",
              bottom: "44%",
              size: 3.6,
              driftX: 28,
              duration: 10.8,
              delay: 3.5,
              opacity: 0.85,
            },
            {
              id: 14,
              left: "26%",
              bottom: "48%",
              size: 2.0,
              driftX: -20,
              duration: 15.2,
              delay: 9.0,
              opacity: 0.65,
            },
            {
              id: 15,
              left: "90%",
              bottom: "40%",
              size: 4.2,
              driftX: -40,
              duration: 12.0,
              delay: 5.5,
              opacity: 0.9,
            },
          ].map((m) => (
            <div
              key={m.id}
              className="absolute rounded-full animate-mote pointer-events-none"
              style={{
                left: m.left,
                bottom: m.bottom,
                width: `${m.size}px`,
                height: `${m.size}px`,
                backgroundColor: isNight
                  ? "#BAE6FD"
                  : isSunset
                    ? "#FED7AA"
                    : "#FEF9C3",
                boxShadow: isNight
                  ? "0 0 8px #7DD3FC"
                  : isSunset
                    ? "0 0 8px #FDBA74"
                    : "0 0 10px rgba(254, 240, 138, 0.9)",
                ["--mote-duration" as any]: `${m.duration}s`,
                ["--mote-delay" as any]: `${m.delay}s`,
                ["--mote-drift-x" as any]: `${m.driftX}px`,
                ["--mote-max-op" as any]: m.opacity,
              }}
            />
          ))}
        </div>

        {/* 6. Bottom Vignette Soft Tint */}
        <div
          className="absolute inset-x-0 bottom-0 h-44 pointer-events-none"
          style={{
            background:
              "linear-gradient(to top, rgba(14, 40, 28, 0.45) 0%, transparent 100%)",
          }}
        />
      </div>

      {/* 3D Isometric Diorama Island Scene */}
      <div className="absolute inset-0 z-10 overflow-hidden pointer-events-auto">
        <CanvasWrapper />
      </div>

      {/* Zen Focus Mode Curtain */}
      <ZenFocusOverlay />

      {/* Floating Apple Liquid Glass HUD & Ergonomic Controls Layer */}
      <div
        className={`fixed inset-0 pointer-events-none z-30 flex flex-col justify-between transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          isZenMode
            ? "opacity-0 scale-[0.98] pointer-events-none"
            : "opacity-100 scale-100"
        }`}
      >
        {/* Top Floating Island Header */}
        <div className="w-full pointer-events-none flex flex-col items-center pt-[env(safe-area-inset-top,0.5rem)] px-3">
          <MobileHeaderHUD
            isZenDimmed={isZenDimmed}
            onOpenProfile={() => {
              setProfileInitialTab("profile");
              setIsProfileOpen(true);
            }}
            onOpenStats={() => setIsStatisticsOpen(true)}
            onOpenJournal={() => {
              setJournalInitialTab("quests");
              setIsJournalOpen(true);
            }}
            onOpenLeaderboard={() => setIsLeaderboardOpen(true)}
            onOpenShare={() => setIsShareOpen(true)}
            onOpenWorkshop={() => {
              window.dispatchEvent(new CustomEvent("rimba:open_workshop"));
            }}
            onOpenSoundscapes={() => setIsSoundscapeOpen(true)}
            onOpenSettings={() => setIsSettingsOpen(true)}
            onOpenOnboarding={() => setIsOnboardingOpen(true)}
            claimableCount={claimableCount}
          />
        </div>

        {/* Spatial Utility Controls */}
        <div className="w-full pointer-events-none relative">
          <NatureWorkshopSheet />
        </div>

        {/* Bottom Cockpit Layer */}
        <MobileFocusCard
          onEnterZen={handleEnterZen}
          claimableCount={claimableCount}
        />
      </div>

      {/* Interactive Overlays & Modals */}
      <ObjectInspectModal />
      <FaunaDialogPopover />
      <NotificationToast />

      {/* Growth & Retention Layer: Strict Guard & Unified Journal Modal */}
      <StrictFocusGuard />
      <SanctuaryJournalModal
        isOpen={isJournalOpen}
        onClose={() => setIsJournalOpen(false)}
        initialTab={journalInitialTab}
      />
      <ShareSnapshotModal
        isOpen={isShareOpen}
        onClose={() => setIsShareOpen(false)}
      />
      <SoundscapeModal
        isOpen={isSoundscapeOpen}
        onClose={() => setIsSoundscapeOpen(false)}
      />
      <DevDebugDrawer
        isOpen={isDevOpen}
        onClose={() => setIsDevOpen(false)}
        onOpenOnboarding={() => {
          setIsDevOpen(false);
          setIsOnboardingOpen(true);
        }}
      />

      {/* Mobile Special Drawers & Onboarding */}
      <MobileProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        initialTab={profileInitialTab}
        onOpenLeaderboard={() => setIsLeaderboardOpen(true)}
      />
      <MobileStatisticsModal
        isOpen={isStatisticsOpen}
        onClose={() => setIsStatisticsOpen(false)}
      />
      <MobileLeaderboardModal
        isOpen={isLeaderboardOpen}
        onClose={() => setIsLeaderboardOpen(false)}
      />
      <MobileSettingsSheet
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onOpenProfile={() => {
          setIsSettingsOpen(false);
          setIsProfileOpen(true);
        }}
      />
      <MobileOnboardingModal
        isOpen={isOnboardingOpen}
        onComplete={() => {
          if (typeof window !== "undefined") {
            localStorage.setItem("rimba_onboarding_completed", "true");
            if (window.location.search.includes("onboarding=")) {
              const url = new URL(window.location.href);
              url.searchParams.delete("onboarding");
              window.history.replaceState(
                {},
                "",
                url.pathname + (url.search ? url.search : ""),
              );
            }
          }
          setIsOnboardingOpen(false);
        }}
      />

      {/* Smooth Crossfade Loading Overlay */}
      {showLoadingOverlay && (
        <LoadingSanctuary
          message="Cultivating Sanctuary"
          subMessage="Nurturing flora & calm focus..."
          fullScreen={true}
          isFadingOut={isFadingOutLoading}
        />
      )}
    </main>
  );
}
