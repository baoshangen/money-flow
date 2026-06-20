import { useMemo, useRef, useState } from "react";
import { useAccounts, useCategories, useUpsertTransaction } from "../../lib/queries";
import { todayISO } from "../../lib/format";
import { Button, Modal, Field, inputClass } from "../../components/ui";
import type { Direction } from "../../types";

// Parser CSV gọn: hỗ trợ dấu phân tách , hoặc ; và ô có dấu ngoặc kép.
function parseCsv(text: string, delim: string): string[][] {
  const rows: string[][] = [];
  for (const raw of text.split(/\r?\n/)) {
    if (!raw.trim()) continue;
    const cells: string[] = [];
    let cur = "";
    let inQuote = false;
    for (let i = 0; i < raw.length; i++) {
      const ch = raw[i];
      if (ch === '"') {
        if (inQuote && raw[i + 1] === '"') {
          cur += '"';
          i++;
        } else inQuote = !inQuote;
      } else if (ch === delim && !inQuote) {
        cells.push(cur);
        cur = "";
      } else cur += ch;
    }
    cells.push(cur);
    rows.push(cells.map((c) => c.trim()));
  }
  return rows;
}

// Chuẩn hóa ngày: nhận YYYY-MM-DD, DD/MM/YYYY, DD-MM-YYYY… → YYYY-MM-DD.
function normalizeDate(s: string): string {
  const iso = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (iso) return `${iso[1]}-${iso[2].padStart(2, "0")}-${iso[3].padStart(2, "0")}`;
  const dmy = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  if (dmy) return `${dmy[3]}-${dmy[2].padStart(2, "0")}-${dmy[1].padStart(2, "0")}`;
  return todayISO();
}

// Chuẩn hóa số tiền: bỏ ký tự không phải số, dấu trừ, dấu thập phân.
function parseAmount(s: string): number {
  const neg = /^\(.*\)$/.test(s) || s.trim().startsWith("-");
  // Bỏ phân tách nghìn (. hoặc ,) — giữ số. VN thường dùng . cho nghìn.
  const digits = s.replace(/[^\d]/g, "");
  const n = Number(digits);
  return neg ? -n : n;
}

