"use client";

import React from "react";
import { ShareAspectRatio } from "./types";

export interface SanctuaryCardProps {
  aspectRatio: ShareAspectRatio;
  language: string;
  favoriteTreeSpecies: string;
  totalHoursNum: number;
  totalMinutes: number;
  regionalBonusHours: number;
  mostFocusedDay: string;
  peakWindowLabel: string;
}

export interface SanctuaryCanvasOptions {
  width: number;
  height: number;
  aspectRatio: ShareAspectRatio;
  language: string;
  favoriteTreeSpecies: string;
  totalHoursNum: number;
  totalMinutes: number;
  regionalBonusHours: number;
  mostFocusedDay: string;
  peakWindowLabel: string;
}

export async function drawSanctuaryCardCanvas(
  ctx: CanvasRenderingContext2D,
  opts: SanctuaryCanvasOptions,
): Promise<void> {
  const {
    width,
    height,
    aspectRatio,
    language,
    favoriteTreeSpecies,
    totalHoursNum,
    totalMinutes,
    regionalBonusHours,
    mostFocusedDay,
    peakWindowLabel,
  } = opts;

  // 1. Full-Bleed Background Photo (sharecard.webp) - Cropped from very bottom
  await new Promise<void>((resolve) => {
    const img = new Image();
    img.onload = () => {
      const imgAspect = img.width / img.height;
      const targetAspect = width / height;
      let sx = 0,
        sy = 0,
        sw = img.width,
        sh = img.height;
      if (imgAspect > targetAspect) {
        sw = img.height * targetAspect;
        sx = (img.width - sw) / 2;
        sy = 0;
      } else {
        sh = img.width / targetAspect;
        sx = 0;
        // USER DIRECTIVE: Crop from the very bottom, NOT center!
        sy = Math.max(0, img.height - sh);
      }
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, width, height);
      resolve();
    };
    img.onerror = () => resolve();
    img.src = "/sharecard.webp";
  });

  // 2. Top Header Fade (for white text contrast against bright sky)
  const topY = aspectRatio === "story" ? 130 : aspectRatio === "portrait" ? 100 : 85;
  const topFadeH = topY + 120;
  const topFade = ctx.createLinearGradient(0, 0, 0, topFadeH);
  topFade.addColorStop(0, "rgba(0, 0, 0, 0.55)");
  topFade.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = topFade;
  ctx.fillRect(0, 0, width, topFadeH);

  const isEn = language === "en";

  // Top Header Text (ALL WHITE & SEMIBOLD, Balanced 3 rows on left and right)
  const titleSize = aspectRatio === "story" ? 54 : aspectRatio === "portrait" ? 44 : 36;
  const subSize = aspectRatio === "story" ? 22 : aspectRatio === "portrait" ? 18 : 15;
  const badgeSize = aspectRatio === "story" ? 16 : aspectRatio === "portrait" ? 14 : 12;
  const topGap1 = aspectRatio === "square" ? 24 : 32;
  const topGap2 = aspectRatio === "square" ? 46 : 60;

  // Left 3 rows: 2026 -> Rimba Sanctuary -> Kilas Balik 2026 / Year in Review
  ctx.textAlign = "left";
  ctx.fillStyle = "#FFFFFF";
  ctx.font = `600 ${titleSize}px "Urbanist", -apple-system, sans-serif`;
  ctx.fillText("2026", 72, topY);

  ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
  ctx.font = `600 ${subSize}px "Urbanist", sans-serif`;
  ctx.fillText("Rimba Sanctuary", 72, topY + topGap1);

  ctx.fillStyle = "rgba(255, 255, 255, 0.60)";
  ctx.font = `600 ${badgeSize}px "Urbanist", sans-serif`;
  ctx.fillText(isEn ? "YEAR IN REVIEW" : "KILAS BALIK 2026", 72, topY + topGap2);

  // Right 3 rows: Rimba (aligned with 2026) -> Favorite Tree -> Tree name
  ctx.textAlign = "right";
  ctx.fillStyle = "#FFFFFF";
  ctx.font = `600 ${titleSize}px "Urbanist", sans-serif`;
  ctx.fillText("Rimba", width - 72, topY);

  ctx.fillStyle = "rgba(255, 255, 255, 0.60)";
  ctx.font = `600 ${badgeSize}px "Urbanist", sans-serif`;
  ctx.fillText(
    isEn ? "FAVORITE TREE" : "POHON TERFAVORIT",
    width - 72,
    topY + topGap1,
  );

  ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
  ctx.font = `600 ${subSize}px "Urbanist", sans-serif`;
  ctx.fillText(favoriteTreeSpecies, width - 72, topY + topGap2);

  // 3. Bottom Grass Section: Soft Translucent Gradient Fade (Grass remains clearly visible)
  const isSquare = aspectRatio === "square";
  const isPortrait = aspectRatio === "portrait";
  const isStory = aspectRatio === "story";

  // Bottom-up Layout calculation: Anchor text cleanly to the very bottom
  const bottomPad = isStory ? 68 : isPortrait ? 52 : 38;
  const boxDescGap = isStory ? 68 : isPortrait ? 54 : 44;
  const boxValGap = isStory ? 34 : isPortrait ? 27 : 22;
  const textStartY = height - bottomPad - boxDescGap;
  const rowDividerY = textStartY - (isStory ? 44 : isPortrait ? 36 : 28);
  const compY = rowDividerY - (isStory ? 52 : isPortrait ? 40 : 32);
  const focusHoursY = compY - (isStory ? 64 : isPortrait ? 48 : 38);
  const focusLabelY = focusHoursY - (isStory ? 82 : isPortrait ? 64 : 52);

  // Soft translucent gradient starting gently above the focusLabelY (never pitch-black!)
  const gradY = focusLabelY - (isStory ? 90 : isPortrait ? 70 : 55);
  const gradH = height - gradY;
  const fadeGrad = ctx.createLinearGradient(0, gradY, 0, height);
  fadeGrad.addColorStop(0, "rgba(8, 24, 18, 0)");
  fadeGrad.addColorStop(0.3, "rgba(8, 24, 18, 0.22)");
  fadeGrad.addColorStop(0.7, "rgba(8, 24, 18, 0.42)");
  fadeGrad.addColorStop(1, "rgba(6, 20, 15, 0.52)");
  ctx.fillStyle = fadeGrad;
  ctx.fillRect(0, gradY, width, gradH);

  // Focus Metrics (With subtle shadow for crisp readability against the diorama grass)
  ctx.save();
  ctx.shadowColor = "rgba(0, 0, 0, 0.45)";
  ctx.shadowBlur = 8;
  ctx.shadowOffsetY = 2;

  ctx.textAlign = "center";
  ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
  ctx.font = `600 ${isStory ? 18 : isPortrait ? 15 : 13}px "Urbanist", sans-serif`;
  ctx.fillText(isEn ? "TOTAL FOCUS TIME" : "TOTAL WAKTU FOKUS", width / 2, focusLabelY);

  ctx.fillStyle = "#FFFFFF";
  ctx.font = `700 ${isStory ? 74 : isPortrait ? 58 : 46}px "Urbanist", sans-serif`;
  const hoursText =
    totalHoursNum >= 1
      ? (isEn ? `${totalHoursNum} hours` : `${totalHoursNum} jam`)
      : (isEn ? `${totalMinutes} mins` : `${totalMinutes} mnt`);
  ctx.fillText(hoursText, width / 2, focusHoursY);

  // Single concise line for comparison
  ctx.fillStyle = "rgba(255, 255, 255, 0.88)";
  ctx.font = `500 ${isStory ? 19 : isPortrait ? 16 : 13}px "Urbanist", sans-serif`;
  const compText =
    isEn
      ? `+${regionalBonusHours}h above average in your region · Amazing!`
      : `+${regionalBonusHours} jam di atas rata-rata regional · Luar biasa!`;
  ctx.fillText(compText, width / 2, compY);

  // 4. Two-Column Info Row - Faded subtle dividers
  ctx.beginPath();
  ctx.moveTo(80, rowDividerY);
  ctx.lineTo(width - 80, rowDividerY);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.20)";
  ctx.lineWidth = 1;
  ctx.stroke();

  // Vertical mid divider
  const colMidX = width / 2;
  const rowHeight = textStartY + boxDescGap - rowDividerY;
  ctx.beginPath();
  ctx.moveTo(colMidX, rowDividerY + 12);
  ctx.lineTo(colMidX, rowDividerY + rowHeight);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.20)";
  ctx.lineWidth = 1;
  ctx.stroke();

  const boxBadgeSize = isStory ? 17 : isPortrait ? 14 : 12;
  const boxValSize = isStory ? 22 : isPortrait ? 18 : 15;
  const boxDescSize = isStory ? 17 : isPortrait ? 14 : 12;

  // Col 1: Focus Type
  const col1X = 84;
  ctx.textAlign = "left";
  ctx.fillStyle = "rgba(255, 255, 255, 0.80)";
  ctx.font = `600 ${boxBadgeSize}px "Urbanist", sans-serif`;
  ctx.fillText(isEn ? "FOCUS TYPE" : "TIPE FOKUS", col1X, textStartY);

  ctx.fillStyle = "#FFFFFF";
  ctx.font = `700 ${boxValSize}px "Urbanist", sans-serif`;
  ctx.fillText(
    isEn ? "Evergreen Guardian" : "Penjaga Abadi",
    col1X,
    textStartY + boxValGap,
  );

  ctx.fillStyle = "rgba(255, 255, 255, 0.80)";
  ctx.font = `400 ${boxDescSize}px "Urbanist", sans-serif`;
  const descText =
    isEn
      ? "Focused throughout the day, steady like the pines."
      : "Fokus konsisten sepanjang hari bagai pinus abadi.";
  ctx.fillText(
    descText,
    col1X,
    textStartY + boxDescGap,
  );

  // Col 2: Hari Terfokus
  const col2X = colMidX + 36;
  ctx.fillStyle = "rgba(255, 255, 255, 0.80)";
  ctx.font = `600 ${boxBadgeSize}px "Urbanist", sans-serif`;
  ctx.fillText(isEn ? "TOP DAY" : "HARI TERFOKUS", col2X, textStartY);

  ctx.fillStyle = "#FFFFFF";
  ctx.font = `700 ${boxValSize}px "Urbanist", sans-serif`;
  ctx.fillText(
    mostFocusedDay,
    col2X,
    textStartY + boxValGap,
  );

  ctx.fillStyle = "rgba(255, 255, 255, 0.80)";
  ctx.font = `400 ${boxDescSize}px "Urbanist", sans-serif`;
  const peakLabel = isEn
    ? `Peak Hours: ${peakWindowLabel || "10:00 – 12:00"}`
    : `Jam Emas: ${peakWindowLabel || "10:00 – 12:00"}`;
  ctx.fillText(
    peakLabel,
    col2X,
    textStartY + boxDescGap,
  );
  ctx.restore();
}

