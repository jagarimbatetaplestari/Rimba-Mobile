"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { useGameStore } from "@/lib/game/useGameStore";
import { calculateAnalytics, getStreakMilestone } from "@/lib/game/analytics";
import { soundManager } from "@/lib/audio/sounds";
import { hapticLight, hapticSuccess } from "@/lib/mobile/nativeBridge";
import { X, Download, Copy, Flame, Check } from "lucide-react";

interface ShareSnapshotModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const DAILY_QUOTES = [
  "Setiap pohon tumbuh dari ketenangan yang kamu jaga.",
  "Hutan yang rimbun berawal dari satu benih fokus yang tekun.",
  "Ketenangan bukan ketiadaan badai, melainkan keteguhan di dalamnya.",
  "Fokus adalah caramu merawat masa depan, satu menit demi satu menit.",
  "Di antara bising dunia, ada pulau tenang yang terus bertumbuh.",
];

export function ShareSnapshotModal({
  isOpen,
  onClose,
}: ShareSnapshotModalProps) {
  const sessions = useGameStore((state) => state.saveData.focus_sessions);
  const notify = useGameStore((state) => state.notify);

  const [snapshotUrl, setSnapshotUrl] = useState<string | null>(null);
  const [aspectRatio, setAspectRatio] = useState<"story" | "square">("story");
  const [isCopied, setIsCopied] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const analytics = useMemo(() => calculateAnalytics(sessions), [sessions]);
  const milestone = useMemo(
    () => getStreakMilestone(analytics.currentStreak),
    [analytics.currentStreak],
  );

  const todayQuote = useMemo(() => {
    const dayOfYear = Math.floor(Date.now() / 86400000);
    return DAILY_QUOTES[dayOfYear % DAILY_QUOTES.length];
  }, []);

  const formattedDate = useMemo(() => {
    return new Date().toLocaleDateString("id-ID", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const timer = setTimeout(() => {
      const canvasEl = document.querySelector("canvas");
      if (canvasEl) {
        try {
          const dataUrl = canvasEl.toDataURL("image/png");
          setSnapshotUrl(dataUrl);
        } catch {
          console.warn("Canvas export tainted or unavailable");
        }
      }
    }, 150);

    return () => clearTimeout(timer);
  }, [isOpen]);

  const generateCompositeImage = async (): Promise<Blob | null> => {
    if (!snapshotUrl) return null;

    const canvas = document.createElement("canvas");
    const width = 1080;
    const height = aspectRatio === "story" ? 1920 : 1080;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    const bgGradient = ctx.createLinearGradient(0, 0, 0, height);
    bgGradient.addColorStop(0, "#D4E7DC");
    bgGradient.addColorStop(0.5, "#C5DFD1");
    bgGradient.addColorStop(1, "#B4D3C2");
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, width, height);

    ctx.save();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.45)";
    ctx.lineWidth = 120;
    ctx.beginPath();
    ctx.arc(width / 2, height / 2, width * 0.45, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    ctx.fillStyle = "#143525";
    ctx.font = "bold 44px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("🌿 RIMBA", width / 2, aspectRatio === "story" ? 160 : 100);

    ctx.fillStyle = "#1E5638";
    ctx.font = "bold 22px sans-serif";
    ctx.fillText(
      "MINDFUL 3D SANCTUARY",
      width / 2,
      aspectRatio === "story" ? 205 : 135,
    );

    ctx.fillStyle = "#456B57";
    ctx.font = "normal 24px sans-serif";
    ctx.fillText(formattedDate, width / 2, aspectRatio === "story" ? 260 : 180);

    await new Promise<void>((resolve) => {
      const img = new Image();
      img.onload = () => {
        ctx.save();
        const imgSize = aspectRatio === "story" ? 840 : 680;
        const imgX = (width - imgSize) / 2;
        const imgY = aspectRatio === "story" ? 320 : 210;

        const r = 40;
        ctx.beginPath();
        ctx.moveTo(imgX + r, imgY);
        ctx.arcTo(imgX + imgSize, imgY, imgX + imgSize, imgY + imgSize, r);
        ctx.arcTo(imgX + imgSize, imgY + imgSize, imgX, imgY + imgSize, r);
        ctx.arcTo(imgX, imgY + imgSize, imgX, imgY, r);
        ctx.arcTo(imgX, imgY, imgX + imgSize, imgY, r);
        ctx.closePath();
        ctx.clip();

        ctx.drawImage(img, imgX, imgY, imgSize, imgSize);
        ctx.restore();

        ctx.save();
        ctx.strokeStyle = "rgba(255, 255, 255, 0.85)";
        ctx.lineWidth = 8;
        ctx.stroke();
        ctx.restore();

        resolve();
      };
      img.src = snapshotUrl;
    });

    const statsY = aspectRatio === "story" ? 1230 : 920;

    ctx.fillStyle = "#143525";
    ctx.font = "bold 42px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(
      `🔥 ${analytics.currentStreak} Hari Beruntun`,
      width / 2,
      statsY,
    );

    ctx.fillStyle = "#456B57";
    ctx.font = "bold 28px sans-serif";
    ctx.fillText(
      `⏱️ ${analytics.todayMinutes}m Fokus Hari Ini  •  🌳 ${analytics.todayTrees} Pohon Tumbuh`,
      width / 2,
      statsY + 60,
    );

    if (aspectRatio === "story") {
      ctx.fillStyle = "#143525";
      ctx.font = "italic 26px sans-serif";
      ctx.fillText(`"${todayQuote}"`, width / 2, statsY + 220);

      ctx.fillStyle = "#456B57";
      ctx.font = "bold 22px sans-serif";
      ctx.fillText(
        "rimba.app  •  Fokus Tenang, Tumbuhkan Hutanmu",
        width / 2,
        height - 120,
      );
    } else {
      ctx.fillStyle = "#456B57";
      ctx.font = "bold 20px sans-serif";
      ctx.fillText(
        "rimba.app  •  Mindful 3D Productivity",
        width / 2,
        height - 35,
      );
    }

    return new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob), "image/png");
    });
  };

  const handleDownload = async () => {
    setIsGenerating(true);
    soundManager.playPop();
    hapticLight();
    const blob = await generateCompositeImage();
    setIsGenerating(false);

    if (!blob) {
      notify("Gagal membuat gambar kartu.", "error");
      return;
    }

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `rimba-island-${Date.now()}.png`;
    link.click();
    URL.revokeObjectURL(url);
    hapticSuccess();
    notify("🎉 Kartu diorama berhasil diunduh!", "success");
  };

  const handleCopy = async () => {
    setIsGenerating(true);
    soundManager.playPop();
    hapticLight();
    const blob = await generateCompositeImage();
    setIsGenerating(false);

    if (!blob) {
      notify("Gagal menyalin gambar.", "error");
      return;
    }

    try {
      await navigator.clipboard.write([
        new ClipboardItem({ "image/png": blob }),
      ]);
      setIsCopied(true);
      hapticSuccess();
      setTimeout(() => setIsCopied(false), 2500);
      notify("📋 Gambar kartu disalin ke clipboard!", "success");
    } catch {
      notify("Gunakan tombol Unduh Kartu untuk menyimpan gambar.", "info");
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-3.5 select-none antialiased animate-in fade-in duration-200 pointer-events-auto"
      style={{
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', var(--font-geist-sans), sans-serif",
      }}
    >
      {/* Backdrop Ethereal Blur */}
      <div
        className="fixed inset-0 bg-[#3d5e4b]/35 backdrop-blur-md transition-opacity duration-300 pointer-events-none"
        aria-hidden="true"
      />

      {/* Main Container */}
      <div
        className="relative z-10 w-full max-w-[385px] max-h-[92vh] overflow-hidden rounded-[34px] border border-white/80 p-5 shadow-[0_24px_60px_rgba(15,45,28,0.22)] animate-in zoom-in-95 duration-200 flex flex-col space-y-4"
        style={{
          background:
            "linear-gradient(180deg, rgba(239, 246, 241, 0.95) 0%, rgba(226, 238, 230, 0.93) 100%)",
        }}
      >
        {/* Navigation Header */}
        <div className="flex items-center justify-between pt-0.5">
          <div className="flex items-baseline gap-2">
            <h2 className="text-[20px] font-semibold tracking-tight text-[#143525]">
              Bagikan Pulau
            </h2>
            <span className="text-[12px] font-normal text-[#456b57]">
              Kartu Diorama
            </span>
          </div>

          <button
            type="button"
            onClick={() => {
              hapticLight();
              onClose();
            }}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-white/80 bg-white/60 hover:bg-white/80 text-[#143525] transition-transform active:scale-90 cursor-pointer shadow-2xs"
            aria-label="Tutup bagikan pulau"
          >
            <X className="h-4 w-4 stroke-[2.2]" />
          </button>
        </div>

        {/* Aspect Ratio Segmented Control */}
        <div className="rounded-full p-1 border border-white/85 bg-white/60 shadow-2xs grid grid-cols-2 gap-1">
          <button
            type="button"
            onClick={() => {
              soundManager.playPop();
              hapticLight();
              setAspectRatio("story");
            }}
            className={`py-1.5 px-3 rounded-full text-[12px] font-semibold transition-all cursor-pointer ${
              aspectRatio === "story"
                ? "bg-white text-[#143525] shadow-xs"
                : "text-[#456b57] hover:text-[#143525]"
            }`}
          >
            📱 Cerita (9:16)
          </button>

          <button
            type="button"
            onClick={() => {
              soundManager.playPop();
              hapticLight();
              setAspectRatio("square");
            }}
            className={`py-1.5 px-3 rounded-full text-[12px] font-semibold transition-all cursor-pointer ${
              aspectRatio === "square"
                ? "bg-white text-[#143525] shadow-xs"
                : "text-[#456b57] hover:text-[#143525]"
            }`}
          >
            ⏹️ Persegi (1:1)
          </button>
        </div>

        {/* Card Live Preview Container */}
        <div
          className={`relative w-full rounded-[26px] overflow-hidden border border-white/90 shadow-[0_8px_24px_rgba(20,50,30,0.06)] p-4 text-center flex flex-col items-center justify-between transition-all duration-300 ${
            aspectRatio === "story" ? "aspect-[9/13]" : "aspect-square"
          }`}
          style={{
            background:
              "linear-gradient(180deg, #edf6f1 0%, #e2eee6 50%, #d4e7dc 100%)",
          }}
        >
          {/* Top Card Info */}
          <div className="space-y-0.5">
            <span className="text-[12px] font-bold tracking-widest text-[#143525] flex items-center justify-center gap-1">
              <span>🌿</span>
              <span>RIMBA</span>
            </span>
            <p className="text-[10px] text-[#456b57] font-medium">
              {formattedDate} · {milestone.icon} {milestone.title}
            </p>
          </div>

          {/* 3D Island Snapshot Preview */}
          <div className="w-[82%] aspect-square rounded-[20px] overflow-hidden shadow-2xs border-2 border-white my-1 bg-white/50 flex items-center justify-center">
            {snapshotUrl ? (
              <img
                src={snapshotUrl}
                alt="Rimba 3D Island"
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-[11px] text-[#456b57]">
                Mengambil foto pulau...
              </span>
            )}
          </div>

          {/* Bottom Card Summary */}
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white/70 border border-white/80 text-[#143525] text-[11px] font-semibold shadow-2xs">
              <Flame className="w-3 h-3 text-amber-600 fill-amber-500" />
              <span>{analytics.currentStreak} Hari Beruntun</span>
            </div>
            <p className="text-[10.5px] font-medium text-[#456b57]">
              {analytics.todayMinutes}m Fokus · {analytics.todayTrees} Pohon
              Tumbuh
            </p>
            {aspectRatio === "story" && (
              <p className="text-[9.5px] text-[#456b57]/80 italic max-w-xs px-2 line-clamp-1">
                &ldquo;{todayQuote}&rdquo;
              </p>
            )}
          </div>

          {/* Watermark */}
          <span className="text-[9px] font-mono text-[#456b57]/60">
            rimba.app · Mindful Sanctuary
          </span>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2.5 pt-0.5">
          <button
            type="button"
            onClick={handleCopy}
            disabled={isGenerating}
            className="py-2.5 px-3 rounded-full border border-white/90 bg-white/75 hover:bg-white text-[12px] font-semibold text-[#143525] shadow-2xs active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            {isCopied ? (
              <Check className="w-3.5 h-3.5 text-[#1e5638]" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
            <span>{isCopied ? "Tersalin!" : "Salin"}</span>
          </button>

          <button
            type="button"
            onClick={handleDownload}
            disabled={isGenerating}
            className="py-2.5 px-3 rounded-full bg-[#1e5638] hover:bg-[#16442e] text-white text-[12px] font-semibold shadow-xs active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{isGenerating ? "Menyimpan..." : "Unduh Kartu"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
