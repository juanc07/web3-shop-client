// src/types/index.ts

export interface User {
  id: string; // Usually corresponds to _id from backend after login/profile fetch
  email: string;
  name: string;
  role: "buyer" | "seller" | "admin";
}

// Define Seller type for clarity, matching populated structure or User subset
export interface SellerInfo {
  _id: string; // Keep _id for consistency with DB refs
  name: string;
  // Add other relevant seller fields if needed, e.g., email
}

export interface Product {
  _id: string; // Use _id as the primary identifier from MongoDB
  id?: string; // Optional: sometimes included in API responses for convenience
  name: string;
  description: string;
  price: number;
  stock: number;
  seller: SellerInfo; // Use the defined Seller type for populated data
  // --- ADDED Image Fields ---
  images?: { url: string; publicId?: string }[]; // Array of image objects
  imageUrl?: string;      // The public URL for displaying the image
  imagePublicId?: string; // Optional: The ID used by Cloudinary (needed for deletion)
  // --- End Added Image Fields ---
  createdAt?: string | Date; // Optional: Timestamps might be ISO strings or Date objects
  updatedAt?: string | Date;
}

export interface CartItem {
  productId: string; // Should match Product._id
  name: string;
  price: number;
  quantity: number;
  imageUrl?: string; // Optional: Add image URL to cart item for display
}

// Interface for the nested product structure within an Order
export interface OrderProductInfo {
   // Reference the main Product type, but maybe only specific fields are populated
   product: Partial<Product> & { _id: string }; // Ensure _id is present, other fields might be partial
   quantity: number;
}

export interface Order {
  _id: string;
  user: User | null; // User who placed the order
  products: OrderProductInfo[]; // Use the refined nested type
  total: number;
  status: "pending" | "completed" | "cancelled";
  paymentMethod: "solana" | "pi" | "other"; // Assuming these are your payment methods
  paymentSignature?: string; // Optional transaction signature
  createdAt?: string | Date;
  updatedAt?: string | Date;
}