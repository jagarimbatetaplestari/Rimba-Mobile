"use client";

import React from "react";
import { StoryChapter } from "@/lib/game/storyLore";
import { ShareAspectRatio } from "./types";

export interface StoryCardProps {
  aspectRatio: ShareAspectRatio;
  language: string;
  story: StoryChapter;
  totalHoursNum: number;
  totalMinutes: number;
  regionalBonusHours: number;
  mostFocusedDay: string;
  peakWindowLabel: string;
}

export interface StoryCanvasOptions {
  width: number;
  height: number;
  aspectRatio: ShareAspectRatio;
  language: string;
  story: StoryChapter;
  totalHoursNum: number;
  totalMinutes: number;
  regionalBonusHours: number;
  mostFocusedDay: string;
  peakWindowLabel: string;
}

export async function drawStoryCardCanvas(
  ctx: CanvasRenderingContext2D,
  opts: StoryCanvasOptions,
): Promise<void> {
  const {
    width,
    height,
    aspectRatio,
    language,
    story,
    totalHoursNum,
    totalMinutes,
    regionalBonusHours,
    mostFocusedDay,
    peakWindowLabel,
  } = opts;

  // 1. Full-Bleed Chapter Artwork (story.image)
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
      } else {
        sh = img.width / targetAspect;
        sy = (img.height - sh) / 2;
      }
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, width, height);
      resolve();
    };
    img.onerror = () => resolve();
    img.src = story.image;
  });

  // 2. Top Dark Gradient Fade (for white text legibility)
  const topY = aspectRatio === "story" ? 140 : aspectRatio === "portrait" ? 110 : 90;
  const topFadeH = topY + 120;
  const topFade = ctx.createLinearGradient(0, 0, 0, topFadeH);
  topFade.addColorStop(0, "rgba(0, 0, 0, 0.65)");
  topFade.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = topFade;
  ctx.fillRect(0, 0, width, topFadeH);

  // Top Left: 2026 / Rimba Chronicle / Year in Review (ALL WHITE)
  const titleSize = aspectRatio === "story" ? 68 : aspectRatio === "portrait" ? 56 : 46;
  const subSize = aspectRatio === "story" ? 26 : aspectRatio === "portrait" ? 22 : 19;
  const topGap = aspectRatio === "square" ? 30 : 42;

  ctx.textAlign = "left";
  ctx.fillStyle = "#FFFFFF";
  ctx.font = `800 ${titleSize}px "Urbanist", -apple-system, sans-serif`;
  ctx.fillText("2026", 72, topY);

  ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
  ctx.font = `700 ${subSize}px "Urbanist", sans-serif`;
  ctx.fillText("Rimba Chronicle", 72, topY + topGap);
  ctx.font = `600 ${subSize - 3}px "Urbanist", sans-serif`;
  ctx.fillText("Year in Review", 72, topY + topGap + (aspectRatio === "square" ? 24 : 30));

  // Top Right: Chapter Number & Title (ALL WHITE)
  ctx.textAlign = "right";
  ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
  ctx.font = `700 ${
    aspectRatio === "story" ? 24 : aspectRatio === "portrait" ? 20 : 17
  }px "Urbanist", sans-serif`;
  ctx.fillText(`CH. ${story.chapterNumber || 1}`, width - 72, topY);

  ctx.fillStyle = "#FFFFFF";
  ctx.font = `800 ${
    aspectRatio === "story" ? 34 : aspectRatio === "portrait" ? 28 : 23
  }px "Urbanist", sans-serif`;
  ctx.fillText(story.title, width - 72, topY + topGap);

  // 3. Bottom Dark Gradient Overlay
  const gradH = aspectRatio === "story" ? 760 : aspectRatio === "portrait" ? 580 : 460;
  const gradY = height - gradH;
  const fadeGrad = ctx.createLinearGradient(0, gradY, 0, height);
  fadeGrad.addColorStop(0, "rgba(0, 0, 0, 0)");
  fadeGrad.addColorStop(0.3, "rgba(0, 0, 0, 0.7)");
  fadeGrad.addColorStop(0.7, "rgba(0, 0, 0, 0.92)");
  fadeGrad.addColorStop(1, "rgba(0, 0, 0, 0.98)");
  ctx.fillStyle = fadeGrad;
  ctx.fillRect(0, gradY, width, gradH);

  // Focus Metrics (ALL WHITE)
  const focusLabelY =
    gradY + (aspectRatio === "story" ? 110 : aspectRatio === "portrait" ? 85 : 70);
  const focusHoursY =
    focusLabelY + (aspectRatio === "story" ? 90 : aspectRatio === "portrait" ? 70 : 56);
  const compY =
    focusHoursY + (aspectRatio === "story" ? 64 : aspectRatio === "portrait" ? 50 : 40);

  ctx.textAlign = "center";
  ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
  ctx.font = `700 ${
    aspectRatio === "story" ? 24 : aspectRatio === "portrait" ? 20 : 16
  }px "Urbanist", sans-serif`;
  ctx.fillText("TOTAL FOCUS TIME", width / 2, focusLabelY);

  ctx.fillStyle = "#FFFFFF";
  ctx.font = `900 ${
    aspectRatio === "story" ? 92 : aspectRatio === "portrait" ? 72 : 56
  }px "Urbanist", sans-serif`;
  const hoursText =
    totalHoursNum >= 1 ? `${totalHoursNum} hours` : `${totalMinutes} mins`;
  ctx.fillText(hoursText, width / 2, focusHoursY);

  ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
  ctx.font = `500 ${
    aspectRatio === "story" ? 24 : aspectRatio === "portrait" ? 19 : 15
  }px "Urbanist", sans-serif`;
  const compText =
    language === "en"
      ? `Your total focus was ${regionalBonusHours} hours more than average of others in your region! Amazing!`
      : `Total fokusmu ${regionalBonusHours} jam lebih banyak dari rata-rata penjaga suaka lainnya! Luar biasa!`;
  ctx.fillText(compText, width / 2, compY);

  // Two-Column Info Row (ALL WHITE)
  const rowDividerY =
    compY + (aspectRatio === "story" ? 55 : aspectRatio === "portrait" ? 42 : 32);
  ctx.beginPath();
  ctx.moveTo(80, rowDividerY);
  ctx.lineTo(width - 80, rowDividerY);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Vertical mid divider
  const colMidX = width / 2;
  const rowHeight =
    aspectRatio === "story" ? 150 : aspectRatio === "portrait" ? 120 : 95;
  ctx.beginPath();
  ctx.moveTo(colMidX, rowDividerY + 16);
  ctx.lineTo(colMidX, rowDividerY + rowHeight);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  const textStartY =
    rowDividerY + (aspectRatio === "story" ? 50 : aspectRatio === "portrait" ? 40 : 32);
  const boxTitleSize =
    aspectRatio === "story" ? 26 : aspectRatio === "portrait" ? 22 : 18;
  const boxValSize =
    aspectRatio === "story" ? 26 : aspectRatio === "portrait" ? 22 : 17;
  const boxDescSize =
    aspectRatio === "story" ? 20 : aspectRatio === "portrait" ? 16 : 13;

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
    textStartY + (aspectRatio === "story" ? 40 : 30),
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
    textStartY + (aspectRatio === "story" ? 78 : 58),
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
    textStartY + (aspectRatio === "story" ? 40 : 30),
  );

  ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
  ctx.font = `500 ${boxDescSize}px "Urbanist", sans-serif`;
  const peakLabel = `Jam Emas: ${peakWindowLabel || "10:00 – 12:00"}`;
  ctx.fillText(
    peakLabel,
    col2X,
    textStartY + (aspectRatio === "story" ? 78 : 58),
  );

  // 4. Footer Watermark: STRICTLY "Rimba" (NO tree icon!)
  ctx.textAlign = "center";
  ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
  ctx.font = '700 24px "Urbanist", sans-serif';
  ctx.fillText("Rimba", width / 2, height - (aspectRatio === "story" ? 45 : 30));
}

