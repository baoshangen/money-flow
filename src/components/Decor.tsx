import { useState, type ReactNode } from "react";

// Mảnh trang trí "teen" tái dùng: mascot, sparkle, tia tốc độ kiểu manga, sticker.

export function Mascot({
  name = "hero",
  className = "",
  alt = "Mascot",
}: {
  name?: "hero" | "happy" | "empty";
  className?: string;
  alt?: string;
}) {
  // Ưu tiên ảnh BẠN tự bỏ vào public/mascot/custom/<name>.png (thư mục này bị
  // Git bỏ qua → chỉ ở máy bạn, không bao giờ lên GitHub/Hostinger).
  // Nếu không có file đó → tự rớt về mascot mở mặc định (CC0) cho bản công khai.
  const [src, setSrc] = useState(`mascot/custom/${name}.png`);
  return (
    <img
      src={src}
      onError={() => {
        if (!src.endsWith(".svg")) setSrc(`mascot/${name}.svg`);
      }}
      alt={alt}
      className={className}
      draggable={false}
    />
  );
}

// Vài ngôi sao/sparkle rải (thuần CSS, nhẹ).
export function Sparkles({ className = "" }: { className?: string }) {
  return (
    <div className={`pointer-events-none select-none ${className}`} aria-hidden>
      <span className="absolute left-2 top-3 text-lg opacity-80">✨</span>
      <span className="absolute right-6 top-6 text-sm opacity-70">⭐</span>
      <span className="absolute bottom-4 left-8 text-xs opacity-70">💫</span>
    </div>
  );
}

// Tia tốc độ kiểu manga (SVG nan quạt mờ) — đặt làm lớp nền trang trí.
export function SpeedLines({ className = "" }: { className?: string }) {
  return (
    <svg
      className={`pointer-events-none absolute ${className}`}
      viewBox="0 0 200 200"
      fill="none"
      aria-hidden
    >
      {Array.from({ length: 14 }).map((_, i) => {
        const a = (i / 14) * Math.PI * 2;
        return (
          <line
            key={i}
            x1={100 + Math.cos(a) * 30}
            y1={100 + Math.sin(a) * 30}
            x2={100 + Math.cos(a) * 140}
            y2={100 + Math.sin(a) * 140}
            stroke="white"
            strokeWidth={6}
            strokeLinecap="round"
            opacity={0.15}
          />
        );
      })}
    </svg>
  );
}

// Nhãn sticker bo tròn nghiêng nhẹ — chất teen.
export function Sticker({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-block -rotate-3 rounded-full bg-white px-3 py-1 text-xs font-bold text-brand-600 shadow-md ring-2 ring-brand-100 ${className}`}
    >
      {children}
    </span>
  );
}
