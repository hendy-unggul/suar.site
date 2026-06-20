# suar.site — Project Context untuk Claude Code

> File ini dibaca otomatis oleh Claude Code di setiap sesi baru.
> Tujuan: supaya tidak perlu menjelaskan ulang arsitektur tiap kali buka project,
> menghemat token. JANGAN HAPUS file ini.

## Apa Ini

Platform game edukasi PWA untuk anak TKA (4-5 tahun) yang membangun fondasi
berpikir logis matematika. Distribusi lewat sekolah PAUD sebagai collaborator,
bukan B2C langsung. Lihat `docs/PRD-v3.docx` untuk detail pedagogik lengkap.

## Prinsip Arsitektur yang TIDAK BOLEH Dilanggar

1. **4 game inti, bukan banyak game terpisah**: Dunia Warna → Dunia Bentuk →
   Dunia Kelompok → Dunia Pola. Urutan ini WAJIB linear dan gated — game
   berikutnya terkunci sampai game sebelumnya tuntas (gate ≥80% akurasi,
   2 minggu berturut-turut di sesi Jumat).

2. **UI anak = NOL teks tertulis**. Anak PAUD belum bisa membaca. Setiap
   instruksi, label, tombol di `apps/game/` HARUS pakai ikon besar + audio cue,
   tidak pernah teks sebagai satu-satunya petunjuk. Tombol minimal 80x80px
   untuk jari anak kecil. Setiap aksi (benar/salah/tap) WAJIB punya audio
   feedback, bukan hanya visual.

3. **Zero punishment design**: tidak ada pengurangan skor untuk jawaban salah.
   Respons ke kesalahan selalu berupa ajakan mencoba lagi dengan animasi/audio
   menyemangati, tidak pernah terasa seperti hukuman.

4. **Reporting WAJIB human-mediated** — ini constraint paling kritis:
   - Data mentah (skor, waktu, akurasi) HANYA boleh muncul di
     `apps/teacher-dashboard/`, tidak pernah dikirim langsung ke orang tua.
   - Sistem boleh generate draf catatan otomatis untuk guru, tapi draf itu
     WAJIB melalui preview + klik konfirmasi eksplisit guru sebelum terkirim.
   - TIDAK ADA tombol "kirim otomatis tanpa review" di mana pun dalam kodebase.
   - Pesan yang sampai ke orang tua selalu menampilkan nama + foto guru,
     tidak pernah sebagai notifikasi generik dari sistem.

5. **Registrasi tertutup**: tidak ada halaman signup publik untuk orang tua.
   Satu-satunya jalur masuk adalah link unik per anak yang di-generate dari
   data yang diinput guru (nama anak, kelas, no HP orang tua) di
   `apps/teacher-dashboard/`. Orang tua hanya konfirmasi no HP + OTP, tidak
   mengisi data apapun.

6. **Auth berbasis no HP, bukan email/password**. Login = no HP + OTP.
   Reset no HP (HP hilang/ganti) HANYA bisa lewat approval guru di dashboard,
   tidak ada self-service reset oleh orang tua. Progress anak harus 100%
   terbawa saat nomor direset.

7. **Weekend Freeplay** ada di tiap game sebagai mode terpisah: semua tema/level
   yang sudah dikenal anak muncul random (interleaving), tanpa skor, tanpa
   limit waktu, tanpa pengaruh ke gate.

## Struktur Folder

```
suar-site/
├── apps/
│   ├── game/                  PWA anak — 4 game inti, no-text UI
│   ├── teacher-dashboard/     Dashboard guru — data mentah + compose catatan
│   └── school-landing/        Subdomain dinamis per sekolah ([slug].suar.site)
├── packages/
│   ├── ui/                    Design system shared (ikon besar, kontras tinggi)
│   └── database/              Schema: school, class, child, parent, progress
└── docs/
    └── PRD-v3.docx             Dokumen pedagogik & teknis lengkap
```

## Stack

- Next.js (App Router) + TypeScript
- PWA via next-pwa atau Serwist
- Database: Postgres (rekomendasi: Supabase/Neon — pilih yang punya free tier)
- Auth: custom no-HP + OTP (bukan NextAuth standar yang asumsi email)
- Deploy: Vercel, auto-deploy dari branch `main`

## Catatan Hemat Token (untuk sesi Claude Code)

- Project ini dikerjakan dengan budget token terbatas. Prioritaskan instruksi
  yang spesifik dan langsung actionable, hindari minta Claude Code
  "jelaskan dulu" sebelum eksekusi kalau arahnya sudah jelas dari file ini.
- Jangan upload screenshot/gambar ke Claude Code kalau bisa dijelaskan via teks
  (gambar memakan token jauh lebih banyak dari teks).
- Untuk perubahan kecil (fix typo, ubah warna, ubah copy), edit langsung tanpa
  minta Claude Code menjelaskan ulang seluruh arsitektur.

## Status Project

- [ ] Scaffold awal struktur folder
- [ ] Setup database schema (school, class, child, parent, progress)
- [ ] Auth flow: no HP + OTP, link unik per anak
- [ ] Game 1: Dunia Warna (MVP)
- [ ] Teacher dashboard: lihat progress + compose catatan
- [ ] Deploy ke Vercel + connect domain suar.site
