// Kiểu dữ liệu khớp với schema Postgres (supabase/migrations/0001_init.sql).

export type AccountType = "bank_card" | "cash" | "ewallet";
export type CategoryType = "income" | "expense";
export type Direction = "in" | "out";
export type TxSource = "manual" | "csv" | "ai_image";
export type ReceiptStatus = "pending" | "parsed" | "confirmed";

export interface Account {
  id: string;
  user_id: string;
  name: string;
  type: AccountType;
  currency: string;
  current_balance: number;
  created_at: string;
}

export interface Category {
  id: string;
  user_id: string;
  name: string;
  type: CategoryType;
  icon: string | null;
  color: string | null;
}

export interface Transaction {
  id: string;
  user_id: string;
  account_id: string | null;
  category_id: string | null;
  amount: number;
  direction: Direction;
  occurred_at: string; // ISO date
  note: string | null;
  source: TxSource;
  receipt_id: string | null;
  created_at: string;
}

export interface Holding {
  id: string;
  user_id: string;
  ticker: string;
  quantity: number;
  avg_cost: number;
  currency: string;
  created_at: string;
}

// Danh mục mẫu "để noi theo" (VD: của anh/chị) — chỉ lưu tỷ trọng %.
export interface TargetHolding {
  id: string;
  user_id: string;
  ticker: string;
  weight: number; // tỷ trọng mục tiêu, đơn vị %
  label: string | null;
  created_at: string;
}

export interface Receipt {
  id: string;
  user_id: string;
  storage_path: string;
  status: ReceiptStatus;
  extracted_json: ExtractedReceipt | null;
  created_at: string;
}

export interface Budget {
  id: string;
  user_id: string;
  category_id: string;
  monthly_limit: number;
  currency: string;
  created_at: string;
}

export interface PriceQuote {
  ticker: string;
  price: number;
  currency: string;
  as_of: string;
}

// Cấu trúc JSON mà Edge Function (Claude vision) trả về.
export interface ExtractedReceipt {
  amount: number | null;
  currency: string | null;
  date: string | null; // YYYY-MM-DD
  merchant: string | null;
  suggested_category: string | null;
  direction: Direction | null;
  items?: { name: string; amount: number | null }[];
}
