'use client';

import { useEffect, useState } from 'react';
import { X, Smartphone, Lock, Sliders, RefreshCw } from 'lucide-react';
import { useGameStore } from '@/lib/game/useGameStore';
import { useTranslation } from '@/lib/i18n/translations';
import { getNativeWidgetStatus, getWidgetQuickPresetMinutes, setWidgetQuickPresetMinutes, syncWidgetsWithSaveData, WidgetStatus } from '@/lib/mobile/widgetBridge';

export interface WidgetControlCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onQuickStartFocus?: (minutes: number) => void;
}

export function WidgetControlCenterModal({ isOpen, onClose }: WidgetControlCenterModalProps) {
  const { language } = useTranslation();
  const en = language === 'en';
  const [status, setStatus] = useState<WidgetStatus>({ available: false, controlsSupported: false });
  const [minutes, setMinutes] = useState(25);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    let disposed = false;
    setMinutes(getWidgetQuickPresetMinutes());
    setMessage('');
    void getNativeWidgetStatus().then(value => { if (!disposed) setStatus(value); });
    return () => { disposed = true; };
  }, [isOpen]);

  if (!isOpen) return null;
  const sync = async (preset?: number) => {
    if (busy) return;
    if (preset) { setMinutes(preset); setWidgetQuickPresetMinutes(preset); }
    setBusy(true);
    const game = useGameStore.getState();
    const result = await syncWidgetsWithSaveData(game.saveData, game.activeSession, true);
    setStatus(await getNativeWidgetStatus());
    setMessage(result.nativeSynced
      ? (en ? 'Widget data updated. iOS controls when widgets refresh.' : 'Data widget diperbarui. iOS mengatur waktu penyegaran widget.')
      : (en ? 'Native widgets are unavailable in this build. Install the latest Rimba iOS build.' : 'Widget native belum tersedia di build ini. Pasang build iOS Rimba terbaru.'));
    setBusy(false);
  };
  const surfaces = [
    { icon: Smartphone, title: en ? 'Home Screen' : 'Layar Utama', text: en ? 'Touch and hold the Home Screen → Edit → Add Widget → Rimba. Choose a small or medium widget.' : 'Tekan lama Layar Utama → Edit → Tambah Widget → Rimba. Pilih widget kecil atau sedang.' },
    { icon: Lock, title: en ? 'Lock Screen' : 'Layar Kunci', text: en ? 'Touch and hold the Lock Screen → Customize → Lock Screen → Add Widgets → Rimba.' : 'Tekan lama Layar Kunci → Sesuaikan → Layar Kunci → Tambah Widget → Rimba.' },
    { icon: Sliders, title: en ? 'Control Center · iOS 18+' : 'Pusat Kontrol · iOS 18+', text: en ? 'Open Control Center → touch and hold → Add a Control → Rimba Focus. Tapping it opens Rimba to start focus, or returns to your current session.' : 'Buka Pusat Kontrol → tekan lama → Tambah Kontrol → Rimba Focus. Ketuk untuk membuka Rimba dan mulai fokus, atau kembali ke sesi aktif.' },
  ];

  return <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
    <section role="dialog" aria-modal="true" aria-labelledby="native-widget-title" onClick={e => e.stopPropagation()}
      className="w-full max-w-lg max-h-[90dvh] overflow-y-auto rounded-t-3xl sm:rounded-3xl border border-emerald-100/20 bg-[#092b23] text-white shadow-2xl p-6"
      style={{ paddingBottom: 'max(24px, env(safe-area-inset-bottom, 0px))' }}>
      <div className="flex items-center justify-between gap-3 mb-2">
        <h2 id="native-widget-title" className="text-xl font-bold">{en ? 'Rimba native widgets' : 'Widget native Rimba'}</h2>
        <button aria-label={en ? 'Close' : 'Tutup'} onClick={onClose} className="p-3 rounded-full bg-white/10"><X size={20} /></button>
      </div>
      <p className="text-sm text-emerald-100/70 mb-5">{en ? 'Add widgets from your device. Your focus and sanctuary progress appear outside the app.' : 'Pasang widget dari perangkat. Fokus dan progres suaka tampil di luar aplikasi.'}</p>
      <div className="rounded-2xl bg-emerald-100/10 border border-emerald-100/10 px-4 py-3 mb-5 text-sm" role="status">
        {status.available
          ? (en ? 'Native integration ready' : 'Integrasi native siap')
          : (en ? 'Requires the latest iOS build' : 'Memerlukan build iOS terbaru')}
        {status.installedWidgets !== undefined && <span className="block text-emerald-100/65 mt-1">{status.installedWidgets} {en ? 'Home / Lock Screen widgets installed' : 'widget Layar Utama / Kunci terpasang'}</span>}
      </div>
      <div className="space-y-4">
        {surfaces.map(({ icon: Icon, title, text }) => <div key={title} className="flex gap-3">
          <Icon className="shrink-0 text-emerald-300 mt-1" size={20} />
          <div><h3 className="font-semibold text-sm">{title}</h3><p className="text-sm text-emerald-100/70 mt-1 leading-relaxed">{text}</p></div>
        </div>)}
      </div>
      <fieldset className="mt-6" disabled={busy}>
        <legend className="text-sm font-semibold mb-3">{en ? 'Quick focus duration' : 'Durasi fokus cepat'}</legend>
        <div className="grid grid-cols-4 gap-2">{[15, 25, 45, 60].map(value => <button key={value} aria-pressed={value === minutes} onClick={() => void sync(value)}
          className={`rounded-xl py-3 text-sm font-bold disabled:opacity-50 ${minutes === value ? 'bg-emerald-300 text-emerald-950' : 'bg-white/10'}`}>{value} {en ? 'min' : 'mnt'}</button>)}</div>
      </fieldset>
      <button disabled={busy} onClick={() => void sync()} className="mt-4 w-full flex justify-center items-center gap-2 bg-white/10 rounded-xl py-3 text-sm font-semibold disabled:opacity-50">
        <RefreshCw size={16} className={busy ? 'animate-spin' : ''} />{busy ? (en ? 'Updating…' : 'Memperbarui…') : (en ? 'Refresh widget data' : 'Perbarui data widget')}
      </button>
      {message && <p role="status" className="mt-3 text-sm text-emerald-100/80">{message}</p>}
      <p className="mt-4 text-xs text-emerald-100/50">{en ? 'Focus shortcuts open Rimba. They do not silently start or cancel sessions while the app is closed. Widget refresh timing is managed by iOS.' : 'Pintasan fokus membuka Rimba. Sesi tidak dimulai atau dibatalkan diam-diam saat aplikasi tertutup. Jadwal penyegaran widget diatur iOS.'}</p>
    </section>
  </div>;
}
