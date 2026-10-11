"use client";

import React from "react";
import { ShareAspectRatio, TagStatItem, drawRoundedRect } from "./types";

export interface DioramaCardProps {
  aspectRatio: ShareAspectRatio;
  forestDateText: string;
  treesCount: number;
  stumpsCount: number;
  totalHoursNum: number;
  snapshotUrl: string | null;
  tagStats: TagStatItem[];
  takingSnapshotText?: string;
}

export interface DioramaCanvasOptions {
  width: number;
  height: number;
  aspectRatio: ShareAspectRatio;
  forestDateText: string;
  treesCount: number;
  stumpsCount: number;
  totalHoursNum: number;
  snapshotUrl: string | null;
  tagStats: TagStatItem[];
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

  // Donut geometry
  const cx = boxX + boxW * 0.28;
  const cy = boxY + boxH * 0.5;
  const outerR = Math.min(boxW * 0.22, boxH * 0.44);
  const innerR = outerR * 0.52;

  let currentAngle = -Math.PI / 2;
  const totalMins = Math.max(1, tags.reduce((a, b) => a + b.minutes, 0));

  tags.forEach((item) => {
    const sliceAngle = (item.minutes / totalMins) * (Math.PI * 2);
    const endAngle = currentAngle + sliceAngle;

    // Draw Slice
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, outerR, currentAngle, endAngle);
    ctx.arc(cx, cy, innerR, endAngle, currentAngle, true);
    ctx.closePath();
    ctx.fillStyle = item.color;
    ctx.fill();
    ctx.strokeStyle = "#FFFFFF";
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Percentage inside slice if large enough
    if (item.pct >= 8 && outerR > 40) {
      const midAngle = currentAngle + sliceAngle / 2;
      const textR = (outerR + innerR) / 2;
      const tx = cx + Math.cos(midAngle) * textR;
      const ty = cy + Math.sin(midAngle) * textR;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "#FFFFFF";
      ctx.font = '700 18px "Urbanist", sans-serif';
      ctx.fillText(`${item.pct}%`, tx, ty);
    }
    ctx.restore();

    currentAngle = endAngle;
  });

  // Center Hole
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, innerR, 0, Math.PI * 2);
  ctx.fillStyle = "#FFFFFF";
  ctx.fill();

  // Center Text: Tag \n Distribution
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#7A8594";
  ctx.font = '600 19px "Urbanist", sans-serif';
  ctx.fillText("Tag", cx, cy - 11);
  ctx.fillText("Distribution", cx, cy + 13);
  ctx.restore();

  // Legend List on Right (Matching reference layout: dot, name, percentage, hours)
  const listX = boxX + boxW * 0.54;
  const availableH = boxH * 0.82;
  const rowH = availableH / Math.max(1, Math.min(6, tags.length));
  const startY = boxY + (boxH - availableH) / 2 + rowH * 0.5;

  tags.slice(0, 6).forEach((item, idx) => {
    const y = startY + idx * rowH;

    // Dot
    ctx.beginPath();
    ctx.arc(listX, y, 7.5, 0, Math.PI * 2);
    ctx.fillStyle = item.color;
    ctx.fill();

    // Tag name
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#555E6D";
    ctx.font = '600 21px "Urbanist", sans-serif';
    ctx.fillText(item.name.toLowerCase(), listX + 20, y);

    // Percentage
    ctx.textAlign = "right";
    ctx.fillStyle = "#7A8594";
    ctx.font = '500 20px "Urbanist", sans-serif';
    ctx.fillText(`${item.pct}%`, boxX + boxW * 0.77, y);

    // Hours
    ctx.fillStyle = "#555E6D";
    ctx.font = '600 21px "Urbanist", sans-serif';
    ctx.fillText(`${item.hours} H`, boxX + boxW - 32, y);
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
    treesCount,
    stumpsCount,
    totalHoursNum,
    snapshotUrl,
    tagStats,
  } = opts;

  ctx.fillStyle = "#F0F1F3";
  ctx.fillRect(0, 0, width, height);

  // Top Left: Date Range & "Total \n Focused \n Time"
  const topY = aspectRatio === "story" ? 120 : aspectRatio === "portrait" ? 95 : 80;
  ctx.textAlign = "left";
  ctx.fillStyle = "#6B7280";
  ctx.font = `600 ${
    aspectRatio === "story" ? 38 : aspectRatio === "portrait" ? 32 : 28
  }px "Urbanist", -apple-system, sans-serif`;
  ctx.fillText(forestDateText, 72, topY);

  ctx.fillStyle = "#7A8594";
  ctx.font = `500 ${
    aspectRatio === "story" ? 22 : aspectRatio === "portrait" ? 18 : 16
  }px "Urbanist", sans-serif`;
  const subLineGap = aspectRatio === "story" ? 28 : aspectRatio === "portrait" ? 23 : 20;
  ctx.fillText("Total", 72, topY + subLineGap + 12);
  ctx.fillText("Focused", 72, topY + subLineGap * 2 + 12);
  ctx.fillText("Time", 72, topY + subLineGap * 3 + 12);

  // Top Right: Flora & Withered Count, Big Hours, "hours"
  ctx.textAlign = "right";
  ctx.fillStyle = "#7A8594";
  ctx.font = `600 ${
    aspectRatio === "story" ? 26 : aspectRatio === "portrait" ? 22 : 19
  }px "Urbanist", sans-serif`;
  ctx.fillText(`🌱 ${treesCount}   🥀 ${stumpsCount}`, width - 72, topY);

  ctx.fillStyle = "#555E6D";
  ctx.font = `800 ${
    aspectRatio === "story" ? 72 : aspectRatio === "portrait" ? 60 : 50
  }px "Urbanist", sans-serif`;
  ctx.fillText(`${totalHoursNum}`, width - 72, topY + (aspectRatio === "story" ? 68 : 55));

  ctx.fillStyle = "#7A8594";
  ctx.font = `600 ${
    aspectRatio === "story" ? 24 : aspectRatio === "portrait" ? 20 : 17
  }px "Urbanist", sans-serif`;
  ctx.fillText("hours", width - 72, topY + (aspectRatio === "story" ? 104 : 85));

  // Rounded White Card (Container for 3D Island & Tag Donut Chart)
  const cardW = width - 120;
  const cardX = 60;
  const cardY =
    topY + (aspectRatio === "story" ? 180 : aspectRatio === "portrait" ? 140 : 115);
  const cardH =
    height - cardY - (aspectRatio === "story" ? 105 : aspectRatio === "portrait" ? 80 : 65);

  ctx.save();
  ctx.fillStyle = "#FFFFFF";
  drawRoundedRect(ctx, cardX, cardY, cardW, cardH, 44);
  ctx.fill();
  ctx.strokeStyle = "#D8DCE3";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();

  // Floating 3D Island (Placed inside upper half of white card)
  const islandH =
    cardH * (aspectRatio === "story" ? 0.53 : aspectRatio === "portrait" ? 0.51 : 0.49);
  const imgSize = Math.min(cardW * 0.9, islandH * 1.05);
  const imgX = (width - imgSize) / 2;
  const imgY = cardY + (islandH - imgSize) / 2 + 10;

  if (snapshotUrl) {
    await new Promise<void>((resolve) => {
      const img = new Image();
      img.onload = () => {
        const cropDim = Math.min(img.width, img.height);
        const sx = (img.width - cropDim) / 2;
        const sy = (img.height - cropDim) / 2;
        ctx.drawImage(img, sx, sy, cropDim, cropDim, imgX, imgY, imgSize, imgSize);
        resolve();
      };
      img.src = snapshotUrl;
    });
  }

  // Lower Section of White Card: Tag Distribution Donut Chart + Legend
  const donutY = cardY + islandH;
  const donutH = cardH - islandH - 20;
  drawForestTagDonutChart(ctx, cardX + 16, donutY, cardW - 32, donutH, tagStats);

  // Minimalist Brand Footer (STRICTLY "Rimba" - NO tree icon!)
  ctx.textAlign = "center";
  ctx.fillStyle = "#7A8594";
  ctx.font = '700 24px "Urbanist", sans-serif';
  ctx.fillText("Rimba", width / 2, height - (aspectRatio === "story" ? 42 : 28));
}