export function SanctuaryShareCard({
  aspectRatio,
  language,
  favoriteTreeSpecies,
  totalHoursNum,
  totalMinutes,
  regionalBonusHours,
  mostFocusedDay,
  peakWindowLabel,
}: SanctuaryCardProps) {
  const isEn = language === "en";

  return (
    <div
      className={`relative w-full rounded-3xl overflow-hidden p-3.5 text-left flex flex-col justify-between transition-all duration-300 shadow-md ${
        aspectRatio === "story"
          ? "aspect-[9/15]"
          : aspectRatio === "portrait"
          ? "aspect-[4/5]"
          : "aspect-square"
      }`}
    >
      {/* FULL-BLEED BACKGROUND PHOTO (sharecard.webp) - Bottom aligned */}
      <img
        src="/sharecard.webp"
        alt="Rimba Sanctuary Photo"
        className="absolute inset-0 w-full h-full object-cover object-bottom pointer-events-none"
        onError={(e) => {
          (e.target as HTMLImageElement).src = "/story/story_chapter_1.webp";
        }}
      />

      {/* Top Fade for Contrast */}
      <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/55 via-black/25 to-transparent pointer-events-none" />

      {/* Top Sky Header (Balanced 3 rows on left and right, Semibold Urbanist, Clear Hierarchy) */}
      <div className="relative z-10 flex items-start justify-between font-urbanist">
        <div className="flex flex-col items-start">
          <p className="text-[22px] font-semibold text-white tracking-tight leading-none drop-shadow-sm">
            2026
          </p>
          <p className="text-[11px] font-semibold text-white/95 mt-1 leading-tight drop-shadow-2xs">
            Rimba Sanctuary
          </p>
          <p className="text-[8px] font-semibold uppercase tracking-[0.18em] text-white/60 mt-0.5 leading-tight drop-shadow-2xs">
            {isEn ? "Year in Review" : "Kilas Balik 2026"}
          </p>
        </div>
        <div className="flex flex-col items-end text-right">
          <p className="text-[22px] font-semibold text-white tracking-tight leading-none drop-shadow-sm">
            Rimba
          </p>
          <p className="text-[8px] font-semibold uppercase tracking-[0.18em] text-white/60 mt-1 leading-tight drop-shadow-2xs">
            {isEn ? "Favorite Tree" : "Pohon Terfavorit"}
          </p>
          <p className="text-[11px] font-semibold text-white/95 mt-0.5 leading-tight drop-shadow-sm truncate max-w-[150px]">
            {favoriteTreeSpecies}
          </p>
        </div>
      </div>

      {/* Center: Open Tree Area (Tree sits freely without obstruction) */}
      <div className="flex-1 min-h-[140px] pointer-events-none" />

      {/* Bottom Grass Section: Strictly BELOW the tree on the grassy mound */}
      <div className="relative z-10 -mx-3.5 -mb-3.5 px-3.5 pb-3.5 pt-5 bg-gradient-to-t from-[#081812]/75 via-[#0A261D]/45 to-transparent flex flex-col gap-1.5 font-urbanist">
        <div className="text-center">
          <span className="text-[8px] font-semibold text-white/60 uppercase tracking-[0.2em] block">
            {isEn ? "Total Focus Time" : "Total Waktu Fokus"}
          </span>
          <div className="text-[26px] font-semibold text-white leading-none drop-shadow-sm my-0.5">
            {totalHoursNum >= 1
              ? (isEn ? `${totalHoursNum} hours` : `${totalHoursNum} jam`)
              : (isEn ? `${totalMinutes} mins` : `${totalMinutes} mnt`)}
          </div>
          <p className="text-[8.5px] text-white/75 leading-normal max-w-[340px] mx-auto font-normal truncate">
            {isEn
              ? `+${regionalBonusHours}h above average in your region · Amazing!`
              : `+${regionalBonusHours} jam di atas rata-rata regional · Luar biasa!`}
          </p>
        </div>

        {/* Two-Column Info Row - Faded hairline dividers */}
        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/10 text-left">
          <div className="pr-1.5 border-r border-white/10">
            <span className="text-[8px] font-semibold uppercase tracking-[0.16em] text-white/60">
              {isEn ? "Focus Type" : "Tipe Fokus"}
            </span>
            <p className="text-[10.5px] font-semibold text-white leading-tight mt-0.5">
              {isEn ? "Evergreen Guardian" : "Penjaga Abadi"}
            </p>
            <p className="text-[7.5px] font-normal text-white/60 leading-tight mt-0.5">
              {isEn
                ? "Focused throughout the day, steady like the pines."
                : "Fokus konsisten sepanjang hari bagai pinus abadi."}
            </p>
          </div>
          <div className="pl-1.5">
            <span className="text-[8px] font-semibold uppercase tracking-[0.16em] text-white/60">
              {isEn ? "Top Day" : "Hari Terfokus"}
            </span>
            <p className="text-[10.5px] font-semibold text-white leading-tight mt-0.5">
              {mostFocusedDay}
            </p>
            <p className="text-[7.5px] font-normal text-white/60 leading-tight mt-0.5">
              {isEn
                ? `Peak Hours: ${peakWindowLabel || "10:00 – 12:00"}`
                : `Jam Emas: ${peakWindowLabel || "10:00 – 12:00"}`}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
