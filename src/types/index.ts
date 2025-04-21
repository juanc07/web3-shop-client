// src/types/index.ts
export interface User {
  id: string;
  email: string;
  name: string;
  role: "buyer" | "seller" | "admin";
}

export interface Product {
  _id: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  seller: { _id: string; name: string };
}

export interface CartItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
}

export interface Order {
  _id: string;
  user: User | null;
  products: { product: Product; quantity: number }[];
  total: number;
  status: "pending" | "completed" | "cancelled";
  paymentMethod: "solana" | "pi" | "other";
  paymentSignature?: string;
}