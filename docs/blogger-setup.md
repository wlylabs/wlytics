# Setup Blogger / Google OAuth

Panduan mendapatkan credentials untuk publish ke Blogger.

Environment variables yang dibutuhkan (lihat [`.env.example`](../.env.example)):

```bash
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REFRESH_TOKEN=
BLOGGER_BLOG_ID=
```

## 1. Buat Project & Enable Blogger API

1. Buka [console.cloud.google.com](https://console.cloud.google.com).
2. **Create Project** → beri nama **"Wlytics"**.
3. **APIs & Services → Enable APIs and Services**.
4. Cari **"Blogger API v3"** → klik **Enable**.

## 2. Buat OAuth 2.0 Client ID

1. **APIs & Services → Credentials**.
2. **Create Credentials → OAuth 2.0 Client ID**.
3. **Application type**: Web application.
4. **Name**: Wlytics.
5. **Authorized redirect URIs** (tambahkan keduanya):
   - `http://localhost:3000/api/auth/callback`
   - `https://wlytics.vercel.app/api/auth/callback`
6. **Create** → salin **Client ID** dan **Client Secret** ke
   `GOOGLE_CLIENT_ID` dan `GOOGLE_CLIENT_SECRET`.

> Jika muncul prompt **OAuth consent screen**, isi dulu (User type: External,
> nama app, email), lalu tambahkan email kamu sebagai **Test user**.

## 3. Dapatkan Refresh Token

`GOOGLE_REFRESH_TOKEN` didapat dari alur OAuth dengan scope
`https://www.googleapis.com/auth/blogger`. Cara tercepat:

1. Buka [OAuth 2.0 Playground](https://developers.google.com/oauthplayground).
2. Klik ikon ⚙️ (Settings) → centang **Use your own OAuth credentials** →
   masukkan Client ID & Client Secret di atas.
3. Di panel kiri, pilih scope **Blogger API v3 →
   `https://www.googleapis.com/auth/blogger`** → **Authorize APIs**.
4. Login dengan akun pemilik blog → **Exchange authorization code for tokens**.
5. Salin **Refresh token** ke `GOOGLE_REFRESH_TOKEN`.

> Pastikan redirect URI Playground (`https://developers.google.com/oauthplayground`)
> juga ditambahkan ke Authorized redirect URIs jika diminta.

## 4. Dapatkan BLOGGER_BLOG_ID

1. Buka [blogger.com](https://www.blogger.com) → masuk ke dashboard blog.
2. Perhatikan URL, contoh: `blogger.com/blog/posts/1234567890`.
3. Angka panjang itu (`1234567890`) adalah **BLOGGER_BLOG_ID**.

## Selesai

Isi keempat nilai di `.env.local`, lalu restart dev server (`npm run dev`).
