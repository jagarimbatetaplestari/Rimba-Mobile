# Panduan Unduh & Instalasi Rimba Android APK

Panduan praktis untuk mengunduh dan memasang aplikasi **Rimba** di smartphone Android Anda langsung dari hasil kompilasi cloud GitHub Actions.

---

## 📲 Cara Mengunduh File APK dari GitHub

Setelah perubahan di-push ke GitHub, sistem **GitHub Actions** akan secara otomatis meng-compile file APK di cloud dalam waktu sekitar 2–3 menit:

### Opsi 1: Lewat Halaman GitHub Releases (Paling Mudah)
1. Buka repositori GitHub: [jagarimbatetaplestari/Rimba-Mobile](https://github.com/jagarimbatetaplestari/Rimba-Mobile).
2. Di sidebar sebelah kanan, klik **Releases** (atau buka tab `/releases`).
3. Temukan rilis terbaru (misal `Rimba Mobile v0.2.0 (Build #...)`).
4. Di bagian **Assets**, tap dan unduh file **`Rimba.apk`** langsung ke smartphone Anda.

### Opsi 2: Lewat Tab GitHub Actions Artifacts
1. Buka tab **Actions** di repositori GitHub.
2. Klik workflow run terbaru dari **"Build Rimba Android APK & AAB"**.
3. Gulir ke bawah ke bagian **Artifacts**.
4. Klik **`Rimba-Android-Debug-APK`** untuk mengunduh arsip zip berisi file `Rimba.apk`.

---

## ⚙️ Cara Memasang di Smartphone Android

1. Buka file **`Rimba.apk`** yang telah diunduh di smartphone Android Anda (biasanya di aplikasi *Files / Download*).
2. Jika muncul peringatan keamanan *"Blocked by Play Protect"* atau *"Izinkan instalasi dari sumber tidak dikenal"*:
   - Pilih **Settings / Pengaturan** > Aktifkan **Izinkan dari sumber ini (Allow from this source)**.
   - Atau tap **More details** > **Install anyway (Tetap instal)**.
3. Tunggu hingga proses instalasi selesai, lalu tap **Buka**.
4. Aplikasi **Rimba** akan berjalan sebagai aplikasi native penuh:
   - Ikon suaka Rimba di layar utama
   - Splash screen emerald yang halus
   - Tombol fisik *Back* Android yang responsif
   - Canvas 3D offline dan haptics getar asli Android.

---

## 🛠️ Perintah Lokal untuk Pengembang (Jika Memiliki Android Studio)

Jika di masa mendatang Anda ingin membuka atau menguji proyek Android di Android Studio:

```bash
# Sinkronkan build web Next.js ke folder Android:
npm run android:sync

# Buka proyek di Android Studio:
npm run android:open

# Generate ulang ikon dan splash screen jika mengganti logo:
npm run android:assets
```
