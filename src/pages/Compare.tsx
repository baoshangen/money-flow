import { useMemo, useState } from "react";
import {
  useHoldings,
  useStockPrices,
  useTargetHoldings,
  useUpsertTargetHolding,
  useDeleteTargetHolding,
} from "../lib/queries";
import type { TargetHolding } from "../types";
import { formatMoney } from "../lib/format";
import { PageHeader, Card, Button, Modal, Field, inputClass } from "../components/ui";

// Định dạng số cổ phiếu (Robinhood cho phép lẻ) — tối đa 4 số thập phân.
function fmtShares(n: number): string {
  return n.toLocaleString("vi-VN", { maximumFractionDigits: 4 });
}
function fmtPct(n: number): string {
  return `${n.toLocaleString("vi-VN", { maximumFractionDigits: 1 })}%`;
}

interface Row {
  ticker: string;
  price: number | null; // null = chưa lấy được giá
  myValue: number;
  myWeight: number; // % theo tổng danh mục hiện tại của bạn
  targetWeight: number; // % mục tiêu (đã chuẩn hoá về tổng 100)
  targetValue: number;
  diffValue: number; // targetValue - myValue: dương = mua, âm = bán
}

export default function Compare() {
  const { data: holdings = [] } = useHoldings();
  const { data: targets = [], isLoading } = useTargetHoldings();
  const upsert = useUpsertTargetHolding();
  const del = useDeleteTargetHolding();
  const [editing, setEditing] = useState<Partial<TargetHolding> | null>(null);

  // Giá thị trường cho hợp của 2 danh mục.
  const allTickers = useMemo(
    () =>
      Array.from(
        new Set([
          ...holdings.map((h) => h.ticker.toUpperCase()),
          ...targets.map((t) => t.ticker.toUpperCase()),
        ]),
      ),
    [holdings, targets],
  );
  const { data: prices = {}, isFetching } = useStockPrices(allTickers);

  const priceOf = (ticker: string, fallback?: number): number | null => {
    const live = prices[ticker.toUpperCase()]?.price;
    if (live != null) return live;
    if (fallback != null && fallback > 0) return fallback;
    return null;
  };

  // Tổng giá trị danh mục hiện tại của bạn (giá thị trường, fallback giá vốn).
  const myTotalValue = useMemo(
    () =>
      holdings.reduce((s, h) => {
        const px = priceOf(h.ticker, Number(h.avg_cost)) ?? 0;
        return s + Number(h.quantity) * px;
      }, 0),
    [holdings, prices],
  );

  // Vốn muốn phân bổ theo cơ cấu của anh. Mặc định = giá trị hiện có; cho
  // phép nhập tay (VD dự tính nạp thêm, hoặc tài khoản đang trống).
  const [capitalInput, setCapitalInput] = useState<string>("");
  const capital =
    capitalInput.trim() !== "" ? Math.max(0, Number(capitalInput) || 0) : myTotalValue;

  // Chuẩn hoá tỷ trọng mục tiêu về tổng 100% (phòng khi nhập lệch).
  const sumWeights = targets.reduce((s, t) => s + Number(t.weight), 0);

  const rows = useMemo<Row[]>(() => {
    const myValueByTicker = new Map<string, number>();
    for (const h of holdings) {
      const px = priceOf(h.ticker, Number(h.avg_cost)) ?? 0;
      const key = h.ticker.toUpperCase();
      myValueByTicker.set(key, (myValueByTicker.get(key) ?? 0) + Number(h.quantity) * px);
    }
    const targetByTicker = new Map<string, number>();
    for (const t of targets) {
      const key = t.ticker.toUpperCase();
      targetByTicker.set(key, (targetByTicker.get(key) ?? 0) + Number(t.weight));
    }

    return allTickers
      .map((ticker): Row => {
        const rawTargetW = targetByTicker.get(ticker) ?? 0;
        const targetWeight = sumWeights > 0 ? (rawTargetW / sumWeights) * 100 : 0;
        const targetValue = (targetWeight / 100) * capital;
        const myValue = myValueByTicker.get(ticker) ?? 0;
        const myWeight = myTotalValue > 0 ? (myValue / myTotalValue) * 100 : 0;
        return {
          ticker,
          price: priceOf(ticker),
          myValue,
          myWeight,
          targetWeight,
          targetValue,
          diffValue: targetValue - myValue,
        };
      })
      .sort((a, b) => b.targetWeight - a.targetWeight || b.myWeight - a.myWeight);
  }, [allTickers, holdings, targets, prices, capital, myTotalValue, sumWeights]);

  // Ngưỡng bỏ qua chênh lệch nhỏ (coi như giữ nguyên).
  const EPS = 1; // 1 đơn vị tiền
  const actionCount = rows.filter((r) => Math.abs(r.diffValue) > EPS).length;

  function openNew() {
    setEditing({ ticker: "", weight: 0, label: "Anh" });
  }
  async function save() {
    if (!editing?.ticker) return;
    await upsert.mutateAsync({ ...editing, ticker: editing.ticker.toUpperCase() });
    setEditing(null);
  }

  const weightWarn = targets.length > 0 && Math.abs(sumWeights - 100) > 0.5;

  return (
    <>
      <PageHeader
        title="Bám danh mục của anh"
        action={<Button onClick={openNew}>+ Thêm mã của anh</Button>}
      />

      {/* Thẻ tổng quan */}
      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        <Card>
          <div className="text-sm text-slate-500">Danh mục của bạn</div>
          <div className="mt-1 text-2xl font-bold text-slate-900">
            {formatMoney(myTotalValue, "USD")}
          </div>
        </Card>
        <Card>
          <div className="text-sm text-slate-500">Vốn phân bổ theo anh</div>
          <input
            className={`${inputClass} mt-1 text-lg font-bold`}
            inputMode="decimal"
            value={capitalInput}
            onChange={(e) => setCapitalInput(e.target.value)}
            placeholder={myTotalValue ? String(Math.round(myTotalValue)) : "VD: 5000"}
          />
          <div className="mt-1 text-xs text-slate-400">
            Để trống = dùng đúng {formatMoney(myTotalValue, "USD")} bạn đang có.
          </div>
        </Card>
        <Card>
          <div className="text-sm text-slate-500">Số lệnh cần làm {isFetching ? "⏳" : ""}</div>
          <div className="mt-1 text-2xl font-bold text-brand-600">{actionCount}</div>
        </Card>
      </div>

      {weightWarn && (
        <Card className="mb-4 !bg-amber-50/80">
          <div className="text-sm text-amber-700">
            ⚠️ Tổng tỷ trọng của anh đang là <b>{fmtPct(sumWeights)}</b> (không bằng 100%). App đã
            tự chuẩn hoá về 100% để tính, nhưng bạn nên kiểm tra lại số liệu.
          </div>
        </Card>
      )}

      {isLoading ? (
        <p className="text-slate-500">Đang tải…</p>
      ) : targets.length === 0 ? (
        <Card>
          <p className="text-slate-600">
            Chưa có danh mục mẫu nào. Bấm <b>“+ Thêm mã của anh”</b> để nhập cơ cấu danh mục của anh
            (ticker + tỷ trọng %), rồi app sẽ chỉ bạn cần mua/bán gì để bám theo.
          </p>
        </Card>
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-sm">
            <thead>
              <tr className="text-left text-slate-400">
                <th className="pb-2">Mã</th>
                <th className="pb-2 text-right">Tỷ trọng bạn</th>
                <th className="pb-2 text-right">Tỷ trọng anh</th>
                <th className="pb-2 text-right">Giá hiện tại</th>
                <th className="pb-2 text-right">Cần điều chỉnh</th>
                <th className="pb-2">Lệnh</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const isBuy = r.diffValue > EPS;
                const isSell = r.diffValue < -EPS;
                const shares =
                  r.price && r.price > 0 ? Math.abs(r.diffValue) / r.price : null;
                return (
                  <tr key={r.ticker} className="border-t border-black/5">
                    <td className="py-2 font-semibold text-slate-800">{r.ticker}</td>
                    <td className="py-2 text-right text-slate-600">{fmtPct(r.myWeight)}</td>
                    <td className="py-2 text-right font-medium text-slate-800">
                      {fmtPct(r.targetWeight)}
                    </td>
                    <td className="py-2 text-right text-slate-500">
                      {r.price ? formatMoney(r.price, "USD") : "—"}
                    </td>
                    <td
                      className={`py-2 text-right font-medium ${
                        isBuy ? "text-emerald-600" : isSell ? "text-red-500" : "text-slate-400"
                      }`}
                    >
                      {isBuy ? "+" : isSell ? "−" : ""}
                      {formatMoney(Math.abs(r.diffValue), "USD")}
                    </td>
                    <td className="py-2">
                      {!isBuy && !isSell ? (
                        <span className="text-slate-400">Giữ nguyên</span>
                      ) : (
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
                            isBuy
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-red-100 text-red-600"
                          }`}
                        >
                          {isBuy ? "MUA" : "BÁN"}
                          {shares != null ? ` ${fmtShares(shares)} cổ` : ""}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="mt-3 text-xs text-slate-400">
            “Tỷ trọng bạn” tính theo giá trị danh mục hiện tại. Lệnh mua/bán tính để đạt đúng cơ cấu
            của anh với vốn phân bổ ở trên. Giá lấy từ Stooq (giá đóng cửa gần nhất).
          </div>
        </Card>
      )}

      {/* Bảng danh mục mẫu của anh (quản lý) */}
      {targets.length > 0 && (
        <Card className="mt-5 overflow-x-auto">
          <div className="mb-2 text-sm font-semibold text-slate-600">Danh mục mẫu của anh</div>
          <table className="w-full min-w-[420px] text-sm">
            <thead>
              <tr className="text-left text-slate-400">
                <th className="pb-2">Mã</th>
                <th className="pb-2 text-right">Tỷ trọng</th>
                <th className="pb-2 text-right"></th>
              </tr>
            </thead>
            <tbody>
              {targets.map((t) => (
                <tr key={t.id} className="border-t border-black/5">
                  <td className="py-2 font-semibold text-slate-800">{t.ticker}</td>
                  <td className="py-2 text-right">{fmtPct(Number(t.weight))}</td>
                  <td className="py-2 text-right whitespace-nowrap">
                    <button
                      className="mr-2 text-slate-500 hover:text-brand-500"
                      onClick={() => setEditing(t)}
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
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title={editing?.id ? "Sửa mã của anh" : "Thêm mã của anh"}
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
            <Field label="Tỷ trọng (%)">
              <input
                type="number"
                className={inputClass}
                value={editing.weight ?? 0}
                onChange={(e) => setEditing({ ...editing, weight: Number(e.target.value) })}
                placeholder="VD: 40"
              />
            </Field>
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
