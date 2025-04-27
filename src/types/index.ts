// src/types.ts
export interface CartItem {
  productId: string;
  name: string;
  price: number;    // Price in USDC
  solPrice: number; // Price in SOL
  piPrice: number;  // Price in Pi
  quantity: number;
  imageUrl?: string;
}

export interface User {
  id: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  username?: string;
  mobileNumber?: string;
  roles: ("buyer" | "seller" | "admin")[];
  solanaWallet?: string | null;
  piWallet?: string | null;
}

export interface SellerInfo {
  _id: string;
  firstName?: string;
  lastName?: string;
  username?: string;
  email?: string;
}

export interface Product {
  _id: string;
  id?: string;
  name: string;
  description: string;
  price: number;    // Price in USDC
  solPrice: number; // Price in SOL
  piPrice: number;  // Price in Pi
  stock: number;
  seller: SellerInfo;
  images?: { url: string; publicId: string }[];
  imageUrl?: string;
  imagePublicId?: string | null;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface OrderProductInfo {
  product: Partial<Product> & { _id: string };
  quantity: number;
}

export interface Order {
  _id: string;
  user: User | null;
  products: OrderProductInfo[];
  total: number; // Total in USDC, SOL, or Pi, based on paymentMethod
  status: "pending" | "completed" | "cancelled";
  paymentMethod: "usdc" | "solana" | "pi" | "other";
  paymentSignature?: string;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}