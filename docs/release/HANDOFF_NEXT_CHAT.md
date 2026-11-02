# Rimba — handoff kesiapan App Store

Diperbarui: 2 November 2026 (Asia/Jakarta).

## Checkpoint terbaru — baca sebelum checkpoint lama

- Pemilik menguji build4 dan melaporkan crash fokus, tombol subscription/delete macet, logout blank, Google gagal, bahasa campur, serta progres Apple terlihat pada tamu. Build4 belum layak rilis.
- Perbaikan lokal direview: hook order NatureWorkshopSheet; race modal history/auth navigation; local sign-out error handling; returning guest onboarding; layering delete/paywall; Google IDs workflow rilis; bahasa dan flyout navbar. Browser sintetis EN390x844/ID834x1194 lulus start/pause/resume/cancel berulang, paywall buka/tutup, dialog hapus lalu batal, logout dan kembali tamu. Bukan pengujian native/pembelian/penghapusan akun nyata.
- Campfire lokal memakai server-authoritative RPC+polling, report/block dan UI moderator, recovery lobby/sesi owner-scoped, serta bonus sosial dari snapshot runtime terverifikasi. Migrasi20261101201444_campfire_authority_and_moderation.sql belum diterapkan. Draft ignored build/campfire-deploy.sql menambah migrasi+ledger+cron harian03:17UTC/10:17Jakarta transaksional; maintenance tidak langsung dijalankan. Moderator pemilik belum ditetapkan. Baca CAMPFIRE_CONTRACT.md.
- Tes terbaru322/322, typecheck, prelaunch155/155 dan build produksi lulus. Dua temuan review (lobby tertinggal, nama host pada evidence setelah deletion) diperbaiki dengan tes. Bukti/batas ada di EXECUTION_LOG.md.
- Supabase connector kembali Unknown tool; CLI Supabase/GitHub belum terautentikasi. Dashboard Supabase in-app browser terautentikasi; katalog read-only: belum ada tabelCampfire, is_anonymous ada, pg_cron tersedia belum terpasang. Cek ulang sebelum migrasi. Privasi kandidat mobile diperbarui; website/label Apple perlu audit ulang.
- Belum push/CI native/upload pengganti build4 di checkpoint ini. Working tree branch fix/rimba-release-readiness di atas31269af; pertahankan screenshot terdahulu. Gerbang device, billing, auth, dua perangkat, screenshot toko dan metadata IAP tetap terbuka. Jangan Submit.

## Instruksi untuk chat berikutnya

Lanjutkan sampai Rimba benar-benar siap untuk pemilik klik Submit; jangan klaim siap hanya karena build atau unit test lulus. Jangan kirim App Review tanpa instruksi jelas. Baca instruksi proyek, rencana dan catatan berikut, lalu verifikasi kondisi terkini. Jangan tampilkan atau masukkan secret dan kredensial ke Git/chat.

- Mobile: D:\Project\Rimba\Rimba-Mobile
- Website: D:\Project\Rimba\Rimba-Website
- Instruksi: D:\Project\Rimba\CODEX.md, GEMINI.md, dan instruksi repo mobile.
- Rencana: D:\Project\Rimba\docs\superpowers\plans\2026-11-01-rimba-app-store-readiness.md.
- Catatan: Rimba-Mobile\docs\release\EXECUTION_LOG.md, BUG_BACKLOG.md, DATA_FLOW.md, BILLING_ROLLOUT.md, CLOUD_SYNC_ROLLOUT.md. Sebagian ledger lebih lama dari checkpoint ini; cek ulang.
- Jalankan npm run build sebelum menyelesaikan pekerjaan kode.

## Keputusan dan izin pemilik

- Freemium lengkap, tanpa klaim penanaman pohon nyata; iPhone dan native iPad; global di luar 27 negara UE.
- Harga awal bulanan Rp29.000, tahunan Rp179.000, lifetime Rp349.000. Seluruh aset dan materi dinyatakan memiliki hak/izin. Dukungan: jagarimba.tetaplestari@gmail.com.
- Pemilik sendiri moderator. Website boleh diperbaiki; pembaruan legal sudah dipublikasikan.
- Pemilik menyetujui konfigurasi Apple/Google, App Privacy, pengamanan Supabase, revisi sync setelah client siap, backend billing/webhook, konfigurasi CI, upload kandidat ke TestFlight setelah CI native, dan akun reviewer non-admin. Izin bukan bukti pengujian lulus atau review sudah dikirim.
- Pemilik punya iPhone dan iPad, tanpa Mac. Jangan asumsikan pengujian perangkat selesai tanpa konfirmasi spesifik build.

## Checkpoint

