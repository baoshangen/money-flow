import { useState } from "react";
import type { Direction, Transaction } from "../../types";
import { useAccounts, useCategories, useUpsertTransaction } from "../../lib/queries";
import { todayISO } from "../../lib/format";
import { Button, Field, inputClass } from "../../components/ui";

export interface TxDraft {
  id?: string; // có id = sửa bản ghi cũ; không có = thêm mới
  amount: number;
  direction: Direction;
  account_id: string | null;
  category_id: string | null;
  occurred_at: string;
  note: string;
  source: Transaction["source"];
  receipt_id?: string | null;
}

export function emptyDraft(): TxDraft {
  return {
    amount: 0,
    direction: "out",
    account_id: null,
    category_id: null,
    occurred_at: todayISO(),
    note: "",
    source: "manual",
  };
}

export default function TransactionForm({
  initial,
  onDone,
}: {
  initial: TxDraft;
  onDone: () => void;
}) {
  const { data: accounts = [] } = useAccounts();
  const { data: categories = [] } = useCategories();
  const upsert = useUpsertTransaction();
  const [draft, setDraft] = useState<TxDraft>(initial);

  // Lọc danh mục theo chiều thu/chi để gợi ý đúng ngữ cảnh.
  const cats = categories.filter((c) =>
    draft.direction === "in" ? c.type === "income" : c.type === "expense",
  );

  async function save() {
    if (!draft.amount) return;
    await upsert.mutateAsync({
      ...(draft.id ? { id: draft.id } : {}),
      amount: draft.amount,
      direction: draft.direction,
      account_id: draft.account_id,
      category_id: draft.category_id,
      occurred_at: draft.occurred_at,
      note: draft.note || null,
      source: draft.source,
      receipt_id: draft.receipt_id ?? null,
    });
    onDone();
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <button
          onClick={() => setDraft({ ...draft, direction: "out", category_id: null })}
          className={`flex-1 rounded-lg py-2 text-sm font-medium ${
            draft.direction === "out"
              ? "bg-red-50 text-red-600 ring-1 ring-red-200"
              : "bg-slate-50 text-slate-500"
          }`}
        >
          Chi tiền
        </button>
        <button
          onClick={() => setDraft({ ...draft, direction: "in", category_id: null })}
          className={`flex-1 rounded-lg py-2 text-sm font-medium ${
            draft.direction === "in"
              ? "bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200"
              : "bg-slate-50 text-slate-500"
          }`}
        >
          Thu tiền
        </button>
      </div>

      <Field label="Số tiền">
        <input
          type="number"
          className={inputClass}
          value={draft.amount || ""}
          onChange={(e) => setDraft({ ...draft, amount: Number(e.target.value) })}
          placeholder="0"
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Tài khoản">
          <select
            className={inputClass}
            value={draft.account_id ?? ""}
            onChange={(e) => setDraft({ ...draft, account_id: e.target.value || null })}
          >
            <option value="">— Chọn —</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Danh mục">
          <select
            className={inputClass}
            value={draft.category_id ?? ""}
            onChange={(e) => setDraft({ ...draft, category_id: e.target.value || null })}
          >
            <option value="">— Chọn —</option>
            {cats.map((c) => (
              <option key={c.id} value={c.id}>
                {c.icon ? `${c.icon} ` : ""}
                {c.name}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Ngày">
          <input
            type="date"
            className={inputClass}
            value={draft.occurred_at}
            onChange={(e) => setDraft({ ...draft, occurred_at: e.target.value })}
          />
        </Field>
        <Field label="Ghi chú">
          <input
            className={inputClass}
            value={draft.note}
            onChange={(e) => setDraft({ ...draft, note: e.target.value })}
            placeholder="Tùy chọn"
          />
        </Field>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button variant="ghost" onClick={onDone}>
          Hủy
        </Button>
        <Button onClick={save} disabled={upsert.isPending || !draft.amount}>
          {upsert.isPending ? "Đang lưu…" : "Lưu giao dịch"}
        </Button>
      </div>
    </div>
  );
}
