-- ============================================================
-- 0002 — Giá cổ phiếu (price_cache) + Ngân sách (budgets)
-- Chạy sau 0001_init.sql
-- ============================================================

-- ── price_cache: giá thị trường, DÙNG CHUNG mọi user ────────
-- Không chứa dữ liệu cá nhân. User chỉ ĐỌC; Edge Function (service
-- role) GHI (bỏ qua RLS).
create table if not exists public.price_cache (
  ticker text primary key,
  price numeric not null,
  currency text not null default 'USD',
  as_of timestamptz not null default now()
);

alter table public.price_cache enable row level security;
drop policy if exists price_read on public.price_cache;
create policy price_read on public.price_cache
  for select to authenticated using (true);

-- ── budgets: ngân sách theo danh mục, theo từng user ────────
create table if not exists public.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  category_id uuid not null references public.categories (id) on delete cascade,
  monthly_limit numeric not null default 0,
  currency text not null default 'VND',
  created_at timestamptz not null default now(),
  unique (user_id, category_id)
);

create index if not exists idx_budget_user on public.budgets (user_id);

-- Tự gán user_id khi insert (tái dùng hàm set_user_id từ 0001).
drop trigger if exists trg_set_user_id on public.budgets;
create trigger trg_set_user_id before insert on public.budgets
  for each row execute function public.set_user_id();

-- RLS: mỗi user chỉ thấy/sửa ngân sách của mình (cùng pattern 0001).
alter table public.budgets enable row level security;
drop policy if exists own_select on public.budgets;
drop policy if exists own_mod on public.budgets;
create policy own_select on public.budgets
  for select using (auth.uid() = user_id);
create policy own_mod on public.budgets
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