export default function ImportCsv() {
  const { data: accounts = [] } = useAccounts();
  const { data: categories = [] } = useCategories();
  const upsert = useUpsertTransaction();
  const fileRef = useRef<HTMLInputElement>(null);

  const [rawText, setRawText] = useState("");
  const [hasHeader, setHasHeader] = useState(true);
  const [delim, setDelim] = useState(",");
  const [colDate, setColDate] = useState(0);
  const [colAmount, setColAmount] = useState(1);
  const [colNote, setColNote] = useState(2);
  const [defaultDir, setDefaultDir] = useState<Direction>("out");
  const [accountId, setAccountId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<number | null>(null);

  function handleFile(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? "");
      // Tự đoán dấu phân tách: nếu nhiều ; hơn , thì dùng ;
      const guess = (text.match(/;/g)?.length ?? 0) > (text.match(/,/g)?.length ?? 0) ? ";" : ",";
      setDelim(guess);
      setRawText(text);
      setDone(null);
      setOpen(true);
    };
    reader.readAsText(file);
  }

  const rows = useMemo(() => (rawText ? parseCsv(rawText, delim) : []), [rawText, delim]);
  const dataRows = hasHeader ? rows.slice(1) : rows;
  const header = hasHeader && rows[0] ? rows[0] : rows[0]?.map((_, i) => `Cột ${i + 1}`) ?? [];

  // Suy ra chiều thu/chi: nếu số âm → ngược lại default; mặc định theo lựa chọn.
  function rowToTx(r: string[]) {
    const amt = parseAmount(r[colAmount] ?? "");
    const direction: Direction = amt < 0 ? (defaultDir === "out" ? "out" : "in") : defaultDir;
    return {
      amount: Math.abs(amt),
      direction,
      account_id: accountId || null,
      category_id: categoryId || null,
      occurred_at: normalizeDate(r[colDate] ?? ""),
      note: (r[colNote] ?? "").slice(0, 200) || null,
      source: "csv" as const,
    };
  }

  async function doImport() {
    setBusy(true);
    let ok = 0;
    for (const r of dataRows) {
      const tx = rowToTx(r);
      if (!tx.amount) continue; // bỏ dòng không có số tiền hợp lệ
      try {
        await upsert.mutateAsync(tx);
        ok++;
      } catch {
        /* bỏ qua dòng lỗi, tiếp tục */
      }
    }
    setBusy(false);
    setDone(ok);
  }

  const colOptions = header.map((h, i) => (
    <option key={i} value={i}>
      {h || `Cột ${i + 1}`}
    </option>
  ));

  return (
    <>
      <input
        ref={fileRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
          e.target.value = "";
        }}
      />
      <Button variant="ghost" onClick={() => fileRef.current?.click()}>
        📥 Nhập CSV
      </Button>

      <Modal open={open} onClose={() => setOpen(false)} title="Nhập giao dịch từ CSV">
        {done !== null ? (
          <div className="space-y-4">
            <p className="text-sm text-emerald-600">✅ Đã nhập {done} giao dịch.</p>
            <div className="flex justify-end">
              <Button onClick={() => setOpen(false)}>Xong</Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Dấu phân tách">
                <select className={inputClass} value={delim} onChange={(e) => {
                  setDelim(e.target.value);
                }}>
                  <option value=",">Phẩy ( , )</option>
                  <option value=";">Chấm phẩy ( ; )</option>
                </select>
              </Field>
              <Field label="Dòng đầu là tiêu đề?">
                <select
                  className={inputClass}
                  value={hasHeader ? "1" : "0"}
                  onChange={(e) => setHasHeader(e.target.value === "1")}
                >
                  <option value="1">Có</option>
                  <option value="0">Không</option>
                </select>
              </Field>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <Field label="Cột Ngày">
                <select className={inputClass} value={colDate} onChange={(e) => setColDate(Number(e.target.value))}>
                  {colOptions}
                </select>
              </Field>
              <Field label="Cột Số tiền">
                <select className={inputClass} value={colAmount} onChange={(e) => setColAmount(Number(e.target.value))}>
                  {colOptions}
                </select>
              </Field>
              <Field label="Cột Ghi chú">
                <select className={inputClass} value={colNote} onChange={(e) => setColNote(Number(e.target.value))}>
                  {colOptions}
                </select>
              </Field>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <Field label="Loại mặc định">
                <select
                  className={inputClass}
                  value={defaultDir}
                  onChange={(e) => setDefaultDir(e.target.value as Direction)}
                >
                  <option value="out">Chi</option>
                  <option value="in">Thu</option>
                </select>
              </Field>
              <Field label="Tài khoản">
                <select className={inputClass} value={accountId} onChange={(e) => setAccountId(e.target.value)}>
                  <option value="">—</option>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Danh mục">
                <select className={inputClass} value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                  <option value="">—</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            {/* Xem trước 5 dòng */}
            <div className="max-h-40 overflow-auto rounded-xl border border-white/70 bg-white/50 p-2 text-xs">
              <div className="mb-1 font-semibold text-slate-600">
                Xem trước ({dataRows.length} dòng):
              </div>
              {dataRows.slice(0, 5).map((r, i) => {
                const tx = rowToTx(r);
                return (
                  <div key={i} className="flex justify-between border-b border-black/5 py-1">
                    <span className="text-slate-500">{tx.occurred_at}</span>
                    <span className="text-slate-700">{tx.note}</span>
                    <span className={tx.direction === "in" ? "text-emerald-600" : "text-red-500"}>
                      {tx.direction === "in" ? "+" : "−"}
                      {tx.amount.toLocaleString("vi-VN")}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <Button variant="ghost" onClick={() => setOpen(false)}>
                Hủy
              </Button>
              <Button onClick={doImport} disabled={busy || dataRows.length === 0}>
                {busy ? "Đang nhập…" : `Nhập ${dataRows.length} dòng`}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
