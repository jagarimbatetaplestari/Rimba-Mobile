# Rimba — handoff kesiapan App Store

Diperbarui: 2 November 2026 (Asia/Jakarta).

## Checkpoint UI Pro dan metadata pembelian

- Source `2bc609e`: EN/ID paywall memakai nama paket ringkas dan wrapping; flyout memakai ikon `#0b2719` dengan label lengkap.365tes/40file, typecheck,155prelaunch, produksi dan10kombinasi layout/browser lulus. NativeCI41437204766 dan deploy41438719466/build13 SUCCESS. Apple13 ebb42a1c-c1a3-401a-927a-a57475d789c5 VALID/IN_BETA_TESTING/Internal; draft memilih13 dan beta notesEN/ID tersimpan. Tidak Submit.
- Pemilik kemudian melaporkan audio/mute, nama pulau, emoji modal serta antrean tidak terlihat dari Campfire. Source perbaikan `9b6548d08665a812746477e90f5f36880a958767`, laporan AUDIO_LOCALE_20261102.md:401tes/45file,155prelaunch,typecheck,produksi dan browser audioEN/ID lulus. NativeCI41445401653 masih QUEUED menunggu runner macOS pada cek terakhir (sekitar19:38WIB). Kandidat14 belum diunggah;13 tidak memuat perbaikan audio/nama/ikon terbaru. Lanjutkan dengan memeriksa run itu; jika SUCCESS, dispatch deploy-appstore.yml dan periksa nomor build aktual, AppleVALID/Internal, catatan EN/ID dan pilihan draft. Jangan mengklaim14 tersedia dari kode lokal.
- Ketiga produk `rimba_pro_monthly`, `rimba_pro_annual`, `rimba_pioneer_lifetime` terverifikasi READY_TO_SUBMIT; tiga screenshot review COMPLETE. Screenshot merupakan browser UI capture dengan harga unavailable; asalnya dijelaskan di review notes, bukan bukti transaksi native. Listing English pada kedua locale: video pertama+6frame iPhone pada2ukuran,8layar iPad,1header,46penempatan ACTIVE; video20detik telah diputar di App Store Connect. Aset/proof di `D:/Project/Rimba/Deliverables/AppStore-Owner-20261102`.
- Pemilik melaporkan Restore build12 berhasil, lalu hapus akun→login lagi→Restore berhasil. Model perangkat, mixer dan persistensi setelah restart belum disebut. Jangan menandai seluruh matriks iPhone+iPad/lifecycle lulus.
- Akun support dibuat melalui dashboard dengan Auto confirm OFF dan password acak privat yang tidak dicatat. Setelah pemilik meminta cek ulang, exact email verified1/sign-in1; role Campfire moderator diberikan hanya pada akun itu. RPC sebagai authenticated: support_moderator=true,queue_type=array,reviewer_moderator=false. Pemilik tidak melihat antrean melalui Campfire karena entry sebelumnya hanya di Profil; entry langsung ditambahkan untuk14, acceptance native berikutnya tetap diperlukan. Detail di PAYWALL_UI_20261102.md dan DEVICE_ACCEPTANCE.md.
- Tidak ada Submit/App Review. Gerbang perangkat, moderator operasional dan acceptance lain tetap terbuka.

## Widget native — checkpoint terbaru

- Source final `408345b`; native CI final `41404506471` SUCCESS;365tes/40file,155prelaunch,typecheck dan export produksi lulus. Target WidgetKit nyata, AppGroup, bridge terdaftar, quick focus cold/warm, countdown/jeda, isolasi akun dan petunjuk pemasangan diterapkan. Lihat [laporan widget](NATIVE_WIDGETS_20261102.md).
- Profil App Store host+extension ACTIVE dan kedua secret GitHub diperbarui. Build11/run41403770011 dibatalkan sebelum upload untuk guard stopwatch. NativeCI41404506471 dan deploy41404509381/build12 SUCCESS. Apple1.0(12)63dde60f-edb0-4122-afe4-9828114e69da VALID/IN_BETA_TESTING, ada di grup Internal; draft memilih12 dan catatan EN/ID tersimpan. Tidak Submit. Build8 di bawah adalah kandidat sebelumnya.
- UI/3D pemilik dipertahankan. Pengaman aktivasi Pro yang tertimpa dikembalikan; starter kosong tidak memunculkan dialog migrasi, tetapi progres berubah/rusak tetap membutuhkan pilihan pemilik. Uji perangkat, Restore/Pro, screenshot final dan gerbang Submit tetap terbuka.

## Kandidat aktivasi Pro final — build8 VALID

