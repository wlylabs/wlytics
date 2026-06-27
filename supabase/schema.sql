-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Keywords table
create table if not exists keywords (
  id uuid default uuid_generate_v4() primary key,
  keyword text not null,
  intent text check (intent in ('informational', 'commercial')),
  estimasi_artikel text,
  status text default 'unused' check (status in ('unused', 'in_progress', 'done')),
  created_at timestamptz default now()
);

-- Articles table
create table if not exists articles (
  id uuid default uuid_generate_v4() primary key,
  keyword_id uuid references keywords(id) on delete set null,
  keyword text,
  title text,
  content text,
  meta_title text,
  meta_description text,
  slug text unique,
  tags text[] default '{}',
  kategori text,
  status text default 'draft' check (status in ('draft','generated','reviewed','published')),
  wp_post_id integer,
  wp_url text,
  blogger_post_id text,
  blogger_url text,
  blogger_published_at timestamptz,
  word_count integer default 0,
  created_at timestamptz default now(),
  published_at timestamptz
);

-- Migration for existing databases: add Blogger columns if missing.
alter table articles add column if not exists blogger_post_id text;
alter table articles add column if not exists blogger_url text;
alter table articles add column if not exists blogger_published_at timestamptz;

-- Analytics table
create table if not exists analytics (
  id uuid default uuid_generate_v4() primary key,
  article_id uuid references articles(id) on delete cascade,
  views integer default 0,
  clicks integer default 0,
  impressions integer default 0,
  ctr float default 0,
  date date default current_date,
  created_at timestamptz default now()
);

-- Indexes untuk performa
create index if not exists idx_articles_status on articles(status);
create index if not exists idx_articles_created_at on articles(created_at desc);
create index if not exists idx_keywords_status on keywords(status);

-- Row Level Security (nonaktifkan untuk development)
alter table keywords disable row level security;
alter table articles disable row level security;
alter table analytics disable row level security;
