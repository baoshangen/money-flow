import { useState } from "react";
import {
  useHoldings,
  useUpsertHolding,
  useDeleteHolding,
  useStockPrices,
} from "../lib/queries";
import type { Holding } from "../types";
import { formatMoney } from "../lib/format";
import { PageHeader, Card, Button, Modal, Field, inputClass } from "../components/ui";

export default function Portfolio() {
  const { data: holdings = [], isLoading } = useHoldings();
  const upsert = useUpsertHolding();
  const del = useDeleteHolding();
  const [editing, setEditing] = useState<Partial<Holding> | null>(null);

  // Lấy giá thị trường thật cho các mã đang giữ (fallback giá vốn nếu chưa có).
  const tickers = holdings.map((h) => h.ticker);
  const { data: prices = {}, isFetching } = useStockPrices(tickers);
  const priceOf = (h: Holding) => prices[h.ticker.toUpperCase()]?.price ?? Number(h.avg_cost);

  const totalCost = holdings.reduce((s, h) => s + Number(h.quantity) * Number(h.avg_cost), 0);
  const totalValue = holdings.reduce((s, h) => s + Number(h.quantity) * priceOf(h), 0);
  const totalPnl = totalValue - totalCost;

  function openNew() {
    setEditing({ ticker: "", quantity: 0, avg_cost: 0, currency: "USD" });
  }

  async function save() {
    if (!editing?.ticker) return;
    await upsert.mutateAsync({ ...editing, ticker: editing.ticker.toUpperCase() });
    setEditing(null);
  }

  const pnlColor = totalPnl >= 0 ? "text-emerald-600" : "text-red-500";

  return (
    <>
      <PageHeader
        title="Danh mục cổ phiếu"
        action={<Button onClick={openNew}>+ Thêm mã</Button>}
      />

      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        <Card>
          <div className="text-sm text-slate-500">Giá trị thị trường</div>
          <div className="mt-1 text-2xl font-bold text-slate-900">{formatMoney(totalValue, "USD")}</div>
        </Card>
        <Card>
          <div className="text-sm text-slate-500">Vốn đầu tư</div>
          <div className="mt-1 text-2xl font-bold text-slate-700">{formatMoney(totalCost, "USD")}</div>
        </Card>
        <Card>
          <div className="text-sm text-slate-500">Lãi / lỗ {isFetching ? "⏳" : ""}</div>
          <div className={`mt-1 text-2xl font-bold ${pnlColor}`}>
            {totalPnl >= 0 ? "+" : ""}
            {formatMoney(totalPnl, "USD")}
          </div>
        </Card>
      </div>

      {isLoading ? (
        <p className="text-slate-500">Đang tải…</p>
      ) : holdings.length === 0 ? (
        <p className="text-slate-500">Chưa có mã cổ phiếu nào.</p>
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="text-left text-slate-400">
                <th className="pb-2">Mã</th>
                <th className="pb-2 text-right">SL</th>
                <th className="pb-2 text-right">Giá vốn</th>
                <th className="pb-2 text-right">Giá hiện tại</th>
                <th className="pb-2 text-right">Giá trị</th>
                <th className="pb-2 text-right">Lãi/lỗ</th>
                <th className="pb-2"></th>
              </tr>
            </thead>
            <tbody>
              {holdings.map((h) => {
                const px = priceOf(h);
                const value = Number(h.quantity) * px;
                const cost = Number(h.quantity) * Number(h.avg_cost);
                const pnl = value - cost;
                const hasLive = !!prices[h.ticker.toUpperCase()];
                return (
                  <tr key={h.id} className="border-t border-black/5">
                    <td className="py-2 font-semibold text-slate-800">{h.ticker}</td>
                    <td className="py-2 text-right">{h.quantity}</td>
                    <td className="py-2 text-right">{formatMoney(Number(h.avg_cost), h.currency)}</td>
                    <td className="py-2 text-right">
                      {formatMoney(px, h.currency)}
                      {!hasLive && <span className="ml-1 text-xs text-slate-300">*</span>}
                    </td>
                    <td className="py-2 text-right font-medium">{formatMoney(value, h.currency)}</td>
                    <td
                      className={`py-2 text-right font-medium ${
                        pnl >= 0 ? "text-emerald-600" : "text-red-500"
                      }`}
                    >
                      {pnl >= 0 ? "+" : ""}
                      {formatMoney(pnl, h.currency)}
                    </td>
                    <td className="py-2 text-right whitespace-nowrap">
                      <button
                        className="mr-2 text-slate-500 hover:text-brand-500"
                        onClick={() => setEditing(h)}
                      >
                        Sửa
                      </button>
                      <button
                        className="text-red-400 hover:text-red-600"
                        onClick={() => del.mutate(h.id)}
                      >
                        Xóa
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="mt-2 text-xs text-slate-400">
            * Chưa lấy được giá thị trường — tạm dùng giá vốn.
          </div>
        </Card>
      )}

      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title={editing?.id ? "Sửa mã" : "Thêm mã cổ phiếu"}
      >
        {editing && (
          <div className="space-y-3">
            <Field label="Mã cổ phiếu (ticker)">
              <input
                className={inputClass}
                value={editing.ticker ?? ""}
                onChange={(e) => setEditing({ ...editing, ticker: e.target.value })}
                placeholder="VD: AAPL, NVDA…"
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Số lượng">
                <input
                  type="number"
                  className={inputClass}
                  value={editing.quantity ?? 0}
                  onChange={(e) => setEditing({ ...editing, quantity: Number(e.target.value) })}
                />
              </Field>
              <Field label="Giá vốn TB">
                <input
                  type="number"
                  className={inputClass}
                  value={editing.avg_cost ?? 0}
                  onChange={(e) => setEditing({ ...editing, avg_cost: Number(e.target.value) })}
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
