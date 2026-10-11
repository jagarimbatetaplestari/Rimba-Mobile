"use client";

import React from "react";
import { ShareAspectRatio, TagStatItem, drawRoundedRect } from "./types";

export interface DioramaCardProps {
  aspectRatio: ShareAspectRatio;
  forestDateText: string;
  treesCount?: number;
  stumpsCount?: number;
  completedSessionsCount?: number;
  mostFocusedDay?: string;
  peakWindowLabel?: string;
  totalHoursNum: number;
  snapshotUrl: string | null;
  tagStats: TagStatItem[];
  takingSnapshotText?: string;
  language?: "id" | "en";
}

export interface DioramaCanvasOptions {
  width: number;
  height: number;
  aspectRatio: ShareAspectRatio;
  forestDateText: string;
  treesCount?: number;
  stumpsCount?: number;
  completedSessionsCount?: number;
  mostFocusedDay?: string;
  peakWindowLabel?: string;
  totalHoursNum: number;
  snapshotUrl: string | null;
  tagStats: TagStatItem[];
  language?: "id" | "en";
}

const ACCENT_COLORS = [
  "#059669", // Emerald
  "#0284C7", // Sky Blue
  "#D97706", // Amber
  "#6366F1", // Indigo
  "#0D9488", // Teal
  "#64748B", // Slate
];

function getSafeColor(index: number, originalColor?: string): string {
  return originalColor || ACCENT_COLORS[index % ACCENT_COLORS.length];
}

export function drawForestTagDonutChart(
  ctx: CanvasRenderingContext2D,
  boxX: number,
  boxY: number,
  boxW: number,
  boxH: number,
  tags: TagStatItem[],
) {
  if (tags.length === 0) return;

  const cx = boxX + boxW * 0.22;
  const cy = boxY + boxH * 0.5;
  const outerR = Math.min(boxW * 0.17, boxH * 0.4);
  const innerR = outerR * 0.6;

  let currentAngle = -Math.PI / 2;
  const totalMins = Math.max(
    1,
    tags.reduce((a, b) => a + b.minutes, 0),
  );

  tags.forEach((item, idx) => {
    const sliceAngle = (item.minutes / totalMins) * (Math.PI * 2);
    const endAngle = currentAngle + sliceAngle;
    const color = getSafeColor(idx, item.color);

    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, outerR, currentAngle, endAngle);
    ctx.arc(cx, cy, innerR, endAngle, currentAngle, true);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = "#FFFFFF";
    ctx.lineWidth = 2;
    ctx.stroke();

    if (item.pct >= 14 && outerR > 32) {
      const midAngle = currentAngle + sliceAngle / 2;
      const textR = (outerR + innerR) / 2;
      const tx = cx + Math.cos(midAngle) * textR;
      const ty = cy + Math.sin(midAngle) * textR;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "#FFFFFF";
      ctx.font = '600 13px "Urbanist", sans-serif';
      ctx.fillText(`${item.pct}%`, tx, ty);
    }
    ctx.restore();

    currentAngle = endAngle;
  });

  // Lubang tengah donat
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, innerR, 0, Math.PI * 2);
  ctx.fillStyle = "#FFFFFF";
  ctx.fill();

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#64748B";
  ctx.font = '700 13px "Urbanist", sans-serif';
  ctx.fillText("Tag", cx, cy - 8);
  ctx.font = '600 11px "Urbanist", sans-serif';
  ctx.fillText("Distribution", cx, cy + 8);
  ctx.restore();

  // Daftar Legenda
  const listX = boxX + boxW * 0.46;
  const availableH = boxH * 0.82;
  const rowH = availableH / Math.max(1, Math.min(4, tags.length));
  const startY = boxY + (boxH - availableH) / 2 + rowH * 0.5;

  tags.slice(0, 4).forEach((item, idx) => {
    const y = startY + idx * rowH;
    const color = getSafeColor(idx, item.color);

    // Titik warna indikator
    ctx.beginPath();
    ctx.arc(listX, y, 5, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();

    // Nama tag
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#334155";
    ctx.font = '600 16px "Urbanist", sans-serif';
    ctx.fillText(item.name.toLowerCase(), listX + 15, y);

    // Persentase
    ctx.textAlign = "right";
    ctx.fillStyle = "#64748B";
    ctx.font = '500 15px "Urbanist", sans-serif';
    ctx.fillText(`${item.pct}%`, boxX + boxW * 0.74, y);

    // Durasi jam
    ctx.fillStyle = "#1E293B";
    ctx.font = '600 16px "Urbanist", sans-serif';
    ctx.fillText(`${item.hours} jam`, boxX + boxW - 14, y);
  });
}

