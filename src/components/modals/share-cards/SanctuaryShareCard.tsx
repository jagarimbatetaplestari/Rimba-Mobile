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

  // Top Header Text (ALL WHITE #FFFFFF, Balanced 3 rows on left and right)
  const titleSize = aspectRatio === "story" ? 64 : aspectRatio === "portrait" ? 52 : 44;
  const subSize = aspectRatio === "story" ? 25 : aspectRatio === "portrait" ? 21 : 18;
  const topGap1 = aspectRatio === "square" ? 28 : 38;
  const topGap2 = aspectRatio === "square" ? 52 : 70;

  // Left 3 rows: 2026 -> Rimba Sanctuary -> Year in Review
  ctx.textAlign = "left";
  ctx.fillStyle = "#FFFFFF";
  ctx.font = `800 ${titleSize}px "Urbanist", -apple-system, sans-serif`;
  ctx.fillText("2026", 72, topY);

  ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
  ctx.font = `700 ${subSize}px "Urbanist", sans-serif`;
  ctx.fillText("Rimba Sanctuary", 72, topY + topGap1);

  ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
  ctx.font = `600 ${subSize - 3}px "Urbanist", sans-serif`;
  ctx.fillText("Year in Review", 72, topY + topGap2);

  // Right 3 rows: Rimba (aligned with 2026) -> Favorite Tree -> Tree name
  ctx.textAlign = "right";
  ctx.fillStyle = "#FFFFFF";
  ctx.font = `800 ${titleSize - 12}px "Urbanist", sans-serif`;
  ctx.fillText("Rimba", width - 72, topY);

  ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
  ctx.font = `700 ${subSize - 4}px "Urbanist", sans-serif`;
  ctx.fillText(
    language === "en" ? "FAVORITE TREE" : "POHON TERFAVORIT",
    width - 72,
    topY + topGap1,
  );

  ctx.fillStyle = "#FFFFFF";
  ctx.font = `800 ${subSize + 5}px "Urbanist", sans-serif`;
  ctx.fillText(favoriteTreeSpecies, width - 72, topY + topGap2);

  // 3. Bottom Grass Section: Soft Dark Emerald Gradient Fade (Strictly BELOW the tree)
  const gradH = aspectRatio === "story" ? 680 : aspectRatio === "portrait" ? 490 : 390;
  const gradY = height - gradH;
  const fadeGrad = ctx.createLinearGradient(0, gradY, 0, height);
  fadeGrad.addColorStop(0, "rgba(8, 24, 18, 0)");
  fadeGrad.addColorStop(0.25, "rgba(8, 24, 18, 0.7)");
  fadeGrad.addColorStop(0.65, "rgba(8, 24, 18, 0.94)");
  fadeGrad.addColorStop(1, "rgba(6, 18, 14, 0.99)");
  ctx.fillStyle = fadeGrad;
  ctx.fillRect(0, gradY, width, gradH);

  // Focus Metrics (ALL WHITE, Positioned strictly BELOW tree trunk on the grass mound)
  const focusLabelY =
    gradY + (aspectRatio === "story" ? 70 : aspectRatio === "portrait" ? 50 : 40);
  const focusHoursY =
    focusLabelY + (aspectRatio === "story" ? 95 : aspectRatio === "portrait" ? 70 : 58);
  const compY =
    focusHoursY + (aspectRatio === "story" ? 68 : aspectRatio === "portrait" ? 50 : 42);

  ctx.textAlign = "center";
  ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
  ctx.font = `700 ${
    aspectRatio === "story" ? 23 : aspectRatio === "portrait" ? 19 : 16
  }px "Urbanist", sans-serif`;
  ctx.fillText("TOTAL FOCUS TIME", width / 2, focusLabelY);

  ctx.fillStyle = "#FFFFFF";
  ctx.font = `900 ${
    aspectRatio === "story" ? 94 : aspectRatio === "portrait" ? 74 : 58
  }px "Urbanist", sans-serif`;
  const hoursText =
    totalHoursNum >= 1 ? `${totalHoursNum} hours` : `${totalMinutes} mins`;
  ctx.fillText(hoursText, width / 2, focusHoursY);

  // Single concise line for comparison
  ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
  ctx.font = `600 ${
    aspectRatio === "story" ? 22 : aspectRatio === "portrait" ? 18 : 15
  }px "Urbanist", sans-serif`;
  const compText =
    language === "en"
      ? `+${regionalBonusHours}h above average in your region · Amazing!`
      : `+${regionalBonusHours} jam di atas rata-rata regional · Luar biasa!`;
  ctx.fillText(compText, width / 2, compY);

  // 4. Two-Column Info Row (ALL WHITE)
  const rowDividerY =
    compY + (aspectRatio === "story" ? 55 : aspectRatio === "portrait" ? 42 : 34);
  ctx.beginPath();
  ctx.moveTo(80, rowDividerY);
  ctx.lineTo(width - 80, rowDividerY);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Vertical mid divider
  const colMidX = width / 2;
  const rowHeight =
    aspectRatio === "story" ? 160 : aspectRatio === "portrait" ? 125 : 100;
  ctx.beginPath();
  ctx.moveTo(colMidX, rowDividerY + 16);
  ctx.lineTo(colMidX, rowDividerY + rowHeight);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  const textStartY =
    rowDividerY + (aspectRatio === "story" ? 50 : aspectRatio === "portrait" ? 40 : 32);
  const boxTitleSize =
    aspectRatio === "story" ? 24 : aspectRatio === "portrait" ? 20 : 17;
  const boxValSize =
    aspectRatio === "story" ? 24 : aspectRatio === "portrait" ? 20 : 16;
  const boxDescSize =
    aspectRatio === "story" ? 19 : aspectRatio === "portrait" ? 15 : 13;

  // Col 1: Focus Type
  const col1X = 84;
  ctx.textAlign = "left";
  ctx.fillStyle = "#FFFFFF";
  ctx.font = `800 ${boxTitleSize}px "Urbanist", sans-serif`;
  ctx.fillText("Focus Type", col1X, textStartY);

  ctx.fillStyle = "#FFFFFF";
  ctx.font = `700 ${boxValSize}px "Urbanist", sans-serif`;
  ctx.fillText(
    "Evergreen Guardian",
    col1X,
    textStartY + (aspectRatio === "story" ? 42 : 32),
  );

  ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
  ctx.font = `500 ${boxDescSize}px "Urbanist", sans-serif`;
  const descText =
    language === "en"
      ? "Focused throughout the day, steady like the pines."
      : "Fokus konsisten sepanjang hari bagai pinus abadi.";
  ctx.fillText(
    descText,
    col1X,
    textStartY + (aspectRatio === "story" ? 82 : 62),
  );

  // Col 2: Hari Terfokus
  const col2X = colMidX + 36;
  ctx.fillStyle = "#FFFFFF";
  ctx.font = `800 ${boxTitleSize}px "Urbanist", sans-serif`;
  ctx.fillText(language === "en" ? "Top Day" : "Hari Terfokus", col2X, textStartY);

  ctx.fillStyle = "#FFFFFF";
  ctx.font = `800 ${boxValSize + 4}px "Urbanist", sans-serif`;
  ctx.fillText(
    mostFocusedDay,
    col2X,
    textStartY + (aspectRatio === "story" ? 42 : 32),
  );

  ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
  ctx.font = `500 ${boxDescSize}px "Urbanist", sans-serif`;
  const peakLabel = `Jam Emas: ${peakWindowLabel || "10:00 – 12:00"}`;
  ctx.fillText(
    peakLabel,
    col2X,
    textStartY + (aspectRatio === "story" ? 82 : 62),
  );
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

      {/* Top Sky Header (ALL WHITE TEXT, Balanced 3 rows on left and right) */}
      <div className="relative z-10 flex items-start justify-between font-urbanist">
        <div>
          <p className="text-[25px] font-black text-white tracking-tight leading-none drop-shadow-sm">
            2026
          </p>
          <p className="text-[10px] font-bold text-white/90 mt-0.5 leading-tight drop-shadow-2xs">
            Rimba Sanctuary
          </p>
          <p className="text-[9px] font-semibold text-white/80 leading-tight drop-shadow-2xs">
            Year in Review
          </p>
        </div>
        <div className="text-right">
          <p className="text-[20px] font-black text-white tracking-tight leading-none drop-shadow-sm">
            Rimba
          </p>
          <p className="text-[8.5px] font-bold text-white/80 uppercase tracking-wider mt-0.5 leading-tight drop-shadow-2xs">
            {language === "en" ? "Favorite Tree" : "Pohon Terfavorit"}
          </p>
          <p className="text-[11.5px] font-black text-white leading-tight drop-shadow-sm">
            {favoriteTreeSpecies}
          </p>
        </div>
      </div>

      {/* Center: Open Tree Area (Tree sits freely without obstruction) */}
      <div className="flex-1 min-h-[140px] pointer-events-none" />

      {/* Bottom Grass Section: Strictly BELOW the tree on the grassy mound */}
      <div className="relative z-10 -mx-3.5 -mb-3.5 px-3.5 pb-3.5 pt-4 bg-gradient-to-t from-[#081812]/95 via-[#0A261D]/80 to-transparent flex flex-col gap-1.5 font-urbanist">
        <div className="text-center">
          <span className="text-[8.5px] font-bold text-white/85 uppercase tracking-widest block">
            Total Focus Time
          </span>
          <div className="text-[28px] font-black text-white leading-none drop-shadow-sm my-0.5">
            {totalHoursNum >= 1 ? `${totalHoursNum} hours` : `${totalMinutes} mins`}
          </div>
          <p className="text-[8.5px] text-white/95 leading-normal max-w-[340px] mx-auto font-medium truncate">
            {language === "en"
              ? `+${regionalBonusHours}h above average in your region · Amazing!`
              : `+${regionalBonusHours} jam di atas rata-rata regional · Luar biasa!`}
          </p>
        </div>

        {/* Two-Column Info Row */}
        <div className="grid grid-cols-2 gap-2 pt-1.5 border-t border-white/20 text-left">
          <div className="pr-1.5 border-r border-white/20">
            <span className="text-[8.5px] font-bold text-white">Focus Type</span>
            <p className="text-[9.5px] font-extrabold text-white leading-tight mt-0.5">
              Evergreen Guardian
            </p>
            <p className="text-[7.5px] text-white/85 leading-tight mt-0.5">
              {language === "en"
                ? "Focused throughout the day, steady like the pines."
                : "Fokus stabil sepanjang hari bagai pinus abadi."}
            </p>
          </div>
          <div className="pl-1.5">
            <span className="text-[8.5px] font-bold text-white">
              {language === "en" ? "Top Day" : "Hari Terfokus"}
            </span>
            <p className="text-[10.5px] font-extrabold text-white leading-tight mt-0.5">
              {mostFocusedDay}
            </p>
            <p className="text-[7.5px] text-white/85 leading-tight mt-0.5">
              Jam Emas: {peakWindowLabel || "10:00 – 12:00"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
