import { useState } from "react";
import { useAccounts, useUpsertAccount, useDeleteAccount } from "../lib/queries";
import type { Account, AccountType } from "../types";
import { formatMoney } from "../lib/format";
import { PageHeader, Card, Button, Modal, Field, inputClass } from "../components/ui";

const TYPE_LABEL: Record<AccountType, string> = {
  bank_card: "💳 Thẻ ngân hàng",
  cash: "💵 Tiền mặt",
  ewallet: "📱 Ví điện tử",
};

export default function Accounts() {
  const { data: accounts = [], isLoading } = useAccounts();
  const upsert = useUpsertAccount();
  const del = useDeleteAccount();
  const [editing, setEditing] = useState<Partial<Account> | null>(null);

  const total = accounts.reduce((s, a) => s + Number(a.current_balance), 0);

  function openNew() {
    setEditing({ name: "", type: "bank_card", currency: "USD", current_balance: 0 });
  }

  async function save() {
    if (!editing?.name) return;
    await upsert.mutateAsync(editing);
    setEditing(null);
  }

  return (
    <>
      <PageHeader
        title="Tài khoản & Thẻ"
        action={<Button onClick={openNew}>+ Thêm tài khoản</Button>}
      />

      <Card className="mb-5">
        <div className="text-sm text-slate-500">Tổng tiền mặt</div>
        <div className="text-3xl font-bold text-brand-500">{formatMoney(total)}</div>
      </Card>

      {isLoading ? (
        <p className="text-slate-500">Đang tải…</p>
      ) : accounts.length === 0 ? (
        <p className="text-slate-500">Chưa có tài khoản nào. Thêm thẻ/ví đầu tiên của bạn.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {accounts.map((a) => (
            <Card key={a.id}>
              <div className="mb-2 text-sm text-slate-500">{TYPE_LABEL[a.type]}</div>
              <div className="text-lg font-semibold text-slate-800">{a.name}</div>
              <div className="mt-1 text-xl font-bold text-slate-900">
                {formatMoney(Number(a.current_balance), a.currency)}
              </div>
              <div className="mt-3 flex gap-2">
                <Button variant="ghost" onClick={() => setEditing(a)}>
                  Sửa
                </Button>
                <Button variant="danger" onClick={() => del.mutate(a.id)}>
                  Xóa
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title={editing?.id ? "Sửa tài khoản" : "Thêm tài khoản"}
      >
        {editing && (
          <div className="space-y-3">
            <Field label="Tên tài khoản">
              <input
                className={inputClass}
                value={editing.name ?? ""}
                onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                placeholder="VD: Vietcombank, Ví Momo…"
              />
            </Field>
            <Field label="Loại">
              <select
                className={inputClass}
                value={editing.type}
                onChange={(e) =>
                  setEditing({ ...editing, type: e.target.value as AccountType })
                }
              >
                <option value="bank_card">Thẻ ngân hàng</option>
                <option value="cash">Tiền mặt</option>
                <option value="ewallet">Ví điện tử</option>
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Số dư hiện tại">
                <input
                  type="number"
                  className={inputClass}
                  value={editing.current_balance ?? 0}
                  onChange={(e) =>
                    setEditing({ ...editing, current_balance: Number(e.target.value) })
                  }
                />
              </Field>
              <Field label="Tiền tệ">
                <input
                  className={inputClass}
                  value={editing.currency ?? "USD"}
                  onChange={(e) => setEditing({ ...editing, currency: e.target.value })}
                />
              </Field>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setEditing(null)}>
                Hủy
              </Button>
              <Button onClick={save} disabled={upsert.isPending}>
                Lưu
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
