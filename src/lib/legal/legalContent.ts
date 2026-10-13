export interface LegalSection {
  id: string;
  title: string;
  content: string[];
}

export interface LegalDocument {
  title: string;
  lastUpdated: string;
  summary: string;
  sections: LegalSection[];
}

export const LEGAL_CONTENT: Record<
  "id" | "en",
  { privacy: LegalDocument; terms: LegalDocument }
> = {
  id: {
    privacy: {
      title: "Kebijakan Privasi",
      lastUpdated: "12 Oktober 2026",
      summary:
        "Rimba menjunjung tinggi kedaulatan privasi Anda dengan arsitektur Local-First. Data pulau dan sesi fokus Anda tersimpan secara lokal di perangkat Anda dan tidak pernah diperjualbelikan kepada pihak ketiga atau pengiklan.",
      sections: [
        {
          id: "prinsip-utama",
          title: "1. Prinsip Utama & Arsitektur Local-First",
          content: [
            "Rimba dirancang sebagai suaka fokus pribadi yang mengedepankan kedaulatan data pengguna.",
            "Secara default, seluruh data perkembangan pulau suaka, riwayat sesi fokus, catatan jurnal, dan preferensi disimpan langsung di penyimpanan lokal perangkat Anda (Local Storage / IndexedDB).",
            "Kami menganut prinsip minimasi data: kami hanya memproses data yang benar-benar esensial untuk mendukung pengalaman fokus, pemulihan suaka, dan gamifikasi produktivitas Anda.",
          ],
        },
        {
          id: "data-yang-dikumpulkan",
          title: "2. Data yang Kami Kumpulkan",
          content: [
            "• Data Sesi Fokus: Durasi fokus, jenis mode (Timer, Stopwatch, atau Pomodoro), status keberhasilan sesi, timestamp waktu mulai dan selesai, serta kategori aktivitas.",
            "• Data Pulau Suaka: Tata letak petak grid 3D, tanaman dan pohon yang ditanam, koin Soul yang diperoleh, ekspansi lahan, dan status objek alam.",
            "• Data Akun (Jika Mendaftar): Alamat email dan nama tampilan yang Anda berikan saat membuat akun untuk keperluan otentikasi. Jika Anda memilih Mode Tamu (Guest Mode), tidak ada informasi pengenal pribadi yang disimpan di server.",
            "• Preferensi Aplikasi: Pengaturan kualitas grafis (Eco, Balanced, Ultra), volume efek suara dan soundscape, notifikasi pengingat harian lokal, dan preferensi haptik.",
          ],
        },
        {
          id: "penggunaan-data",
          title: "3. Cara Kami Menggunakan Data",
          content: [
            "Menghitung metrik produktivitas harian dan mingguan serta menghasilkan cerita refleksi fokus (Focus Lore & Sanctuary Review).",
            "Menyinkronkan progres pulau Anda ke awan (Cloud Sync melalui Supabase) secara terenkripsi hanya jika Anda masuk dengan akun terdaftar dan mengaktifkan sinkronisasi.",
            "Menampilkan statistik papan peringkat (Leaderboard) regional secara anonim atau samaran jika Anda memilih berpartisipasi.",
            "Kami TIDAK menggunakan data Anda untuk penargetan iklan, profil komersial, atau penjualan kepada pialang data mana pun. Rimba bebas dari pelacak iklan pihak ketiga.",
          ],
        },
        {
          id: "penyimpanan-keamanan",
          title: "4. Penyimpanan, Keamanan & Sinkronisasi",
          content: [
            "Data lokal Anda berada di bawah kendali penuh perangkat Anda.",
            "Jika Anda menggunakan fitur sinkronisasi akun awan, seluruh transmisi data diamankan menggunakan protokol enkripsi standar industri (HTTPS / TLS 1.3).",
            "Penyimpanan database awan dilindungi dengan kebijakan Row-Level Security (RLS), memastikan bahwa hanya akun Anda yang memiliki hak akses membaca dan menulis data pulau Anda.",
          ],
        },
        {
          id: "hak-kedaulatan-pengguna",
          title: "5. Hak Pengguna & Penghapusan Akun Permanen",
          content: [
            "• Hak Ekspor Data (Cadangan Mandiri): Anda berhak mengunduh seluruh berkas data suaka Anda dalam format JSON kapan saja melalui menu Pengaturan > Cadangan & Pemulihan.",
            "• Hak Reset Pulau: Anda dapat mereset tata letak pulau kapan saja tanpa menghapus riwayat sesi fokus.",
            "• Hak Penghapusan Akun & Data (Apple Guideline 5.1.1): Anda berhak menghapus akun Anda beserta seluruh data pulau dan riwayat sesi fokus secara permanen dan seketika melalui tombol 'Hapus Akun & Data Suaka' di menu Pengaturan. Tindakan ini bersifat ireversibel dan langsung membersihkan data dari perangkat dan server.",
          ],
        },
        {
          id: "notifikasi-perangkat",
          title: "6. Izin & Notifikasi Perangkat",
          content: [
            "Rimba dapat meminta izin notifikasi lokal semata-mata untuk mengingatkan Anda ketika sesi fokus selesai atau mengingatkan jadwal fokus harian yang Anda atur sendiri.",
            "Notifikasi ini dijadwalkan secara lokal di perangkat Anda tanpa mengirimkan push notification tracking dari server eksternal.",
          ],
        },
        {
          id: "kontak-layanan",
          title: "7. Hubungi Kami",
          content: [
            "Jika Anda memiliki pertanyaan, masukan, atau permohonan terkait data pribadi Anda di Rimba, silakan hubungi tim kami melalui email resmi:",
            "Email resmi: halo@rimba.app atau melalui repositori resmi Jagat Rimba Tetap Lestari.",
          ],
        },
      ],
    },
    terms: {
      title: "Syarat & Ketentuan Layanan",
      lastUpdated: "12 Oktober 2026",
      summary:
        "Syarat dan ketentuan ini mengatur penggunaan aplikasi Rimba. Rimba adalah alat bantu produktivitas dan suaka fokus digital yang ditujukan untuk menumbuhkan kebiasaan kerja mendalam secara mindful.",
      sections: [
        {
          id: "penerimaan-ketentuan",
          title: "1. Penerimaan Ketentuan",
          content: [
            "Dengan mengunduh, mengakses, atau menggunakan aplikasi Rimba, Anda menyatakan bahwa Anda telah membaca, memahami, dan menyetujui untuk terikat oleh Syarat dan Ketentuan ini.",
            "Jika Anda tidak menyetujui ketentuan ini, Anda dipersilakan untuk tidak menggunakan aplikasi atau menghapus aplikasi dari perangkat Anda.",
          ],
        },
        {
          id: "tujuan-layanan",
          title: "2. Deskripsi Layanan",
          content: [
            "Rimba menyediakan platform gamifikasi fokus, timer produktivitas (Pomodoro, Stopwatch, Countdown), soundscape audio bertema alam, serta diorama pulau 3D yang bertumbuh seiring waktu fokus pengguna.",
            "Layanan ini dirancang untuk tujuan produktivitas pribadi, kesehatan digital (digital wellbeing), dan sarana meditasi kerja mendalam.",
          ],
        },
        {
          id: "aset-virtual",
          title: "3. Aset Virtual & Mata Uang Dalam Game (Soul)",
          content: [
            "Pohon, tanaman, objek dekorasi alam, ekspansi petak pulau, dan 'Soul' (koin dalam game) merupakan aset virtual murni.",
            "Semua aset virtual diperoleh sebagai apresiasi atas dedikasi waktu fokus nyata Anda.",
            "Aset virtual ini TIDAK memiliki nilai moneter di dunia nyata, tidak dapat diperjualbelikan, ditransfer antar akun, atau ditukarkan dengan uang sungguhan dalam bentuk apa pun.",
          ],
        },
        {
          id: "tanggung-jawab-akun",
          title: "4. Akun & Keamanan Pengguna",
          content: [
            "Anda dapat menggunakan Rimba dalam Mode Tamu (Guest) tanpa registrasi, atau mendaftar menggunakan alamat email untuk menikmati sinkronisasi lintas perangkat.",
            "Anda bertanggung jawab penuh untuk menjaga kerahasiaan kata sandi akun Anda.",
            "Anda dilarang menggunakan skrip otomatis, bot, emulator manipulasi waktu, atau eksploitasi kode untuk memanipulasi durasi sesi fokus atau posisi papan peringkat.",
          ],
        },
        {
          id: "hak-kekayaan-intelektual",
          title: "5. Hak Kekayaan Intelektual",
          content: [
            "Seluruh hak cipta, merek dagang, desain antarmuka, model 3D diorama, ilustrasi narasi bab cerita (Story Lore), rekaman audio soundscape, dan kode sumber aplikasi Rimba adalah milik pengembang Rimba dan dilindungi oleh undang-undang hak kekayaan intelektual.",
            "Pengguna dilarang merekayasa balik (reverse engineer), mendistribusikan ulang, atau mengeksploitasi aset media Rimba untuk kepentingan komersial tanpa izin tertulis.",
          ],
        },
        {
          id: "penafian-tanggung-jawab",
          title: "6. Penafian & Batasan Tanggung Jawab",
          content: [
            "Aplikasi Rimba disediakan atas dasar 'sebagaimana adanya' (as-is) dan 'sebagaimana tersedia' (as-available).",
            "Meskipun kami berupaya memastikan keakuratan timer dan kestabilan aplikasi, penghitungan timer di latar belakang dapat dipengaruhi oleh optimasi baterai dan kebijakan sleep sistem operasi perangkat Anda.",
            "Rimba bukan pengganti saran medis profesional untuk penanganan gangguan perhatian klinis, insomnia, atau kondisi kesehatan lainnya.",
          ],
        },
        {
          id: "perubahan-layanan",
          title: "7. Pembaruan & Perubahan Ketentuan",
          content: [
            "Kami dapat memperbarui Syarat dan Ketentuan ini dari waktu ke waktu untuk mencerminkan fitur baru atau perubahan regulasi hukum.",
            "Perubahan akan berlaku efektif setelah dipublikasikan di dalam aplikasi dengan tanggal pembaruan terbaru.",
          ],
        },
      ],
    },
  },
  en: {
    privacy: {
      title: "Privacy Policy",
      lastUpdated: "October 12, 2026",
      summary:
        "Rimba respects and safeguards your privacy sovereignty with an offline-first architecture. Your focus history and sanctuary island data remain locally on your device and are never sold to advertisers or third parties.",
      sections: [
        {
          id: "core-principles",
          title: "1. Core Principles & Offline-First Design",
          content: [
            "Rimba is architected as a personal focus sanctuary that champions user data sovereignty.",
            "By default, all island growth data, focus sessions, reflection journals, and settings are stored locally on your device (Local Storage / IndexedDB).",
            "We adhere to strict data minimization: we only process what is strictly essential for your gamified focus and sanctuary restoration experience.",
          ],
        },
        {
          id: "data-we-collect",
          title: "2. Information We Collect",
          content: [
            "• Focus Session Data: Duration, timer mode (Timer, Stopwatch, or Pomodoro), session success outcome, start and completion timestamps, and category tags.",
            "• Sanctuary Island Data: 3D grid layouts, planted flora and trees, earned Soul currency, unlocked land expansions, and environmental object placements.",
            "• Account Information (If Registered): Email address and display name provided during registration for authentication purposes. In Guest Mode, zero personally identifiable information is stored on our servers.",
            "• App Preferences: Graphic quality presets (Eco, Balanced, Ultra), soundscape and SFX volume levels, local daily reminder schedules, and haptic feedback toggles.",
          ],
        },
        {
          id: "how-we-use-data",
          title: "3. How We Use Information",
          content: [
            "To calculate daily and weekly productivity metrics and generate reflective focus summaries (Focus Lore & Sanctuary Review).",
            "To securely synchronize your sanctuary progress to the cloud (via Supabase) solely when you log in with a registered account and choose to sync.",
            "To display regional leaderboards anonymously or using your chosen display handle if you opt in.",
            "We NEVER sell, monetize, or share your data with advertisers or data brokers. Rimba is entirely free of commercial ad trackers.",
          ],
        },
        {
          id: "storage-security",
          title: "4. Data Storage, Security & Sync",
          content: [
            "Your local data remains under your full control on your personal device.",
            "When cloud sync is utilized, all data transmissions are protected via modern encryption standards (HTTPS / TLS 1.3).",
            "Cloud database tables are secured with Row-Level Security (RLS) policies, ensuring only your verified account can read or modify your sanctuary data.",
          ],
        },
        {
          id: "user-rights-deletion",
          title: "5. User Rights & Account Deletion (Apple 5.1.1)",
          content: [
            "• Data Export Right: You can download a complete backup of your sanctuary data in JSON format at any time via Settings > Backup & Restore.",
            "• Island Reset Right: You may reset your 3D island layout whenever desired without wiping your historical focus sessions.",
            "• Permanent Account Deletion (Apple Guideline 5.1.1): You can permanently erase your account, all cloud backups, and local sanctuary data instantly via the 'Delete Account & Sanctuary Data' option in Settings. This process is irreversible.",
          ],
        },
        {
          id: "device-permissions",
          title: "6. Device Permissions & Notifications",
          content: [
            "Rimba may request local notification permissions strictly to notify you when a focus session concludes or to trigger your scheduled daily focus reminder.",
            "These notifications are scheduled on-device without remote tracking payloads.",
          ],
        },
        {
          id: "contact-us",
          title: "7. Contact Us",
          content: [
            "If you have questions, feedback, or data requests regarding Rimba, please reach out via our official communication channels:",
            "Official email: halo@rimba.app or through the Jagat Rimba Tetap Lestari repository.",
          ],
        },
      ],
    },
    terms: {
      title: "Terms of Service",
      lastUpdated: "October 12, 2026",
      summary:
        "These terms govern your use of the Rimba mobile application. Rimba is a mindful productivity tool and digital sanctuary designed to foster deep work habits.",
      sections: [
        {
          id: "acceptance-of-terms",
          title: "1. Acceptance of Terms",
          content: [
            "By downloading, accessing, or using Rimba, you agree to be bound by these Terms of Service.",
            "If you do not agree to these terms, please discontinue using Rimba and remove the application from your device.",
          ],
        },
        {
          id: "description-of-service",
          title: "2. Description of Service",
          content: [
            "Rimba provides a gamified focus platform featuring flexible timers (Pomodoro, Stopwatch, Countdown), natural soundscapes, and an interactive 3D diorama island that prospers with your focus habits.",
            "The service is intended for personal productivity, mindfulness, and digital wellbeing.",
          ],
        },
        {
          id: "virtual-assets",
          title: "3. Virtual Items & In-Game Currency (Soul)",
          content: [
            "Trees, botanical ornaments, land tiles, and 'Soul' tokens are purely virtual in-game items awarded for your focused time.",
            "Virtual items have zero real-world monetary value, cannot be redeemed for fiat currency, and cannot be traded outside the application.",
          ],
        },
        {
          id: "user-accounts",
          title: "4. User Accounts & Fair Use",
          content: [
            "You may use Rimba anonymously in Guest Mode, or register with an email address to enable multi-device cloud synchronization.",
            "You are responsible for maintaining the confidentiality of your login credentials.",
            "You agree not to employ automated bots, time-tampering utilities, or exploits to fabricate focus durations or manipulate leaderboard standings.",
          ],
        },
        {
          id: "intellectual-property",
          title: "5. Intellectual Property",
          content: [
            "All visual artwork, 3D diorama models, original soundscapes, narrative story lore, and source code are the intellectual property of Rimba developers.",
            "Unauthorized reverse engineering, redistribution, or commercial reproduction of Rimba assets is strictly prohibited.",
          ],
        },
        {
          id: "disclaimer-liability",
          title: "6. Disclaimer & Limitation of Liability",
          content: [
            "Rimba is provided on an 'as-is' and 'as-available' basis.",
            "While we strive for precise timekeeping, background timer performance may be influenced by your device operating system's battery optimization policies.",
            "Rimba is a productivity companion and does not constitute medical treatment for clinical attention or psychological conditions.",
          ],
        },
        {
          id: "updates-to-terms",
          title: "7. Modifications to Terms",
          content: [
            "We reserve the right to revise these Terms of Service periodically to reflect product updates or legal standards.",
            "Continued use of Rimba following updates signifies your acceptance of the revised terms.",
          ],
        },
      ],
    },
  },
};
