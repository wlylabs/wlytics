# wlytics

An automated dashboard for generating and publishing Indonesian tech articles end to end — from keyword research to a live Blogger or Dev.to post — powered by Groq and Gemini.

## Features

- **Keyword research** — generate 20 long-tail tech keywords at a time with Groq.
- **Article generation** — a streaming pipeline (outline → article → SEO meta) across Groq and Gemini, with live per-step progress.
- **Article types** — choose the format and length target that fits the topic.
- **Review & edit** — preview articles and edit SEO metadata before publishing.
- **One-click publishing** — push finished articles to Blogger or Dev.to via their APIs.
- **Analytics** — track the content pipeline and publishing status at a glance.

## Tech Stack

| Layer | Technology |
| --- | --- |
| Framework | Next.js 14 (App Router, TypeScript) |
| Styling | Tailwind CSS |
| Database | Supabase (PostgreSQL) |
| LLMs | Groq API, Gemini API |
| Publishing | Blogger API, Dev.to API |

## How It Works

```
Keyword research (Groq)
        │
        ▼
Outline (Groq) ──► Article (Gemini) ──► SEO meta (Groq) ──► Save (Supabase)
        │
        ▼
   Review & edit ──► Publish (Blogger / Dev.to)
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
| `ADMIN_PASSWORD` | Yes | Password checked at `/login` to access the dashboard |
| `AUTH_SECRET` | Yes | Random secret used to sign the session cookie |
| `GROQ_API_KEY` | Yes | Groq API key |
| `GEMINI_API_KEY` | Yes | Gemini API key |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase service-role key (server only) |
| `GROQ_MODEL` | No | Override the large Groq model |
| `GROQ_FAST_MODEL` | No | Override the fast Groq model |
| `GEMINI_MODEL` | No | Override the Gemini model |
| `SLACK_WEBHOOK_URL` | No | Slack incoming webhook — alerts when the cron run fails or partially publishes |
| `TELEGRAM_BOT_TOKEN` / `TELEGRAM_CHAT_ID` | No | Telegram bot alerting (alternative/addition to Slack) |

> The service-role key bypasses row-level security and must never be exposed to the client.
>
> The entire dashboard and all `/api/*` routes (except `/api/cron/*` and `/api/health`) require a logged-in session — see `middleware.ts` and `lib/auth.ts`.

### Where to get the keys

- **Groq** — https://console.groq.com
- **Gemini** — https://aistudio.google.com
- **Supabase** — https://supabase.com (Project Settings → API)

## AI Models

Defaults are current production models and can be overridden via environment variables without code changes:

| Role | Default | Override |
| --- | --- | --- |
| Groq (large) | `openai/gpt-oss-120b` | `GROQ_MODEL` |
| Groq (fast) | `openai/gpt-oss-20b` | `GROQ_FAST_MODEL` |
| Gemini | `gemini-2.5-flash` | `GEMINI_MODEL` |

LLM calls retry automatically with exponential backoff on rate limits and transient errors, and fail with a clear message when an API key is missing. If a provider deprecates a model, just update the matching environment variable.

## Auto-pilot (Cron)

`vercel.json` schedules `/api/cron/auto-publish` once a day (`0 1 * * *`, 08:00 WIB). Each run:

1. Reclaims any keyword stuck in `in_progress` from a previous run that got killed mid-flight.
2. Processes keywords one at a time (outline → article → meta → save → publish) up to `CRON_MAX_PER_RUN` (default 4), stopping early once ~45s have elapsed so the function always returns before Vercel's 60s hard limit. Anything not reached stays `unused` and is picked up on the next run.
3. Sends a Slack/Telegram alert (if configured — see `SLACK_WEBHOOK_URL` / `TELEGRAM_BOT_TOKEN`) when a run fails or only partially publishes.

**More than one run a day:** Vercel's Hobby plan allows cron jobs to fire at most once a day but permits up to 2 distinct cron jobs. If you're on Hobby and want more daily volume, add a second entry to `vercel.json` pointing at the same path with a different schedule (e.g. `"schedule": "0 13 * * *"` for a second run 12 hours later) — Vercel will reject the deploy if this exceeds your plan's cron job limit, so check `vercel.com/docs/cron-jobs/usage-and-pricing` first. On Pro (or higher), you can instead raise the schedule frequency directly.

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
│   │   ├── publish/          # POST publish to Blogger/Dev.to
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
├── lib/                      # Integrations: groq, gemini, supabase, blogger, devto, prompts, retry, articleTypes
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
| `npm run test` | Run the unit test suite (Vitest) |

## License

[MIT](./LICENSE)
