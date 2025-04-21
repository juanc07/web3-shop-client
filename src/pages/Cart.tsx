// src/pages/Cart.tsx
import { useCart } from "../context/CartContext";
import { useSolana } from "../hooks/useSolana";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const Cart = () => {
  const { cart, removeFromCart, clearCart } = useCart();
  const { connectWallet, sendPayment, wallet } = useSolana();

  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const handleCheckout = async () => {
    if (!wallet) await connectWallet();

    try {
      const res = await axios.post(
        "http://localhost:5000/api/orders",
        {
          products: cart.map((item) => ({ product: item.productId, quantity: item.quantity })),
          total,
          paymentMethod: "solana",
        },
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }
      );

      const signature = await sendPayment("SELLER_PUBLIC_KEY", total); // Replace with actual seller key
      await axios.post(
        "http://localhost:5000/api/payments/verify-solana",
        { signature, orderId: res.data._id },
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }
      );

      clearCart();
      alert("Payment successful!");
    } catch (error) {
      console.error(error);
      alert("Payment failed");
    }
  };

  return (
    <div className="w-full px-4 py-6">
      <h1 className="text-xl sm:text-2xl font-bold mb-4 text-center">Your Cart</h1>
      {cart.length === 0 ? (
        <p className="text-center text-gray-600 dark:text-gray-300">Your cart is empty</p>
      ) : (
        <Card className="bg-card-light dark:bg-card-dark shadow-lg w-full">
          <CardHeader>
            <CardTitle className="text-lg sm:text-xl">Cart Items</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-4">
              {cart.map((item) => (
                <li
                  key={item.productId}
                  className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2"
                >
                  <div>
                    <p className="font-semibold text-sm sm:text-base">{item.name}</p>
                    <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300">
                      ${item.price} x {item.quantity}
                    </p>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => removeFromCart(item.productId)}
                  >
                    Remove
                  </Button>
                </li>
              ))}
            </ul>
            <p className="text-lg font-bold mt-4">Total: ${total}</p>
            <Button className="w-full sm:w-auto mt-4" onClick={handleCheckout}>
              Checkout with Solana
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Cart;