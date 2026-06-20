-- ============================================================
-- Money Flow — schema + Row Level Security + storage bucket
-- Chạy: supabase db push   (hoặc dán vào SQL Editor trên Dashboard)
-- ============================================================

-- ── Bảng ────────────────────────────────────────────────────
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  type text not null check (type in ('income', 'expense')),
  icon text,
  color text
);

create table if not exists public.accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  type text not null check (type in ('bank_card', 'cash', 'ewallet')),
  currency text not null default 'VND',
  current_balance numeric not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.receipts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  storage_path text not null,
  status text not null default 'pending' check (status in ('pending', 'parsed', 'confirmed')),
  extracted_json jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  account_id uuid references public.accounts (id) on delete set null,
  category_id uuid references public.categories (id) on delete set null,
  amount numeric not null,
  direction text not null check (direction in ('in', 'out')),
  occurred_at date not null default current_date,
  note text,
  source text not null default 'manual' check (source in ('manual', 'csv', 'ai_image')),
  receipt_id uuid references public.receipts (id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.holdings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  ticker text not null,
  quantity numeric not null default 0,
  avg_cost numeric not null default 0,
  currency text not null default 'USD',
  created_at timestamptz not null default now()
);

create index if not exists idx_tx_user_date on public.transactions (user_id, occurred_at desc);
create index if not exists idx_acc_user on public.accounts (user_id);
create index if not exists idx_hold_user on public.holdings (user_id);

-- ── Tự gán user_id = người đang đăng nhập khi INSERT ────────
-- Giúp client không cần tự set user_id; RLS vẫn đảm bảo đúng chủ.
create or replace function public.set_user_id()
returns trigger language plpgsql as $$
begin
  if new.user_id is null then
    new.user_id := auth.uid();
  end if;
  return new;
end; $$;

do $$
declare t text;
begin
  foreach t in array array['categories','accounts','receipts','transactions','holdings'] loop
    execute format(
      'drop trigger if exists trg_set_user_id on public.%I;
       create trigger trg_set_user_id before insert on public.%I
       for each row execute function public.set_user_id();', t, t);
  end loop;
end $$;

-- ── Row Level Security: mỗi user chỉ thấy/sửa data của mình ──
do $$
declare t text;
begin
  foreach t in array array['categories','accounts','receipts','transactions','holdings'] loop
    execute format('alter table public.%I enable row level security;', t);
    execute format('drop policy if exists own_select on public.%I;', t);
    execute format('drop policy if exists own_mod on public.%I;', t);
    execute format(
      'create policy own_select on public.%I for select using (auth.uid() = user_id);', t);
    execute format(
      'create policy own_mod on public.%I for all using (auth.uid() = user_id) with check (auth.uid() = user_id);', t);
  end loop;
end $$;

-- ── Seed danh mục mặc định cho user mới ─────────────────────
create or replace function public.seed_default_categories()
returns trigger language plpgsql security definer as $$
begin
  insert into public.categories (user_id, name, type, icon) values
    (new.id, 'Ăn uống', 'expense', '🍜'),
    (new.id, 'Đi lại', 'expense', '🚗'),
    (new.id, 'Hóa đơn', 'expense', '🧾'),
    (new.id, 'Mua sắm', 'expense', '🛍️'),
    (new.id, 'Giải trí', 'expense', '🎬'),
    (new.id, 'Sức khỏe', 'expense', '💊'),
    (new.id, 'Khác', 'expense', '📦'),
    (new.id, 'Lương', 'income', '💰'),
    (new.id, 'Đầu tư', 'income', '📈'),
    (new.id, 'Thu khác', 'income', '➕');
  return new;
end; $$;

drop trigger if exists trg_seed_categories on auth.users;
create trigger trg_seed_categories
  after insert on auth.users
  for each row execute function public.seed_default_categories();

-- ── Storage bucket cho ảnh hóa đơn (private) ────────────────
insert into storage.buckets (id, name, public)
values ('receipts', 'receipts', false)
on conflict (id) do nothing;

-- Chỉ chủ sở hữu (thư mục đầu = user id) được thao tác ảnh của mình.
drop policy if exists receipts_own on storage.objects;
create policy receipts_own on storage.objects
  for all to authenticated
  using (bucket_id = 'receipts' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'receipts' and (storage.foldername(name))[1] = auth.uid()::text);
