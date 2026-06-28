# wlytics

An automated dashboard for generating and publishing Indonesian tech articles end to end — from keyword research to a live WordPress post — powered by Groq and Gemini.

## Features

- **Keyword research** — generate 20 long-tail tech keywords at a time with Groq.
- **Article generation** — a streaming pipeline (outline → article → SEO meta) across Groq and Gemini, with live per-step progress.
- **Article types** — choose the format and length target that fits the topic.
- **Review & edit** — preview articles and edit SEO metadata before publishing.
- **One-click publishing** — push finished articles to WordPress via the REST API.
- **Analytics** — track the content pipeline and publishing status at a glance.

## Tech Stack

| Layer | Technology |
| --- | --- |
| Framework | Next.js 14 (App Router, TypeScript) |
| Styling | Tailwind CSS |
| Database | Supabase (PostgreSQL) |
| LLMs | Groq API, Gemini API |
| Publishing | WordPress REST API |

## How It Works

```
Keyword research (Groq)
        │
        ▼
Outline (Groq) ──► Article (Gemini) ──► SEO meta (Groq) ──► Save (Supabase)
        │
        ▼
   Review & edit ──► Publish (WordPress REST API)
```

The generation endpoint streams newline-delimited JSON so the UI reflects real per-step progress instead of a spinner.

## Prerequisites

- Node.js 18.17 or later
- npm 9 or later
- A Supabase project, plus Groq and Gemini API keys

## Getting Started

### 1. Clone and install

```bash
git clone https://github.com/wlylabs/wlytics.git
cd wlytics
npm install
```

### 2. Configure environment variables

```bash
cp .env.example .env.local
```

Fill in the values in `.env.local` (see [Environment Variables](#environment-variables)).

### 3. Set up the database

Open the Supabase Dashboard → SQL Editor and run [`supabase/schema.sql`](./supabase/schema.sql). See [`supabase/README.md`](./supabase/README.md) for step-by-step instructions.

### 4. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment Variables

| Variable | Required | Description |
| --- | --- | --- |
| `GROQ_API_KEY` | Yes | Groq API key |
| `GEMINI_API_KEY` | Yes | Gemini API key |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase service-role key (server only) |
| `WP_URL` | Yes | WordPress site URL |
| `WP_USERNAME` | Yes | WordPress username |
| `WP_APP_PASSWORD` | Yes | WordPress application password |
| `GROQ_MODEL` | No | Override the large Groq model |
| `GROQ_FAST_MODEL` | No | Override the fast Groq model |
| `GEMINI_MODEL` | No | Override the Gemini model |

> The service-role key bypasses row-level security and must never be exposed to the client.

### Where to get the keys

- **Groq** — https://console.groq.com
- **Gemini** — https://aistudio.google.com
- **Supabase** — https://supabase.com (Project Settings → API)
- **WordPress** — Users → Profile → Application Passwords

## AI Models

Defaults are current production models and can be overridden via environment variables without code changes:

| Role | Default | Override |
| --- | --- | --- |
| Groq (large) | `openai/gpt-oss-120b` | `GROQ_MODEL` |
| Groq (fast) | `openai/gpt-oss-20b` | `GROQ_FAST_MODEL` |
| Gemini | `gemini-2.5-flash` | `GEMINI_MODEL` |

LLM calls retry automatically with exponential backoff on rate limits and transient errors, and fail with a clear message when an API key is missing. If a provider deprecates a model, just update the matching environment variable.

## Article Types

Each type targets a different length and structure:

| Type | Target length |
| --- | --- |
| Complete Guide | 2000+ words |
| Tips & Tricks | 1200–1500 words |
| Comparison | 1500–2000 words |
| Tech News | 800–1000 words |

## Project Structure

```
.
├── app/                      # Next.js App Router
│   ├── api/                  # Route handlers
│   │   ├── keywords/         # GET list, POST research (Groq)
│   │   ├── generate/         # POST streaming pipeline (outline → article → meta)
│   │   ├── articles/         # GET list, PATCH update, [id] GET/DELETE
│   │   ├── publish/          # POST publish to WordPress
│   │   └── stats/            # GET dashboard stats
│   ├── keywords/             # Keyword research page
│   ├── generate/             # Article generation page
│   ├── articles/             # Article list and detail ([id])
│   ├── analytics/            # Analytics page
│   ├── publish/              # Publish page
│   ├── layout.tsx            # Root layout (sidebar + toaster)
│   └── page.tsx              # Dashboard
├── components/
│   ├── layout/               # Sidebar, Header
│   └── ui/                   # Button, Badge, Card, Loader, EmptyState, ConfirmDialog
├── lib/                      # Integrations: groq, gemini, supabase, wordpress, prompts, retry, articleTypes
├── types/                    # Shared TypeScript types
└── supabase/                 # schema.sql + database setup guide
```

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm run build` | Create a production build |
| `npm run start` | Run the production build |
| `npm run lint` | Run ESLint |

## License

[MIT](./LICENSE)
