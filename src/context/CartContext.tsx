// src/context/CartContext.tsx
import { createContext, useContext, useState, useEffect } from "react";
import axios from "axios";
import { toast } from "sonner";
import { CartItem } from "../types";
import { useAuth } from "./AuthContext";

interface CartContextType {
  cart: CartItem[];
  addToCart: (item: CartItem) => Promise<void>;
  removeFromCart: (productId: string) => Promise<void>;
  clearCart: () => void;
  fetchCart: () => Promise<void>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider = ({ children }: { children: React.ReactNode }) => {
  const [cart, setCart] = useState<CartItem[]>([]);
  const { user } = useAuth();

  const fetchCart = async () => {
    if (!user) {
      setCart([]);
      return;
    }

    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Authentication required");
      const res = await axios.get("http://localhost:5000/api/cart", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCart(
        res.data.items.map((item: any) => ({
          productId: item.product._id,
          name: item.product.name,
          price: item.product.price,
          quantity: item.quantity,
          imageUrl: item.product.images?.[0]?.url,
        }))
      );
    } catch (error) {
      console.error("Error fetching cart:", error);
      toast.error("Failed to load cart.");
      setCart([]);
    }
  };

  useEffect(() => {
    fetchCart();
  }, [user]);

  const addToCart = async (item: CartItem) => {
    if (!user) {
      toast.error("Please connect a wallet to add items to cart.");
      return;
    }

    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Authentication required");
      await axios.post(
        "http://localhost:5000/api/cart/add",
        {
          productId: item.productId,
          quantity: item.quantity || 1,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      await fetchCart();
      toast.success(`${item.name} added to cart!`);
    } catch (error) {
      console.error("Error adding to cart:", error);
      let message = "Failed to add item to cart.";
      if (axios.isAxiosError(error)) message = error.response?.data?.message || error.message;
      toast.error(message);
    }
  };

  const removeFromCart = async (productId: string) => {
    if (!user) {
      toast.error("Please connect a wallet.");
      return;
    }

    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Authentication required");
      await axios.delete(`http://localhost:5000/api/cart/remove/${productId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCart((prev) => prev.filter((item) => item.productId !== productId));
      toast.success("Item removed from cart.");
    } catch (error) {
      console.error("Error removing from cart:", error);
      toast.error("Failed to remove item from cart.");
    }
  };

  const clearCart = () => {
    setCart([]);
  };

  return (
    <CartContext.Provider value={{ cart, addToCart, removeFromCart, clearCart, fetchCart }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used within a CartProvider");
  return context;
};