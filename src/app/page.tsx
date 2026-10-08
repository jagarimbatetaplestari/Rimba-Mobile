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
import { MobileProfileModal, ProfileTab } from "@/components/modals/MobileProfileModal";
import { MobileStatisticsModal } from "@/components/modals/MobileStatisticsModal";
import { MobileLeaderboardModal } from "@/components/modals/MobileLeaderboardModal";
import { MobileSettingsSheet } from "@/components/modals/MobileSettingsSheet";
import { syncMobileStatusBar } from "@/lib/mobile/nativeBridge";
import { setupBackgroundGuard } from "@/lib/mobile/backgroundTimerGuard";
import { getDailyQuestStatus } from "@/lib/game/quests";
import { evaluateAchievements } from "@/lib/game/achievements";
import { LoadingSanctuary } from "@/components/feedback/LoadingSanctuary";

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
  const [profileInitialTab, setProfileInitialTab] = useState<ProfileTab>("profile");
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
          BIOPHILIC SOFT SAGE ATMOSPHERIC BACKGROUND SYSTEM
          ==================================================== */}
      <div
        className="absolute inset-0 z-0 pointer-events-none overflow-hidden"
        aria-hidden="true"
      >
        {/* 1. Base Gradient Canvas (Pastel Sage-Mint ala Forest & Apple) */}
        <div
          className={`absolute inset-0 transition-opacity duration-1000 ${
            isDay ? "opacity-100" : "opacity-0"
          }`}
          style={{
            background:
              "linear-gradient(180deg, #82ac94 0%, #75a288 45%, #649377 100%)",
          }}
        />

        {/* Sunset Soft Peach-Honey Canvas */}
        <div
          className={`absolute inset-0 transition-opacity duration-1000 ${
            isSunset ? "opacity-100" : "opacity-0"
          }`}
          style={{
            background:
              "linear-gradient(180deg, #d98a6c 0%, #be6c4e 45%, #8f4732 100%)",
          }}
        />

        {/* Night Velvet Emerald-Navy Canvas */}
        <div
          className={`absolute inset-0 transition-opacity duration-1000 ${
            isNight ? "opacity-100" : "opacity-0"
          }`}
          style={{
            background:
              "linear-gradient(180deg, #041f17 0%, #031812 50%, #010f0b 100%)",
          }}
        />

        {/* 2. Top-Right Soft Ambient Warm Sun Glow (Siang Hari) */}
        <div
          className={`absolute -top-24 -right-16 w-[420px] h-[420px] rounded-full pointer-events-none transition-opacity duration-1000 ${
            isDay ? "opacity-100" : "opacity-0"
          }`}
          style={{
            background:
              "radial-gradient(circle, rgba(255, 255, 235, 0.45) 0%, rgba(255, 255, 255, 0.15) 45%, transparent 75%)",
            filter: "blur(40px)",
          }}
        />

        {/* 3. Volumetric Sun Rays / God Rays (Angling from Top Right to Center) */}
        <div
          className={`absolute inset-0 pointer-events-none transition-opacity duration-1000 mix-blend-screen ${
            isDay ? "opacity-35" : "opacity-0"
          }`}
          style={{
            background: `
              conic-gradient(from 196deg at 90% 4%,
                transparent 0deg,
                rgba(255, 255, 255, 0.55) 5deg,
                transparent 12deg,
                rgba(255, 255, 255, 0.45) 18deg,
                transparent 25deg,
                rgba(255, 255, 255, 0.6) 32deg,
                transparent 45deg
              )
            `,
            filter: "blur(14px)",
          }}
        />

        {/* Additional Diagonal Light Streaks */}
        <div
          className={`absolute inset-0 pointer-events-none transition-opacity duration-1000 mix-blend-overlay ${
            isDay ? "opacity-30" : "opacity-0"
          }`}
          style={{
            background:
              "linear-gradient(132deg, rgba(255, 255, 255, 0.4) 0%, rgba(255, 255, 255, 0.15) 35%, transparent 65%)",
          }}
        />

        {/* 4. Island Center Soft Glow Pedestal (Memberikan kedalaman diorama) */}
        <div
          className={`absolute inset-0 transition-opacity duration-1000 pointer-events-none ${
            isDay ? "opacity-100" : "opacity-0"
          }`}
          style={{
            background:
              "radial-gradient(ellipse at 50% 50%, rgba(255, 255, 255, 0.18) 0%, transparent 60%)",
          }}
        />

        {/* 5. Floating Dust Motes & Ambient Sparkles */}
        <div
          className={`absolute inset-0 pointer-events-none transition-opacity duration-1000 ${
            isDay ? "opacity-100" : "opacity-0"
          }`}
        >
          {/* Sparkle 1 */}
          <div
            className="absolute top-[28%] left-[22%] w-1.5 h-1.5 rounded-full bg-white/70 shadow-[0_0_8px_white] animate-pulse"
            style={{ animationDuration: "3.2s" }}
          />
          {/* Sparkle 2 */}
          <div
            className="absolute top-[34%] right-[28%] w-1 h-1 rounded-full bg-white/60 shadow-[0_0_6px_white] animate-pulse"
            style={{ animationDuration: "2.4s" }}
          />
          {/* Sparkle 3 */}
          <div
            className="absolute top-[22%] right-[38%] w-1.5 h-1.5 rounded-full bg-white/80 shadow-[0_0_10px_white] animate-pulse"
            style={{ animationDuration: "4s" }}
          />
          {/* Sparkle 4 */}
          <div
            className="absolute top-[42%] left-[34%] w-1 h-1 rounded-full bg-white/50 shadow-[0_0_6px_white] animate-pulse"
            style={{ animationDuration: "3.6s" }}
          />
          {/* Sparkle 5 */}
          <div
            className="absolute top-[26%] left-[45%] w-1 h-1 rounded-full bg-white/60 shadow-[0_0_6px_white] animate-pulse"
            style={{ animationDuration: "2.8s" }}
          />
        </div>

        {/* Bottom Ambient Vignette Tint (Membuat bottom cockpit terbaca jelas) */}
        <div
          className="absolute inset-x-0 bottom-0 h-48 pointer-events-none"
          style={{
            background:
              "linear-gradient(to top, rgba(74, 114, 91, 0.35) 0%, transparent 100%)",
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
        <MobileFocusCard onEnterZen={handleEnterZen} />
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
