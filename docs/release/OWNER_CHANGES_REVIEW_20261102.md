# Review perubahan pemilik — 2 November 2026

Sumber awal: `7f4730e9b3fb04ec6129515bd1e4cc91a8580cc9`. Catatan audit yang dilampirkan diperlakukan sebagai laporan untuk diverifikasi, bukan bukti kelulusan atau perintah deployment.

| Temuan | Bukti dan penanganan |
| --- | --- |
| Build gagal pada profil save | `profile.id` diubah menjadi UID akun, sedangkan skema/backup mengharuskan literal `local-user`. UID pemilik ada di `storage_owner`. Auth dan restore cloud diperbaiki tanpa memperlemah skema; regresi login sebelum perbaikan gagal lalu lulus. |
| Aktivasi dapat dibuang saat refresh token | `authSessionRevision` sebelumnya bertambah pada setiap event Supabase, termasuk TOKEN_REFRESHED/duplikat SIGNED_IN pada pemilik yang sama. Hasil purchase/Restore kemudian ditolak sebagai sesi lama. Tes lintas modul mereproduksi kegagalan; epoch pergantian pemilik dipisahkan dari generasi pembacaan profil, dengan regresi sign-out dan A→B→A tetap menolak hasil lama. |
| Refresh Free dapat menimpa Pro yang baru aktif | Refresh yang dimulai selama sheet purchase/Restore sebelumnya masih membawa generasi operasi yang sama setelah pembayaran selesai. Dua tes mereproduksi penimpaan hasil terverifikasi. Generasi sekarang dinaikkan juga saat operasi toko selesai, sehingga refresh lama ditandai superseded. |
| Pembelian tidak memberi feedback yang jelas | Paywall memakai toast bertuliskan restore berhasil dan langsung ditutup. Error toast berada di z100, di bawah paywall z120. Sekarang ada konfirmasi Pro terverifikasi yang menetap, pesan restore terpisah, serta error/pending di dalam paywall dekat tombol dan digulir ke area terlihat. |
| Pembayaran diterima toko tetapi backend belum selesai | Ada status pending terpisah, retry terbatas untuk gangguan transport/503, dan tombol verifikasi memakai Restore tanpa mengulang purchase. Pro tidak diberikan dari callback toko yang belum dikonfirmasi server. Tap berulang dan pergantian akun tetap dijaga. |
| Klaim widget belum sesuai konfigurasi native | File WidgetKit/bridge dan pratinjau ada. `project.pbxproj` hanya punya target App; target/embedding Widget Extension belum ada, entitlement App Groups belum ada pada App, dan bridge custom belum terdaftar pada controller/plugin list. Ini pekerjaan integrasi native yang masih terbuka, bukan fitur widget yang sudah tervalidasi. |
| Build/tag lokal tetap lanjut setelah error | Rangkaian PowerShell menggunakan `;`. Setelah build gagal, perintah sync bisa memakai `out` lama dan tag tetap dibuat. Run deploy6 `41383802859` untuk tag `v1.0.6-202611021034` benar-benar gagal di Build Next.js Static Export; tidak menghasilkan pengganti TestFlight5. Push `origin main` juga tidak mendorong commit dari branch feature. |
| Tes baru terdampak bridge widget | Mock boundary widget ditambahkan pada tes auth/deletion; fixture storage Google disesuaikan dengan profil save yang valid. Suite pulih tanpa menonaktifkan pemeriksaan asli. |

## Google dan nonce

Pemilik melaporkan login berhasil setelah mengaktifkan Skip Nonce Check pada provider Google Supabase. Jalur native saat ini mengirim ID token tanpa nonce. Capgo6.0.1 memiliki opsi TypeScript `nonce`, tetapi implementasi Google iOS yang diperiksa tidak meneruskannya ke request native. Jangan menambahkan nonce hanya pada pertukaran Supabase atau mengaktifkan kembali pemeriksaan sebelum alur native teruji. Apple tetap memakai pasangan nonce kriptografisnya; tidak diubah.

Supabase mendokumentasikan Skip Nonce Check untuk library native yang tidak menangani verifikasi nonce: https://supabase.com/docs/guides/auth/social-login/auth-google . Konfigurasi server pemilik dipertahankan; tidak ada pelemahan pengaturan auth tambahan oleh task ini.

## Bukti dan batas pengujian

- Backend diperiksa read-only. Ada satu catatan Pro tahunan sandbox terkonfirmasi dan receipt webhook sandbox diproses; ini bukan pencocokan pasti transaksi yang dilaporkan pemilik. Log24jam menunjukkan reconcile200, satu401 dan satu503; tidak cukup untuk menyimpulkan akar transaksi tertentu. Tidak ada transaksi finansial atau pemberian Pro manual dilakukan.
- 335 tes pada 35 file, typecheck,155prelaunch checks dan build produksi lulus. Tambahan8tes renderer memeriksa welcome, restore, pending/error, pemilik hasil, pembatalan, ID/EN dan tap berulang.
- Browser sintetis EN390x844/ID834x1194 lulus fokus/pause/resume/cancel berulang, paywall, dialog hapus lalu batal, logout dan masuk tamu; tanpa akun atau transaksi nyata.
- Build akhir setelah penempatan pesan feedback dicek ulang. CI native dan TestFlight pengganti harus dicatat terpisah setelah dijalankan; tes sandbox dan pengalaman setelah pembelian tetap membutuhkan perangkat.

Gunakan pemeriksaan exit code sebelum langkah berikutnya pada PowerShell, misalnya `npm run build; if ($LASTEXITCODE -ne 0) { throw 'Build gagal' }`, lalu lakukan pemeriksaan serupa setelah sync/verifikasi sebelum commit atau tag kandidat yang benar.

## Klarifikasi acceptance dan kandidat pengganti

Laporan perangkat menegaskan fitur Pro tetap terkunci, sehingga masalah aktivasi diprioritaskan di atas feedback visual. Run upload7/41387288040 dibatalkan pada tahap upload agar kandidat final juga memuat fix epoch auth. Belum ada transaksi ulang atau grant Pro manual. Setelah fix tambahan:339tes full lulus, satu regresi tambahan A→B→A lulus dalam9tes auth lifecycle,155prelaunch dan typecheck lulus; build dan CI kandidat berikutnya harus dicatat terpisah.

Verifikasi akhir aktivasi:342tes full pada35file dan typecheck lulus, termasuk9auth lifecycle dan30service billing. Dua regresi refresh-during-purchase/Restore gagal sebelum perubahan lalu lulus. Build final dan gerbang native kandidat terakhir dicatat pada handoff/log.
