# 📱 Panduan Resmi Submission Google Play Store & Apple App Store: Rimba

Dokumen ini berisi panduan formulir lengkap (**Copy-Paste Ready**) untuk mendaftarkan dan meloloskan aplikasi **Rimba** di **Google Play Console** dan **Apple App Store Connect**.

---

## 🏷️ 1. Metadata & Identitas Aplikasi

| Field | Google Play Store (Android) | Apple App Store (iOS) |
| :--- | :--- | :--- |
| **App Name** | `Rimba: Focus Garden` *(Maks 30 Karakter)* | `Rimba: Focus Garden` *(Maks 30 Karakter)* |
| **Subtitle** | *(Tidak ada)* | `Tumbuhkan Suaka Alami Fokus` *(Maks 30 Karakter)* |
| **Package ID / Bundle ID** | `com.rimba.focus` | `com.rimba.focus` |
| **Kategori Utama** | **Productivity** (Produktivitas) | **Productivity** (Produktivitas) |
| **Kategori Sekunder** | **Health & Fitness** atau **Casual** | **Lifestyle** atau **Games (Simulation)** |
| **Tags / Keywords** | `focus timer, pomodoro, habit, relaxing, meditation, nature, zen, plant trees, productivity` | `focus, pomodoro, timer, relax, zen, mindful, garden, productivity, habit, meditation` |
| **Support URL** | `https://github.com/jagarimbatetaplestari/Rimba-Mobile/issues` *(atau website resmi)* | `https://github.com/jagarimbatetaplestari/Rimba-Mobile/issues` |
| **Privacy Policy URL** | `https://rimba-mobile.vercel.app/privacy` | `https://rimba-mobile.vercel.app/privacy` |

### 📝 Deskripsi Singkat (Short Description) — Maks 80 Karakter:
```text
Tumbuhkan pulau suaka alam virtualmu sembari melatih fokus harian yang tenang.
```

### 📄 Deskripsi Lengkap (Full Description) — Siap Copy-Paste:
```text
Selamat datang di Rimba, suaka alam virtual di mana setiap menit fokusmu menumbuhkan kehidupan baru.

Rimba menggabungkan metode fokus berbasis waktu (Pomodoro & Stopwatch) dengan simulasi pulau diorama 3D yang hidup dan menenangkan. Setiap kali kamu fokus belajar, bekerja, atau bermeditasi, bibit pohonmu bertumbuh menjadi flora yang rimbun dan membuka ekosistem satwa liar.

🌿 FITUR UTAMA RIMBA:

1. SUAKA ALAMI FOKUS & POMODORO
• Tentukan durasi fokusmu (15 hingga 120 menit) atau gunakan mode stopwatch bebas.
• Mode Fokus Penuh (Strict Guard): Mengunci distraksi agar pohonmu tidak layu saat kamu tergoda membuka aplikasi lain.
• Pohon tumbuh seiring waktu dan memberikan esensi jiwa (Soul) untuk merawat pulau.

2. MODE ZEN & SOUNDSCAPE MENENANGKAN
• Masuki Mode Zen minimalis untuk meditasi atau konsentrasi mendalam.
• Lapisan audio ganda: Suara hujan rintik, angin pinus, aliran sungai, deburan ombak, dipadukan dengan musik Lo-Fi dan ambient lembut.
• Tetap berputar di latar belakang saat layar ponsel terkunci.

3. WORKSHOP ARSITEKTUR ALAM & 4 BIOMA
• Bangun dan tata pulau suaka impianmu: letakkan aliran sungai, jembatan kayu, bebatuan, dan pepohonan unik.
• Jelajahi 4 tema bioma musiman: Padang Rumput Hijau, Musim Gugur Emas, Puncak Salju Zen, dan Mata Air Teratai.

4. STATISTIK SIRKADIAN 24 JAM & JURNAL PERJALANAN
• Lacak ritme produktivitas harianmu dengan diagram jam biologis sirkadian 24 jam.
• Catat progres streak harian, raih lencana pencapaian, dan kumpulkan fragmen kebijaksanaan alam.

5. OFFLINE-FIRST & AMAN
• Berfungsi penuh tanpa internet. Seluruh progres tersimpan aman di perangkat dan tersinkronisasi otomatis saat terhubung kembali.
• Mode Tamu (Guest Mode) tersedia tanpa kewajiban mendaftar akun.

Jadikan setiap momen fokusmu lebih damai, produktif, dan bermakna bersama Rimba.
```

---

## 🤖 2. Formulir Deklarasi Google Play Console

### A. Data Safety Questionnaire (Keamanan Data)
Google Play mewajibkan pengisian kuisioner Data Safety. Isi dengan jawaban berikut:

1. **Apakah aplikasi mengumpulkan atau membagikan data pengguna?**
   - Jawab: **YES (Ya)**
2. **Apakah semua data pengguna dienkripsi saat transit?**
   - Jawab: **YES (Ya)** *(Semua lalu lintas data menggunakan protokol HTTPS / TLS aman)*
3. **Apakah pengguna dapat meminta penghapusan data mereka?**
   - Jawab: **YES (Ya)**
   - Link permintaan hapus data: `https://rimba-mobile.vercel.app/privacy` *(Pengguna juga dapat menekan tombol Reset & Hapus Data di menu Pengaturan aplikasi)*
