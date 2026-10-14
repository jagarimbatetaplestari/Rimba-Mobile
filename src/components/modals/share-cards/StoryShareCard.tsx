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

  // Pastikan tidak ada shadow / glow dari state canvas sebelumnya
  ctx.shadowColor = "transparent";
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;

  // Muat gambar terlebih dahulu untuk digunakan pada ambient glass & hero frame
  const loadedImg = await new Promise<HTMLImageElement | null>((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = story.image || "/story/story_chapter_1.webp";
  });

  // 1. Dasar Kartu: Apple Liquid Glass Pearl Base
  const baseGrad = ctx.createLinearGradient(0, 0, width, height);
  baseGrad.addColorStop(0, "#F8FAFC");
  baseGrad.addColorStop(0.5, "#F1F5F9");
  baseGrad.addColorStop(1, "#E8EEF5");
  ctx.fillStyle = baseGrad;
  ctx.fillRect(0, 0, width, height);

  // Bias warna ambient lembut dari artwork (Apple Material Tint)
  if (loadedImg) {
    ctx.save();
    ctx.globalAlpha = 0.16;
    if ("filter" in ctx) {
      ctx.filter = "blur(64px) saturate(130%)";
    }
    ctx.drawImage(
      loadedImg,
      -width * 0.1,
      -height * 0.1,
      width * 1.2,
      height * 1.2,
    );
    ctx.restore();
  }

  // Lapisan kaca buram utama di atas seluruh permukaan
  const surfaceGlass = ctx.createLinearGradient(0, 0, 0, height);
  surfaceGlass.addColorStop(0, "rgba(255, 255, 255, 0.82)");
  surfaceGlass.addColorStop(0.5, "rgba(248, 250, 252, 0.76)");
  surfaceGlass.addColorStop(1, "rgba(241, 245, 249, 0.88)");
  ctx.fillStyle = surfaceGlass;
  ctx.fillRect(0, 0, width, height);

  // Ukuran grid & proporsi utama
  const pad = width * 0.046;
  const innerW = width - pad * 2;
  const imgCardH = isSquare
    ? height * 0.49
    : isPortrait
      ? height * 0.54
      : height * 0.57;
  const imgCardRadius = width * 0.052;

  // 2. Kotak Artwork Atas (Hero Frame)
  let sx = 0,
    sy = 0,
    sw = 1,
    sh = 1;

  ctx.save();
  drawRoundedRect(ctx, pad, pad, innerW, imgCardH, imgCardRadius);
  ctx.clip();

  if (loadedImg) {
    const imgAspect = loadedImg.width / loadedImg.height;
    const targetAspect = innerW / imgCardH;
    sw = loadedImg.width;
    sh = loadedImg.height;

    if (imgAspect > targetAspect) {
      sw = loadedImg.height * targetAspect;
      sx = (loadedImg.width - sw) / 2;
    } else {
      sh = loadedImg.width / targetAspect;
      sy = (loadedImg.height - sh) / 2;
    }
    ctx.drawImage(loadedImg, sx, sy, sw, sh, pad, pad, innerW, imgCardH);
  } else {
    const fallbackGrad = ctx.createLinearGradient(
      pad,
      pad,
      pad,
      pad + imgCardH,
    );
    fallbackGrad.addColorStop(0, "#1E293B");
    fallbackGrad.addColorStop(1, "#0F172A");
    ctx.fillStyle = fallbackGrad;
    ctx.fillRect(pad, pad, innerW, imgCardH);
  }

  // Panel Floating Liquid Glass di dalam Artwork (Bagian Bawah)
  const dockMargin = width * 0.028;
  const dockX = pad + dockMargin;
  const dockW = innerW - dockMargin * 2;

  const compFontSize = isSquare ? 13.5 : isPortrait ? 16.5 : 19;
  const compLineH = compFontSize * 1.35;
  ctx.font = `500 ${compFontSize}px "Urbanist", -apple-system, BlinkMacSystemFont, sans-serif`;
  const compLines = getWrappedTextLines(
    ctx,
    t.compMessage(regionalBonusHours),
    dockW * 0.88,
  ).slice(0, 2);

  const hoursFontSize = isSquare ? 44 : isPortrait ? 58 : 70;
  const labelFontSize = isSquare ? 11.5 : isPortrait ? 13.5 : 15.5;
  const pillH = labelFontSize + (isSquare ? 11 : 14);
  const dockPadY = isSquare ? 14 : isPortrait ? 18 : 22;

  const dockH =
    dockPadY * 2 +
    pillH +
    (isSquare ? 8 : 12) +
    hoursFontSize * 0.92 +
    (isSquare ? 10 : 14) +
    compLines.length * compLineH;
  const dockY = pad + imgCardH - dockMargin - dockH;
  const dockRadius = width * 0.038;

  // Efek Liquid Glass (Blur + Specular Tint) untuk Hero Dock
  ctx.save();
  drawRoundedRect(ctx, dockX, dockY, dockW, dockH, dockRadius);
  ctx.clip();

  if (loadedImg) {
    ctx.save();
    if ("filter" in ctx) {
      ctx.filter = "blur(24px) saturate(140%)";
    }
    ctx.drawImage(loadedImg, sx, sy, sw, sh, pad, pad, innerW, imgCardH);
    ctx.restore();
  }

  // Lapisan akrilik translusen gelap-netral agar teks putih tajam tanpa drop-shadow
  const dockGlassGrad = ctx.createLinearGradient(0, dockY, 0, dockY + dockH);
  dockGlassGrad.addColorStop(0, "rgba(15, 23, 42, 0.42)");
  dockGlassGrad.addColorStop(0.5, "rgba(15, 23, 42, 0.52)");
  dockGlassGrad.addColorStop(1, "rgba(15, 23, 42, 0.64)");
  ctx.fillStyle = dockGlassGrad;
  ctx.fillRect(dockX, dockY, dockW, dockH);

  // Kilau spekular diagonal khas Apple Glass
  const dockSheen = ctx.createLinearGradient(
    dockX,
    dockY,
    dockX + dockW,
    dockY + dockH,
  );
  dockSheen.addColorStop(0, "rgba(255, 255, 255, 0.22)");
  dockSheen.addColorStop(0.45, "rgba(255, 255, 255, 0.06)");
  dockSheen.addColorStop(1, "rgba(255, 255, 255, 0.12)");
  ctx.fillStyle = dockSheen;
  ctx.fillRect(dockX, dockY, dockW, dockH);
  ctx.restore();

  // Hairline border spekular pada Hero Dock
  drawRoundedRect(ctx, dockX, dockY, dockW, dockH, dockRadius);
  const dockBorderGrad = ctx.createLinearGradient(0, dockY, 0, dockY + dockH);
  dockBorderGrad.addColorStop(0, "rgba(255, 255, 255, 0.55)");
  dockBorderGrad.addColorStop(1, "rgba(255, 255, 255, 0.18)");
  ctx.strokeStyle = dockBorderGrad;
  ctx.lineWidth = 1.25;
  ctx.stroke();

  // Pill Badge: Total Waktu Fokus
  ctx.font = `700 ${labelFontSize}px "Urbanist", -apple-system, sans-serif`;
  const badgeText = t.totalFocusTime.toUpperCase();
  const badgeMetrics = ctx.measureText(badgeText);
  const pillW = badgeMetrics.width + (isSquare ? 26 : 34);
  const pillX = width / 2 - pillW / 2;
  const pillY = dockY + dockPadY;

  drawRoundedRect(ctx, pillX, pillY, pillW, pillH, pillH / 2);
  ctx.fillStyle = "rgba(255, 255, 255, 0.16)";
  ctx.fill();
  ctx.strokeStyle = "rgba(255, 255, 255, 0.34)";
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "rgba(255, 255, 255, 0.96)";
  ctx.fillText(badgeText, width / 2, pillY + pillH / 2 + 0.5);

  // Angka Utama Waktu Fokus
  ctx.textBaseline = "alphabetic";
  ctx.font = `800 ${hoursFontSize}px "Urbanist", -apple-system, sans-serif`;
  ctx.fillStyle = "#FFFFFF";
  const hoursText =
    totalHoursNum >= 1
      ? `${totalHoursNum} ${t.hoursUnit}`
      : `${totalMinutes} ${t.minsUnit}`;
  const hoursY = pillY + pillH + (isSquare ? 6 : 9) + hoursFontSize * 0.82;
  ctx.fillText(hoursText, width / 2, hoursY);

  // Teks Perbandingan Wilayah
  ctx.font = `500 ${compFontSize}px "Urbanist", -apple-system, sans-serif`;
  ctx.fillStyle = "rgba(255, 255, 255, 0.86)";
  const compStartY = hoursY + (isSquare ? 16 : 22);
  compLines.forEach((line, idx) => {
    ctx.fillText(line, width / 2, compStartY + idx * compLineH);
  });

  ctx.restore(); // Selesai clip Hero Artwork

  // Hairline border luar pada Hero Artwork
  drawRoundedRect(ctx, pad, pad, innerW, imgCardH, imgCardRadius);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.75)";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // 3. Bagian Bawah: Apple Bento Liquid Glass Panels
  const sectionGap = isSquare ? height * 0.022 : height * 0.024;
  const bottomAreaTop = pad + imgCardH + sectionGap;
  const bottomAreaH = height - bottomAreaTop - pad;

  const subCardH = isSquare
    ? bottomAreaH * 0.44
    : isPortrait
      ? bottomAreaH * 0.43
      : bottomAreaH * 0.42;
  const personaCardH = bottomAreaH - subCardH - sectionGap * 0.85;
  const bentoRadius = width * 0.04;

  // Panel 3A: Focus Persona Liquid Glass Card
  const personaCardY = bottomAreaTop;
  drawRoundedRect(ctx, pad, personaCardY, innerW, personaCardH, bentoRadius);
  const personaGlass = ctx.createLinearGradient(
    pad,
    personaCardY,
    pad,
    personaCardY + personaCardH,
  );
  personaGlass.addColorStop(0, "rgba(255, 255, 255, 0.84)");
  personaGlass.addColorStop(1, "rgba(255, 255, 255, 0.62)");
  ctx.fillStyle = personaGlass;
  ctx.fill();

  ctx.strokeStyle = "rgba(255, 255, 255, 0.95)";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  drawRoundedRect(ctx, pad, personaCardY, innerW, personaCardH, bentoRadius);
  ctx.strokeStyle = "rgba(15, 23, 42, 0.06)";
  ctx.lineWidth = 1;
  ctx.stroke();

  // Isi Teks Persona Card
  const personaPadX = pad + width * 0.036;
  const personaContentW = innerW - width * 0.072;
  const tagSize = isSquare ? 11 : isPortrait ? 13 : 14.5;
  const personaTitleSize = isSquare ? 23 : isPortrait ? 29 : 34;
  const descFontSize = isSquare ? 13 : isPortrait ? 15.5 : 18;
  const descLineH = descFontSize * 1.38;

  ctx.font = `500 ${descFontSize}px "Urbanist", -apple-system, sans-serif`;
  const descLines = getWrappedTextLines(
    ctx,
    t.personaDesc,
    personaContentW,
  ).slice(0, 2);

  const totalPersonaTextH =
    tagSize +
    (isSquare ? 5 : 7) +
    personaTitleSize * 0.95 +
    (isSquare ? 8 : 11) +
    descLines.length * descLineH;
  const personaTextStartY =
    personaCardY + (personaCardH - totalPersonaTextH) / 2 + tagSize * 0.85;

  // Indikator titik kecil + Label Persona
  ctx.textAlign = "left";
  const dotRadius = isSquare ? 3.5 : 4.5;
  ctx.beginPath();
  ctx.arc(
    personaPadX + dotRadius,
    personaTextStartY - tagSize * 0.32,
    dotRadius,
    0,
    Math.PI * 2,
  );
  ctx.fillStyle = "#0D9488";
  ctx.fill();

  ctx.font = `700 ${tagSize}px "Urbanist", -apple-system, sans-serif`;
  ctx.fillStyle = "#0D9488";
  ctx.fillText(
    t.personaLabel.toUpperCase(),
    personaPadX + dotRadius * 2 + 8,
    personaTextStartY,
  );

  // Nama Persona
  const personaTitleY =
    personaTextStartY + (isSquare ? 5 : 7) + personaTitleSize * 0.92;
  ctx.font = `800 ${personaTitleSize}px "Urbanist", -apple-system, sans-serif`;
  ctx.fillStyle = "#0F172A";
  ctx.fillText(t.personaName, personaPadX, personaTitleY);

  // Deskripsi Persona
  ctx.font = `500 ${descFontSize}px "Urbanist", -apple-system, sans-serif`;
  ctx.fillStyle = "#475569";
  const descStartY = personaTitleY + (isSquare ? 16 : 21);
  descLines.forEach((line, idx) => {
    ctx.fillText(line, personaPadX, descStartY + idx * descLineH);
  });

  // 4. Dua Kotak Micro-Cards Bento di Bawah
  const cardGap = width * 0.024;
  const subCardW = (innerW - cardGap) / 2;
  const subCardY = personaCardY + personaCardH + sectionGap * 0.85;

  const drawGlassMicroCard = (
    x: number,
    label: string,
    value: string,
    sub: string,
  ) => {
    drawRoundedRect(ctx, x, subCardY, subCardW, subCardH, bentoRadius);
    const tileGrad = ctx.createLinearGradient(
      x,
      subCardY,
      x,
      subCardY + subCardH,
    );
    tileGrad.addColorStop(0, "rgba(255, 255, 255, 0.86)");
    tileGrad.addColorStop(1, "rgba(255, 255, 255, 0.60)");
    ctx.fillStyle = tileGrad;
    ctx.fill();

    // Inner specular highlight
    ctx.strokeStyle = "rgba(255, 255, 255, 0.95)";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Crisp outer hairline
    drawRoundedRect(ctx, x, subCardY, subCardW, subCardH, bentoRadius);
    ctx.strokeStyle = "rgba(15, 23, 42, 0.06)";
    ctx.lineWidth = 1;
    ctx.stroke();

    const tilePadX = x + width * 0.032;
    const subLabelSize = isSquare ? 10.5 : isPortrait ? 12 : 13.5;
    const subValSize = isSquare ? 18 : isPortrait ? 22 : 25;
    const subNoteSize = isSquare ? 10.5 : isPortrait ? 12 : 13.5;

    const blockH =
      subLabelSize + subValSize + subNoteSize + (isSquare ? 14 : 20);
    const startY = subCardY + (subCardH - blockH) / 2 + subLabelSize;

    ctx.textAlign = "left";
    ctx.fillStyle = "#64748B";
    ctx.font = `700 ${subLabelSize}px "Urbanist", -apple-system, sans-serif`;
    ctx.fillText(label.toUpperCase(), tilePadX, startY);

    ctx.fillStyle = "#0F172A";
    ctx.font = `800 ${subValSize}px "Urbanist", -apple-system, sans-serif`;
    ctx.fillText(value, tilePadX, startY + subValSize + (isSquare ? 5 : 7));

    ctx.fillStyle = "#0D9488";
    ctx.font = `600 ${subNoteSize}px "Urbanist", -apple-system, sans-serif`;
    ctx.fillText(
      sub,
      tilePadX,
      startY + subValSize + subNoteSize + (isSquare ? 12 : 16),
    );
  };

  drawGlassMicroCard(
    pad,
    t.bestDayLabel,
    mostFocusedDay || "Thursday",
    t.bestDaySub,
  );

  drawGlassMicroCard(
    pad + subCardW + cardGap,
    t.goldenWindowLabel,
    cleanPeakWindow(peakWindowLabel),
    t.goldenWindowSub,
  );
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
  const isSquare = aspectRatio === "square";
  const isPortrait = aspectRatio === "portrait";

  const containerAspectClass =
    aspectRatio === "story"
      ? "aspect-[9/16]"
      : isPortrait
        ? "aspect-[4/5]"
        : "aspect-square";

  const hoursDisplay =
    totalHoursNum >= 1
      ? `${totalHoursNum} ${t.hoursUnit}`
      : `${totalMinutes} ${t.minsUnit}`;

  const imageSrc = story.image || "/story/story_chapter_1.webp";

  return (
    <div
      className={`relative w-full rounded-[32px] sm:rounded-[38px] p-3.5 sm:p-4 flex flex-col justify-between font-urbanist select-none overflow-hidden bg-gradient-to-br from-[#F8FAFC] via-[#F1F5F9] to-[#E8EEF5] border border-white/90 ring-1 ring-slate-900/[0.06] ${containerAspectClass}`}
    >
      {/* Lapisan Ambient Liquid Glass (Bias warna lembut dari ilustrasi tanpa glow berlebih) */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <img
          src={imageSrc}
          alt=""
          aria-hidden="true"
          className="w-full h-full object-cover scale-125 blur-3xl opacity-[0.16] saturate-125"
          onError={(e) => {
            (e.target as HTMLImageElement).src = "/story/story_chapter_1.webp";
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-white/80 via-slate-50/75 to-slate-100/85 backdrop-blur-2xl" />
      </div>

      {/* 1. KOTAK ILUSTRASI ATAS + FLOATING LIQUID GLASS DOCK */}
      <div
        className={`relative z-10 w-full rounded-[24px] sm:rounded-[28px] overflow-hidden border border-white/80 ring-1 ring-slate-900/[0.05] min-h-0 ${
          isSquare ? "flex-[1.15]" : isPortrait ? "flex-[1.3]" : "flex-[1.42]"
        }`}
      >
        <img
          src={imageSrc}
          alt={story.title}
          className="absolute inset-0 w-full h-full object-cover pointer-events-none"
          onError={(e) => {
            (e.target as HTMLImageElement).src = "/story/story_chapter_1.webp";
          }}
        />

        {/* Highlight spekular halus di tepi dalam atas gambar */}
        <div className="absolute inset-x-0 top-0 h-px bg-white/50 pointer-events-none" />

        {/* Floating Apple Liquid Glass HUD */}
        <div className="absolute inset-x-2.5 sm:inset-x-3 bottom-2.5 sm:bottom-3 rounded-[20px] sm:rounded-[22px] bg-slate-950/45 backdrop-blur-xl backdrop-saturate-150 border border-white/30 px-3.5 py-2.5 sm:px-4 sm:py-3.5 flex flex-col items-center text-center">
          {/* Specular Top Hairline */}
          <div className="absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent pointer-events-none" />

          {/* Pill Badge */}
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-white/15 border border-white/30 text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.12em] text-white/95">
            {t.totalFocusTime}
          </span>

          {/* Nilai Fokus Utama */}
          <div
            className={`${
              isSquare
                ? "text-[24px] sm:text-[28px] my-0.5"
                : "text-[28px] sm:text-[34px] my-0.5 sm:my-1"
            } font-extrabold text-white tracking-tight leading-none`}
          >
            {hoursDisplay}
          </div>

          {/* Pesan Perbandingan Wilayah */}
          <p className="text-[9.5px] sm:text-[10.5px] text-white/85 leading-snug max-w-[270px] font-medium line-clamp-2">
            {t.compMessage(regionalBonusHours)}
          </p>
        </div>
      </div>

      {/* 2. BAGIAN BAWAH: APPLE BENTO LIQUID GLASS CARDS */}
      <div
        className={`relative z-10 flex-1 flex flex-col justify-between min-h-0 ${
          isSquare ? "pt-2 gap-2" : "pt-2.5 sm:pt-3 gap-2 sm:gap-2.5"
        }`}
      >
        {/* Bento Card Utama: Focus Persona */}
        <div className="relative flex-1 rounded-[20px] sm:rounded-[22px] bg-gradient-to-b from-white/85 to-white/65 backdrop-blur-xl border border-white/95 ring-1 ring-slate-900/[0.05] px-3.5 py-2.5 sm:px-4 sm:py-3 flex flex-col justify-center min-h-0">
          {/* Specular Top Line */}
          <div className="absolute inset-x-4 top-0 h-px bg-white pointer-events-none" />

          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#0d9488]" />
            <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.1em] text-[#0d9488]">
              {t.personaLabel}
            </span>
          </div>

          <h3
            className={`${
              isSquare
                ? "text-[17px] sm:text-[19px]"
                : "text-[19px] sm:text-[22px]"
            } font-extrabold text-slate-900 tracking-tight leading-tight mt-0.5`}
          >
            {t.personaName}
          </h3>

          <p className="text-[10px] sm:text-[11px] text-slate-600 leading-relaxed mt-0.5 sm:mt-1 font-medium line-clamp-2">
            {t.personaDesc}
          </p>
        </div>

        {/* Grid 2 Micro-Cards Bento */}
        <div className="grid grid-cols-2 gap-2 sm:gap-2.5 shrink-0">
          {/* Card 1: Hari Puncak */}
          <div className="relative rounded-[18px] sm:rounded-[20px] bg-gradient-to-b from-white/85 to-white/60 backdrop-blur-xl border border-white/95 ring-1 ring-slate-900/[0.05] px-3 py-2 sm:px-3.5 sm:py-2.5 flex flex-col justify-between">
            <div className="absolute inset-x-3 top-0 h-px bg-white pointer-events-none" />
            <span className="text-[8.5px] sm:text-[9px] font-bold uppercase tracking-[0.08em] text-slate-500">
              {t.bestDayLabel}
            </span>
            <p className="text-[13.5px] sm:text-[15.5px] font-extrabold text-slate-900 tracking-tight leading-tight my-0.5 truncate">
              {mostFocusedDay || "Thursday"}
            </p>
            <span className="text-[8.5px] sm:text-[9.5px] font-semibold text-[#0d9488] truncate">
              {t.bestDaySub}
            </span>
          </div>

          {/* Card 2: Jam Emas */}
          <div className="relative rounded-[18px] sm:rounded-[20px] bg-gradient-to-b from-white/85 to-white/60 backdrop-blur-xl border border-white/95 ring-1 ring-slate-900/[0.05] px-3 py-2 sm:px-3.5 sm:py-2.5 flex flex-col justify-between">
            <div className="absolute inset-x-3 top-0 h-px bg-white pointer-events-none" />
            <span className="text-[8.5px] sm:text-[9px] font-bold uppercase tracking-[0.08em] text-slate-500">
              {t.goldenWindowLabel}
            </span>
            <p className="text-[13px] sm:text-[15px] font-extrabold text-slate-900 tracking-tight leading-tight my-0.5 truncate">
              {cleanPeakWindow(peakWindowLabel)}
            </p>
            <span className="text-[8.5px] sm:text-[9.5px] font-semibold text-[#0d9488] truncate">
              {t.goldenWindowSub}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
