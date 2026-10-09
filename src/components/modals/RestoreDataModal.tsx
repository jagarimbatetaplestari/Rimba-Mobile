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
import { useTranslation } from "@/lib/i18n/translations";

interface RestoreDataModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function RestoreDataModal({ isOpen, onClose }: RestoreDataModalProps) {
  const { t, language } = useTranslation();
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
        error: t.restoreModal.readingError,
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
        `Auto-Backup (${new Date().toLocaleTimeString(language === "en" ? "en-US" : "id-ID", { hour: "2-digit", minute: "2-digit" })})`,
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
        <div className="relative z-10 w-full max-w-[375px] max-h-[90vh] overflow-hidden rounded-3xl border border-white/80 bg-gradient-to-b from-white/95 via-white/95 to-white/90 p-5 shadow-2xl shadow-[#0E3B2D]/20 backdrop-blur-xl animate-in zoom-in-95 duration-200 flex flex-col space-y-4">
          {/* Header Navigasi */}
          <div className="flex items-center justify-between pb-0.5">
            <div className="flex items-baseline gap-2">
              <h2 className="text-[19px] font-semibold tracking-tight text-[#0D3528]">
                {t.restoreModal.title}
              </h2>
              <span className="text-[12px] font-normal text-[#4C7567]">
                {t.restoreModal.subtitle}
              </span>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-[#0D3528]/5 hover:bg-[#0D3528]/10 text-[#0D3528] transition-all active:scale-90 cursor-pointer shadow-2xs"
              aria-label={t.common.close}
            >
              <X className="h-4 w-4 stroke-[2]" />
            </button>
          </div>

          {/* Bagian Pemilihan Berkas */}
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
                className="p-6 rounded-3xl border border-dashed border-[#187557]/30 hover:border-[#187557]/60 bg-[#E4F4ED]/30 hover:bg-[#E4F4ED]/50 transition-all cursor-pointer flex flex-col items-center justify-center text-center gap-3 shadow-xs active:scale-[0.98]"
              >
                <div className="w-11 h-11 rounded-2xl bg-[#E4F4ED] text-[#187557] border border-[#BCE5D3] flex items-center justify-center shadow-2xs">
                  <Upload className="w-5 h-5 stroke-[1.8]" />
                </div>
                <div>
                  <p className="text-[13.5px] font-semibold text-[#0D3528]">
                    {isProcessing
                      ? (language === "en" ? "Checking file..." : "Memeriksa berkas...")
                      : t.restoreModal.dropzoneTitle}
                  </p>
                  <p className="text-[11.5px] text-[#4C7567] mt-0.5 font-normal">
                    {t.restoreModal.dropzoneDesc}
                  </p>
                </div>
              </div>

              {/* Banner Kesalahan */}
              {validation?.error && (
                <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5 stroke-[2]" />
                  <div>
                    <span className="font-semibold block">
                      {t.restoreModal.invalidFile}
                    </span>
                    <span className="text-[11px] text-rose-600/80 mt-0.5 block font-normal">
                      {validation.error}
                    </span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Ringkasan Validasi Berhasil */
            <div className="space-y-3 overflow-y-auto no-scrollbar flex-1 pr-0.5">
              <div className="p-3.5 rounded-2xl border border-[#BCE5D3] bg-[#E4F4ED]/70 shadow-xs flex items-center justify-between">
                <div className="flex items-center gap-2.5 min-w-0 pr-2">
                  <FileCheck2 className="w-5 h-5 text-[#187557] shrink-0 stroke-[1.8]" />
                  <div className="min-w-0 text-left">
                    <span className="text-[13.5px] font-semibold text-[#0D3528] block truncate">
                      {validation.summary?.worldName || "Suaka Rimba"}
                    </span>
                    <span className="text-[11px] text-[#4C7567] truncate block font-normal">
                      {fileName} (Valid)
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleResetPicker}
                  className="text-[11px] font-medium px-3 py-1 rounded-full bg-white border border-[#BCE5D3] text-[#14664D] hover:bg-[#E4F4ED] transition-colors cursor-pointer shrink-0 shadow-2xs"
                >
                  {language === "en" ? "Change" : "Ganti"}
                </button>
              </div>

              {/* Bento Grid Statistik 2x2 */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="p-3 rounded-2xl border border-[#0D3528]/8 bg-[#0D3528]/[0.025] flex items-center gap-2.5">
                  <TreePine className="w-4 h-4 text-[#187557] shrink-0 stroke-[1.8]" />
                  <div>
                    <span className="text-[10px] text-[#4C7567] uppercase font-medium tracking-wider block">
                      {language === "en" ? "Lush Trees" : "Pohon Subur"}
                    </span>
                    <span className="font-semibold text-[#0D3528] text-xs tabular-nums">
                      {validation.summary?.treesCount} {language === "en" ? "Trees" : "Pohon"}
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded-2xl border border-[#0D3528]/8 bg-[#0D3528]/[0.025] flex items-center gap-2.5">
                  <Coins className="w-4 h-4 text-amber-600 shrink-0 stroke-[1.8]" />
                  <div>
                    <span className="text-[10px] text-[#4C7567] uppercase font-medium tracking-wider block">
                      Soul
                    </span>
                    <span className="font-semibold text-[#0D3528] text-xs tabular-nums">
                      {validation.summary?.gold.toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded-2xl border border-[#0D3528]/8 bg-[#0D3528]/[0.025] flex items-center gap-2.5">
                  <Clock className="w-4 h-4 text-[#187557] shrink-0 stroke-[1.8]" />
                  <div>
                    <span className="text-[10px] text-[#4C7567] uppercase font-medium tracking-wider block">
                      {language === "en" ? "Total Focus" : "Total Fokus"}
                    </span>
                    <span className="font-semibold text-[#0D3528] text-xs tabular-nums">
                      {validation.summary?.totalFocusMinutes}m
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded-2xl border border-[#0D3528]/8 bg-[#0D3528]/[0.025] flex items-center gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-[#187557] shrink-0 stroke-[1.8]" />
                  <div>
                    <span className="text-[10px] text-[#4C7567] uppercase font-medium tracking-wider block">
                      {language === "en" ? "Sanctuary Level" : "Level Suaka"}
                    </span>
                    <span className="font-semibold text-[#0D3528] text-xs tabular-nums">
                      Level {validation.summary?.level}
                    </span>
                  </div>
                </div>
              </div>

              {/* Sakelar Cadangan Otomatis */}
              <div className="p-3.5 rounded-2xl border border-[#0D3528]/8 bg-[#0D3528]/[0.025] flex items-center justify-between">
                <div className="flex flex-col pr-2 text-left">
                  <span className="text-[13px] font-semibold text-[#0D3528]">
                    {language === "en" ? "Auto-Backup Current Island" : "Amankan Data Saat Ini"}
                  </span>
                  <span className="text-[11px] text-[#4C7567] font-normal">
                    {language === "en" ? "Automatically snapshot before overwriting" : "Buat snapshot otomatis sebelum menimpa"}
                  </span>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={autoBackupCurrent}
                  onClick={() => setAutoBackupCurrent(!autoBackupCurrent)}
                  className={`relative w-11 h-6 shrink-0 rounded-full p-0.5 transition-colors duration-200 cursor-pointer ${
                    autoBackupCurrent ? "bg-[#187557]" : "bg-[#0D3528]/15"
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-white shadow-xs transition-transform duration-200 ${
                      autoBackupCurrent ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              {/* Catatan Peringatan */}
              <p className="text-[11.5px] text-amber-900 bg-amber-50/80 border border-amber-200/70 p-3 rounded-2xl leading-relaxed font-normal">
                {language === "en"
                  ? "Restoring data will replace your current active island layout."
                  : "Memulihkan data akan menggantikan tata letak pulau yang aktif saat ini."}
              </p>
            </div>
          )}

          {/* Tombol Aksi */}
          {validation?.isValid && (
            <button
              type="button"
              onClick={handleConfirmRestore}
              className="w-full py-3 rounded-full bg-[#187557] hover:bg-[#126046] text-white font-medium text-[13px] tracking-tight shadow-xs flex items-center justify-center gap-1.5 active:scale-[0.98] transition-all cursor-pointer"
            >
              <Check className="w-4 h-4 stroke-[2]" />
              <span>{t.restoreModal.confirmBtn}</span>
            </button>
          )}
        </div>
      </div>
    </>
  );
}
