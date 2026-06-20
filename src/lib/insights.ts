import type { Transaction } from "../types";

export interface MonthSummary {
  income: number;
  expense: number;
  net: number;
}

// Tổng thu/chi trong một khoảng giao dịch đã lọc.
export function summarize(txs: Transaction[]): MonthSummary {
  let income = 0;
  let expense = 0;
  for (const t of txs) {
    if (t.direction === "in") income += Number(t.amount);
    else expense += Number(t.amount);
  }
  return { income, expense, net: income - expense };
}

export interface HealthResult {
  score: number; // 0–100
  label: string;
  tone: "good" | "ok" | "bad";
  savingsRate: number; // 0–1
}

/**
 * Đánh giá "sức khỏe tài chính" của tháng.
 *
 * ──────────────────────────────────────────────────────────────
 * 👉 ĐÂY LÀ PHẦN DÀNH CHO BẠN TỰ ĐỊNH NGHĨA (logic nghiệp vụ).
 *
 * Cách đo "khỏe" tùy triết lý mỗi người. Vài hướng để bạn cân nhắc:
 *  - Tỷ lệ tiết kiệm (savings rate = net / income): >20% là tốt?
 *  - Có quỹ dự phòng (cash) đủ N tháng chi tiêu không?
 *  - Chi tiêu tháng này so với trung bình các tháng trước?
 *
 * Bản mặc định dưới đây CHỈ dựa trên tỷ lệ tiết kiệm để app chạy được.
 * Hãy thay bằng công thức phản ánh đúng mục tiêu tài chính của BẠN.
 * (Gợi ý: có thể nhận thêm tham số cashTotal, lịch sử nhiều tháng…)
 * ──────────────────────────────────────────────────────────────
 */
export function financialHealth(month: MonthSummary): HealthResult {
  const savingsRate = month.income > 0 ? month.net / month.income : 0;

  // TODO(bạn): thay logic chấm điểm bên dưới theo tiêu chí của riêng bạn.
  const score = Math.max(0, Math.min(100, Math.round(savingsRate * 100)));
  let label = "Cần cải thiện";
  let tone: HealthResult["tone"] = "bad";
  if (savingsRate >= 0.2) {
    label = "Khỏe mạnh";
    tone = "good";
  } else if (savingsRate >= 0.05) {
    label = "Ổn định";
    tone = "ok";
  }

  return { score, label, tone, savingsRate };
}
