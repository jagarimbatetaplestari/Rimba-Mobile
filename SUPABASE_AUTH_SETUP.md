# 🌿 Panduan Konfigurasi Supabase Auth & Template Email: Rimba

Dokumen ini adalah panduan resmi langkah-demi-langkah (**Step-by-Step Production Guide**) untuk menyetel **Supabase Authentication**, **Template Email Biophilic**, **Redirect URLs**, dan **Keamanan Database** untuk aplikasi **Rimba Mobile & Web**.

---

## 📑 Daftar Isi
1. [Pengaturan Email Templates di Supabase Dashboard](#1-pengaturan-email-templates-di-supabase-dashboard)
2. [Konfigurasi Email Provider & OTP](#2-konfigurasi-email-provider--otp)
3. [Konfigurasi URL & Redirect URL Deep Linking](#3-konfigurasi-url--redirect-url-deep-linking)
4. [Rekomendasi SMTP Mandiri (Bypass Rate-Limit 3 Email/Jam)](#4-rekomendasi-smtp-mandiri-bypass-rate-limit-3-emailjam)
5. [Skema Database & Trigger Supabase](#5-skema-database--trigger-supabase)

---

## 🎨 1. Pengaturan Email Templates di Supabase Dashboard

Buka dashboard proyek Supabase Anda:
👉 **Project Dashboard -> Authentication -> Email Templates**

File template HTML siap pakai tersedia di folder [`supabase/email-templates/`](file:///d:/Project/Rimba/Rimba-Mobile/supabase/email-templates/):

| Template | Lokasi File | Subject Rekomendasi | Keterangan |
| :--- | :--- | :--- | :--- |
| **Confirm signup** | [`confirmation.html`](file:///d:/Project/Rimba/Rimba-Mobile/supabase/email-templates/confirmation.html) | `Kode Verifikasi Rimba: {{ .Token }} — Selamat Datang di Suaka Fokus` | Dikirim saat user mendaftar akun baru via email. Berisi kode 6 digit OTP & tautan konfirmasi. |
| **Magic link** | [`magic_link.html`](file:///d:/Project/Rimba/Rimba-Mobile/supabase/email-templates/magic_link.html) | `Kode Masuk Rimba: {{ .Token }} — Lanjutkan Sesi Fokusmu` | Dikirim saat user login tanpa password / OTP instan. |
| **Reset password** | [`recovery.html`](file:///d:/Project/Rimba/Rimba-Mobile/supabase/email-templates/recovery.html) | `Atur Ulang Kata Sandi Rimba: {{ .Token }}` | Dikirim saat user meminta reset kata sandi akun. |
| **Change email address** | [`email_change.html`](file:///d:/Project/Rimba/Rimba-Mobile/supabase/email-templates/email_change.html) | `Konfirmasi Perubahan Email Rimba: {{ .Token }}` | Dikirim saat user memperbarui alamat email mereka di profil. |

### 💡 Cara Pasang di Dashboard:
1. Klik salah satu tab template (misal: **Confirm signup**).
2. Ubah kolom **Subject** menjadi:
   ```text
   Kode Verifikasi Rimba: {{ .Token }} — Selamat Datang di Suaka Fokus
   ```
3. Buka file [`confirmation.html`](file:///d:/Project/Rimba/Rimba-Mobile/supabase/email-templates/confirmation.html), salin seluruh isi kodenya (`Ctrl+A` -> `Ctrl+C`).
4. Tempel ke editor **Body** di Supabase Dashboard dan klik **Save changes**.
5. Ulangi langkah di atas untuk tab **Magic link**, **Reset password**, dan **Change email address**.

> 💡 **Pratinjau Visual:** Anda dapat membuka [`supabase/email-templates/preview.html`](file:///d:/Project/Rimba/Rimba-Mobile/supabase/email-templates/preview.html) langsung di browser Anda untuk melihat tampilan email di Desktop & Mobile serta tombol satu-klik salin HTML.

---

## ⚙️ 2. Konfigurasi Email Provider & Instant Sign-Up (Zero-Friction)

Buka **Authentication -> Providers -> Email**:

| Pengaturan | Nilai Standar | Alasan Arsitektur (Zero-Cost & Zero-Friction) |
| :--- | :---: | :--- |
| **Enable Email provider** | **ON (Aktif)** | Mengizinkan pendaftaran & login via email + kata sandi. |
| **Confirm email** | **OFF (Mati)** | **Instant Sign-Up (<1 detik)**: Mengizinkan user baru & tim *Reviewer* Apple/Google (yang kerap memakai email dummy) langsung masuk tanpa layar tunggu OTP dan tanpa menguras kuota pengiriman SMTP. |
| **Secure email change** | **ON (Aktif)** | Mengharuskan konfirmasi jika user mengubah alamat email. |
| **Minimum password length** | **6** | Selaras dengan validasi form login & register Rimba. |
| **OTP Expiry (seconds)** | **3600** *(1 jam)* | Masa berlaku kode pemulihan kata sandi (Forgot Password). |

---

## 🌐 3. Konfigurasi URL & Redirect URL Deep Linking

Buka **Authentication -> URL Configuration**:

### A. Site URL:
```text
https://rimba-website.pages.dev
```

### B. Redirect URLs (Tambahkan semua baris ini):
1. `http://localhost:3000/**` *(Untuk testing development lokal)*
2. `https://rimba-website.pages.dev/**` *(Untuk web publik)*
3. `com.syntheticae.rimba://**` *(Untuk deep link balik ke aplikasi native Android/iOS)*

---

## 🚀 4. Konfigurasi Custom SMTP Gratis via Gmail App Password (Zero-Cost)

Karena pendaftaran pengguna baru sudah menggunakan **Instant Sign-Up (Confirm email: OFF)**, pengiriman email transaksional **hanya dipakai untuk fitur Lupa Kata Sandi (Forgot Password / Reset Password)** dan dikelola murni oleh Supabase Auth tanpa SDK berbayar di sisi aplikasi.

Gunakan **Gmail SMTP (Gratis 500 email/hari)** dengan langkah berikut:

1. Buka akun Google/Gmail resmi proyek Anda -> **Manage your Google Account -> Security**.
2. Pastikan **2-Step Verification (Verifikasi 2 Langkah)** sudah **Aktif (ON)**.
3. Cari menu **App Passwords (Sandi Aplikasi)** di kolom pencarian Security.
4. Buat App Password baru dengan nama `Supabase Rimba Auth`, lalu salin **16 karakter kode sandi** yang muncul (tanpa spasi).
5. Buka **Supabase Dashboard -> Project Settings -> Authentication -> SMTP Settings**:
   - **Enable Custom SMTP:** `ON`
   - **Sender email:** `email-anda@gmail.com`
   - **Sender name:** `Rimba Suaka Fokus`
   - **Host:** `smtp.gmail.com`
   - **Port:** `465` *(SSL)* atau `587` *(TLS)*
   - **Username:** `email-anda@gmail.com`
   - **Password:** `<16_DIGIT_GMAIL_APP_PASSWORD>`
6. Klik **Save**. Kini email pemulihan kata sandi (*Reset Password*) terkirim instan dalam 1–2 detik dengan biaya **Rp 0 (Zero-Cost)**!

---

## 🗄️ 5. Skema Database & Trigger Supabase

Pastikan seluruh skema tabel di [`supabase_schema.sql`](file:///d:/Project/Rimba/Rimba-Mobile/supabase_schema.sql) telah dieksekusi di **SQL Editor** Supabase:

1. **Tabel `public.profiles`**: Menyimpan identitas Ranger (Display Name, Avatar, Bio, XP, Level).
2. **Tabel `public.game_saves`**: Menyimpan data pulau 3D, petak grid, dan riwayat sesi fokus dengan enkripsi RLS.
3. **Trigger `handle_new_user()`**: Otomatis membuat profil baru di `public.profiles` sesaat setelah user berhasil mendaftar (`auth.users`).
4. **RPC `delete_user_account()`**: Fungsi keamanan server-side yang menghapus akun & data permanen sesuai regulasi Apple 5.1.1(v).
5. **Storage Bucket `avatars`**: Bucket publik untuk foto profil ranger pengguna.