export function DioramaShareCard({
  aspectRatio,
  forestDateText,
  treesCount,
  stumpsCount,
  totalHoursNum,
  snapshotUrl,
  tagStats,
  takingSnapshotText = "Membuat tangkapan pulau...",
}: DioramaCardProps) {
  return (
    <div
      className={`relative w-full rounded-3xl overflow-hidden border border-slate-200/90 p-3 text-left flex flex-col justify-between transition-all duration-300 shadow-md bg-[#F0F1F3] font-urbanist ${
        aspectRatio === "story"
          ? "aspect-[9/15]"
          : aspectRatio === "portrait"
          ? "aspect-[4/5]"
          : "aspect-square"
      }`}
    >
      {/* Top Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[12.5px] font-semibold text-[#64748B] tracking-tight">
            {forestDateText}
          </p>
          <div className="text-[9px] text-[#7A8594] font-medium leading-[1.15] mt-1">
            <p>Total</p>
            <p>Focused</p>
            <p>Time</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[9.5px] font-medium text-[#7A8594]">
            🌱 {treesCount} &nbsp; 🥀 {stumpsCount}
          </p>
          <p className="text-[22px] font-extrabold text-[#555E6D] leading-none mt-1">
            {totalHoursNum}
          </p>
          <p className="text-[9.5px] text-[#7A8594] font-medium">hours</p>
        </div>
      </div>

      {/* Rounded White Card Container: Holds 3D Island & Donut Chart */}
      <div className="relative w-full flex-1 rounded-2xl bg-white border border-[#D8DCE3] p-2 flex flex-col justify-between shadow-2xs my-1 overflow-hidden">
        {/* Upper: 3D Island WebGL Snapshot */}
        <div className="w-[62%] mx-auto aspect-square flex items-center justify-center relative my-auto">
          {snapshotUrl ? (
            <img
              src={snapshotUrl}
              alt="3D Island"
              className="w-full h-full object-contain filter drop-shadow-xs"
            />
          ) : (
            <span className="text-[10px] text-slate-400 font-normal">
              {takingSnapshotText}
            </span>
          )}
        </div>

        {/* Lower: Tag Distribution Donut Chart + Legend */}
        <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
          {/* SVG Donut Chart */}
          <svg viewBox="0 0 160 160" className="w-[84px] h-[84px] shrink-0">
            {(() => {
              let currentAngle = -90;
              const totalM = Math.max(1, tagStats.reduce((a, b) => a + b.minutes, 0));
              const cx = 80,
                cy = 80,
                r = 62,
                innerR = 34;

              return (
                <>
                  {tagStats.map((item, idx) => {
                    const sliceAngle = (item.minutes / totalM) * 360;
                    const startA = currentAngle;
                    const endA = currentAngle + sliceAngle;
                    currentAngle = endA;

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
                        <path d={d} fill={item.color} stroke="#FFFFFF" strokeWidth="1.5" />
                        {item.pct >= 10 && (
                          <text
                            x={tx}
                            y={ty}
                            textAnchor="middle"
                            dominantBaseline="central"
                            fill="#FFFFFF"
                            fontSize="7.5"
                            fontWeight="bold"
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
                    fill="#7A8594"
                    fontSize="8"
                    fontWeight="600"
                  >
                    Tag
                  </text>
                  <text
                    x={cx}
                    y={cy + 6}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fill="#7A8594"
                    fontSize="7"
                    fontWeight="600"
                  >
                    Distribution
                  </text>
                </>
              );
            })()}
          </svg>

          {/* Tag Legend List */}
          <div className="flex-1 min-w-0 flex flex-col justify-center space-y-1">
            {tagStats.slice(0, 5).map((item, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between text-[7.5px] leading-tight"
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <span
                    className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="font-semibold text-[#555E6D] truncate lowercase">
                    {item.name}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0 pl-1 font-mono">
                  <span className="text-[#7A8594]">{item.pct}%</span>
                  <span className="font-semibold text-[#555E6D]">{item.hours} H</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Clean Watermark (STRICTLY "Rimba", NO tree icon) */}
      <div className="text-center pt-0.5">
        <span className="text-[9.5px] text-[#7A8594] font-bold tracking-[0.2em] uppercase">
          Rimba
        </span>
      </div>
    </div>
  );
}
