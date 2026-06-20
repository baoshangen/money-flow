// Hàm định dạng tiền tệ & ngày dùng chung toàn app.

export function formatMoney(amount: number, currency = "VND"): string {
  try {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency,
      maximumFractionDigits: currency === "VND" ? 0 : 2,
    }).format(amount);
  } catch {
    // Phòng khi mã tiền tệ lạ Intl không nhận.
    return `${amount.toLocaleString("vi-VN")} ${currency}`;
  }
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}
