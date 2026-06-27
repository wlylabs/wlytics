# 🤖 wlytics

Dashboard otomatis untuk generate & publish artikel teknologi menggunakan Groq + Gemini API ke WordPress.

## ✨ Fitur
- 🔍 Keyword Research otomatis (Groq AI)
- ✍️ Generate artikel 2000 kata (Gemini Flash)
- 📋 Preview & edit artikel sebelum publish
- 🚀 Auto publish ke WordPress
- 📊 Analytics & tracking

## 🛠 Tech Stack
- **Frontend & Backend**: Next.js 14 (App Router + TypeScript)
- **Styling**: Tailwind CSS
- **Database**: Supabase (PostgreSQL)
- **LLM**: Groq API + Gemini API
- **CMS**: WordPress REST API

## 🚀 Quick Start

### 1. Clone & Install
```bash
git clone https://github.com/wlylabs/wlytics.git
cd wlytics
npm install
```

### 2. Environment Variables
```bash
cp .env.example .env.local
```
Isi semua value di `.env.local`.

### 3. Setup Database
- Buka Supabase Dashboard → SQL Editor
- Jalankan file `supabase/schema.sql` (lihat [`supabase/README.md`](./supabase/README.md) untuk langkah detail)

### 4. Run Development
```bash
npm run dev
```
Buka http://localhost:3000

## 📁 Struktur Project

```
.
├── app/                      # Next.js App Router
│   ├── api/                  # Route handlers (backend)
│   │   ├── keywords/         # GET list, POST research keyword (Groq)
│   │   ├── generate/         # POST pipeline outline → artikel → meta
│   │   ├── articles/         # GET list, PATCH update, [id] GET/DELETE
│   │   ├── publish/          # POST publish artikel ke WordPress
│   │   └── stats/            # GET statistik dashboard
│   ├── keywords/             # Halaman keyword research
│   ├── generate/             # Halaman generate artikel
│   ├── articles/             # Daftar artikel + detail ([id])
│   ├── analytics/            # Halaman analytics
│   ├── layout.tsx            # Root layout (Sidebar + Toaster)
│   └── page.tsx              # Dashboard
├── components/
│   ├── layout/               # Sidebar, Header
│   └── ui/                   # Button, Badge, Card, Loader, EmptyState
├── lib/                      # Integrasi: groq, gemini, supabase, wordpress, prompts
├── types/                    # Tipe TypeScript bersama (Keyword, Article, dll)
├── supabase/                 # schema.sql + panduan setup database
├── .env.example              # Template environment variables
└── README.md
```

## 🔑 API Keys yang Dibutuhkan
- **Groq**: https://console.groq.com
- **Gemini**: https://aistudio.google.com
- **Supabase**: https://supabase.com
- **WordPress**: Settings → Application Passwords

## 📄 License
MIT
