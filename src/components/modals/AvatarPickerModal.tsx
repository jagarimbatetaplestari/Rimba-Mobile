"use client";

import React, { useState, useRef } from "react";
import { useAuthStore } from "@/lib/auth/useAuthStore";
import { useGameStore } from "@/lib/game/useGameStore";
import { RangerAvatar } from "@/components/ui/RangerAvatar";
import { hapticLight, hapticSuccess } from "@/lib/mobile/nativeBridge";
import { soundManager } from "@/lib/audio/sounds";
import {
  X,
  Upload,
  Check,
  Camera,
  Sparkles,
  Image as ImageIcon,
} from "lucide-react";

interface AvatarPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentAvatarUrl?: string;
}

export const RIMBA_AVATAR_PRESETS = [
  { id: "preset_deer", label: "Rusa Mistis", emoji: "🦌" },
  { id: "preset_koala", label: "Koala Zen", emoji: "🐨" },
  { id: "preset_cat", label: "Kucing Rimba", emoji: "🐱" },
  { id: "preset_bird", label: "Kutilang", emoji: "🐦" },
  { id: "preset_tree", label: "Beringin", emoji: "🌲" },
  { id: "preset_orchid", label: "Anggrek", emoji: "🌸" },
  { id: "preset_fox", label: "Rubah Emas", emoji: "🦊" },
  { id: "preset_ranger", label: "Ranger", emoji: "🏕️" },
];