4. **Kategori Data yang Dikumpulkan:**
   - **Personal Info -> Email Address:**
     - Dikumpulkan? **YES (Opsional)** *(Hanya jika pengguna memilih login dengan email; tidak wajib di Guest Mode)*
     - Dibagikan ke pihak ketiga? **NO (Tidak)**
     - Tujuan: **App functionality & Account management**
   - **App Info & Performance -> Diagnostics / Crash logs:**
     - Dikumpulkan? **YES (Anonim)**
     - Dibagikan? **NO (Tidak)**
     - Tujuan: **Analytics & Developer diagnostics**
   - **Lokasi, Keuangan, Kontak, SMS, Foto:**
     - Jawab: **NO (Tidak dikumpulkan sama sekali)**

### B. Advertising ID (Google Advertising ID / GAID)
- **Apakah aplikasi Anda menggunakan Advertising ID?**
  - Jawab: **NO (Tidak)** *(Rimba tidak menampilkan iklan dan tidak menggunakan SDK pelacak iklan)*

### C. Izin Alarm Tepat (SCHEDULE_EXACT_ALARM)
Google Play menanyakan alasan penggunaan izin `SCHEDULE_EXACT_ALARM`:
- **Pilihan Kategori:** **Alarms & Timers** (Jam & Timer)
- **Penjelasan (Text):**
  ```text
  Rimba is a productivity focus timer application. The SCHEDULE_EXACT_ALARM permission is strictly required to deliver precise local notifications and ring alerts exactly when the user's countdown timer expires, ensuring reliable alarms even when the device is in Doze/standby mode.
  ```

### D. Rating Konten IARC (Content Rating Questionnaire)
- Kekerasan: **Tidak ada**
- Konten seksual: **Tidak ada**
- Bahasa kasar / makian: **Tidak ada**
- Perjudian / Taruhan: **Tidak ada**
- Hasil Prediksi: **PEGI 3 / Everyone (Semua Umur / Rating 3+)**

### E. Aturan Closed Testing (20 Testers Selama 14 Hari)
Bagi akun Google Play Developer personal baru (dibuat setelah Nov 2023):
1. Masuk ke **Testing -> Closed testing**.
2. Buat track baru (misal: `Alpha Closed`).
3. Buat Google Group (contoh: `rimba-testers@googlegroups.com`) dan masukkan 20 email kawan/rekan tim.
4. Upload file `Rimba.aab` (dari folder `build/` atau GitHub Actions).
5. Minta 20 tester untuk menginstal aplikasi dan membuka aplikasi secara berkala selama 14 hari berturut-turut.
6. Setelah hari ke-14, tombol **"Apply for Production"** di dashboard Play Console akan aktif.

---

## 🍎 3. Formulir Deklarasi Apple App Store Connect

### A. Age Rating (Batasan Usia)
- Semua kategori konten (Violence, Gambling, Mature themes): Set ke **None**
- Web Access: **Unrestricted Web Access -> NO**
- Hasil Rating: **Age 4+**

### B. App Privacy (Nutrition Labels)
1. **Data Used to Track You:**
   - Jawab: **No, we do not track users** *(Rimba tidak melacak IDFA)*
2. **Data Linked to You:**
   - **Contact Info -> Email Address:**
     - Linked to User: **YES**
     - Purpose: **App Functionality**
3. **Data Not Linked to You:**
   - **Diagnostics -> Crash Data:**
     - Purpose: **App Performance**

### C. App Review Information (Catatan untuk Penguji Apple)
Masukkan informasi berikut di tab **App Review Information**:

- **Sign-In Required:** **No** *(Jelaskan bahwa Guest Mode tersedia)*
- **Demo Account (Jika Reviewer ingin mencoba login cloud):**
  - **Username / Email:** `apple.reviewer@rimba.id`
  - **Password:** `RimbaZen2026!`
- **Notes for Reviewer (Catatan untuk Reviewer):**
  ```text
  Hello Apple Review Team,
  
  Rimba is a mindful productivity garden and Pomodoro focus timer built with interactive 3D dioramas.
  
  Key Testing Instructions:
  1. The app offers a full "Guest Mode" (Mode Tamu) accessible directly from the login screen with zero sign-up friction.
  2. The Background Audio entitlement (audio UIBackgroundModes) is used exclusively for playing relaxing nature soundscapes (rain, river, wind) and lo-fi focus ambient sounds while the timer runs, including when the device screen is turned off.
  3. Account deletion and local data reset can be tested anytime via Settings -> Data & Storage -> Reset / Delete Account.
  
  Thank you for reviewing Rimba!
  ```

---

## 🎨 4. Lokasi File Aset Siap Pakai

Semua aset visual listing toko telah di-generate dan tersimpan di folder [`store_assets/`](file:///d:/Project/Rimba/Rimba-Mobile/store_assets):

1. **Google Play Store:**
   - Ikon Toko: `store_assets/google_play_icon_512x512.png`
   - Feature Graphic: `store_assets/google_play_feature_graphic_1024x500.png`
   - Screenshot Android (1080x2400): `store_assets/screenshots_android_1080x2400/` (5 slide promo)
2. **Apple App Store:**
   - Ikon Toko: `store_assets/app_store_icon_1024x1024.png` *(Tanpa transparansi/alpha channel)*
   - Screenshot iPhone 6.7" (1290x2796): `store_assets/screenshots_ios_1290x2796/` (5 slide promo)