export async function drawDioramaCardCanvas(
  ctx: CanvasRenderingContext2D,
  opts: DioramaCanvasOptions,
): Promise<void> {
  const {
    width,
    height,
    aspectRatio,
    forestDateText,
    treesCount = 0,
    completedSessionsCount,
    mostFocusedDay,
    totalHoursNum,
    snapshotUrl,
    tagStats,
    language = "id",
  } = opts;

  const isSquare = aspectRatio === "square";
  const isPortrait = aspectRatio === "portrait";
  const isEn = language === "en";

  const habitatBadge = isEn ? "SANCTUARY HABITAT" : "DIORAMA HABITAT";
  const sessionCount = completedSessionsCount ?? treesCount ?? 0;
  const sessionMetric = isEn
    ? `${treesCount} Flourishing Trees · ${sessionCount} Sessions`
    : `${treesCount} Pohon Lestari · ${sessionCount} Sesi Sukses`;

  const focusBadge = isEn ? "TOTAL FOCUS TIME" : "TOTAL WAKTU FOKUS";
  const hoursUnit = isEn ? "HRS" : "JAM";
  const peakLabel = isEn ? "Peak Day" : "Hari Puncak";
  const rhythmMetric = `${peakLabel}: ${mostFocusedDay || (isEn ? "Thu" : "Kamis")}`;

  ctx.fillStyle = "#F6F7F9";
  ctx.fillRect(0, 0, width, height);

  // 1. Header Kiri Atas (Stylish, Informatif, Tanpa Emoji/Ikon)
  const topY = isSquare ? 58 : isPortrait ? 74 : 86;
  const padX = isSquare ? 42 : 54;

  ctx.textAlign = "left";
  // Micro-badge Teal
  ctx.fillStyle = "#0D9488";
  ctx.font = `800 ${isSquare ? 11 : isPortrait ? 13 : 14}px "Urbanist", sans-serif`;
  ctx.fillText(habitatBadge, padX, topY - (isSquare ? 16 : 18));

  // Period Date Bold Ink
  ctx.fillStyle = "#0F172A";
  ctx.font = `900 ${isSquare ? 23 : isPortrait ? 27 : 29}px "Urbanist", sans-serif`;
  ctx.fillText(forestDateText, padX, topY + (isSquare ? 12 : 14));

  // Sub-metric Slate
  ctx.fillStyle = "#64748B";
  ctx.font = `600 ${isSquare ? 13 : isPortrait ? 15 : 16}px "Urbanist", sans-serif`;
  ctx.fillText(sessionMetric, padX, topY + (isSquare ? 36 : 42));

  // 2. Header Kanan Atas (Stylish, Informatif, Tanpa Emoji/Ikon)
  const rightX = width - padX;

  ctx.textAlign = "right";
  // Micro-badge Slate
  ctx.fillStyle = "#64748B";
  ctx.font = `800 ${isSquare ? 11 : isPortrait ? 12 : 13}px "Urbanist", sans-serif`;
  ctx.fillText(focusBadge, rightX, topY - (isSquare ? 16 : 18));

  // Big Focus Hours Ink Bold
  ctx.fillStyle = "#0F172A";
  ctx.font = `900 ${isSquare ? 32 : isPortrait ? 38 : 42}px "Urbanist", sans-serif`;
  const hoursStr = `${totalHoursNum}`;
  ctx.fillText(hoursStr, rightX - (isSquare ? 36 : 42), topY + (isSquare ? 14 : 16));

  // Unit JAM / HRS
  ctx.fillStyle = "#64748B";
  ctx.font = `800 ${isSquare ? 13 : isPortrait ? 15 : 16}px "Urbanist", sans-serif`;
  ctx.fillText(hoursUnit, rightX, topY + (isSquare ? 14 : 16));

  // Sub-metric Peak Rhythm Teal
  ctx.fillStyle = "#0D9488";
  ctx.font = `700 ${isSquare ? 13 : isPortrait ? 15 : 16}px "Urbanist", sans-serif`;
  ctx.fillText(rhythmMetric, rightX, topY + (isSquare ? 36 : 42));

  // 3. Kontainer Tag Bawah
  const cardW = width - padX * 2;
  const cardH = isSquare ? height * 0.28 : height * 0.25;
  const cardX = padX;
  const cardY = height - cardH - (isSquare ? 40 : isPortrait ? 52 : 62);

  ctx.save();
  ctx.fillStyle = "#FFFFFF";
  ctx.shadowColor = "rgba(15, 23, 42, 0.05)";
  ctx.shadowBlur = 16;
  ctx.shadowOffsetY = 6;
  drawRoundedRect(ctx, cardX, cardY, cardW, cardH, 22);
  ctx.fill();

  ctx.shadowColor = "transparent";
  ctx.strokeStyle = "#E2E8F0";
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.restore();

  drawForestTagDonutChart(
    ctx,
    cardX + 12,
    cardY + 8,
    cardW - 24,
    cardH - 16,
    tagStats,
  );

  // 4. Watermark Bersih Rimba di Bawah Kartu
  ctx.textAlign = "center";
  ctx.fillStyle = "#94A3B8";
  ctx.font = `700 ${isSquare ? 13 : isPortrait ? 15 : 16}px "Urbanist", sans-serif`;
  ctx.fillText("RIMBA", width / 2, height - (isSquare ? 15 : isPortrait ? 20 : 25));

  // 5. Pulau 3D: Proporsional & Besar Tanpa Terpotong
  if (snapshotUrl) {
    const areaTop = topY + (isSquare ? 52 : 66);
    const areaBottom = cardY - 14;
    const availableH = areaBottom - areaTop;
    const islandSize = Math.min(cardW * 0.95, availableH * 1.15);
    const islandX = (width - islandSize) / 2;
    const islandY = areaTop + (availableH - islandSize) / 2;

    await new Promise<void>((resolve) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        ctx.save();
        ctx.shadowColor = "rgba(15, 23, 42, 0.14)";
        ctx.shadowBlur = 24;
        ctx.shadowOffsetY = 12;
        ctx.drawImage(img, islandX, islandY, islandSize, islandSize);
        ctx.restore();
        resolve();
      };
      img.onerror = () => resolve();
      img.src = snapshotUrl;
    });
  }
}

