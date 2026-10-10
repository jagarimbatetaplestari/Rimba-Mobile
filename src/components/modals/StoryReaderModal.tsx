"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Image from "next/image";
import { STORY_CHAPTERS, StoryChapter } from "@/lib/game/storyLore";
import { useGameStore } from "@/lib/game/useGameStore";
import { useTranslation } from "@/lib/i18n/translations";
import { soundManager } from "@/lib/audio/sounds";
import {
  hapticLight,
  hapticMedium,
  hapticWarning,
  hapticSuccess,
} from "@/lib/mobile/nativeBridge";
import {
  X,
  ChevronLeft,
  ChevronRight,
  Lock,
  Check,
  Sparkles,
  Quote,
  Sprout,
  Droplets,
  Trees,
  HeartHandshake,
  Compass,
} from "lucide-react";

interface StoryReaderModalProps {
  isOpen: boolean;
  initialChapterIndex?: number;
  onClose: () => void;
  onClaimReward?: (chapterId: string) => void;
}

export function StoryReaderModal({
  isOpen,
  initialChapterIndex = 0,
  onClose,
  onClaimReward,
}: StoryReaderModalProps) {
  const { t, language, translateChapter } = useTranslation();
  const saveData = useGameStore((state) => state.saveData);
  const claimStoryChapter = useGameStore((state) => state.claimStoryChapter);
  const notify = useGameStore((state) => state.notify);

  const [currentIndex, setCurrentIndex] = useState<number>(initialChapterIndex);

  // Sync initial chapter when modal opens
  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(
        Math.max(0, Math.min(initialChapterIndex, STORY_CHAPTERS.length - 1)),
      );
    }
  }, [isOpen, initialChapterIndex]);

  const currentChapter = STORY_CHAPTERS[currentIndex] || STORY_CHAPTERS[0];
  const trChapter = translateChapter(currentChapter);

  const claimedSet = useMemo(
    () => new Set(saveData.claimed_story_chapters || []),
    [saveData.claimed_story_chapters],
  );

  const { isUnlocked, progressText } = currentChapter.checkUnlocked(saveData);
  const isClaimed = claimedSet.has(currentChapter.id);

  // Check which chapters are unlocked for navigation boundary
  const unlockedMap = useMemo(() => {
    return STORY_CHAPTERS.map((ch) => ch.checkUnlocked(saveData).isUnlocked);
  }, [saveData]);

  const handlePrev = useCallback(() => {
    if (currentIndex > 0) {
      soundManager.playPop();
      hapticLight();
      setCurrentIndex((prev) => prev - 1);
    }
  }, [currentIndex]);

  const handleNext = useCallback(() => {
    if (currentIndex < STORY_CHAPTERS.length - 1) {
      const nextUnlocked = unlockedMap[currentIndex + 1];
      if (nextUnlocked) {
        soundManager.playPop();
        hapticLight();
        setCurrentIndex((prev) => prev + 1);
      } else {
        hapticWarning();
        notify(
          language === "en"
            ? `Chapter ${currentIndex + 2} is still locked. ${STORY_CHAPTERS[currentIndex + 1].unlockDescription}`
            : `Bab ${currentIndex + 2} masih terkunci. ${STORY_CHAPTERS[currentIndex + 1].unlockDescription}`,
          "info",
        );
      }
    }
  }, [currentIndex, unlockedMap, notify, language]);

  // Keyboard navigation (Arrow keys & Escape)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        handlePrev();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        handleNext();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, handlePrev, handleNext]);

  if (!isOpen) return null;

  const renderIcon = (iconName: string) => {
    switch (iconName) {
      case "Sprout":
        return <Sprout className="w-4 h-4" />;
      case "Droplets":
        return <Droplets className="w-4 h-4" />;
      case "Trees":
        return <Trees className="w-4 h-4" />;
      case "HeartHandshake":
        return <HeartHandshake className="w-4 h-4" />;
      case "Compass":
        return <Compass className="w-4 h-4" />;
      case "Sparkles":
        return <Sparkles className="w-4 h-4" />;
      default:
        return <Sprout className="w-4 h-4" />;
    }
  };

  const handleClaim = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onClaimReward) {
      onClaimReward(currentChapter.id);
    } else {
      claimStoryChapter(currentChapter.id);
      soundManager.playLevelUp();
      hapticSuccess();
      notify(
        language === "en"
          ? `Claimed +${currentChapter.reward.gold} Soul & +${currentChapter.reward.xp} XP!`
          : `Mengklaim +${currentChapter.reward.gold} Soul & +${currentChapter.reward.xp} XP!`,
        "success",
      );
    }
  };

  return (
    <div
      className="fixed inset-0 z-[120] flex flex-col justify-between overflow-hidden bg-black select-none text-white animate-in fade-in duration-300"
      style={{
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', var(--font-geist-sans), sans-serif",
      }}
    >
      {/* BACKGROUND IMAGE WITH SUBTLE KEN BURNS / FADE TRANSITION */}
      <div className="absolute inset-0 z-0">
        <Image
          src={currentChapter.image}
          alt={trChapter.title}
          fill
          priority
          sizes="100vw"
          className="object-cover object-center transition-all duration-700 scale-100"
        />
        {/* Cinematic Vignette & Bottom Scrim Gradients for text legibility */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-black/60 pointer-events-none" />
        <div className="absolute inset-0 bg-radial-gradient from-transparent via-transparent to-black/40 pointer-events-none" />
      </div>

      {/* TOP HEADER: Progress Segments, Chapter Emblem, Close Button */}
      <div className="relative z-20 pt-safe px-4 pt-3 flex flex-col gap-3">
        {/* Story Segment Bars */}
        <div className="flex items-center gap-1.5 w-full">
          {STORY_CHAPTERS.map((ch, idx) => {
            const isPast = idx < currentIndex;
            const isCurrent = idx === currentIndex;
            const isLocked = !unlockedMap[idx];

            return (
              <button
                key={ch.id}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (!isLocked) {
                    soundManager.playPop();
                    hapticLight();
                    setCurrentIndex(idx);
                  } else {
                    hapticWarning();
                    notify(
                      language === "en"
                        ? `Chapter ${idx + 1} is locked.`
                        : `Bab ${idx + 1} terkunci.`,
                      "info",
                    );
                  }
                }}
                className="h-1 flex-1 rounded-full overflow-hidden transition-all relative cursor-pointer"
                title={`${t.journal.chapterPrefix} ${idx + 1}: ${ch.title}`}
              >
                <div
                  className={`h-full w-full rounded-full transition-all duration-300 ${
                    isCurrent
                      ? "bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]"
                      : isPast
                        ? "bg-emerald-400/80"
                        : isLocked
                          ? "bg-white/20"
                          : "bg-white/45"
                  }`}
                />
              </button>
            );
          })}
        </div>

        {/* Top Control Bar */}
        <div className="flex items-center justify-between">
          {/* Chapter Pill Badge */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/40 backdrop-blur-xl border border-white/20 shadow-lg">
            <span className="text-emerald-300">
              {renderIcon(currentChapter.icon)}
            </span>
            <span className="text-xs font-semibold tracking-wide uppercase text-white/95">
              {t.journal.chapterPrefix} {currentChapter.chapterNumber} ·{" "}
              {trChapter.title}
            </span>
          </div>

          {/* Close Button */}
          <button
            type="button"
            onClick={() => {
              soundManager.playPop();
              hapticLight();
              onClose();
            }}
            className="w-9 h-9 rounded-full flex items-center justify-center bg-black/40 hover:bg-black/60 active:scale-90 transition-all border border-white/25 text-white shadow-lg cursor-pointer backdrop-blur-xl"
            aria-label={t.journal.closeStory}
          >
            <X className="w-4 h-4 stroke-[2.2]" />
          </button>
        </div>
      </div>

      {/* INVISIBLE TAP ZONES FOR PREV / NEXT NAVIGATION (Zen Reader) */}
      <div className="absolute inset-y-16 inset-x-0 z-10 flex">
        {/* Left Tap Zone (Previous Chapter) */}
        <div
          onClick={handlePrev}
          className="w-1/3 h-full cursor-pointer select-none"
          title={t.journal.prevChapter}
        />
        {/* Center Zone (Read / Idle) */}
        <div className="w-1/3 h-full select-none" />
        {/* Right Tap Zone (Next Chapter) */}
        <div
          onClick={handleNext}
          className="w-1/3 h-full cursor-pointer select-none"
          title={t.journal.nextChapter}
        />
      </div>

      {/* FLOATING SIDE CHEVRON BUTTONS (Accessible & Intuitive) */}
      <div className="absolute inset-y-0 left-2 z-20 flex items-center pointer-events-none">
        {currentIndex > 0 && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handlePrev();
            }}
            className="pointer-events-auto w-10 h-10 rounded-full flex items-center justify-center bg-black/35 hover:bg-black/55 active:scale-90 transition-all border border-white/20 text-white backdrop-blur-lg shadow-xl cursor-pointer"
            aria-label={t.journal.prevChapter}
          >
            <ChevronLeft className="w-5 h-5 stroke-[2.2]" />
          </button>
        )}
      </div>

      <div className="absolute inset-y-0 right-2 z-20 flex items-center pointer-events-none">
        {currentIndex < STORY_CHAPTERS.length - 1 && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleNext();
            }}
            className={`pointer-events-auto w-10 h-10 rounded-full flex items-center justify-center transition-all border backdrop-blur-lg shadow-xl cursor-pointer ${
              unlockedMap[currentIndex + 1]
                ? "bg-black/35 hover:bg-black/55 active:scale-90 border-white/20 text-white"
                : "bg-black/25 border-white/10 text-white/40 cursor-not-allowed"
            }`}
            aria-label={t.journal.nextChapter}
          >
            {unlockedMap[currentIndex + 1] ? (
              <ChevronRight className="w-5 h-5 stroke-[2.2]" />
            ) : (
              <Lock className="w-4 h-4 stroke-[2]" />
            )}
          </button>
        )}
      </div>

      {/* BOTTOM CONTENT CARD: Apple Liquid Glass Editorial Layout */}
      <div className="relative z-20 pb-safe px-5 pb-6 flex flex-col gap-3 max-w-lg mx-auto w-full">
        <div className="rounded-[28px] p-5 bg-gradient-to-b from-white/18 via-black/40 to-black/75 backdrop-blur-2xl border border-white/30 shadow-[0_16px_40px_rgba(0,0,0,0.5)] flex flex-col gap-3 relative overflow-hidden text-left">
          {/* Subtle Sheen reflection */}
          <div className="absolute inset-x-0 top-0 h-12 bg-gradient-to-b from-white/20 to-transparent pointer-events-none rounded-t-[28px]" />

          {/* Subtitle & Badge */}
          <div className="flex items-center justify-between gap-2 relative z-10">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-300">
              {trChapter.subtitle}
            </span>

            {/* Claim Reward Pill / Claimed Badge */}
            {isClaimed ? (
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/25 border border-emerald-400/40 text-[10.5px] font-medium text-emerald-200 flex items-center gap-1">
                <Check className="w-3 h-3 stroke-[2.5]" /> {t.journal.claimed}
              </span>
            ) : isUnlocked ? (
              <button
                type="button"
                onClick={handleClaim}
                className="px-3 py-1 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold text-xs shadow-md shadow-emerald-500/30 flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer animate-pulse"
              >
                <Sparkles className="w-3.5 h-3.5 fill-current" />
                <span>
                  {t.journal.claimBtn.replace(
                    "{soul}",
                    String(currentChapter.reward.gold),
                  )}
                </span>
              </button>
            ) : (
              <span className="text-[10px] text-white/60 bg-white/10 px-2 py-0.5 rounded-md border border-white/15">
                {progressText}
              </span>
            )}
          </div>

          {/* Chapter Main Title */}
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight leading-snug drop-shadow-md relative z-10">
            {trChapter.title}
          </h2>

          {/* Narration Paragraph */}
          <p className="text-[13px] text-white/90 leading-relaxed font-normal tracking-wide relative z-10">
            {trChapter.narration}
          </p>

          {/* Quote Card */}
          <div className="p-3 rounded-2xl bg-white/10 border border-white/20 backdrop-blur-md flex items-start gap-2.5 relative z-10">
            <Quote className="w-4 h-4 text-emerald-300 shrink-0 mt-0.5 opacity-80" />
            <p className="text-[12px] text-emerald-100 italic font-medium leading-relaxed">
              &ldquo;{trChapter.quote}&rdquo;
            </p>
          </div>
        </div>

        {/* Footer Hint */}
        <p className="text-center text-[10.5px] text-white/50 font-medium">
          {language === "en"
            ? "Tap right to advance · Tap left to go back"
            : "Ketuk kanan untuk lanjut · Ketuk kiri untuk kembali"}
        </p>
      </div>
    </div>
  );
}
