// Hiện khi chưa cấu hình Supabase (.env) — thân thiện cho người mới,
// thay vì màn hình trắng/crash.
export default function SetupNeeded() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-lg rounded-3xl bg-white/70 p-8 shadow-[0_8px_40px_rgba(120,80,50,0.12)] ring-1 ring-white/60 backdrop-blur-xl">
        <div className="mb-2 flex items-center gap-2 text-2xl font-extrabold">
          <span>💰</span>
          <span className="text-slate-800">Money</span>
          <span className="text-brand-500">Flow</span>
        </div>
        <h1 className="mb-3 text-lg font-bold text-slate-800">Cần cấu hình một bước nữa 🔧</h1>
        <p className="mb-4 text-sm text-slate-600">
          App chưa biết kết nối tới cơ sở dữ liệu của bạn. Hãy tạo một project{" "}
          <span className="font-semibold text-brand-600">Supabase</span> (miễn phí) rồi điền 2 giá trị
          vào file <code className="rounded bg-brand-50 px-1 text-brand-600">.env</code>:
        </p>
        <ol className="mb-4 list-decimal space-y-2 pl-5 text-sm text-slate-600">
          <li>
            Tạo project tại{" "}
            <a
              href="https://supabase.com"
              target="_blank"
              rel="noreferrer"
              className="font-medium text-brand-600 underline"
            >
              supabase.com
            </a>
            .
          </li>
          <li>
            Vào <b>Project Settings → API</b>, sao chép <b>Project URL</b> và <b>anon public key</b>.
          </li>
          <li>
            Sao chép file <code className="rounded bg-brand-50 px-1 text-brand-600">.env.example</code>{" "}
            thành <code className="rounded bg-brand-50 px-1 text-brand-600">.env</code> và dán 2 giá trị
            vào.
          </li>
          <li>
            Chạy lại <code className="rounded bg-brand-50 px-1 text-brand-600">npm run dev</code>.
          </li>
        </ol>
        <p className="rounded-2xl bg-brand-50/70 p-3 text-xs text-slate-500">
          📄 Hướng dẫn đầy đủ (tạo bảng, bật tính năng AI đọc ảnh, deploy lên Hostinger) nằm trong file{" "}
          <b>README.md</b> của dự án.
        </p>
      </div>
    </div>
  );
}
