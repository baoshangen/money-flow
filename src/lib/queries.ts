import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "./supabase";
import type {
  Account,
  Budget,
  Category,
  Holding,
  PriceQuote,
  TargetHolding,
  Transaction,
} from "../types";

// ── Accounts ────────────────────────────────────────────────
export function useAccounts() {
  return useQuery({
    queryKey: ["accounts"],
    queryFn: async (): Promise<Account[]> => {
      const { data, error } = await supabase
        .from("accounts")
        .select("*")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useUpsertAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (acc: Partial<Account>) => {
      const { error } = await supabase.from("accounts").upsert(acc);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["accounts"] }),
  });
}

export function useDeleteAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("accounts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["accounts"] }),
  });
}

// ── Categories ──────────────────────────────────────────────
export function useCategories() {
  return useQuery({
    queryKey: ["categories"],
    queryFn: async (): Promise<Category[]> => {
      const { data, error } = await supabase.from("categories").select("*").order("name");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useUpsertCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (cat: Partial<Category>) => {
      const { error } = await supabase.from("categories").upsert(cat);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["categories"] }),
  });
}

// ── Transactions ────────────────────────────────────────────
export function useTransactions(limit?: number) {
  return useQuery({
    queryKey: ["transactions", limit ?? "all"],
    queryFn: async (): Promise<Transaction[]> => {
      let q = supabase
        .from("transactions")
        .select("*")
        .order("occurred_at", { ascending: false });
      if (limit) q = q.limit(limit);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useUpsertTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (tx: Partial<Transaction>) => {
      const { error } = await supabase.from("transactions").upsert(tx);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["transactions"] });
      qc.invalidateQueries({ queryKey: ["accounts"] });
    },
  });
}

export function useDeleteTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("transactions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["transactions"] });
      qc.invalidateQueries({ queryKey: ["accounts"] });
    },
  });
}

// ── Holdings (cổ phiếu) ─────────────────────────────────────
export function useHoldings() {
  return useQuery({
    queryKey: ["holdings"],
    queryFn: async (): Promise<Holding[]> => {
      const { data, error } = await supabase
        .from("holdings")
        .select("*")
        .order("ticker");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useUpsertHolding() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (h: Partial<Holding>) => {
      const { error } = await supabase.from("holdings").upsert(h);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["holdings"] }),
  });
}

export function useDeleteHolding() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("holdings").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["holdings"] }),
  });
}

// ── Target holdings (danh mục mẫu để bám theo) ──────────────
export function useTargetHoldings() {
  return useQuery({
    queryKey: ["target_holdings"],
    queryFn: async (): Promise<TargetHolding[]> => {
      const { data, error } = await supabase
        .from("target_holdings")
        .select("*")
        .order("weight", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useUpsertTargetHolding() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (t: Partial<TargetHolding>) => {
      const { error } = await supabase.from("target_holdings").upsert(t);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["target_holdings"] }),
  });
}

export function useDeleteTargetHolding() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("target_holdings").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["target_holdings"] }),
  });
}

// ── Budgets (ngân sách) ─────────────────────────────────────
export function useBudgets() {
  return useQuery({
    queryKey: ["budgets"],
    queryFn: async (): Promise<Budget[]> => {
      const { data, error } = await supabase.from("budgets").select("*");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useUpsertBudget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (b: Partial<Budget>) => {
      // onConflict theo (user_id, category_id): set lại hạn mức nếu đã có.
      const { error } = await supabase
        .from("budgets")
        .upsert(b, { onConflict: "user_id,category_id" });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["budgets"] }),
  });
}

export function useDeleteBudget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("budgets").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["budgets"] }),
  });
}

// ── Giá cổ phiếu (Edge Function stock-prices + cache) ───────
export function useStockPrices(tickers: string[]) {
  const key = [...tickers].sort().join(",");
  return useQuery({
    queryKey: ["prices", key],
    enabled: tickers.length > 0,
    staleTime: 5 * 60_000, // giá ít đổi trong vài phút
    queryFn: async (): Promise<Record<string, PriceQuote>> => {
      const { data, error } = await supabase.functions.invoke<{ prices: PriceQuote[] }>(
        "stock-prices",
        { body: { tickers } },
      );
      if (error) throw error;
      const map: Record<string, PriceQuote> = {};
      for (const p of data?.prices ?? []) map[p.ticker.toUpperCase()] = p;
      return map;
    },
  });
}
