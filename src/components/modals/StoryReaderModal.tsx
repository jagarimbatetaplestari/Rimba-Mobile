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

        {/* Top Control Bar (Clean solid badges, no glass) */}
        <div className="flex items-center justify-between">
          {/* Chapter Pill Badge */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/80 border border-white/15 shadow-md">
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
            className="w-9 h-9 rounded-full flex items-center justify-center bg-black/80 hover:bg-black active:scale-90 transition-all border border-white/15 text-white shadow-md cursor-pointer"
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

      {/* FLOATING SIDE CHEVRON BUTTONS (Clean solid buttons, no glass) */}
      <div className="absolute inset-y-0 left-2 z-20 flex items-center pointer-events-none">
        {currentIndex > 0 && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handlePrev();
            }}
            className="pointer-events-auto w-10 h-10 rounded-full flex items-center justify-center bg-black/75 hover:bg-black active:scale-90 transition-all border border-white/15 text-white shadow-md cursor-pointer"
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
            className={`pointer-events-auto w-10 h-10 rounded-full flex items-center justify-center transition-all border shadow-md cursor-pointer ${
              unlockedMap[currentIndex + 1]
                ? "bg-black/75 hover:bg-black active:scale-90 border-white/15 text-white"
                : "bg-black/40 border-white/10 text-white/40 cursor-not-allowed"
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

      {/* BOTTOM CONTENT: Editorial Text Overlaid Directly on Artwork (No Glass Card) */}
      <div className="relative z-20 pb-safe px-5 pb-6 flex flex-col gap-3 max-w-lg mx-auto w-full">
        <div className="flex flex-col gap-2.5 text-left">
          {/* Subtitle & Badge */}
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-300 drop-shadow-sm">
              {trChapter.subtitle}
            </span>

            {/* Claim Reward Pill / Claimed Badge */}
            {isClaimed ? (
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-600/90 border border-emerald-400/30 text-[10.5px] font-medium text-white flex items-center gap-1 shadow-sm">
                <Check className="w-3 h-3 stroke-[2.5]" /> {t.journal.claimed}
              </span>
            ) : isUnlocked ? (
              <button
                type="button"
                onClick={handleClaim}
                className="px-3 py-1 rounded-full bg-[#187557] hover:bg-[#126046] text-white font-bold text-xs shadow-md flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer animate-pulse"
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
              <span className="text-[10px] text-white/80 bg-black/60 px-2.5 py-0.5 rounded-md border border-white/15">
                {progressText}
              </span>
            )}
          </div>

          {/* Chapter Main Title */}
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight leading-snug drop-shadow-md">
            {trChapter.title}
          </h2>

          {/* Narration Paragraph */}
          <p className="text-[13px] text-white/95 leading-relaxed font-normal tracking-wide drop-shadow-sm">
            {trChapter.narration}
          </p>

          {/* Quote Block (No Glass - Clean Editorial Left Border Accent) */}
          <div className="border-l-2 border-emerald-400/80 pl-3 py-1 mt-1 flex items-start gap-2">
            <Quote className="w-3.5 h-3.5 text-emerald-300 shrink-0 mt-0.5 opacity-90" />
            <p className="text-[12px] text-emerald-100 italic font-medium leading-relaxed drop-shadow-sm">
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
