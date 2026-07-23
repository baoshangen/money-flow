-- ============================================================
-- 0003 — Danh mục mẫu (target_holdings)
-- Lưu cơ cấu danh mục "để noi theo" (VD: của anh/chị) dưới dạng
-- ticker + tỷ trọng %. Dùng để đối chiếu & tính lệnh mua/bán giúp
-- danh mục của user bám theo đúng tỷ trọng này.
-- Chạy sau 0002_prices_budgets.sql
-- ============================================================

create table if not exists public.target_holdings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  ticker text not null,
  weight numeric not null default 0,   -- tỷ trọng mục tiêu, đơn vị %
  label text,                          -- nhãn nguồn, VD "Anh"
  created_at timestamptz not null default now()
);

create index if not exists idx_target_user on public.target_holdings (user_id);

-- Tự gán user_id khi insert (tái dùng hàm set_user_id từ 0001).
drop trigger if exists trg_set_user_id on public.target_holdings;
create trigger trg_set_user_id before insert on public.target_holdings
  for each row execute function public.set_user_id();

-- RLS: mỗi user chỉ thấy/sửa danh mục mẫu của mình (cùng pattern 0001).
alter table public.target_holdings enable row level security;
drop policy if exists own_select on public.target_holdings;
drop policy if exists own_mod on public.target_holdings;
create policy own_select on public.target_holdings
  for select using (auth.uid() = user_id);
create policy own_mod on public.target_holdings
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