- Source a839c4ee055a0e238d7f9b1e5edebb3299b4e065 di branch fix/rimba-release-readiness. NativeCI41389307337 SUCCESS; deploy41389860676 SUCCESS. Apple build8b34cd2f-6e5b-484b-b9ef-15a74a0c34b7 versi1.0(8) VALID, IN_BETA_TESTING dan ada di grup Internal. Draft App Store memilih8; tidak Submit.
-342tes pada35file,155prelaunch checks,typecheck dan build final lulus. Memuat perbaikan profil save, dua race aktivasi Pro (auth token/duplicate event dan refresh Free yang datang setelah purchase/Restore), serta feedback welcome/restore/error/pending. Jangan menyebutnya hanya fix modal.
- Catatan TestFlight en-US/id sudah disimpan. Pemilik diminta memperbarui ke8, login Apple akun semula dan Restore pembelian yang sudah ada, lalu memeriksa mixer dua suara/fitur Pro. Belum ada hasil pengujian build8 dari perangkat. Jangan membeli ulang atau memberikan Pro manual untuk menutupi kegagalan.
- Build7 upload dibatalkan dan bukan kandidat lengkap; tag6 sebelumnya gagal build. Laporan rinci: OWNER_CHANGES_REVIEW_20261102.md. Widget Extension/AppGroup/registrasi bridge, audit privasi native dan gerbang App Review lain tetap terbuka. Screenshot toko yang tersedia berasal dari runtime f643673 sebelum perubahan UI pemilik; perbarui setelah acceptance kandidat final.

## Aktivasi Pro — verifikasi terakhir

- Pemilik mengonfirmasi fitur Pro tetap terkunci setelah transaksi. Dua kelas bug direproduksi dan diperbaiki: event auth untuk akun yang sama membuang hasil paid; refresh Free yang mulai selama purchase/Restore menimpa Pro yang sudah diverifikasi. Epoch pemilik dan generasi hidrasi dipisah, dan generasi operasi billing juga berubah saat selesai.
-342tes full dan typecheck lulus. Gunakan kandidat terakhir yang memuat kedua fix;611d923 hanya memuat fix auth. Build7/run41387288040 dibatalkan. Jangan klaim pembelian di perangkat sudah lulus; pemilik perlu Restore dengan akun semula pada build final.

## Checkpoint review perubahan pemilik dan subscription — 2 November 2026

- Pemilik mengubah53file pada7f4730e dan menonaktifkan nonce check Google di Supabase; login dilaporkan berhasil. Jalur Google iOS Capgo6.0.1 tidak meneruskan opsi nonce, dan pertukaran Supabase saat ini tanpa nonce. Konfigurasi pemilik dipertahankan; Apple nonce tidak diubah.
- Tag v1.0.6-202611021034/run41383802859 gagal pada Next build, bukan TestFlight baru. UID akun dipasang ke profile.id yang wajib local-user. Fix auth/cloud profile schema dan regresi sudah masuk e13b1a2.
- e13b1a2 di origin/fix/rimba-release-readiness mempertahankan perubahan pemilik, memperbaiki feedback pembelian/restore, pending-verification recovery tanpa membeli kedua kali, error terlihat dekat CTA, dan rapid-tap/account guards.335tests,155prelaunch,typecheck,build dan browser sintetis EN/ID lulus. CI native41386535235 SUCCESS.
- Upload7/run41387288040 dibatalkan pada tahap upload setelah klarifikasi fitur Pro tetap terkunci. Regresi membuktikan TOKEN_REFRESHED/duplikat SIGNED_IN menginvalidasi hasil paid pada akun yang sama. Fix memisahkan epoch pemilik dan generasi hidrasi profil;339tes full + regresi tambahan A-B-A,155prelaunch,typecheck dan build akhir lulus. Kandidat berikutnya perlu native CI dan upload baru.
- Baca OWNER_CHANGES_REVIEW_20261102.md: WidgetKit baru berupa file/pratinjau; target/embedding extension, AppGroup entitlement App dan registrasi bridge belum ada. Integrasi widget dan audit privasi native belum lulus. Jangan mengklaim fitur widget sudah terpasang hanya karena App target dapat dikompilasi.
- Pertanyaan untuk pemilik masih menunggu: build/paket/metode login saat pembelian yang terasa tidak bereaksi, serta apakah fitur Pro sebenarnya sudah terbuka. Backend punya satu catatan annual sandbox terkonfirmasi, tetapi belum dicocokkan dengan transaksi pemilik. Tidak ada transaksi atau grantPro manual dilakukan.

## Checkpoint rilis build 5 — 2 November 2026

