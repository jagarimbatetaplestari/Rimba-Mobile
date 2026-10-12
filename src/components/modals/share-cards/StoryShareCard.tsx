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

const getI18n = (lang: string) => {
  const isId = lang === "id";
  return {
    totalFocusTime: isId ? "Total Waktu Fokus" : "Total Focus Time",
    hoursUnit: isId ? "Jam" : "Hours",
    minsUnit: isId ? "Menit" : "Mins",
    compMessage: (hours: number) =>
      isId
        ? `Total waktu fokusmu ${hours} jam lebih banyak dari rata-rata lainnya di wilayahmu! Luar biasa!`
        : `Your total focus time was ${hours} hours more than the average of others in your region! Amazing!`,
    personaLabel: isId ? "Persona Fokus" : "Focus Persona",
    personaName: isId ? "Penjaga Abadi" : "Evergreen Guardian",
    personaDesc: isId
      ? "Fokusmu kokoh dan stabil sepanjang hari bak pohon pinus, baik di bawah terik matahari maupun rembulan."
      : "You stay focused and grounded throughout the day, steady like the pines whether under the sun or moon.",
    bestDayLabel: isId ? "Hari Puncak" : "Most Focused Day",
    bestDaySub: isId ? "Aktivitas tertinggi" : "Peak consistency",
    goldenWindowLabel: isId ? "Jam Emas" : "Golden Window",
    goldenWindowSub: isId ? "Aliran produktif" : "Midday Flow",
  };
};

