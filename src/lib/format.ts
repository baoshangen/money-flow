// Hàm định dạng tiền tệ & ngày dùng chung toàn app.

export function formatMoney(amount: number, currency = "USD"): string {
  // USD hiển thị kiểu $1,234.56 (en-US); VND kiểu 1.234 ₫ (vi-VN).
  const locale = currency === "VND" ? "vi-VN" : "en-US";
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      maximumFractionDigits: currency === "VND" ? 0 : 2,
    }).format(amount);
  } catch {
    // Phòng khi mã tiền tệ lạ Intl không nhận.
    return `${amount.toLocaleString(locale)} ${currency}`;
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
