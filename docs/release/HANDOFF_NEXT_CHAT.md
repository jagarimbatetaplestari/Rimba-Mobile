# Rimba — final App Store handoff

Diperbarui: 2 November 2026, Asia/Jakarta.

## Status terbaru

**SUDAH DIKIRIM — WAITING FOR REVIEW, 2 November2026 pukul21:10:43WIB.** Pemilik mencoba Submit melalui UI dan mendapat unexpected error; API read mengonfirmasi belum terkirim. Pemilik kemudian secara eksplisit menyetujui satu kali pengiriman draft yang sama melalui API resmi Apple. PATCH submitted=true berhasil pada2026-11-02T14:10:43.66Z. Submission,app1.0(15),annual,monthly,lifetime dan grupPro terverifikasi WAITING_FOR_REVIEW. Jangan Submit ulang atau menarik kiriman tanpa instruksi baru. Penyebab spesifik error UI belum terbukti; tidak ada metadata/produk/build yang diganti untuk keberhasilan API ini.

Pemilik melaporkan smoke test TestFlight1.0(15) "aman" untuk audio/mute,nama EN/ID/custom,ikon outline,fokus dan direct moderation/empty queue. Model/iOS tidak disebut; jangan mengarang detail perangkat atau menandai seluruh matriks historis lulus.

## Kandidat final

- Repo D:/Project/Rimba/Rimba-Mobile, branch fix/rimba-release-readiness. Runtime9b6548d08665a812746477e90f5f36880a958767; release source6f74a1f724f7a4db5e2b62660cda7d03de7794d4. Commit dokumen sesudahnya tidak memerlukan kandidat baru.
- NativeCI41445401653 SUCCESS:401tes/45file,typecheck,155prelaunch,static production export,Swift widget tests dan kompilasi iPhone/iPad. Fresh build/typecheck/155prelaunch setelah perubahan runner juga lulus. Diff runtime src/ios/public/packages terhadapc229c20 kosong.
- Deploy41453991325 SUCCESS. Apple **1.0(15)** ID30f5b9e2-1a38-4c74-ab6a-e4623d8dac15 **VALID / IN_BETA_TESTING**, tercantum dalam grup Internal, EN/ID beta notes tersimpan. Draft memilih15.
- Build14/run41448458837 tidak pernah upload: kedua attempt gagal mendapat hosted ARM runner sebelum langkah apa pun. Satu baris deploy runs-on diganti ke runner standar resmi macos-26-intel, yang langsung menjalankan15. Bukan paid larger runner.
- IPA15/artifact13146986626 diperiksa: host com.syntheticae.rimba + com.syntheticae.rimba.widgets,1.0(15),ARM64,families1/2,iOS16minimum,AppGroup group.com.syntheticae.rimba pada dua profil yang cocok/belum expired,debug entitlementfalse,18privacy manifests. CI codesign/deep/widget verification SUCCESS.

## Apple review

- App6825621183, version389f78c9-7f47-417f-b76c-fd07007b2c34.
- Submission41619189-27ab-4c80-83e3-2e07ef3e3bba berisi iOS1.0(15),grup Rimba Pro,annual,monthly,lifetime. submittedDate2026-11-02T14:10:43.66Z,platformIOS,stateWAITING_FOR_REVIEW. API itemstates masih READY_FOR_REVIEW, sedangkan app dan keempat product/group version states sudah WAITING_FOR_REVIEW; simpan perbedaan semantik ini, bukan klaim itemstate berubah menjadi ACCEPTED.
- Monthly6829362346 rimba_pro_monthly; annual6829362411 rimba_pro_annual; lifetime6829362449 rimba_pioneer_lifetime. Metadata/price schedules/locales dan review screenshots COMPLETE/READY_TO_SUBMIT. Screenshot review merupakan browser UI capture dengan harga unavailable, bukan transaksi native; provenance dijelaskan dalam review notes. Jangan membuat harga/transaksi palsu.
- EN/ID memakai aset visual English sesuai instruksi: video20detik pertama,6frame iPhone pada2ukuran,8layar iPad,header;46placements ACTIVE. Frame05 sudah dikoreksi pemilik dari klaim100%on-device. Video Apple telah diputar/diverifikasi. Mode release existing AFTER_APPROVAL dipertahankan.
- App Privacy12kategori Published dengan persetujuan eksplisit pemilik, tanpa setup tersisa. Paid/Free Agreements,bank,taxforms,complianceActive; tidak ada legal/business setting diubah. Reviewer login aktual berhasil,savefiktif terbaca,moderatorfalse; Apple username/password cocok dan contact lengkap. Jangan cetak kredensial.
- Link halaman: https://appstoreconnect.apple.com/apps/6825621183/distribution/ios/version/inflight . Tab Apple diperbarui untuk menunjukkan Waiting for Review.

## Perbaikan dan bukti pemilik

