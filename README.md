# 💰 Money Flow — Quản lý tài chính cá nhân

Web app theo dõi **chi tiêu hằng ngày, thẻ/tài khoản ngân hàng, danh mục cổ phiếu** trong một chỗ.
Hỗ trợ **up ảnh hóa đơn → AI tự bóc tách giao dịch** (Claude vision).

- **Frontend:** React + Vite + TypeScript + Tailwind v4 + Recharts → host tĩnh trên **Hostinger**.
- **Backend/Data:** **Supabase** — Postgres + Row Level Security + Auth + Storage + Edge Function.
- **Bảo mật:** code public được; **dữ liệu & API key luôn nằm ngoài repo** (xem mục Bảo mật).

---

## 1. Cài đặt local

```bash
npm install
cp .env.example .env     # rồi điền VITE_SUPABASE_URL & VITE_SUPABASE_ANON_KEY
npm run dev
```

## 2. Tạo project Supabase

1. Tạo project tại https://supabase.com → vào **Project Settings → API** lấy:
   - `Project URL` → `VITE_SUPABASE_URL`
   - `anon public` key → `VITE_SUPABASE_ANON_KEY`
2. Tạo schema: mở **SQL Editor**, dán nội dung [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql) và **Run**.
   (Hoặc dùng CLI: `supabase link` rồi `supabase db push`.)
   - Lệnh này tạo bảng, bật RLS, seed danh mục mặc định, và tạo bucket `receipts` (private).

## 3. Bật tính năng AI đọc ảnh (Edge Function)

```bash
npm i -g supabase
supabase login
supabase link --project-ref <project-ref>
supabase functions deploy extract-receipt
supabase secrets set ANTHROPIC_API_KEY=sk-ant-xxxx   # KEY chỉ ở server, không vào repo
```

Lấy `ANTHROPIC_API_KEY` tại https://console.anthropic.com (tính phí riêng theo từng ảnh).
Mặc định dùng model `claude-haiku-4-5`; đổi bằng `supabase secrets set CLAUDE_MODEL=claude-opus-4-8`.

## 4. Build & deploy lên Hostinger

```bash
npm run build           # tạo thư mục dist/
```

- Vào **hPanel → File Manager** (hoặc FTP), upload **toàn bộ nội dung `dist/`** vào `public_html/`
  (hoặc một subfolder nếu muốn).
- Vì là SPA dùng React Router, thêm file `public_html/.htaccess` để mọi route trỏ về `index.html`:

  ```apache
  <IfModule mod_rewrite.c>
    RewriteEngine On
    RewriteBase /
    RewriteRule ^index\.html$ - [L]
    RewriteCond %{REQUEST_FILENAME} !-f
    RewriteCond %{REQUEST_FILENAME} !-d
    RewriteRule . /index.html [L]
  </IfModule>
  ```

> Lưu ý: biến `VITE_*` được nhúng vào bản build lúc `npm run build`, nên hãy đảm bảo `.env`
> đã đúng trước khi build. Anon key lộ ra là bình thường và an toàn (đã có RLS).

---

## 🔒 Bảo mật (đọc kỹ trước khi public GitHub)

| Thứ | Để ở đâu | Public được? |
|-----|----------|--------------|
| Code | GitHub repo | ✅ |
| `VITE_SUPABASE_URL`, `anon key` | `.env` (build vào frontend) | ✅ an toàn nhờ RLS |
| Dữ liệu giao dịch/portfolio | Postgres (Supabase), có RLS | ❌ riêng tư |
| Ảnh hóa đơn | Storage bucket `receipts` (private) | ❌ riêng tư |
| `ANTHROPIC_API_KEY`, service key | Supabase secrets (Edge Function) | ❌ **TUYỆT ĐỐI không** |

`.env` đã nằm trong `.gitignore`. Trước khi push public, kiểm tra:
```bash
git status            # .env KHÔNG được xuất hiện
git log -p | grep -i "sk-ant"   # không có key nào trong lịch sử
```

---

## Cấu trúc

```
src/
  pages/        Dashboard, Transactions, Accounts, Portfolio, Login
  features/     receipt-upload (AI), transactions (form dùng chung)
  lib/          supabase client, queries (React Query), format, insights
  components/   Layout, ProtectedRoute, ui (Card/Modal/Button…)
supabase/
  migrations/   0001_init.sql  (schema + RLS + bucket)
  functions/    extract-receipt (Claude vision)
```

## Lộ trình mở rộng
- Import CSV/Excel sao kê ngân hàng.
- Cập nhật giá cổ phiếu thời gian thực (Edge Function lấy giá) → lãi/lỗ thật.
- Ngân sách (budget) theo danh mục, cảnh báo vượt chi.