export function AvatarPickerModal({
  isOpen,
  onClose,
  currentAvatarUrl,
}: AvatarPickerModalProps) {
  const updateProfile = useAuthStore((state) => state.updateProfile);
  const uploadAvatarFile = useAuthStore((state) => state.uploadAvatarFile);
  const setProfileAvatar = useGameStore((state) => state.setProfileAvatar);
  const [selectedAvatar, setSelectedAvatar] = useState<string>(
    currentAvatarUrl || "",
  );
  const [activeTab, setActiveTab] = useState<"presets" | "upload">("presets");
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleSelectPreset = (presetEmoji: string) => {
    soundManager.playPop();
    hapticLight();
    setSelectedAvatar(presetEmoji);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    soundManager.playPop();
    hapticLight();

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = async () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        const size = 256;
        canvas.width = size;
        canvas.height = size;

        if (ctx) {
          const minDim = Math.min(img.width, img.height);
          const startX = (img.width - minDim) / 2;
          const startY = (img.height - minDim) / 2;

          ctx.drawImage(img, startX, startY, minDim, minDim, 0, 0, size, size);
          const compressedDataUrl = canvas.toDataURL("image/jpeg", 0.82);
          setSelectedAvatar(compressedDataUrl);

          // Coba unggah ke Supabase Storage jika akun terhubung
          try {
            canvas.toBlob(async (blob) => {
              if (blob) {
                const cloudUrl = await uploadAvatarFile(blob);
                if (cloudUrl) {
                  setSelectedAvatar(cloudUrl);
                }
              }
            }, "image/jpeg", 0.82);
          } catch {
            // Tetap gunakan compressedDataUrl
          }
        }
        setIsProcessing(false);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    soundManager.playComplete();
    hapticSuccess();
    if (selectedAvatar) {
      updateProfile({ avatarUrl: selectedAvatar });
      setProfileAvatar(selectedAvatar);
    }
    onClose();
  };

  const isDataUrl =
    selectedAvatar?.startsWith("data:image/") ||
    selectedAvatar?.startsWith("http");

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

      {/* Main Sheet Container */}
      <div
        className="relative z-10 w-full max-w-[385px] rounded-[34px] border border-white/80 p-5 shadow-[0_24px_60px_rgba(15,45,28,0.22)] animate-in zoom-in-95 duration-200 space-y-4"
        style={{
          background:
            "linear-gradient(180deg, rgba(239, 246, 241, 0.95) 0%, rgba(226, 238, 230, 0.93) 100%)",
        }}
      >
        {/* Navigation Header */}
        <div className="flex items-center justify-between pt-0.5">
          <div className="flex items-baseline gap-2">
            <h2 className="text-[20px] font-semibold tracking-tight text-[#143525]">
              Foto Profil
            </h2>
            <span className="text-[12px] font-normal text-[#456b57]">
              Pilih Maskot
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-white/80 bg-white/60 hover:bg-white/80 text-[#143525] transition-transform active:scale-90 cursor-pointer shadow-2xs"
            aria-label="Tutup pemilih avatar"
          >
            <X className="h-4 w-4 stroke-[2.2]" />
          </button>
        </div>

        {/* Live Circular Avatar Preview */}
        <div className="flex flex-col items-center justify-center py-1">
          <div className="relative p-1 flex items-center justify-center">
            <RangerAvatar
              avatarUrl={selectedAvatar}
              size={84}
              borderClassName="border-2 border-white shadow-[0_8px_24px_rgba(20,50,30,0.08)] bg-white/80"
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-[#1e5638] text-white flex items-center justify-center shadow-xs active:scale-90 transition-transform cursor-pointer border-2 border-white z-10"
              title="Unggah Foto"
            >
              <Camera className="w-3.5 h-3.5" />
            </button>
          </div>
          <span className="text-[11px] text-[#456b57] mt-2 font-medium">
            Pratinjau di Status & Peringkat
          </span>
        </div>

        {/* Mode Switcher Segmented Control */}
        <div className="rounded-full p-1 border border-white/85 bg-white/60 shadow-2xs grid grid-cols-2 gap-1">
          <button
            type="button"
            onClick={() => {
              setActiveTab("presets");
              soundManager.playPop();
              hapticLight();
            }}
            className={`py-2 px-3 rounded-full text-[12px] font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === "presets"
                ? "bg-white text-[#143525] shadow-xs"
                : "text-[#456b57] hover:text-[#143525]"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Preset Satwa</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab("upload");
              soundManager.playPop();
              hapticLight();
            }}
            className={`py-2 px-3 rounded-full text-[12px] font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === "upload"
                ? "bg-white text-[#143525] shadow-xs"
                : "text-[#456b57] hover:text-[#143525]"
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>Unggah Foto</span>
          </button>
        </div>

        {/* Tab 1: Presets Grid */}
        {activeTab === "presets" && (
          <div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto no-scrollbar p-0.5">
            {RIMBA_AVATAR_PRESETS.map((preset) => {
              const isSelected = selectedAvatar === preset.emoji;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handleSelectPreset(preset.emoji)}
                  className={`p-2.5 rounded-[20px] flex flex-col items-center justify-center gap-1 transition-all active:scale-95 cursor-pointer ${
                    isSelected
                      ? "border-2 border-[#1e5638] bg-white shadow-xs"
                      : "border border-white/85 bg-white/70 hover:bg-white/90 shadow-2xs"
                  }`}
                >
                  <span className="text-2xl leading-none">{preset.emoji}</span>
                  <span
                    className={`text-[10px] truncate w-full text-center ${
                      isSelected
                        ? "font-bold text-[#143525]"
                        : "font-medium text-[#456b57]"
                    }`}
                  >
                    {preset.label}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Tab 2: Custom Upload */}
        {activeTab === "upload" && (
          <div className="space-y-3">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileUpload}
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing}
              className="w-full py-6 px-4 rounded-[24px] border-2 border-dashed border-[#143525]/20 hover:border-[#1e5638] bg-white/70 hover:bg-white/90 shadow-2xs flex flex-col items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <div className="w-10 h-10 rounded-full bg-[#bfdac8]/50 text-[#143525] flex items-center justify-center">
                <Upload className="w-5 h-5 stroke-[2.2]" />
              </div>
              <div className="text-center">
                <span className="text-[12.5px] font-semibold text-[#143525] block">
                  {isProcessing
                    ? "Mengompres foto..."
                    : "Buka Galeri atau Kamera"}
                </span>
                <span className="text-[10.5px] text-[#456b57] block mt-0.5">
                  Format JPG, PNG, WEBP (otomatis dioptimalkan)
                </span>
              </div>
            </button>
          </div>
        )}

        {/* Save Button */}
        <button
          type="button"
          onClick={handleSave}
          className="w-full py-3 rounded-full bg-[#1e5638] hover:bg-[#16442e] text-white font-semibold text-[13px] tracking-tight shadow-xs flex items-center justify-center gap-1.5 active:scale-[0.98] transition-all cursor-pointer pt-3"
        >
          <Check className="w-4 h-4 stroke-[2.4]" />
          <span>Gunakan Avatar Ini</span>
        </button>
      </div>
    </div>
  );
}