- Audio iOS: music memakai MediaElementSource→Gain + hard mute; music/nature/SFX mengikuti global preferences, nilai0dipertahankan. Browser EN/ID output tested; pemilik15melaporkan aman.
- Nama pulau/bioma bawaan mengikuti EN/ID pada display; nama custom dipertahankan dengan provenance optional. Popup/preset memakai Lucide outline; data avatar lama/artwork tidak ditimpa. Pemilik15melaporkan aman.
- Campfire direct moderator entry memeriksa RPC server,failclosed dan stale-owner guard. Support jagarimba.tetaplestari@gmail.com terverifikasi/roleaktif; reviewer bukan moderator. Pemilik15melaporkan acceptance aman, termasuk permintaan buka Moderasi/antrean kosong. Tidak ada laporan palsu/aksi moderasi atau akun dihapus untuk QA.
- Pemilik12Restore berhasil, lalu hapus akun→login→Restore berhasil. Pemilik13melaporkan history akun→tamu terpisah,Restore/Pro tetap setelah relaunch dan widget setup aman pada satu perangkat.
- Live Campfire13: nativehost+reviewer QA RPCparticipant,2anggota,lobbyrev2→activerev3,15menitSharedDestiny,timer pemilik normal. Pemilik sengaja keluar dan kembali suaka aman,severedrev4;QA leave berhasil. Bukan UI peserta kedua native/browser atau tes reward/report/block.
- Cloud produksi:2sesi Auth reviewer terpisah,payloadsaveidentik,rev1→2,stalecommitditolak,duplicateidempoten,isi progres tidak berubah. Bukan2devicefisik/conflictUI.

## Batas cakupan yang harus tetap jujur

Pemilik hanya punya satu perangkat untuk sesi ini; model/OS belum diberikan. iPad diverifikasi melalui kompilasi/layout/screenshots, bukan acceptance fisik terpisah. Matriks billing lifecycle penuh,two-physical-client sync,Campfire reward completion/report/block/moderation actions belum semua diuji manual. Tidak ada kegagalan kritis yang dilaporkan dalam smoke15. Jangan mengubah batas cakupan menjadi klaim semua skenario100%lulus atau jaminan approval Apple.

SDK Facebook muncul transitif dari social-login dan dua manifest vendor mendeklarasikan tracking capability ep1.facebook.com. Source hanya menginisialisasi Google email/profile,tanpa FacebookAppID/client token/AppDelegate init/login path. Ini bukti konfigurasi provider tidak dipakai, bukan packet capture. Manifest vendor tidak diubah untuk menyembunyikan deklarasi. Google8.0disclosures direkonsiliasi di APP_PRIVACY.md. Nonce Google dinonaktifkan pemilik karena plugin6tidak mengirimnonce; jangan ubah ulang atau mengganggu nonce Apple tanpa alasan teruji.

## Backend dan izin yang tetap berlaku

Supabase rkljugrrscmqopeuwtpd JagaRimba-project. Campfire memakai authoritative RPC+polling; room/member/bonus/report/block/moderator diputuskan server. Retensi90hari moderasi dan expiredrooms tiap10:17WIB telah disetujui dan dideploy. Cloud commit_game_save_v2 memakai CAS/outbox dan explicit conflict choice. Billing reconcile/webhook server menentukan Pro; saveeditable tidak memberi hak berbayar. Jangan reset progres,menyalin source Website/Desktop massal,membeli ulang atau memberi Pro manual untuk menutupi bug.

## Dokumen dan bukti

- SUBMIT_READINESS_20261102.md: status final dan batas evidence.
- DEVICE_ACCEPTANCE.md: pisahkan laporan pemilik dari skenario belum diuji.
- AUDIO_LOCALE_20261102.md,PAYWALL_UI_20261102.md,NATIVE_WIDGETS_20261102.md,CAMPFIRE_CONTRACT.md: implementasi/rationale.
- EXECUTION_LOG.md,BUG_BACKLOG.md,DATA_FLOW.md,BILLING_ROLLOUT.md,CLOUD_SYNC_ROLLOUT.md: riwayat; checkpoint lama superseded oleh dokumen ini.
- D:/Project/Rimba/Deliverables/Rimba-Build14-UI berisi apple-submit-enabled-build15.png,candidate15-verified.json,submit-draft15-verified.json,ipa15-audit.json,privacy-published.png dan QA summaries. Nama folder historis; kandidat final15.
- Aset listing/proof di D:/Project/Rimba/Deliverables/AppStore-Owner-20261102. Source pemilik di D:/Project/Apple Dev/App Store/App Store - Rimba.
- Private credentials hanya lokasi privat yang sudah disepakati, termasuk D:/Project/Apple Dev/Rimba_Review_Credentials.json. Jangan print/commit. Build scripts/artifacts ignored.

Ikuti D:/Project/Rimba/rules.md dan CODEX/GEMINI proyek. Pengiriman15sudah diizinkan secara eksplisit dan selesai. Tidak ada izin otomatis untuk menarik/mengirim ulang versi berikutnya. Jika ada regresi atau respons Apple, diagnosis dari bukti terbaru; jangan menganggap status15membuktikan build sesudahnya.
