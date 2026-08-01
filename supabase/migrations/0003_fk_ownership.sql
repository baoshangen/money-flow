-- ============================================================
-- 0003 — Vá IDOR (CWE-639): giao dịch/ngân sách chỉ được gắn
--        foreign key THUỘC CHÍNH USER (account/category/receipt).
-- Phát hiện bởi codex-security scan 31/07/2026.
-- Chạy sau 0002. Cách chạy: `supabase db push`  HOẶC dán vào
-- Supabase Dashboard → SQL Editor → Run.
--
-- Trước đây RLS chỉ check `auth.uid() = user_id` khi INSERT/UPDATE,
-- nên client có thể tạo giao dịch (của mình) nhưng trỏ account_id/
-- category_id/receipt_id sang UUID của NGƯỜI KHÁC. Migration này thêm
-- điều kiện: mọi FK tham chiếu phải là hàng do chính user sở hữu.
-- Chỉ SIẾT lúc ghi — không đụng dữ liệu cũ hợp lệ.
-- ============================================================

-- ── transactions: account_id / category_id / receipt_id phải của mình ──
drop policy if exists own_mod on public.transactions;
create policy own_mod on public.transactions
  for all
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and (account_id is null or exists (
      select 1 from public.accounts a
      where a.id = account_id and a.user_id = auth.uid()))
    and (category_id is null or exists (
      select 1 from public.categories c
      where c.id = category_id and c.user_id = auth.uid()))
    and (receipt_id is null or exists (
      select 1 from public.receipts r
      where r.id = receipt_id and r.user_id = auth.uid()))
  );

-- ── budgets: category_id phải của mình ──
drop policy if exists own_mod on public.budgets;
create policy own_mod on public.budgets
  for all
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.categories c
      where c.id = category_id and c.user_id = auth.uid())
  );