export function StoryShareCard({
  aspectRatio,
  language,
  story,
  totalHoursNum,
  totalMinutes,
  regionalBonusHours,
  mostFocusedDay,
  peakWindowLabel,
}: StoryCardProps) {
  return (
    <div
      className={`relative w-full rounded-3xl overflow-hidden p-3.5 text-left flex flex-col justify-between transition-all duration-300 shadow-md font-urbanist ${
        aspectRatio === "story"
          ? "aspect-[9/15]"
          : aspectRatio === "portrait"
          ? "aspect-[4/5]"
          : "aspect-square"
      }`}
    >
      {/* FULL-BLEED CHAPTER ARTWORK */}
      <img
        src={story.image}
        alt={story.title}
        className="absolute inset-0 w-full h-full object-cover pointer-events-none"
        onError={(e) => {
          (e.target as HTMLImageElement).src = "/story/story_chapter_1.webp";
        }}
      />

      {/* Top Fade for Contrast */}
      <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/65 via-black/30 to-transparent pointer-events-none" />

      {/* Top Header (ALL WHITE TEXT) */}
      <div className="relative z-10 flex items-start justify-between">
        <div>
          <p className="text-[26px] font-black text-white tracking-tight leading-none drop-shadow-sm">
            2026
          </p>
          <p className="text-[10px] font-bold text-white/90 mt-0.5 leading-tight drop-shadow-2xs">
            Rimba Chronicle<br />Year in Review
          </p>
        </div>
        <div className="text-right">
          <p className="text-[9px] font-bold text-white/80 uppercase tracking-wider drop-shadow-2xs">
            CH. {story.chapterNumber || 1}
          </p>
          <p className="text-[12.5px] font-black text-white leading-tight drop-shadow-sm">
            {story.title}
          </p>
        </div>
      </div>

      {/* Center: Open Nature Art */}
      <div className="my-auto pointer-events-none" />

      {/* Bottom Section with Dark Fade (ALL WHITE TEXT) */}
      <div className="relative z-10 -mx-3.5 -mb-3.5 px-3.5 pb-3 pt-8 bg-gradient-to-t from-black/95 via-black/75 to-transparent flex flex-col gap-2">
        <div className="text-center">
          <span className="text-[9px] font-bold text-white/85 uppercase tracking-widest">
            Total Focus Time
          </span>
          <div className="text-[30px] font-black text-white leading-tight drop-shadow-sm my-0.5">
            {totalHoursNum >= 1 ? `${totalHoursNum} hours` : `${totalMinutes} mins`}
          </div>
          <p className="text-[9px] text-white/95 leading-snug max-w-[280px] mx-auto font-medium">
            {language === "en"
              ? `Your total focus was ${regionalBonusHours} hours more than average in your region! Amazing!`
              : `Total fokusmu ${regionalBonusHours} jam lebih banyak dari rata-rata penjaga suaka lainnya! Luar biasa!`}
          </p>
        </div>

        {/* Two-Column Info Row (ALL WHITE) */}
        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/20 text-left">
          <div className="pr-1.5 border-r border-white/20">
            <span className="text-[9px] font-bold text-white">Focus Type</span>
            <p className="text-[10px] font-extrabold text-white leading-tight mt-0.5">
              Evergreen Guardian
            </p>
            <p className="text-[7.5px] text-white/85 leading-tight mt-0.5">
              {language === "en"
                ? "Focused throughout the day, steady like the pines."
                : "Fokus konsisten sepanjang hari bagai pinus abadi."}
            </p>
          </div>
          <div className="pl-1.5">
            <span className="text-[9px] font-bold text-white">
              {language === "en" ? "Top Day" : "Hari Terfokus"}
            </span>
            <p className="text-[11px] font-extrabold text-white leading-tight mt-0.5">
              {mostFocusedDay}
            </p>
            <p className="text-[7.5px] text-white/85 leading-tight mt-0.5">
              Jam Emas: {peakWindowLabel || "10:00 – 12:00"}
            </p>
          </div>
        </div>

        {/* Clean Watermark (STRICTLY "Rimba", NO tree icon) */}
        <div className="text-center pt-0.5">
          <span className="text-[9.5px] text-white/80 font-bold tracking-[0.25em] uppercase">
            Rimba
          </span>
        </div>
      </div>
    </div>
  );
}
