"use client";

import React, { useState, useRef } from "react";
import { useAuthStore } from "@/lib/auth/useAuthStore";
import { useGameStore } from "@/lib/game/useGameStore";
import { RangerAvatar } from "@/components/ui/RangerAvatar";
import { hapticLight, hapticSuccess } from "@/lib/mobile/nativeBridge";
import { soundManager } from "@/lib/audio/sounds";
import { useTranslation } from "@/lib/i18n/translations";
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
  const { t, translateAvatarPreset } = useTranslation();
  const updateProfile = useAuthStore((state) => state.updateProfile);
  const uploadAvatarFile = useAuthStore((state) => state.uploadAvatarFile);
  const setProfileAvatar = useGameStore((state) => state.setProfileAvatar);
  const timeOfDay = useGameStore((state) => state.timeOfDay);

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
            canvas.toBlob(
              async (blob) => {
                if (blob) {
                  const cloudUrl = await uploadAvatarFile(blob);
                  if (cloudUrl) {
                    setSelectedAvatar(cloudUrl);
                  }
                }
              },
              "image/jpeg",
              0.82,
            );
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

  return (
    <>
      {/* Tipografi Urbanist yang Halus & Modern */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Urbanist:wght@400;500;600;700&display=swap');
        .font-urbanist {
          font-family: 'Urbanist', -apple-system, BlinkMacSystemFont, sans-serif !important;
        }
      `}</style>

      <div
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
        className="fixed inset-0 z-[115] flex items-center justify-center p-4 select-none antialiased font-urbanist text-[#0D3528] animate-in fade-in duration-200 pointer-events-auto"
      >
        {/* Soft Ambient Backdrop */}
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity duration-200 pointer-events-none"
          aria-hidden="true"
        />

        {/* Main Glass Dialog */}
        <div className="relative z-10 w-full max-w-[370px] rounded-3xl border border-white/80 bg-gradient-to-b from-white/95 via-white/95 to-white/90 p-5 shadow-2xl shadow-[#0E3B2D]/20 backdrop-blur-xl animate-in zoom-in-95 duration-200 space-y-4 overflow-hidden">
          {/* Header Navigasi */}
          <div className="flex items-center justify-between pb-0.5">
            <div className="flex items-baseline gap-2">
              <h2 className="text-[19px] font-semibold tracking-tight text-[#0D3528]">
                {t.avatarPicker.title}
              </h2>
              <span className="text-[12px] font-normal text-[#4C7567]">
                {t.avatarPicker.subtitle}
              </span>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-[#0D3528]/5 hover:bg-[#0D3528]/10 text-[#0D3528] transition-all active:scale-90 cursor-pointer shadow-2xs"
              aria-label={t.avatarPicker.closeAria}
            >
              <X className="h-4 w-4 stroke-[2]" />
            </button>
          </div>

          {/* Pratinjau Avatar Lingkaran */}
          <div className="flex flex-col items-center justify-center py-0.5">
            <div className="relative p-1 flex items-center justify-center">
              <div className="rounded-full p-1 bg-white border border-[#BCE5D3] shadow-md shadow-[#0E3B2D]/5">
                <RangerAvatar
                  avatarUrl={selectedAvatar}
                  size={84}
                  borderClassName="border-2 border-white shadow-xs"
                />
              </div>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-1 right-1 w-8 h-8 rounded-full bg-[#187557] hover:bg-[#126046] text-white flex items-center justify-center shadow-md active:scale-90 transition-transform cursor-pointer border-2 border-white z-10"
                title={t.avatarPicker.uploadTitle}
              >
                <Camera className="w-4 h-4 stroke-[2]" />
              </button>
            </div>
            <span className="text-[11.5px] text-[#4C7567] mt-1.5 font-normal">
              {t.avatarPicker.previewHint}
            </span>
          </div>

          {/* Segmented Switcher Pill */}
          <div className="rounded-full p-1 border border-[#0D3528]/8 bg-[#0D3528]/5 grid grid-cols-2 gap-1">
            <button
              type="button"
              onClick={() => {
                setActiveTab("presets");
                soundManager.playPop();
                hapticLight();
              }}
              className={`py-1.5 px-3 rounded-full text-[12px] flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeTab === "presets"
                  ? "bg-white text-[#0D3528] shadow-xs font-semibold"
                  : "text-[#4C7567] hover:text-[#0D3528] font-medium"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 stroke-[1.8] text-[#187557]" />
              <span>{t.avatarPicker.tabPresets}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab("upload");
                soundManager.playPop();
                hapticLight();
              }}
              className={`py-1.5 px-3 rounded-full text-[12px] flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeTab === "upload"
                  ? "bg-white text-[#0D3528] shadow-xs font-semibold"
                  : "text-[#4C7567] hover:text-[#0D3528] font-medium"
              }`}
            >
              <ImageIcon className="w-3.5 h-3.5 stroke-[1.8] text-[#187557]" />
              <span>{t.avatarPicker.tabUpload}</span>
            </button>
          </div>

          {/* Tab 1: Grid Presets */}
          {activeTab === "presets" && (
            <div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto no-scrollbar p-0.5">
              {RIMBA_AVATAR_PRESETS.map((preset) => {
                const isSelected = selectedAvatar === preset.emoji;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleSelectPreset(preset.emoji)}
                    className={`p-2.5 rounded-2xl flex flex-col items-center justify-center gap-1 transition-all active:scale-95 cursor-pointer border ${
                      isSelected
                        ? "border-[#187557]/40 bg-[#E4F4ED] shadow-xs"
                        : "border-white/80 bg-white/70 hover:bg-white shadow-2xs"
                    }`}
                  >
                    <span className="text-2xl leading-none">
                      {preset.emoji}
                    </span>
                    <span
                      className={`text-[10.5px] truncate w-full text-center ${
                        isSelected
                          ? "font-semibold text-[#14664D]"
                          : "font-normal text-[#4C7567]"
                      }`}
                    >
                      {translateAvatarPreset(preset.id, preset.label)}
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
                className="w-full py-6 px-4 rounded-3xl border border-dashed border-[#187557]/30 hover:border-[#187557]/60 bg-[#E4F4ED]/30 hover:bg-[#E4F4ED]/50 shadow-xs flex flex-col items-center justify-center gap-2.5 transition-all cursor-pointer"
              >
                <div className="w-10 h-10 rounded-2xl bg-[#E4F4ED] text-[#187557] border border-[#BCE5D3] flex items-center justify-center shadow-2xs">
                  <Upload className="w-5 h-5 stroke-[1.8]" />
                </div>
                <div className="text-center">
                  <span className="text-[13px] font-semibold text-[#0D3528] block">
                    {isProcessing
                      ? t.avatarPicker.compressing
                      : t.avatarPicker.openGallery}
                  </span>
                  <span className="text-[11px] text-[#4C7567] block mt-0.5 font-normal">
                    {t.avatarPicker.uploadFormatHint}
                  </span>
                </div>
              </button>
            </div>
          )}

          {/* Tombol Simpan */}
          <button
            type="button"
            onClick={handleSave}
            className="w-full py-3 rounded-full bg-[#187557] hover:bg-[#126046] text-white font-medium text-[13px] tracking-tight shadow-xs flex items-center justify-center gap-1.5 active:scale-[0.98] transition-all cursor-pointer"
          >
            <Check className="w-4 h-4 stroke-[2]" />
            <span>{t.avatarPicker.useAvatarBtn}</span>
          </button>
        </div>
      </div>
    </>
  );
}
