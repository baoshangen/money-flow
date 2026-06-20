// ============================================================
// Edge Function: extract-receipt
// Nhận storage_path của ảnh hóa đơn → gọi Claude vision → trả JSON
// giao dịch. ANTHROPIC_API_KEY nằm trong Supabase secrets, KHÔNG
// bao giờ lộ ra frontend/repo.
//
// Deploy:
//   supabase functions deploy extract-receipt
//   supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
// ============================================================
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const MODEL = Deno.env.get("CLAUDE_MODEL") ?? "claude-haiku-4-5";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, apikey",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const EXTRACTION_PROMPT = `Bạn là trợ lý bóc tách hóa đơn/biên lai/sao kê.
Đọc ảnh và trả về DUY NHẤT một JSON hợp lệ (không kèm chữ nào khác) theo schema:
{
  "amount": number | null,          // tổng tiền, chỉ số
  "currency": string | null,        // "VND", "USD"...
  "date": "YYYY-MM-DD" | null,      // ngày giao dịch
  "merchant": string | null,        // tên cửa hàng/đơn vị
  "suggested_category": string | null, // vd: "Ăn uống","Đi lại","Mua sắm","Hóa đơn"
  "direction": "in" | "out" | null, // "out" nếu là chi tiền (mặc định hóa đơn)
  "items": [ { "name": string, "amount": number | null } ]
}
Nếu không chắc trường nào, để null. KHÔNG bịa số liệu.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const { storage_path } = await req.json();
    if (!storage_path) {
      return json({ error: "Thiếu storage_path" }, 400);
    }

    // Client mang JWT của user → mọi thao tác bị RLS ràng buộc đúng chủ.
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (!user) return json({ error: "Chưa đăng nhập" }, 401);

    // 1) Tải ảnh từ bucket private.
    const { data: file, error: dlErr } = await supabase.storage
      .from("receipts")
      .download(storage_path);
    if (dlErr || !file) return json({ error: "Không tải được ảnh" }, 400);

    const buf = new Uint8Array(await file.arrayBuffer());
    const base64 = base64Encode(buf);
    const mediaType = file.type || "image/jpeg";

    // 2) Gọi Claude vision.
    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) return json({ error: "Server chưa cấu hình ANTHROPIC_API_KEY" }, 500);

    const aiRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1024,
        messages: [
          {
            role: "user",
            content: [
              { type: "image", source: { type: "base64", media_type: mediaType, data: base64 } },
              { type: "text", text: EXTRACTION_PROMPT },
            ],
          },
        ],
      }),
    });

    if (!aiRes.ok) {
      const t = await aiRes.text();
      return json({ error: `Lỗi Claude API: ${t}` }, 502);
    }

    const aiJson = await aiRes.json();
    const text: string = aiJson?.content?.[0]?.text ?? "{}";
    const extracted = safeParseJson(text);

    // 3) Lưu lại receipt (status=parsed) để truy vết, trả về cho client review.
    const { data: inserted, error: insErr } = await supabase
      .from("receipts")
      .insert({ storage_path, status: "parsed", extracted_json: extracted })
      .select("id")
      .single();
    if (insErr) return json({ error: insErr.message }, 400);

    return json({ receipt_id: inserted.id, extracted });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Lỗi không xác định" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "content-type": "application/json" },
  });
}

// Trích JSON kể cả khi model lỡ kèm văn bản quanh nó.
function safeParseJson(text: string) {
  try {
    return JSON.parse(text);
  } catch {
    const m = text.match(/\{[\s\S]*\}/);
    if (m) {
      try {
        return JSON.parse(m[0]);
      } catch {
        /* ignore */
      }
    }
    return {};
  }
}

function base64Encode(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}
