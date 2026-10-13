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

## ⚙️ 2. Konfigurasi Email Provider & OTP

Buka **Authentication -> Providers -> Email**:

| Pengaturan | Nilai Rekomendasi | Alasan Teknis |
| :--- | :---: | :--- |
| **Enable Email provider** | **ON (Aktif)** | Mengizinkan pendaftaran & login via email. |
| **Confirm email** | **ON (Aktif)** | Mencegah pendaftaran email palsu; memicu pengiriman 6-digit OTP ke email user saat sign up. |
| **Secure email change** | **ON (Aktif)** | Mengharuskan konfirmasi email ganda jika user mengubah email. |
| **Minimum password length** | **6** | Selaras dengan validasi form login & register Rimba. |
| **OTP Expiry (seconds)** | **3600** *(1 jam)* | Memberikan waktu cukup bagi user untuk memeriksa email tanpa kedaluwarsa terlalu cepat. |

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
3. `com.rimba.focus://**` *(Untuk deep link balik ke aplikasi native Android/iOS)*

---

## 🚀 4. Rekomendasi SMTP Mandiri (Bypass Rate-Limit 3 Email/Jam)

Secara default, Supabase membatasi pengiriman email bawaan (**default Supabase mailer**) hanya **3 hingga 4 email per jam** untuk mencegah spam.

Untuk penggunaan rilis produksi, sangat disarankan menghubungkan **Custom SMTP Provider**:

### Opsi Terbaik & Gratis: **Resend** (resend.com)
1. Daftar gratis di [Resend.com](https://resend.com) (gratis 3.000 email/bulan, 100 email/hari).
2. Verifikasi domain Anda (misal: `rimba.app` atau `jagarimba.id`) atau gunakan subdomain test.
3. Buat API Key di Resend.
4. Di Supabase Dashboard, buka **Project Settings -> Authentication -> SMTP Settings**:
   - **Sender email:** `halo@rimba.app` *(atau email domain terverifikasi Anda)*
   - **Sender name:** `Rimba Suaka Fokus`
   - **Host:** `smtp.resend.com`
   - **Port:** `465` (SSL) atau `587` (TLS)
   - **Username:** `resend`
   - **Password:** `<API_KEY_RESEND_ANDA>`
5. Klik **Save**. Pengiriman email OTP akan tiba dalam kurun waktu **1-2 detik** tanpa batasan rate limit Supabase!

---

## 🗄️ 5. Skema Database & Trigger Supabase

Pastikan seluruh skema tabel di [`supabase_schema.sql`](file:///d:/Project/Rimba/Rimba-Mobile/supabase_schema.sql) telah dieksekusi di **SQL Editor** Supabase:

1. **Tabel `public.profiles`**: Menyimpan identitas Ranger (Display Name, Avatar, Bio, XP, Level).
2. **Tabel `public.game_saves`**: Menyimpan data pulau 3D, petak grid, dan riwayat sesi fokus dengan enkripsi RLS.
3. **Trigger `handle_new_user()`**: Otomatis membuat profil baru di `public.profiles` sesaat setelah user berhasil mendaftar (`auth.users`).
4. **RPC `delete_user_account()`**: Fungsi keamanan server-side yang menghapus akun & data permanen sesuai regulasi Apple 5.1.1(v).
5. **Storage Bucket `avatars`**: Bucket publik untuk foto profil ranger pengguna.
