"use client";

import React, { useState, useRef } from "react";
import { useGameStore } from "@/lib/game/useGameStore";
import {
  validateRimbaBackup,
  BackupValidationResult,
  createIslandSnapshot,
} from "@/lib/game/backupManager";
import { soundManager } from "@/lib/audio/sounds";
import {
  hapticLight,
  hapticSuccess,
  hapticWarning,
} from "@/lib/mobile/nativeBridge";
import {
  X,
  Upload,
  FileCheck2,
  AlertTriangle,
  TreePine,
  Clock,
  Coins,
  ShieldCheck,
  Check,
} from "lucide-react";

interface RestoreDataModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function RestoreDataModal({ isOpen, onClose }: RestoreDataModalProps) {
  const currentSaveData = useGameStore((state) => state.saveData);
  const importSaveData = useGameStore((state) => state.importSaveData);

  const [validation, setValidation] = useState<BackupValidationResult | null>(
    null,
  );
  const [fileName, setFileName] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [autoBackupCurrent, setAutoBackupCurrent] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setIsProcessing(true);
    soundManager.playPop();
    hapticLight();

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const res = validateRimbaBackup(content);
      setValidation(res);
      setIsProcessing(false);
      if (res.isValid) {
        soundManager.playComplete();
        hapticSuccess();
      } else {
        soundManager.playError();
        hapticWarning();
      }
    };
    reader.onerror = () => {
      setValidation({
        isValid: false,
        error: "Gagal membaca berkas dari penyimpanan perangkat.",
      });
      setIsProcessing(false);
      soundManager.playError();
    };
    reader.readAsText(file);
  };

  const handleConfirmRestore = () => {
    if (!validation?.isValid || !validation.data) return;

    soundManager.playComplete();
    hapticSuccess();

    if (autoBackupCurrent) {
      createIslandSnapshot(
        currentSaveData,
        `Auto-Backup Sebelum Pulihkan (${new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })})`,
      );
    }

    importSaveData(validation.data);
    onClose();
  };

  const handleResetPicker = () => {
    setValidation(null);
    setFileName("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

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
              Pulihkan Data
            </h2>
            <span className="text-[12px] font-normal text-[#456b57]">
              Impor Cadangan
            </span>
          </div>

          <button
            type="button"
            onClick={() => {
              hapticLight();
              onClose();
            }}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-white/80 bg-white/60 hover:bg-white/80 text-[#143525] transition-transform active:scale-90 cursor-pointer shadow-2xs"
            aria-label="Tutup pulihkan data"
          >
            <X className="h-4 w-4 stroke-[2.2]" />
          </button>
        </div>

        {/* File Picker Section */}
        {!validation?.isValid ? (
          <div className="space-y-3">
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              onChange={handleFileChange}
              className="hidden"
            />

            <div
              onClick={() => fileInputRef.current?.click()}
              className="p-6 rounded-[26px] border-2 border-dashed border-[#143525]/20 hover:border-[#1e5638] bg-white/70 hover:bg-white/90 transition-all cursor-pointer flex flex-col items-center justify-center text-center gap-3 shadow-2xs active:scale-[0.98]"
            >
              <div className="w-11 h-11 rounded-full bg-[#bfdac8]/50 text-[#143525] flex items-center justify-center">
                <Upload className="w-5 h-5 stroke-[2.2]" />
              </div>
              <div>
                <p className="text-[13px] font-semibold text-[#143525]">
                  {isProcessing
                    ? "Memeriksa berkas..."
                    : "Pilih Berkas Cadangan (.json)"}
                </p>
                <p className="text-[11px] text-[#456b57] mt-0.5">
                  Ketuk untuk mencari dokumen lokal
                </p>
              </div>
            </div>

            {/* Error Banner */}
            {validation?.error && (
              <div className="p-3.5 rounded-[20px] bg-rose-50 border border-rose-200/80 text-rose-700 text-xs flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold block">
                    Gagal Memvalidasi Berkas
                  </span>
                  <span className="text-[11px] text-rose-600/80 mt-0.5 block">
                    {validation.error}
                  </span>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Validation Success Summary */
          <div className="space-y-3 overflow-y-auto no-scrollbar flex-1 pr-0.5">
            <div className="p-3.5 rounded-[22px] border border-white/85 bg-white/80 shadow-2xs flex items-center justify-between">
              <div className="flex items-center gap-2.5 min-w-0 pr-2">
                <FileCheck2 className="w-5 h-5 text-[#1e5638] shrink-0" />
                <div className="min-w-0 text-left">
                  <span className="text-[13px] font-semibold text-[#143525] block truncate">
                    {validation.summary?.worldName || "Suaka Rimba"}
                  </span>
                  <span className="text-[10.5px] text-[#456b57] truncate block">
                    {fileName} (Valid)
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={handleResetPicker}
                className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-[#bfdac8]/40 hover:bg-[#bfdac8]/60 text-[#143525] transition-colors cursor-pointer shrink-0"
              >
                Ganti
              </button>
            </div>

            {/* Stats 2x2 Bento Grid */}
            <div className="grid grid-cols-2 gap-2.5">
              <div className="p-3 rounded-[20px] border border-white/85 bg-white/75 shadow-2xs flex items-center gap-2.5">
                <TreePine className="w-4 h-4 text-[#1e5638] shrink-0" />
                <div>
                  <span className="text-[10px] text-[#456b57] uppercase font-semibold block">
                    Pohon Subur
                  </span>
                  <span className="font-mono font-bold text-[#143525] text-xs">
                    {validation.summary?.treesCount} Pohon
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-[20px] border border-white/85 bg-white/75 shadow-2xs flex items-center gap-2.5">
                <Coins className="w-4 h-4 text-amber-500 shrink-0" />
                <div>
                  <span className="text-[10px] text-[#456b57] uppercase font-semibold block">
                    Energi Soul
                  </span>
                  <span className="font-mono font-bold text-[#143525] text-xs">
                    {validation.summary?.gold.toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-[20px] border border-white/85 bg-white/75 shadow-2xs flex items-center gap-2.5">
                <Clock className="w-4 h-4 text-[#1e5638] shrink-0" />
                <div>
                  <span className="text-[10px] text-[#456b57] uppercase font-semibold block">
                    Total Fokus
                  </span>
                  <span className="font-mono font-bold text-[#143525] text-xs">
                    {validation.summary?.totalFocusMinutes}m
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-[20px] border border-white/85 bg-white/75 shadow-2xs flex items-center gap-2.5">
                <ShieldCheck className="w-4 h-4 text-[#1e5638] shrink-0" />
                <div>
                  <span className="text-[10px] text-[#456b57] uppercase font-semibold block">
                    Level Suaka
                  </span>
                  <span className="font-mono font-bold text-[#143525] text-xs">
                    Level {validation.summary?.level}
                  </span>
                </div>
              </div>
            </div>

            {/* Auto-backup Switcher */}
            <div className="p-3 rounded-[20px] border border-white/85 bg-white/75 shadow-2xs flex items-center justify-between">
              <div className="flex flex-col pr-2 text-left">
                <span className="text-[12.5px] font-semibold text-[#143525]">
                  Amankan Data Saat Ini
                </span>
                <span className="text-[10.5px] text-[#456b57]">
                  Buat snapshot otomatis sebelum menimpa
                </span>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={autoBackupCurrent}
                onClick={() => setAutoBackupCurrent(!autoBackupCurrent)}
                className={`relative w-10 h-6 shrink-0 rounded-full p-0.5 transition-colors duration-200 cursor-pointer ${
                  autoBackupCurrent ? "bg-[#1e5638]" : "bg-black/15"
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                    autoBackupCurrent ? "translate-x-4" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            {/* Warning Note */}
            <p className="text-[11px] text-amber-800 bg-amber-50/80 border border-amber-200/70 p-2.5 rounded-[18px] leading-relaxed">
              Memulihkan data akan menggantikan tata letak pulau yang aktif saat
              ini.
            </p>
          </div>
        )}

        {/* Action Button */}
        {validation?.isValid && (
          <button
            type="button"
            onClick={handleConfirmRestore}
            className="w-full py-3 rounded-full bg-[#1e5638] hover:bg-[#16442e] text-white font-semibold text-[13px] tracking-tight shadow-xs flex items-center justify-center gap-1.5 active:scale-[0.98] transition-all cursor-pointer"
          >
            <Check className="w-4 h-4 stroke-[2.4]" />
            <span>Terapkan & Pulihkan Suaka</span>
          </button>
        )}
      </div>
    </div>
  );
}