export function DioramaShareCard({
  aspectRatio,
  forestDateText,
  treesCount = 0,
  stumpsCount = 0,
  completedSessionsCount,
  mostFocusedDay,
  peakWindowLabel,
  totalHoursNum,
  snapshotUrl,
  tagStats,
  takingSnapshotText = "Membuat tangkapan pulau...",
  language = "id",
}: DioramaCardProps) {
  const isEn = language === "en";
  const habitatBadge = isEn ? "SANCTUARY HABITAT" : "DIORAMA HABITAT";
  const sessionCount = completedSessionsCount ?? treesCount ?? 0;
  const sessionMetric = isEn
    ? `${treesCount} Flourishing Trees · ${sessionCount} Sessions`
    : `${treesCount} Pohon Lestari · ${sessionCount} Sesi Sukses`;

  const focusBadge = isEn ? "TOTAL FOCUS TIME" : "TOTAL WAKTU FOKUS";
  const hoursUnit = isEn ? "HRS" : "JAM";
  const peakLabel = isEn ? "Peak Day" : "Hari Puncak";
  const rhythmMetric = `${peakLabel}: ${mostFocusedDay || (isEn ? "Thu" : "Kamis")}`;

  const containerAspectClass =
    aspectRatio === "story"
      ? "aspect-[9/15] max-h-[500px]"
      : aspectRatio === "portrait"
        ? "aspect-[4/5] max-h-[460px]"
        : "aspect-square max-h-[430px]";

  return (
    <div
      className={`relative w-full max-w-[340px] mx-auto rounded-[32px] p-3.5 sm:p-4 text-left flex flex-col justify-between transition-all duration-300 shadow-xl bg-[#F6F7F9] font-urbanist select-none ${containerAspectClass}`}
    >
      {/* 1. Header Kiri & Kanan Atas (Informatif, Stylish, Tanpa Emoji/Ikon) */}
      <div className="flex items-start justify-between relative z-20 shrink-0">
        {/* Kiri Atas */}
        <div className="flex flex-col items-start text-left">
          <span className="text-[8px] sm:text-[9px] font-extrabold uppercase tracking-[0.22em] text-[#0D9488] leading-none">
            {habitatBadge}
          </span>
          <p className="text-[15px] sm:text-[17px] font-black text-[#0F172A] tracking-tight leading-tight mt-1">
            {forestDateText}
          </p>
          <p className="text-[9.5px] sm:text-[10px] font-semibold text-[#64748B] leading-tight mt-1">
            {sessionMetric}
          </p>
        </div>

        {/* Kanan Atas */}
        <div className="flex flex-col items-end text-right">
          <span className="text-[8px] sm:text-[9px] font-extrabold uppercase tracking-[0.2em] text-[#64748B] leading-none">
            {focusBadge}
          </span>
          <div className="flex items-baseline justify-end gap-1 mt-0.5 leading-none">
            <span className="text-[22px] sm:text-[26px] font-black text-[#0F172A] leading-none tracking-tight">
              {totalHoursNum}
            </span>
            <span className="text-[10px] sm:text-[11px] font-extrabold text-[#64748B] uppercase tracking-wider">
              {hoursUnit}
            </span>
          </div>
          <p className="text-[9.5px] sm:text-[10px] font-bold text-[#0D9488] leading-tight mt-1">
            {rhythmMetric}
          </p>
        </div>
      </div>

      {/* 2. Panggung Pulau 3D: Besar, Proporsional & Melayang Indah */}
      <div className="relative z-10 flex-1 w-full flex items-center justify-center min-h-0 py-1 sm:py-2 pointer-events-none">
        {snapshotUrl ? (
          <img
            src={snapshotUrl}
            alt="3D Diorama Island"
            className="max-w-[95%] max-h-full object-contain filter drop-shadow-[0_16px_28px_rgba(15,23,42,0.14)]"
          />
        ) : (
          <div className="flex flex-col items-center justify-center py-6 gap-2">
            <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-[10.5px] text-slate-400 font-medium animate-pulse">
              {takingSnapshotText}
            </span>
          </div>
        )}
      </div>

      {/* 3. Kartu Distribusi Tag Bawah */}
      <div className="relative z-20 w-full rounded-[22px] bg-white border border-slate-200/90 p-2.5 sm:p-3 shadow-2xs flex items-center gap-3 shrink-0">
        {/* SVG Donut Chart */}
        <svg
          viewBox="0 0 160 160"
          className="w-[68px] h-[68px] sm:w-[76px] sm:h-[76px] shrink-0"
        >
          {(() => {
            let currentAngle = -90;
            const totalM = Math.max(
              1,
              tagStats.reduce((a, b) => a + b.minutes, 0),
            );
            const cx = 80,
              cy = 80,
              r = 66,
              innerR = 40;

            return (
              <>
                {tagStats.map((item, idx) => {
                  const sliceAngle = (item.minutes / totalM) * 360;
                  const startA = currentAngle;
                  const endA = currentAngle + sliceAngle;
                  currentAngle = endA;
                  const color = getSafeColor(idx, item.color);

                  const toRad = (deg: number) => (deg * Math.PI) / 180;
                  const x1 = cx + r * Math.cos(toRad(startA));
                  const y1 = cy + r * Math.sin(toRad(startA));
                  const x2 = cx + r * Math.cos(toRad(endA));
                  const y2 = cy + r * Math.sin(toRad(endA));
                  const ix1 = cx + innerR * Math.cos(toRad(endA));
                  const iy1 = cy + innerR * Math.sin(toRad(endA));
                  const ix2 = cx + innerR * Math.cos(toRad(startA));
                  const iy2 = cy + innerR * Math.sin(toRad(startA));
                  const largeArc = sliceAngle > 180 ? 1 : 0;

                  const d = `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} L ${ix1} ${iy1} A ${innerR} ${innerR} 0 ${largeArc} 0 ${ix2} ${iy2} Z`;

                  const midA = startA + sliceAngle / 2;
                  const textR = (r + innerR) / 2;
                  const tx = cx + textR * Math.cos(toRad(midA));
                  const ty = cy + textR * Math.sin(toRad(midA));

                  return (
                    <g key={idx}>
                      <path
                        d={d}
                        fill={color}
                        stroke="#FFFFFF"
                        strokeWidth="2"
                      />
                      {item.pct >= 14 && (
                        <text
                          x={tx}
                          y={ty}
                          textAnchor="middle"
                          dominantBaseline="central"
                          fill="#FFFFFF"
                          fontSize="8"
                          fontWeight="800"
                        >
                          {item.pct}%
                        </text>
                      )}
                    </g>
                  );
                })}
                <text
                  x={cx}
                  y={cy - 4}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill="#334155"
                  fontSize="9.5"
                  fontWeight="800"
                >
                  Tag
                </text>
                <text
                  x={cx}
                  y={cy + 7}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill="#64748B"
                  fontSize="8"
                  fontWeight="700"
                >
                  Distribution
                </text>
              </>
            );
          })()}
        </svg>

        {/* Legenda Kategori */}
        <div className="flex-1 min-w-0 flex flex-col justify-center gap-1.5">
          {tagStats.slice(0, 4).map((item, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between text-[8px] sm:text-[9px] leading-tight"
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <span
                  className="w-1.5 h-1.5 rounded-full shrink-0"
                  style={{ backgroundColor: getSafeColor(idx, item.color) }}
                />
                <span className="font-semibold text-[#334155] truncate lowercase">
                  {item.name}
                </span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0 pl-1 font-mono">
                <span className="text-[#64748B] font-medium">{item.pct}%</span>
                <span className="font-bold text-[#1E293B]">
                  {item.hours} jam
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 4. Clean Watermark (STRICTLY "Rimba", NO tree icon) */}
      <div className="text-center pt-1 shrink-0">
        <span className="text-[10px] text-[#94A3B8] font-bold tracking-[0.25em] uppercase">
          Rimba
        </span>
      </div>
    </div>
  );
}
