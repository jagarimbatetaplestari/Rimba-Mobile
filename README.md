# 🌲 Rimba Mobile — Digital Garden & Focus World

A calm, diorama-style mindfulness and Pomodoro focus application. Cultivate your floating island sanctuary with mindful focus sessions, real-time procedural nature simulation, and authentic offline-first sovereignty.

[![Build Rimba iOS IPA](https://github.com/jagarimbatetaplestari/Rimba-Mobile/actions/workflows/build-ipa.yml/badge.svg)](https://github.com/jagarimbatetaplestari/Rimba-Mobile/actions/workflows/build-ipa.yml)

---

## ✨ Fitur Utama (Key Features)

- **3D Diorama Floating Sanctuary**: Pulau diorama 3D hidup dengan elevasi bertingkat, dinding tanah terakota organik, rumput velvet (*instanced grass wind-shader*), dan pencahayaan dinamis.
- **Sistem Sungai & Aliran Air Otomatis**: Penataan petak sungai yang langsung tersambung dan menyatu secara seamless (*orthogonal auto-tiling*) dengan dasar sungai berpasir dan bebatuan tepi air.
- **Mindful Focus Engine**: Mode Pomodoro & Zen Focus dengan pertumbuhan pohon bertahap (Benih → Tunas → Pohon Muda → Dewasa / Tunggul jika sesi ditinggalkan).
- **Audio Ambience & Soundscapes**: Koleksi musik fokus orisinal (*Embun Pagi Rimba, Kabut Pegunungan, Hening Lembah Pinus*) dan efek suara alami.
- **Ranger Hall of Fame Otentik**: 7 tingkatan hierarki kemajuan suaka murni berbasis pencapaian lokal pengguna tanpa data bot rekayasa.
- **Pengaturan Kualitas Grafis (Eco, Seimbang, Ultra)**: Pilihan densitas rumput dan bayangan untuk performa 60 FPS dan efisiensi baterai ponsel.
- **Sovereign Privacy & App Store Ready**: 100% Offline-first dengan fitur pencadangan JSON, pemulihan data, serta kepatuhan penuh Apple Guideline 5.1.1(v) (*Hapus Akun & Data*).

---

## 📱 Sideload di iPhone via SideStore / AltStore

Aplikasi ini dilengkapi pipeline **GitHub Actions CI/CD** otomatis yang memproduksi file `.ipa` siap sideload setiap ada pembaruan ke branch `main`:

1. Buka tab **[Actions](../../actions)** pada repositori ini di browser Safari iPhone.
2. Pilih workflow run terbaru pada workflow **Build Rimba iOS IPA (SideStore / AltStore)**.
3. Download artifact **`Rimba-SideStore-IPA`** (atau download langsung dari tab **Releases** jika tersedia).
4. Buka aplikasi **SideStore** (atau AltStore) di iPhone.
5. Tap tombol `+` di pojok kiri atas dan pilih file `Rimba.ipa`.
6. SideStore akan menandatangani aplikasi secara otomatis dengan Apple ID pribadi Anda.

---

## 🛠️ Tech Stack

- **Frontend**: Next.js 14 (App Router, Static Export `output: 'export'`), React 18, TypeScript, Tailwind CSS
- **3D Graphics**: Three.js, React Three Fiber (`@react-three/fiber`), React Three Drei (`@react-three/drei`)
- **Native Container**: Capacitor 6 (`@capacitor/core`, `@capacitor/ios`, `@capacitor/haptics`, `@capacitor/local-notifications`, `@capacitor/status-bar`)
- **Cloud & Backend (Opsional)**: Supabase (Auth & Sync)
- **State & Storage**: Zustand (Persistent Local Sovereign Store), W3C Screen Wake Lock API

---

## 💻 Pengembangan Lokal (Local Development)

```bash
# 1. Install dependencies
npm install

# 2. Jalankan development server
npm run dev

# 3. Export static build untuk Capacitor
npm run build

# 4. Sinkronisasi ke Xcode iOS project
npx cap sync ios
```

---

*Dibuat dengan cinta untuk ketenangan dan fokus mindful di alam rimba.* 🍃
