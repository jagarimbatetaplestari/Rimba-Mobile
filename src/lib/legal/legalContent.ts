export interface LegalSection { id: string; title: string; content: string[]; }
export interface LegalDocument { title: string; lastUpdated: string; summary: string; sections: LegalSection[]; }
export const SUPPORT_EMAIL = "jagarimba.tetaplestari@gmail.com";
export const LEGAL_CONTENT: Record<'id' | 'en', { privacy: LegalDocument; terms: LegalDocument }> = {
  "id": {
    "privacy": {
      "title": "Kebijakan Privasi",
      "lastUpdated": "1 November 2026",
      "summary": "Rimba menyimpan progres di perangkat dan menyinkronkannya ke cloud saat Anda masuk. Kebijakan ini menjelaskan akun, profil komunitas, pembelian, dan pilihan penghapusan data Anda.",
      "sections": [
        {
          "id": "data",
          "title": "1. Data yang Diproses",
          "content": [
            "• Akun: ID pengguna, nama, email, dan informasi autentikasi yang diberikan saat masuk melalui email, Apple, atau Google. Kami tidak menerima kata sandi akun Apple atau Google Anda.",
            "• Progres: Durasi, waktu, mode dan status sesi fokus; tugas, tag, jurnal, tata letak pulau, objek, Soul/XP, pencapaian dan preferensi. Data ini disimpan lokal dan dapat disinkronkan sebagai save akun.",
            "• Profil dan komunitas: Nama tampilan, bio, avatar/foto yang Anda pilih, statistik serta informasi kehadiran/sesi ketika memakai fitur komunitas.",
            "• Pembelian dan operasi layanan: ID pengguna aplikasi, produk, transaksi, status langganan, pemulihan pembelian, informasi platform/perangkat, dan log teknis yang diperlukan oleh penyedia layanan. Apple atau Google memproses pembayaran; Rimba tidak menerima nomor kartu pembayaran Anda."
          ]
        },
        {
          "id": "purpose",
          "title": "2. Tujuan dan Sinkronisasi",
          "content": [
            "Kami memproses data untuk autentikasi, menyimpan dan memulihkan progres, menghitung statistik fokus, menyediakan fitur sosial, memverifikasi akses Pro, serta menangani dukungan dan penyalahgunaan.",
            "Saat masuk dengan akun, aplikasi dapat menyinkronkan progres secara otomatis melalui Supabase. Mode tamu menyimpan progres di perangkat; penggunaan fitur jaringan tetap dapat mengirimkan data yang diperlukan untuk fitur tersebut.",
            "Kami tidak menjual data pribadi atau menggunakannya untuk penargetan iklan lintas aplikasi."
          ]
        },
        {
          "id": "public",
          "title": "3. Data yang Terlihat oleh Orang Lain",
          "content": [
            "Nama tampilan, bio, avatar dan statistik yang ditampilkan pada papan peringkat atau sesi bersama dapat dilihat peserta atau pengguna lain. Email akun bukan bagian dari profil publik yang dimaksudkan untuk ditampilkan.",
            "Avatar yang diunggah menggunakan URL publik; siapa pun yang memiliki URL dapat mengaksesnya. Hindari memasukkan informasi sensitif ke profil, nama ruangan atau konten yang dibagikan."
          ]
        },
        {
          "id": "providers",
          "title": "4. Penyedia Layanan",
          "content": [
            "Supabase menyediakan autentikasi, database, penyimpanan avatar dan Realtime. Apple dan Google memproses login sesuai metode yang Anda pilih.",
            "RevenueCat memproses identitas pengguna aplikasi serta data pembelian/langganan untuk memverifikasi akses Pro dan pemulihan pembelian. App Store atau Google Play menangani transaksi dan pengelolaan tagihan.",
            "Penyedia hosting/CDN serta layanan font dapat menerima informasi koneksi seperti alamat IP dan permintaan teknis. Pemrosesan dan lokasi penyimpanan mengikuti konfigurasi serta kebijakan masing-masing penyedia; data dapat diproses di luar negara Anda."
          ]
        },
        {
          "id": "security",
          "title": "5. Penyimpanan dan Keamanan",
          "content": [
            "Data lokal memakai penyimpanan aplikasi/peramban. Menghapus aplikasi, membersihkan penyimpanan, kerusakan perangkat atau kegagalan save dapat memengaruhi data yang belum dicadangkan.",
            "Komunikasi cloud menggunakan HTTPS/TLS dan kontrol akses server. Sinkronisasi bukan enkripsi end-to-end: operator layanan dan penyedia yang berwenang dapat memproses data untuk menjalankan layanan. Tidak ada sistem yang dapat menjamin keamanan mutlak."
          ]
        },
        {
          "id": "deletion",
          "title": "6. Retensi, Ekspor dan Penghapusan",
          "content": [
            "Data akun disimpan selama diperlukan untuk menyediakan layanan atau sampai penghapusan akun diproses. Catatan yang wajib disimpan untuk kewajiban hukum, keamanan atau transaksi dapat mengikuti retensi penyedia terkait.",
            "Ekspor JSON tersedia melalui Cadangan & Pemulihan. Berkas yang sudah Anda ekspor atau bagikan berada di luar kendali penghapusan jarak jauh Rimba.",
            "Gunakan Pengaturan atau Profil → Hapus Akun & Data Suaka untuk menghapus akun. Kegagalan jaringan/server harus diselesaikan sebelum penghapusan dinyatakan berhasil. Jika tidak dapat masuk, hubungi email dukungan; kami perlu memverifikasi kepemilikan akun.",
            "Penghapusan akun tidak otomatis membatalkan langganan App Store/Google Play. Kelola atau batalkan langganan melalui pengaturan toko sebelum menghapus akun."
          ]
        },
        {
          "id": "permissions",
          "title": "7. Izin Perangkat",
          "content": [
            "Notifikasi digunakan untuk pengingat fokus lokal. Foto/kamera atau pemilih berkas hanya digunakan saat Anda memilih avatar atau mengimpor/mengekspor data. Anda dapat mengelola izin melalui pengaturan perangkat."
          ]
        },
        {
          "id": "contact",
          "title": "8. Kontak dan Pembaruan",
          "content": [
            "Untuk dukungan, privasi, penghapusan akun, atau laporan konten: jagarimba.tetaplestari@gmail.com.",
            "Kebijakan diperbarui bila praktik data berubah; tanggal terbaru ditampilkan di atas."
          ]
        }
      ]
    },
    "terms": {
      "title": "Syarat & Ketentuan Layanan",
      "lastUpdated": "1 November 2026",
      "summary": "Rimba adalah alat produktivitas dengan timer fokus, audio alam dan suaka digital. Ketentuan ini menjelaskan penggunaan fitur gratis, Pro, aset virtual dan akun.",
      "sections": [
        {
          "id": "service",
          "title": "1. Penggunaan Layanan",
          "content": [
            "Gunakan layanan secara sah dan jaga keamanan akun Anda. Mode tamu menyimpan progres lokal; akun diperlukan untuk fitur cloud tertentu. Rimba bukan layanan medis atau jaminan peningkatan produktivitas."
          ]
        },
        {
          "id": "virtual",
          "title": "2. Aset Digital",
          "content": [
            "Pohon, pulau, Soul, XP dan hadiah merupakan aset virtual tanpa nilai tukar uang. Pembelian Pro pada rilis ini tidak mendanai atau menjanjikan penanaman pohon nyata, donasi konservasi, lokasi pohon, maupun sertifikat lingkungan."
          ]
        },
        {
          "id": "purchases",
          "title": "3. Rimba Pro dan Pembelian",
          "content": [
            "Pro tersedia sebagai langganan bulanan, tahunan, atau pembelian lifetime satu kali. Fitur, harga lokal, periode dan total pembayaran ditampilkan oleh toko sebelum konfirmasi.",
            "Langganan bulanan/tahunan diperpanjang otomatis kecuali dibatalkan melalui App Store/Google Play. Pembatalan menghentikan perpanjangan berikutnya; akses yang telah dibayar mengikuti periode dan status transaksi yang berlaku. Lifetime adalah akses satu kali selama layanan/fitur tersebut tersedia, bukan janji bahwa layanan akan beroperasi selamanya.",
            "Gunakan Pulihkan Pembelian dengan akun toko yang membeli. Penghapusan akun atau aplikasi tidak membatalkan tagihan. Pengembalian dana dan pembatalan mengikuti prosedur toko serta hak konsumen yang berlaku. Untuk Apple: https://apps.apple.com/account/subscriptions.",
            "Penggunaan aplikasi Apple tunduk juga pada Apple Standard EULA: https://www.apple.com/legal/internet-services/itunes/dev/stdeula/."
          ]
        },
        {
          "id": "community",
          "title": "4. Akun dan Konten Komunitas",
          "content": [
            "Jangan membagikan konten ilegal, pelecehan, ancaman, ujaran kebencian, spam, informasi pribadi orang lain tanpa izin atau materi yang melanggar hak. Jangan memanipulasi timer, hadiah, keanggotaan ruangan atau peringkat.",
            "Anda tetap memiliki konten yang Anda berikan dan mengizinkan pemrosesan/penampilannya sejauh diperlukan untuk menyediakan fitur yang Anda gunakan. Konten atau akses yang melanggar dapat dibatasi. Laporkan masalah melalui email dukungan."
          ]
        },
        {
          "id": "rights",
          "title": "5. Hak Kekayaan Intelektual",
          "content": [
            "Kode, merek dan aset Rimba dimiliki pengembang atau pemberi lisensinya. Penggunaan aplikasi tidak memberikan hak untuk menjual atau mendistribusikan ulang aset; hak yang diberikan lisensi pihak ketiga tetap berlaku."
          ]
        },
        {
          "id": "reliability",
          "title": "6. Ketersediaan dan Data",
          "content": [
            "Timer latar belakang dipengaruhi kebijakan sistem operasi. Buat cadangan sebelum tindakan penting. Kami mengupayakan layanan yang andal tetapi tidak menjamin layanan tanpa gangguan atau pemulihan semua data. Hak wajib konsumen tetap berlaku."
          ]
        },
        {
          "id": "contact",
          "title": "7. Kontak dan Perubahan",
          "content": [
            "Hubungi jagarimba.tetaplestari@gmail.com untuk bantuan, laporan konten atau pertanyaan ketentuan. Perubahan material akan ditampilkan dengan tanggal pembaruan."
          ]
        }
      ]
    }
  },
  "en": {
    "privacy": {
      "title": "Privacy Policy",
      "lastUpdated": "November 1, 2026",
      "summary": "Rimba stores progress on your device and syncs it to the cloud when you sign in. This policy covers accounts, community profiles, purchases, and your deletion choices.",
      "sections": [
        {
          "id": "data",
          "title": "1. Data We Process",
          "content": [
            "• Account: User ID, name, email and authentication information provided through email, Apple or Google sign-in. We do not receive your Apple or Google account password.",
            "• Progress: Focus session duration, timestamps, mode and status; tasks, tags, journals, island layout, objects, Soul/XP, achievements and preferences. This is stored locally and may be synced as an account save.",
            "• Profile and community: Display name, bio, avatar/photo you choose, statistics and presence/session information when using community features.",
            "• Purchases and operations: App user ID, products, transactions, subscription status, purchase restoration, platform/device information, and technical logs needed by service providers. Apple or Google handles payment; Rimba does not receive your payment card number."
          ]
        },
        {
          "id": "purpose",
          "title": "2. Purposes and Sync",
          "content": [
            "We use data to authenticate accounts, save and restore progress, calculate focus statistics, provide social features, verify Pro access, and handle support or abuse.",
            "When you sign in, the app may automatically sync progress through Supabase. Guest progress is stored on-device; using network features may still transmit information required for those features.",
            "We do not sell personal data or use it for cross-app advertising targeting."
          ]
        },
        {
          "id": "public",
          "title": "3. Information Visible to Others",
          "content": [
            "Display names, bios, avatars and statistics shown in leaderboards or shared sessions may be visible to participants or other users. Account email is not intended to be part of the public profile.",
            "Uploaded avatars use public URLs; anyone with the URL can access them. Avoid sensitive information in profiles, room names or shared content."
          ]
        },
        {
          "id": "providers",
          "title": "4. Service Providers",
          "content": [
            "Supabase provides authentication, database, avatar storage and Realtime. Apple and Google process sign-in according to your chosen method.",
            "RevenueCat processes app user identity and purchase/subscription information to verify Pro access and restore purchases. App Store or Google Play handles transactions and billing management.",
            "Hosting/CDN and font providers may receive connection information such as IP addresses and technical requests. Processing and storage locations depend on provider configuration and policies; data may be processed outside your country."
          ]
        },
        {
          "id": "security",
          "title": "5. Storage and Security",
          "content": [
            "Local data uses app/browser storage. Uninstalling the app, clearing storage, device damage or failed saves can affect data that has not been backed up.",
            "Cloud communication uses HTTPS/TLS and server access controls. Sync is not end-to-end encrypted: authorized operators and providers can process data to run the service. No system can guarantee absolute security."
          ]
        },
        {
          "id": "deletion",
          "title": "6. Retention, Export and Deletion",
          "content": [
            "Account data is retained as needed to provide the service or until account deletion is processed. Records required for legal, security or transaction obligations may follow applicable provider retention.",
            "JSON export is available under Backup & Restore. Files you export or share remain outside Rimba remote deletion control.",
            "Use Settings or Profile → Delete Account & Sanctuary Data to delete your account. Network/server failures must be resolved before deletion is confirmed. If you cannot sign in, contact support; we must verify account ownership.",
            "Deleting an account does not automatically cancel App Store/Google Play subscriptions. Manage or cancel them through store settings before deleting your account."
          ]
        },
        {
          "id": "permissions",
          "title": "7. Device Permissions",
          "content": [
            "Notifications provide local focus reminders. Photos/camera or file pickers are used when you choose an avatar or import/export data. Manage permissions in your device settings."
          ]
        },
        {
          "id": "contact",
          "title": "8. Contact and Updates",
          "content": [
            "For support, privacy, account deletion or content reports: jagarimba.tetaplestari@gmail.com.",
            "We update this policy when data practices change; the latest date appears above."
          ]
        }
      ]
    },
    "terms": {
      "title": "Terms of Service",
      "lastUpdated": "November 1, 2026",
      "summary": "Rimba is a productivity tool with focus timers, nature audio and a digital sanctuary. These terms cover free features, Pro, virtual items and accounts.",
      "sections": [
        {
          "id": "service",
          "title": "1. Using Rimba",
          "content": [
            "Use the service lawfully and protect your account credentials. Guest mode stores progress locally; an account is required for some cloud features. Rimba is not medical care or a guarantee of productivity improvements."
          ]
        },
        {
          "id": "virtual",
          "title": "2. Digital Items",
          "content": [
            "Trees, islands, Soul, XP and rewards are virtual items without cash redemption value. Pro purchases in this release do not fund or promise real-tree planting, conservation donations, tree locations or environmental certificates."
          ]
        },
        {
          "id": "purchases",
          "title": "3. Rimba Pro and Purchases",
          "content": [
            "Pro is offered as monthly or annual subscriptions, or a one-time lifetime purchase. The store displays features, local pricing, period and total charge before confirmation.",
            "Monthly/annual subscriptions renew automatically unless canceled through App Store/Google Play. Cancellation stops the next renewal; paid access follows the applicable period and transaction status. Lifetime is one-time access while the service/features remain available, not a promise of perpetual service operation.",
            "Use Restore Purchases with the store account that made the purchase. Deleting an account or app does not cancel billing. Refunds and cancellations follow store procedures and applicable consumer rights. For Apple: https://apps.apple.com/account/subscriptions.",
            "Apple app use is also subject to the Apple Standard EULA: https://www.apple.com/legal/internet-services/itunes/dev/stdeula/."
          ]
        },
        {
          "id": "community",
          "title": "4. Accounts and Community Content",
          "content": [
            "Do not share illegal content, harassment, threats, hate speech, spam, private information about others without permission, or infringing material. Do not manipulate timers, rewards, room membership or rankings.",
            "You retain ownership of your content and permit its processing/display as needed for features you use. Violating content or access may be restricted. Report issues through support email."
          ]
        },
        {
          "id": "rights",
          "title": "5. Intellectual Property",
          "content": [
            "Rimba code, brands and assets belong to the developer or its licensors. App use does not grant rights to sell or redistribute assets; rights granted by third-party licenses remain applicable."
          ]
        },
        {
          "id": "reliability",
          "title": "6. Availability and Data",
          "content": [
            "Background timers are affected by operating system policies. Back up before important actions. We work toward reliable service but cannot guarantee uninterrupted availability or recovery of all data. Mandatory consumer rights remain unaffected."
          ]
        },
        {
          "id": "contact",
          "title": "7. Contact and Changes",
          "content": [
            "Contact jagarimba.tetaplestari@gmail.com for support, content reports or questions about these terms. Material changes will be shown with an updated date."
          ]
        }
      ]
    }
  }
};