function cleanPeakWindow(label: string): string {
  if (!label) return "12:00 – 13:00";
  const match = label.match(/\((.*?)\)/);
  return match ? match[1] : label;
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  if (typeof ctx.roundRect === "function") {
    ctx.roundRect(x, y, w, h, r);
  } else {
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
}

function getWrappedTextLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let currentLine = "";

  for (let n = 0; n < words.length; n++) {
    const testLine = currentLine + words[n] + " ";
    if (ctx.measureText(testLine).width > maxWidth && n > 0) {
      lines.push(currentLine.trim());
      currentLine = words[n] + " ";
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine.trim().length > 0) {
    lines.push(currentLine.trim());
  }
  return lines;
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

  const t = getI18n(language);
  const isSquare = aspectRatio === "square";
  const isPortrait = aspectRatio === "portrait";

  // 1. Dasar kartu putih
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, width, height);

  // 2. Kotak Artwork Atas
  const pad = width * 0.05;
  const innerW = width - pad * 2;
  const imgCardH = isSquare ? height * 0.48 : isPortrait ? height * 0.55 : height * 0.58;
  const imgCardRadius = width * 0.055;

  ctx.save();
  drawRoundedRect(ctx, pad, pad, innerW, imgCardH, imgCardRadius);
  ctx.clip();

  await new Promise<void>((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const imgAspect = img.width / img.height;
      const targetAspect = innerW / imgCardH;
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
      ctx.drawImage(img, sx, sy, sw, sh, pad, pad, innerW, imgCardH);
      resolve();
    };
    img.onerror = () => resolve();
    img.src = story.image || "/story/story_chapter_1.webp";
  });

  // Gradien gelap di bawah artwork
  const gradH = imgCardH * 0.55;
  const gradY = pad + imgCardH - gradH;
  const bottomGrad = ctx.createLinearGradient(0, gradY, 0, pad + imgCardH);
  bottomGrad.addColorStop(0, "rgba(5, 17, 24, 0)");
  bottomGrad.addColorStop(0.3, "rgba(5, 17, 24, 0.45)");
  bottomGrad.addColorStop(0.7, "rgba(5, 17, 24, 0.85)");
  bottomGrad.addColorStop(1, "rgba(4, 14, 20, 0.95)");
  ctx.fillStyle = bottomGrad;
  ctx.fillRect(pad, gradY, innerW, gradH);

  // Metrik di dalam artwork
  ctx.textAlign = "center";
  const compFontSize = isSquare ? 15 : isPortrait ? 18 : 21;
  const compLineH = compFontSize * 1.35;
  ctx.font = `500 ${compFontSize}px "Urbanist", sans-serif`;
  const compLines = getWrappedTextLines(ctx, t.compMessage(regionalBonusHours), innerW * 0.88);

  const bottomInnerPadding = isSquare ? 20 : isPortrait ? 28 : 34;
  const compStartY =
    pad + imgCardH - bottomInnerPadding - (compLines.length - 1) * compLineH;

  ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
  compLines.forEach((line, idx) => {
    ctx.fillText(line, width / 2, compStartY + idx * compLineH);
  });

  const hoursFontSize = isSquare ? 52 : isPortrait ? 68 : 82;
  ctx.font = `900 ${hoursFontSize}px "Urbanist", sans-serif`;
  ctx.fillStyle = "#FFFFFF";
  const hoursText =
    totalHoursNum >= 1
      ? `${totalHoursNum} ${t.hoursUnit}`
      : `${totalMinutes} ${t.minsUnit}`;
  const hoursY = compStartY - (isSquare ? 20 : 28);
  ctx.fillText(hoursText, width / 2, hoursY);

  const labelFontSize = isSquare ? 18 : isPortrait ? 23 : 27;
  ctx.font = `700 ${labelFontSize}px "Urbanist", sans-serif`;
  ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
  ctx.fillText(t.totalFocusTime, width / 2, hoursY - (isSquare ? 48 : 62));

  ctx.restore();

  // 3. Bagian Bawah: Focus Persona & Narasi
  const contentPadX = pad + 6;
  const contentW = width - contentPadX * 2;
  const textSectionTop = pad + imgCardH + (isSquare ? 18 : isPortrait ? 26 : 34);

  // Tag Kategori Persona
  ctx.textAlign = "left";
  const tagSize = isSquare ? 13 : isPortrait ? 15 : 17;
  ctx.font = `800 ${tagSize}px "Urbanist", sans-serif`;
  ctx.fillStyle = "#0D9488";
  ctx.fillText(t.personaLabel.toUpperCase(), contentPadX, textSectionTop + tagSize);

  // Nama Persona Utama
  const personaTitleSize = isSquare ? 26 : isPortrait ? 34 : 40;
  ctx.font = `900 ${personaTitleSize}px "Urbanist", sans-serif`;
  ctx.fillStyle = "#154E63";
  const personaY = textSectionTop + tagSize + personaTitleSize * 1.05;
  ctx.fillText(t.personaName, contentPadX, personaY);

  // Deskripsi Singkat Persona
  const descFontSize = isSquare ? 14 : isPortrait ? 17 : 20;
  const descLineH = descFontSize * 1.4;
  ctx.font = `500 ${descFontSize}px "Urbanist", sans-serif`;
  ctx.fillStyle = "#475569";
  const descStartY = personaY + (isSquare ? 12 : 16);
  const descLines = getWrappedTextLines(ctx, t.personaDesc, contentW);
  descLines.slice(0, 2).forEach((line, idx) => {
    ctx.fillText(line, contentPadX, descStartY + idx * descLineH);
  });

  // 4. Dua Kotak Micro-Cards di Bawah
  const cardGap = width * 0.025;
  const subCardW = (contentW - cardGap) / 2;
  const subCardH = isSquare ? 75 : isPortrait ? 95 : 110;
  const subCardY = height - pad - subCardH - 4;
  const cardRadius = 16;

  // Box 1: Most Focused Day
  const box1X = contentPadX;
  ctx.fillStyle = "#F8FAFC";
  drawRoundedRect(ctx, box1X, subCardY, subCardW, subCardH, cardRadius);
  ctx.fill();
  ctx.strokeStyle = "#E2E8F0";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Box 1 Teks
  const subLabelSize = isSquare ? 11 : isPortrait ? 13 : 15;
  const subValSize = isSquare ? 18 : isPortrait ? 22 : 26;
  const subNoteSize = isSquare ? 11 : isPortrait ? 13 : 14;

  ctx.fillStyle = "#64748B";
  ctx.font = `800 ${subLabelSize}px "Urbanist", sans-serif`;
  ctx.fillText(t.bestDayLabel.toUpperCase(), box1X + 16, subCardY + subLabelSize + 12);

  ctx.fillStyle = "#154E63";
  ctx.font = `900 ${subValSize}px "Urbanist", sans-serif`;
  ctx.fillText(mostFocusedDay || "Thursday", box1X + 16, subCardY + subLabelSize + subValSize + 16);

  ctx.fillStyle = "#0D9488";
  ctx.font = `600 ${subNoteSize}px "Urbanist", sans-serif`;
  ctx.fillText(t.bestDaySub, box1X + 16, subCardY + subCardH - 12);

  // Box 2: Golden Window
  const box2X = contentPadX + subCardW + cardGap;
  ctx.fillStyle = "#F8FAFC";
  drawRoundedRect(ctx, box2X, subCardY, subCardW, subCardH, cardRadius);
  ctx.fill();
  ctx.strokeStyle = "#E2E8F0";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Box 2 Teks
  ctx.fillStyle = "#64748B";
  ctx.font = `800 ${subLabelSize}px "Urbanist", sans-serif`;
  ctx.fillText(t.goldenWindowLabel.toUpperCase(), box2X + 16, subCardY + subLabelSize + 12);

  ctx.fillStyle = "#154E63";
  ctx.font = `900 ${subValSize}px "Urbanist", sans-serif`;
  ctx.fillText(cleanPeakWindow(peakWindowLabel), box2X + 16, subCardY + subLabelSize + subValSize + 16);

  ctx.fillStyle = "#0D9488";
  ctx.font = `600 ${subNoteSize}px "Urbanist", sans-serif`;
  ctx.fillText(t.goldenWindowSub, box2X + 16, subCardY + subCardH - 12);
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
  const t = getI18n(language);

  const containerAspectClass =
    aspectRatio === "story"
      ? "aspect-[9/16]"
      : aspectRatio === "portrait"
      ? "aspect-[4/5]"
      : "aspect-square";

  const hoursDisplay =
    totalHoursNum >= 1
      ? `${totalHoursNum} ${t.hoursUnit}`
      : `${totalMinutes} ${t.minsUnit}`;

  return (
    <div
      className={`relative w-full bg-white rounded-[32px] sm:rounded-[38px] p-4 sm:p-5 flex flex-col justify-between shadow-2xl font-urbanist select-none overflow-hidden ${containerAspectClass}`}
    >
      {/* 1. KOTAK ILUSTRASI ATAS */}
      <div className="relative w-full rounded-[24px] sm:rounded-[28px] overflow-hidden flex-[1.35] min-h-0">
        <img
          src={story.image || "/story/story_chapter_1.webp"}
          alt={story.title}
          className="absolute inset-0 w-full h-full object-cover pointer-events-none"
          onError={(e) => {
            (e.target as HTMLImageElement).src = "/story/story_chapter_1.webp";
          }}
        />

        {/* Gradien dasar ilustrasi */}
        <div className="absolute inset-x-0 bottom-0 pt-16 pb-3 sm:pb-5 px-4 bg-gradient-to-t from-[#041016]/95 via-[#05161f]/65 to-transparent flex flex-col items-center text-center justify-end">
          <span className="text-[11px] sm:text-[13px] font-bold text-white/90 tracking-wide">
            {t.totalFocusTime}
          </span>
          <div className="text-[28px] sm:text-[36px] font-black text-white leading-tight my-0.5 drop-shadow-sm">
            {hoursDisplay}
          </div>
          <p className="text-[9.5px] sm:text-[11px] text-white/90 leading-snug max-w-[280px] font-medium">
            {t.compMessage(regionalBonusHours)}
          </p>
        </div>
      </div>

      {/* 2. BAGIAN TEKS BAWAH (BERSIH & TERSTRUKTUR) */}
      <div className="flex-1 flex flex-col justify-between pt-3.5 sm:pt-4 px-1 pb-0.5 min-h-0 text-[#154e63]">
        {/* Header Persona */}
        <div>
          <span className="text-[9.5px] sm:text-[10px] font-extrabold uppercase tracking-wider text-[#0d9488]">
            {t.personaLabel}
          </span>
          <h3 className="text-[20px] sm:text-[23px] font-black text-[#154e63] tracking-tight leading-tight mt-0.5">
            {t.personaName}
          </h3>
          <p className="text-[10.5px] sm:text-[11.5px] text-[#475569] leading-relaxed mt-1 font-medium line-clamp-2">
            {t.personaDesc}
          </p>
        </div>

        {/* Micro-cards Grid */}
        <div className="grid grid-cols-2 gap-2 sm:gap-2.5 pt-2">
          {/* Card 1: Hari Paling Fokus */}
          <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded-2xl p-2.5 flex flex-col justify-between">
            <span className="text-[8.5px] sm:text-[9px] font-extrabold uppercase tracking-wider text-[#64748b]">
              {t.bestDayLabel}
            </span>
            <p className="text-[14px] sm:text-[16px] font-black text-[#154e63] leading-tight my-0.5">
              {mostFocusedDay || "Thursday"}
            </p>
            <span className="text-[8.5px] sm:text-[9px] font-semibold text-[#0d9488]">
              {t.bestDaySub}
            </span>
          </div>

          {/* Card 2: Jam Emas */}
          <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded-2xl p-2.5 flex flex-col justify-between">
            <span className="text-[8.5px] sm:text-[9px] font-extrabold uppercase tracking-wider text-[#64748b]">
              {t.goldenWindowLabel}
            </span>
            <p className="text-[13px] sm:text-[15px] font-black text-[#154e63] leading-tight my-0.5 truncate">
              {cleanPeakWindow(peakWindowLabel)}
            </p>
            <span className="text-[8.5px] sm:text-[9px] font-semibold text-[#0d9488] truncate">
              {t.goldenWindowSub}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
