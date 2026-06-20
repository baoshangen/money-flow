import { useRef, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";
import { useCategories } from "../../lib/queries";
import type { ExtractedReceipt } from "../../types";
import { Modal, Button } from "../../components/ui";
import TransactionForm, { type TxDraft, emptyDraft } from "../transactions/TransactionForm";

type Phase = "idle" | "uploading" | "extracting" | "review" | "error";

export default function ReceiptUpload({ label = "📷 Up ảnh hóa đơn" }: { label?: string }) {
  const { user } = useAuth();
  const { data: categories = [] } = useCategories();
  const fileRef = useRef<HTMLInputElement>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [draft, setDraft] = useState<TxDraft | null>(null);

  // Map gợi ý danh mục (chuỗi từ AI) sang category_id có sẵn theo tên gần đúng.
  function matchCategory(name: string | null): string | null {
    if (!name) return null;
    const lower = name.toLowerCase();
    const hit = categories.find(
      (c) => c.name.toLowerCase() === lower || c.name.toLowerCase().includes(lower),
    );
    return hit?.id ?? null;
  }

  async function handleFile(file: File) {
    if (!user) return;
    setErrorMsg(null);
    try {
      // 1) Upload ảnh lên bucket private `receipts`, đặt theo userId để RLS chặn đúng.
      setPhase("uploading");
      const path = `${user.id}/${Date.now()}-${file.name.replace(/\s+/g, "_")}`;
      const { error: upErr } = await supabase.storage.from("receipts").upload(path, file);
      if (upErr) throw upErr;

      // 2) Gọi Edge Function đọc ảnh (key Claude nằm an toàn phía server).
      setPhase("extracting");
      const { data, error: fnErr } = await supabase.functions.invoke<{
        receipt_id: string;
        extracted: ExtractedReceipt;
      }>("extract-receipt", { body: { storage_path: path } });
      if (fnErr) throw fnErr;

      // 3) Đổ kết quả AI vào form review để user duyệt trước khi lưu.
      const ex = data!.extracted;
      setDraft({
        ...emptyDraft(),
        amount: ex.amount ?? 0,
        direction: ex.direction ?? "out",
        category_id: matchCategory(ex.suggested_category),
        occurred_at: ex.date ?? emptyDraft().occurred_at,
        note: ex.merchant ?? "",
        source: "ai_image",
        receipt_id: data!.receipt_id,
      });
      setPhase("review");
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "Có lỗi khi xử lý ảnh.");
      setPhase("error");
    }
  }

  return (
    <>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
          e.target.value = "";
        }}
      />
      <Button onClick={() => fileRef.current?.click()}>{label}</Button>

      <Modal
        open={phase === "uploading" || phase === "extracting"}
        onClose={() => {}}
        title="Đang xử lý ảnh…"
      >
        <p className="text-sm text-slate-500">
          {phase === "uploading"
            ? "Đang tải ảnh lên…"
            : "AI đang đọc hóa đơn (số tiền, ngày, danh mục)…"}
        </p>
      </Modal>

      <Modal open={phase === "error"} onClose={() => setPhase("idle")} title="Lỗi">
        <p className="mb-4 text-sm text-red-500">{errorMsg}</p>
        <div className="flex justify-end">
          <Button variant="ghost" onClick={() => setPhase("idle")}>
            Đóng
          </Button>
        </div>
      </Modal>

      <Modal
        open={phase === "review" && !!draft}
        onClose={() => setPhase("idle")}
        title="Duyệt giao dịch từ ảnh"
      >
        {draft && (
          <>
            <p className="mb-3 text-xs text-amber-600">
              ⚠️ AI chỉ gợi ý — hãy kiểm tra lại số tiền & danh mục trước khi lưu.
            </p>
            <TransactionForm initial={draft} onDone={() => setPhase("idle")} />
          </>
        )}
      </Modal>
    </>
  );
}
