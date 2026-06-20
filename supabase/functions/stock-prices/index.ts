// ============================================================
// Edge Function: stock-prices
// Nhận { tickers: string[] } → lấy giá đóng cửa từ Stooq (CSV, MIỄN PHÍ,
// không cần API key) → ghi vào price_cache (service role) → trả về giá.
//
// Deploy: supabase functions deploy stock-prices
// (Không cần secret thủ công; SUPABASE_URL & SUPABASE_SERVICE_ROLE_KEY
//  được Supabase tự cấp cho Edge Function.)
// ============================================================
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, apikey",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface Quote {
  ticker: string;
  price: number;
  currency: string;
  as_of: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const { tickers } = (await req.json()) as { tickers?: string[] };
    if (!tickers?.length) return json({ prices: [] });

    // Stooq nhận nhiều mã: s=aapl.us,msft.us ; f=symbol,date,time,close
    const symbols = tickers.map((t) => `${t.toLowerCase()}.us`).join(",");
    const url = `https://stooq.com/q/l/?s=${symbols}&f=sd2t2c&h&e=csv`;
    const res = await fetch(url);
    if (!res.ok) return json({ error: "Không lấy được giá từ Stooq" }, 502);

    const csv = await res.text();
    const prices: Quote[] = [];
    const lines = csv.trim().split("\n").slice(1); // bỏ dòng header
    for (const line of lines) {
      const [sym, , , close] = line.split(",");
      const price = Number(close);
      if (!sym || !isFinite(price) || price <= 0) continue; // bỏ N/D
      prices.push({
        ticker: sym.replace(/\.us$/i, "").toUpperCase(),
        price,
        currency: "USD",
        as_of: new Date().toISOString(),
      });
    }

    // Ghi cache bằng service role (bỏ qua RLS) để dùng chung mọi user.
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (serviceKey && prices.length) {
      const admin = createClient(Deno.env.get("SUPABASE_URL")!, serviceKey);
      await admin.from("price_cache").upsert(prices, { onConflict: "ticker" });
    }

    return json({ prices });
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
