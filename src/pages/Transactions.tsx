import { useState } from "react";
import {
  useTransactions,
  useAccounts,
  useCategories,
  useDeleteTransaction,
} from "../lib/queries";
import { formatMoney, formatDate } from "../lib/format";
import { PageHeader, Card, Button, Modal } from "../components/ui";
import TransactionForm, { emptyDraft, type TxDraft } from "../features/transactions/TransactionForm";
import ReceiptUpload from "../features/receipt-upload/ReceiptUpload";
import ImportCsv from "../features/import-csv/ImportCsv";
import type { Transaction } from "../types";

export default function Transactions() {
  const { data: txs = [], isLoading } = useTransactions();
  const { data: accounts = [] } = useAccounts();
  const { data: categories = [] } = useCategories();
  const del = useDeleteTransaction();
  const [editing, setEditing] = useState<TxDraft | null>(null);

  const accName = (id: string | null) => accounts.find((a) => a.id === id)?.name ?? "—";
  const cat = (id: string | null) => categories.find((c) => c.id === id);

  // Chuyển một giao dịch sẵn có thành TxDraft để mở form sửa.
  function toDraft(t: Transaction): TxDraft {
    return {
      id: t.id,
      amount: Number(t.amount),
      direction: t.direction,
      account_id: t.account_id,
      category_id: t.category_id,
      occurred_at: t.occurred_at,
      note: t.note ?? "",
      source: t.source,
      receipt_id: t.receipt_id,
    };
  }

  return (
    <>
      <PageHeader
        title="Giao dịch"
        action={
          <div className="flex flex-wrap gap-2">
            <ImportCsv />
            <ReceiptUpload />
            <Button onClick={() => setEditing(emptyDraft())}>+ Nhập tay</Button>
          </div>
        }
      />

      {isLoading ? (
        <p className="text-slate-500">Đang tải…</p>
      ) : txs.length === 0 ? (
        <p className="text-slate-500">Chưa có giao dịch. Nhập tay hoặc up ảnh hóa đơn để bắt đầu.</p>
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="text-left text-slate-400">
                <th className="pb-2">Ngày</th>
                <th className="pb-2">Danh mục</th>
                <th className="pb-2">Tài khoản</th>
                <th className="pb-2">Ghi chú</th>
                <th className="pb-2 text-right">Số tiền</th>
                <th className="pb-2"></th>
              </tr>
            </thead>
            <tbody>
              {txs.map((t) => {
                const c = cat(t.category_id);
                return (
                  <tr key={t.id} className="border-t border-slate-100">
                    <td className="py-2 text-slate-500">{formatDate(t.occurred_at)}</td>
                    <td className="py-2">
                      {c ? `${c.icon ?? ""} ${c.name}` : "—"}
                      {t.source === "ai_image" && (
                        <span className="ml-1 text-xs text-emerald-500" title="Từ ảnh AI">
                          📷
                        </span>
                      )}
                    </td>
                    <td className="py-2 text-slate-500">{accName(t.account_id)}</td>
                    <td className="py-2 text-slate-500">{t.note ?? ""}</td>
                    <td
                      className={`py-2 text-right font-medium ${
                        t.direction === "in" ? "text-emerald-600" : "text-red-500"
                      }`}
                    >
                      {t.direction === "in" ? "+" : "−"}
                      {formatMoney(Number(t.amount))}
                    </td>
                    <td className="py-2 text-right whitespace-nowrap">
                      <button
                        className="mr-2 text-slate-500 hover:text-brand-500"
                        onClick={() => setEditing(toDraft(t))}
                      >
                        Sửa
                      </button>
                      <button
                        className="text-red-400 hover:text-red-600"
                        onClick={() => del.mutate(t.id)}
                      >
                        Xóa
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}

      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title={editing?.id ? "Sửa giao dịch" : "Thêm giao dịch"}
      >
        {editing && <TransactionForm initial={editing} onDone={() => setEditing(null)} />}
      </Modal>
    </>
  );
}