- TestFlight 1.0 (5), source 308215bd140a442bd9b20c57ce2e2d24228d9cbf (app runtime f643673), upload run 41376358841 SUCCESS. Apple API reports VALID; Internal beta group contains build5 and internalBuildState IN_BETA_TESTING. Draft version1.0 now selects build5. No review submitted.
- OTP verification/paste and password recovery now accept full8digits; explicit verification supports6/8digits without auto-submit at6. ID/EN copy updated.324tests,155prelaunch,typecheck,production export passed.
- Native verify41374567443 for f643673 completed SUCCESS, including all12screenshots. Browser log lag misled an earlier stall diagnosis; artifacts proved all three device sizes captured.308215b adds only bounded simctl commands/logging and docs. Follow-up native verify41375983476 still running screenshot step at last check; do not assume final success.
- All12native screenshots visually checked and uploaded through current Apple Asset Library API; en-US/id placements use official IPHONE_DYNAMIC_ISLAND_MEDIUM_PROFILE, IPHONE_DYNAMIC_ISLAND_LARGE_PROFILE, IPAD_13_PROFILE.10images PREPARE_FOR_SUBMISSION/ACTIVE; iphone-medium-en-sanctuary and ipad-13-en-sanctuary remain UPLOAD_COMPLETE/PENDING (no stateDetails). Recheck processing; do not call every asset ready. Evidence: build/asc-assets-uploaded.json and asc-assets-verification.json (ignored/private operational artifacts).
- Website4be7359 published on production main; public /privacy verified in both languages with November2 Campfire/90day disclosures. Monthly/annual/lifetime review notes saved. IAP review paywall screenshot and native sandbox acceptance remain pending.
- Device acceptance request sent for exact build5; no result yet. See DEVICE_ACCEPTANCE.md. Owner support account must be registered before assigning moderator role; prior exact email lookup found0users.
- Native simulator artifact inspected:16privacy manifests including GoogleSignIn8/RevenueCat and transitive Facebook frameworks. App config initializes Google only (Facebook requires explicit appId); do not infer active collection from framework presence. Google manifest declares more potential categories than current App Privacy inventory (coarse location/device/other usage), requiring final reconciliation with configured SDK behavior. Signed IPA5 audit remains open. Never mark Submit-ready from unit tests.

## Checkpoint terbaru — baca sebelum checkpoint lama

- Pemilik menguji build4 dan melaporkan crash fokus, tombol subscription/delete macet, logout blank, Google gagal, bahasa campur, serta progres Apple terlihat pada tamu. Build4 belum layak rilis.
- Perbaikan lokal direview: hook order NatureWorkshopSheet; race modal history/auth navigation; local sign-out error handling; returning guest onboarding; layering delete/paywall; Google IDs workflow rilis; bahasa dan flyout navbar. Browser sintetis EN390x844/ID834x1194 lulus start/pause/resume/cancel berulang, paywall buka/tutup, dialog hapus lalu batal, logout dan kembali tamu. Bukan pengujian native/pembelian/penghapusan akun nyata.
- Campfire lokal memakai server-authoritative RPC+polling, report/block dan UI moderator, recovery lobby/sesi owner-scoped, serta bonus sosial dari snapshot runtime terverifikasi. Migrasi20261101201444_campfire_authority_and_moderation.sql sudah diterapkan dengan ledger dan retensi harian03:17UTC/10:17Jakarta atas persetujuan eksplisit pemilik. Katalog produksi:8tabelRLS,akses tabel langsung klien0,anonRPCfalse,memberRPCtrue,maintenance hanya server. Matriks host/outsider/early completion/report/moderator lulus dalam transaksi fiktif rollback. Moderator pemilik belum ditetapkan: pemilik memilih email dukungan, tetapi pencarian tepat email itu menghasilkan0akun; perlu login/daftar sekali. Baca CAMPFIRE_CONTRACT.md.
- Tes terbaru324/324 (termasuk OTP6/8digit), typecheck, prelaunch155/155 dan build produksi lulus. Dua temuan review (lobby tertinggal, nama host pada evidence setelah deletion) diperbaiki dengan tes. Bukti/batas ada di EXECUTION_LOG.md.
- Supabase connector kembali Unknown tool; CLI Supabase/GitHub belum terautentikasi. Dashboard Supabase in-app browser terautentikasi; migrasi via dashboard telah berhasil dan jadwal retensi aktif. Privasi kandidat mobile diperbarui; website/label Apple perlu audit ulang.
- Kandidat cabfdb2 (dengan c5e83b6) sudah dipush ke branch fix/rimba-release-readiness. NativeCI41372926763 lulus, tetapi belum memuat fix OTP. Kandidat berikutnya harus memuat fix OTP dan screenshot simulator. Belum upload TestFlight pengganti build4. Gerbang device, billing, auth, dua perangkat, screenshot toko dan metadata IAP tetap terbuka. Jangan Submit.

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
