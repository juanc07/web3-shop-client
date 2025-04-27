// src/types/index.ts
export interface User {
  id: string;
  email: string;
  name: string;
  role: "buyer" | "seller" | "admin";
}

export interface SellerInfo {
  _id: string;
  name: string;
  email?: string;
}

export interface Product {
  _id: string;
  id?: string; // Optional for backward compatibility
  name: string;
  description: string;
  price: number;
  stock: number;
  seller: SellerInfo;
  images?: { url: string; publicId: string }[];
  imageUrl?: string; // For legacy products
  imagePublicId?: string | null; // For legacy products
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface CartItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  imageUrl?: string;
}

export interface OrderProductInfo {
  product: Partial<Product> & { _id: string };
  quantity: number;
}

export interface Order {
  _id: string;
  user: User | null;
  products: OrderProductInfo[];
  total: number;
  status: "pending" | "completed" | "cancelled";
  paymentMethod: "solana" | "pi" | "other";
  paymentSignature?: string;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}