# Supabase Database Setup

Skema database untuk **wlytics** (content farm). Folder ini berisi:

- [`schema.sql`](./schema.sql) — definisi tabel, index, dan konfigurasi RLS.

## Isi Skema

| Tabel | Kegunaan |
| --- | --- |
| `keywords` | Daftar keyword hasil research (intent, estimasi artikel, status). |
| `articles` | Artikel yang digenerate beserta metadata SEO dan info publish WordPress. |
| `analytics` | Metrik performa per artikel (views, clicks, impressions, CTR). |

Plus index pada `articles(status)`, `articles(created_at desc)`, dan `keywords(status)` untuk performa query.

> **Catatan RLS:** skema ini **menonaktifkan** Row Level Security agar mudah saat development. **Jangan** dibiarkan nonaktif di produksi — aktifkan RLS dan buat policy yang sesuai sebelum go-live.

## Cara Menjalankan di Supabase Dashboard

1. Buka [app.supabase.com](https://app.supabase.com) dan pilih project kamu (atau buat project baru).
2. Di sidebar kiri, klik menu **SQL Editor**.
3. Klik **+ New query**.
4. Buka file [`supabase/schema.sql`](./schema.sql), salin **seluruh** isinya, lalu tempel ke editor.
5. Klik tombol **Run** (atau tekan `Ctrl/Cmd + Enter`).
6. Pastikan muncul notifikasi **Success. No rows returned** — artinya tabel berhasil dibuat.
7. Verifikasi di menu **Table Editor**: tabel `keywords`, `articles`, dan `analytics` seharusnya sudah muncul.

Skema bersifat **idempotent** (memakai `create ... if not exists`), jadi aman dijalankan ulang tanpa menghapus data yang sudah ada.

## Menghubungkan ke Aplikasi

Setelah skema dibuat, ambil kredensial project dari **Project Settings → API** dan isi ke `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-public-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
```

> ⚠️ `SUPABASE_SERVICE_ROLE_KEY` bersifat rahasia (bypass RLS). Hanya dipakai di sisi server (API routes) dan jangan pernah diekspos ke client.

Restart dev server (`npm run dev`) setelah mengisi env agar nilai terbaca.
