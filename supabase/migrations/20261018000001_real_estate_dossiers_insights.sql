-- ============================================================================
-- Kretz Real Estate Platform — Real Estate Dossiers & Insights Database Schema
-- Migration: 20261018000001_real_estate_dossiers_insights.sql
-- 
-- Features:
-- 1. Editorial category taxonomy (public.insight_categories)
-- 2. Comprehensive article & dossier records (public.insight_articles)
-- 3. Strict Row Level Security (RLS) policies:
--    - Anonymous / Authenticated public: SELECT on 'published' articles
--    - Platform Administrators (via is_admin()): full SELECT, INSERT, UPDATE, DELETE
-- 4. Fast indexing on slugs, categories, status, publication dates, and tags
-- 5. Storage bucket configuration for editorial-assets
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. INSIGHT CATEGORIES TABLE
-- ----------------------------------------------------------------------------
create table if not exists public.insight_categories (
  id text primary key,
  slug text unique not null,
  name text not null,
  short_name text not null,
  description text not null,
  accent_color text default '#10B981' not null,
  icon text default 'BookOpen' not null,
  hero_image text not null,
  featured_order integer default 0 not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists idx_insight_categories_slug on public.insight_categories(slug);

-- Enable RLS
alter table public.insight_categories enable row level security;

-- Categories RLS: Read public, write admin only
create policy "Allow public read access on insight_categories"
  on public.insight_categories for select
  using (true);

create policy "Allow admin write access on insight_categories"
  on public.insight_categories for all
  using (
    auth.uid() is not null and (
      exists (
        select 1 from public.user_roles 
        where user_id = auth.uid() 
          and role in ('admin', 'super_admin', 'operations_admin')
      )
    )
  );

-- ----------------------------------------------------------------------------
-- 2. INSIGHT ARTICLES & DOSSIERS TABLE
-- ----------------------------------------------------------------------------
create table if not exists public.insight_articles (
  id text primary key,
  slug text unique not null,
  title text not null,
  subtitle text not null,
  excerpt text not null,
  category_slug text not null references public.insight_categories(slug) on update cascade,
  category_name text not null,
  is_dossier boolean default false not null,
  dossier_issue text,
  chapters jsonb default '[]'::jsonb not null,
  author_name text not null,
  author_role text not null,
  author_avatar text not null,
  author_bio text,
  author_organization text,
  published_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  scheduled_publish_date timestamp with time zone,
  status text default 'published' not null check (status in ('published', 'draft', 'scheduled', 'archived')),
  read_time text default '10 min read' not null,
  cover_image text not null,
  cover_image_alt text not null,
  cover_image_caption text not null,
  cover_image_attribution text not null,
  is_featured boolean default false not null,
  is_editors_pick boolean default false not null,
  tags text[] default '{}'::text[] not null,
  key_takeaways text[] default '{}'::text[] not null,
  content text not null,
  views_count integer default 0 not null check (views_count >= 0),
  shares_count integer default 0 not null check (shares_count >= 0),
  downloadable_resource jsonb,
  related_article_slugs text[] default '{}'::text[],
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists idx_insight_articles_slug on public.insight_articles(slug);
create index if not exists idx_insight_articles_cat on public.insight_articles(category_slug);
create index if not exists idx_insight_articles_status on public.insight_articles(status);
create index if not exists idx_insight_articles_pub on public.insight_articles(published_at desc);
create index if not exists idx_insight_articles_featured on public.insight_articles(is_featured);
create index if not exists idx_insight_articles_is_dossier on public.insight_articles(is_dossier);

-- Enable RLS
alter table public.insight_articles enable row level security;

-- RLS: Public reads published articles where published_at <= now()
create policy "Allow public read published articles"
  on public.insight_articles for select
  using (
    status = 'published' and published_at <= timezone('utc'::text, now())
  );

-- RLS: Admins have full access to all articles (including drafts & scheduled)
create policy "Allow admins full access on insight_articles"
  on public.insight_articles for all
  using (
    auth.uid() is not null and (
      exists (
        select 1 from public.user_roles 
        where user_id = auth.uid() 
          and role in ('admin', 'super_admin', 'operations_admin', 'auditor')
      )
    )
  );

-- ----------------------------------------------------------------------------
-- 3. STORAGE BUCKET POLICIES (editorial-assets)
-- ----------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('editorial-assets', 'editorial-assets', true)
on conflict (id) do nothing;

create policy "Allow public read on editorial-assets"
  on storage.objects for select
  using (bucket_id = 'editorial-assets');

create policy "Allow admins upload on editorial-assets"
  on storage.objects for insert
  with check (
    bucket_id = 'editorial-assets' and
    auth.uid() is not null and (
      exists (
        select 1 from public.user_roles 
        where user_id = auth.uid() 
          and role in ('admin', 'super_admin', 'operations_admin')
      )
    )
  );

-- Seed Categories
insert into public.insight_categories (id, slug, name, short_name, description, accent_color, icon, hero_image, featured_order)
values
  ('cat-dossiers', 'dossiers', 'Dossiers & Investigations', 'Dossiers', 'In-depth investigative reports, multi-chapter market surveys, and deep strategic analyses of European real estate transformations.', '#10B981', 'BookOpen', 'https://images.unsplash.com/photo-1541888946425-d0fbb186f5f7?auto=format&fit=crop&w=1600&q=80', 1),
  ('cat-barometer', 'barometre-immobilier', 'Market Barometer & Valuation', 'Market Barometer', 'Quarterly price-per-square-meter indices, capitalization rates, prime rental yields, and transaction volume trends across Paris, Madrid, and the Mediterranean.', '#3B82F6', 'TrendingUp', 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1600&q=80', 2),
  ('cat-proptech', 'proptech-tokenization', 'PropTech & Asset Tokenization', 'PropTech & Blockchain', 'Smart contracts, fractional SPV structuring, secondary market liquidity pools, and digital title registry innovations under EU regulatory frameworks.', '#8B5CF6', 'Cpu', 'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?auto=format&fit=crop&w=1600&q=80', 3),
  ('cat-regulatory', 'reglementation-fiscalite', 'Regulation, Tax & Legal Frameworks', 'Legal & Tax', 'MiCA compliance, European ESG disclosure standards, cross-border wealth structuring, non-resident taxes, and post-Golden Visa residence strategies.', '#F59E0B', 'Scale', 'https://images.unsplash.com/photo-1450133064473-71024230f91b?auto=format&fit=crop&w=1600&q=80', 4),
  ('cat-wealth', 'patrimoine-luxe', 'Luxury Assets & Family Offices', 'Luxury & Wealth', 'Trophy real estate acquisitions, historic Parisian hôtels particuliers, prime Spanish fincas, and private family office allocation architectures.', '#D97706', 'Crown', 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1600&q=80', 5)
on conflict (id) do nothing;
