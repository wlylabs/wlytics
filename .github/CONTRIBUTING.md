# Contributing Guide

Terima kasih sudah tertarik berkontribusi ke **AI Content Farm Dashboard** 🎉

Dokumen ini menjelaskan cara berkontribusi dengan rapi agar mudah di-review dan di-merge.

## 🧰 Prasyarat

- **Node.js** 18.17+ (disarankan 20 LTS)
- **npm** 9+
- Akun Supabase, serta API key Groq & Gemini untuk menjalankan fitur generate

## 🚀 Setup Lokal

1. **Fork** repository ini, lalu clone fork kamu:
   ```bash
   git clone https://github.com/<username-kamu>/wlytics.git
   cd wlytics
   ```
2. Tambahkan remote upstream agar mudah sinkronisasi:
   ```bash
   git remote add upstream https://github.com/wlylabs/wlytics.git
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Siapkan environment & database:
   ```bash
   cp .env.example .env.local
   ```
   Isi nilainya, lalu jalankan `supabase/schema.sql` di Supabase SQL Editor.
5. Jalankan dev server:
   ```bash
   npm run dev
   ```

## 🌿 Alur Branch

- Selalu mulai dari branch `main` yang ter-update:
  ```bash
  git checkout main
  git pull upstream main
  ```
- Buat branch baru per perubahan, gunakan prefix yang deskriptif:
  - `feat/<nama-fitur>` untuk fitur baru
  - `fix/<nama-bug>` untuk perbaikan bug
  - `docs/<topik>` untuk perubahan dokumentasi
  - `refactor/<area>` untuk refactor tanpa perubahan perilaku

  ```bash
  git checkout -b feat/keyword-bulk-import
  ```

## ✅ Sebelum Membuat Pull Request

Pastikan semua cek di bawah lulus secara lokal:

```bash
npm run lint     # ESLint
npm run build    # Type-check + production build
```

Checklist:
- [ ] `npm run lint` bersih (tidak ada error/warning baru)
- [ ] `npm run build` sukses
- [ ] Tidak ada secret/API key yang ter-commit (cek `.env.local` tetap di-ignore)
- [ ] Perubahan UI sudah dicoba manual di browser

## 📝 Konvensi Commit

Gunakan format [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>: <ringkasan singkat>

[body opsional yang menjelaskan alasan perubahan]
```

Contoh `type`: `feat`, `fix`, `docs`, `refactor`, `style`, `test`, `chore`.

Contoh:
```
feat: tambah filter intent di halaman keywords
fix: cegah double-submit saat generate artikel
```

## 🔀 Membuat Pull Request

1. Push branch ke fork kamu:
   ```bash
   git push -u origin feat/keyword-bulk-import
   ```
2. Buka Pull Request ke branch `main` di repository upstream.
3. Pada deskripsi PR, jelaskan:
   - **Apa** yang diubah dan **mengapa**
   - Cara menguji (langkah reproduksi / verifikasi)
   - Screenshot bila ada perubahan UI
4. Tautkan issue terkait bila ada (misal `Closes #12`).

PR akan di-review; mohon responsif terhadap feedback dan jaga agar diskusi tetap fokus.

## 🎨 Gaya Kode

- **TypeScript** untuk semua kode baru — hindari `any` bila memungkinkan.
- Komponen React memakai functional component + hooks.
- Styling memakai **Tailwind CSS**; manfaatkan komponen UI di `components/ui` agar konsisten.
- Ikuti pola folder yang ada (`app/`, `components/`, `lib/`, `types/`).
- Biarkan ESLint (`eslint-config-next`) memandu format; jangan menonaktifkan rule tanpa alasan jelas.

## 🐛 Melaporkan Bug / Mengusulkan Fitur

Buka **GitHub Issue** dan sertakan:
- Langkah reproduksi (untuk bug) atau use case (untuk fitur)
- Perilaku yang diharapkan vs yang terjadi
- Environment (OS, versi Node, browser) bila relevan

## 📄 License

Dengan berkontribusi, kamu setuju bahwa kontribusimu dilisensikan di bawah **MIT License**, sama seperti project ini.
