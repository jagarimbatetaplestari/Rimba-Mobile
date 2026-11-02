'use client';

import React, { useEffect, useState } from 'react';
import { X, RefreshCw, ShieldCheck } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/auth/useAuthStore';
import { useTranslation } from '@/lib/i18n/translations';

interface Report {
  id: string; reason: string; target_id: string; created_at: string;
  evidence: { name?: string; participants?: { id: string; name: string }[] };
}

export function CampfireModerationModal({ onClose }: { onClose: () => void }) {
  const { language } = useTranslation();
  const en = language === 'en';
  const owner = useAuthStore(s => s.user?.id);
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const [reload, setReload] = useState(0);
  const [selection, setSelection] = useState<{ id: string; action: 'dismiss' | 'remove' | 'suspend' } | null>(null);
  const [note, setNote] = useState('');

  useEffect(() => {
    let closed = false;
    setLoading(true); setReports([]); setError(false); setSelection(null);
    void supabase.rpc('campfire_moderator_queue_v1').then(({ data, error: failure }) => {
      if (closed || useAuthStore.getState().user?.id !== owner) return;
      if (failure || !Array.isArray(data)) setError(true);
      else setReports(data as Report[]);
      setLoading(false);
    }, () => { if (!closed) { setError(true); setLoading(false); } });
    return () => { closed = true; };
  }, [owner, reload]);

  async function resolve() {
    if (!selection || busy || note.trim().length < 3) return;
    const selected = selection;
    setBusy(selected.id); setError(false);
    try {
      const { data, error: failure } = await supabase.rpc('campfire_moderate_v1', {
        p_report_id: selected.id, p_action: selected.action, p_note: note.trim(),
      });
      if (useAuthStore.getState().user?.id !== owner) return;
      if (failure || data?.resolved !== true) { setError(true); return; }
      setReports(current => current.filter(report => report.id !== selected.id));
      setSelection(null); setNote('');
    } catch { setError(true); } finally { setBusy(null); }
  }

  return <section role="dialog" aria-modal="true" aria-label={en ? 'Campfire moderation' : 'Moderasi Campfire'}
    className="fixed inset-0 z-[120] pointer-events-auto overflow-y-auto bg-[#FAFAF7] text-[#0D3528] safe-modal-content p-5">
    <div className="mx-auto max-w-2xl space-y-5 pb-8">
      <header className="flex items-center gap-3">
        <ShieldCheck className="h-6 w-6" />
        <h2 className="flex-1 text-xl font-semibold">{en ? 'Campfire moderation' : 'Moderasi Campfire'}</h2>
        <button onClick={() => setReload(n => n + 1)} disabled={loading || !!busy} aria-label={en ? 'Refresh reports' : 'Segarkan laporan'} className="min-h-11 min-w-11 rounded-full bg-emerald-900/5 flex items-center justify-center"><RefreshCw className="h-5 w-5" /></button>
        <button onClick={onClose} disabled={!!busy} aria-label={en ? 'Close' : 'Tutup'} className="min-h-11 min-w-11 rounded-full bg-emerald-900/5 flex items-center justify-center"><X className="h-5 w-5" /></button>
      </header>
      {loading && <p role="status">{en ? 'Loading reports…' : 'Memuat laporan…'}</p>}
      {error && <p role="alert" className="rounded-2xl bg-rose-50 p-4 text-rose-800">{en ? 'Reports could not be processed. Check your moderator access and connection, then refresh.' : 'Laporan belum dapat diproses. Periksa akses moderator dan koneksi, lalu segarkan.'}</p>}
      {!loading && !error && reports.length === 0 && <p>{en ? 'No pending reports.' : 'Tidak ada laporan tertunda.'}</p>}
      {reports.map(report => <article key={report.id} className="space-y-3 rounded-3xl border border-emerald-900/10 bg-white p-5">
        <p className="text-xs text-emerald-900/60">{new Date(report.created_at).toLocaleString(en ? 'en-US' : 'id-ID')}</p>
        <h3 className="font-semibold break-words">{report.evidence?.participants?.find(p => p.id === report.target_id)?.name || (en ? 'Reported participant' : 'Peserta dilaporkan')}</h3>
        <p className="break-words whitespace-pre-wrap">{report.reason}</p>
        <details><summary className="cursor-pointer py-2 text-sm">{en ? 'Captured room evidence' : 'Bukti ruang saat dilaporkan'}</summary>
          <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-all rounded-xl bg-emerald-900/5 p-3 text-xs">{JSON.stringify(report.evidence, null, 2)}</pre>
        </details>
        <div className="flex flex-wrap gap-2">
          {(['dismiss', 'remove', 'suspend'] as const).map(action => <button key={action} disabled={!!busy} onClick={() => { setSelection({ id: report.id, action }); setNote(''); }} className="min-h-11 rounded-xl border border-emerald-900/15 px-3 text-sm">{action === 'dismiss' ? (en ? 'Dismiss report' : 'Tutup laporan') : action === 'remove' ? (en ? 'Remove from room' : 'Keluarkan dari ruang') : (en ? 'Suspend Campfire access' : 'Tangguhkan akses Campfire')}</button>)}
        </div>
        {selection?.id === report.id && <div className="space-y-3 rounded-2xl bg-amber-50 p-4">
          <p className="text-sm">{selection.action === 'suspend' ? (en ? 'This prevents this account from using Campfire.' : 'Akun ini tidak dapat menggunakan Campfire setelah ditangguhkan.') : selection.action === 'remove' ? (en ? 'This removes the participant and closes this room.' : 'Peserta akan dikeluarkan dan ruang ini ditutup.') : (en ? 'Close this report without restricting the participant.' : 'Tutup laporan tanpa membatasi peserta.')}</p>
          <label className="block text-sm">{en ? 'Decision note' : 'Catatan keputusan'}<textarea value={note} onChange={e => setNote(e.target.value)} maxLength={500} className="mt-2 w-full rounded-xl border border-emerald-900/20 p-3" /></label>
          <div className="flex gap-2"><button disabled={!!busy || note.trim().length < 3} onClick={() => void resolve()} className="min-h-11 rounded-xl bg-[#14664D] px-4 text-sm text-white disabled:opacity-40">{busy ? (en ? 'Saving…' : 'Menyimpan…') : (en ? 'Confirm decision' : 'Konfirmasi keputusan')}</button><button disabled={!!busy} onClick={() => setSelection(null)} className="min-h-11 rounded-xl border border-emerald-900/20 px-4 text-sm">{en ? 'Cancel' : 'Batal'}</button></div>
        </div>}
      </article>)}
    </div>
  </section>;
}