- Branch fix/rimba-release-readiness HEAD dan origin terakhir terverifikasi di 31269af. Perubahan belum di-commit: .github/workflows/verify-ios.yml, scripts/capture-native-screenshots.mjs, scripts/native-screenshot-fixture.mjs, tests/nativeScreenshotFixture.test.ts. Pertahankan dan periksa sebelum edit; jangan reset.
- Auth Apple/Google dan penghapusan akun disiapkan. Akun reviewer non-admin fiktif dibuat dan kredensial disimpan di Sign-In Information App Store Connect serta cadangan privat D:\Project\Apple Dev\Rimba_Review_Credentials.json. Jangan cetak atau commit isinya. Jangan pakai akun reviewer untuk tes hapus akun.
- Migrasi cloud revision CAS 20261101094129_guard_game_save_revisions.sql diterapkan setelah client kompatibel diuji. Client lama yang menulis langsung gagal sync; data lokal tetap ada. Konflik memilih salinan secara eksplisit, dengan snapshot dan outbox idempoten. Pengujian dua perangkat masih diperlukan.
- Migrasi billing 20261101102757_trusted_billing_state.sql, fungsi reconcile-subscription dan revenuecat-webhook sudah dideploy. Webhook test RevenueCat mengembalikan 200 dan permintaan tanpa secret 401; bukan bukti pembelian, restore, refund atau expiry di perangkat.
- Penawaran RevenueCat default berisi produk bulanan, tahunan dan lifetime. Hak Pro memerlukan verifikasi backend; cache offline hanya dari informasi native terverifikasi dengan batas 24 jam. Uji sandbox, lifecycle dan pemulihan tetap terbuka.
- App Privacy diterbitkan atas persetujuan pemilik; kategori, hak konten, rating, deskripsi en-US/id dan wilayah telah diisi. Audit ulang setelah fitur sosial dan audit SDK native; screenshot toko dan metadata review pembelian belum selesai.
- Kandidat 31269af lulus native CI 41299921644. Signing awal gagal karena profil lama; profil pengganti aktif dan secret signing diperbarui setelah pemilik menyelesaikan verifikasi GitHub. Upload run 41300427801 percobaan 2 berhasil. App Store Connect menunjukkan build 1.0 (4) VALID dan internal TestFlight. Ini bukan review submission dan belum tentu kandidat final.
- Pengujian kandidat billing: 247 tes, typecheck, 157 prelaunch checks dan build lulus. Sesudah tambahan fixture screenshot, 248 tes, typecheck dan build dilaporkan lulus; verifikasi ulang setelah perubahan berikutnya.
- Belum ada jawaban pemilik yang tercatat untuk permintaan uji build 4: login Apple/Google/email; sync/konflik dua perangkat; pembelian sandbox dan restore; timer; hapus akun Apple (batal lalu setujui menggunakan akun disposable). Jangan anggap lulus.

## Prioritas dan gerbang terbuka

1. Selesaikan screenshot simulator native yang belum di-commit: tinjau perubahan, uji fixture dan workflow, jalankan CI macOS, lalu periksa visual screenshot iPhone dan iPad dari simulator sebelum dipakai. Fixture hanya data fiktif pada salinan simulator, bukan data pengguna atau binary release. Jangan upload hasil kosong/onboarding/keliru. Periksa dimensi dan persyaratan Apple terkini.
2. Audit dan perbaiki Campfire/fitur sosial serta moderasi penuh. Audit awal menemukan channel realtime dan perintah klien berpotensi dipalsukan serta keberhasilan room lokal palsu. Perlu otorisasi anggota/host server, pelaporan/pemblokiran/filter, antrean dan alur kerja moderator, tes isolasi/penyalahgunaan dan pengujian dua perangkat. Jangan anggap moderasi selesai.
3. Tuntaskan audit native iPhone/iPad, performa, izin, SDK/dependensi dan bandingkan praktik data dengan App Privacy. Artefak IPA build 4 dari GitHub Actions artifact 13081296983 dapat diperiksa jika masih tersedia. Jangan simpulkan pengumpulan data hanya dari nama dependency.
4. Verifikasi produk IAP beserta screenshot review, metadata, sandbox purchase/restore/refund/renewal, reviewer account dan notes. Periksa kembali wilayah, rating, URL legal/dukungan dan validasi draft Apple.
5. Setelah perubahan final, ulangi tes relevan, typecheck, prelaunch dan build; jalankan CI native dan upload build kandidat baru sesuai izin. Minta pemilik menguji build final spesifik pada iPhone+iPad, termasuk Apple deletion dan konflik sync. Build 4 tidak membuktikan build sesudahnya.
6. Catat bukti dan blocker pada ledger. Jangan klik Submit sampai pemilik meminta secara jelas dan semua prasyarat yang bisa diverifikasi terpenuhi.

## Pesan untuk memulai chat baru

Lanjutkan Rimba dari D:\Project\Rimba\Rimba-Mobile\docs\release\HANDOFF_NEXT_CHAT.md. Baca juga instruksi proyek dan catatan yang dirujuk, verifikasi status terkini, lalu lanjutkan sampai siap gue klik Submit.
