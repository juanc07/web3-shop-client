// src/pages/OrdersPage.tsx
import { useState, useEffect } from "react";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import { Order, OrderProductInfo } from "../types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { Image as ImageIcon } from "lucide-react";

const OrdersPage = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setError("Please log in to view your orders.");
      setIsLoading(false);
      return;
    }

    const fetchOrders = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const token = localStorage.getItem("token");
        if (!token) throw new Error("Authentication required");
        const res = await axios.get("http://localhost:5000/api/orders", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setOrders(res.data);
      } catch (error) {
        console.error("Error fetching orders:", error);
        let message = "Failed to load orders.";
        if (axios.isAxiosError(error)) message = error.response?.data?.message || error.message;
        setError(message);
        toast.error(message, { id: "orders-error" });
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrders();
  }, [user]);

  if (isLoading) return <div className="w-full px-4 py-6 text-center">Loading orders...</div>;
  if (error) return <div className="w-full px-4 py-6 text-center"><Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert></div>;

  return (
    <div className="w-full px-4 py-6 space-y-6">
      <h1 className="text-2xl sm:text-3xl font-bold text-center">Your Orders</h1>
      {orders.length === 0 ? (
        <p className="text-center text-muted-foreground">You have no orders.</p>
      ) : (
        <div className="space-y-6">
          {orders.map((order) => (
            <Card key={order._id} className="bg-card-light dark:bg-card-dark shadow-lg border">
              <CardHeader>
                <CardTitle className="text-lg">
                  Order #{order._id.slice(-6)} - {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-2">
                  Payment Method: {order.paymentMethod.toUpperCase()}
                </p>
                <p className="text-sm text-muted-foreground mb-2">
                  Total: {order.total.toFixed(order.paymentMethod === "pi" || order.paymentMethod === "usdc" ? 2 : 6)} {order.paymentMethod.toUpperCase()}
                </p>
                <p className="text-sm text-muted-foreground mb-4">
                  Date: {new Date(order.createdAt!).toLocaleString()}
                </p>
                <ul className="space-y-4">
                  {order.products.map((item: OrderProductInfo, index: number) => {
                    const priceField = order.paymentMethod === "pi" ? "piPrice" : order.paymentMethod === "usdc" ? "price" : "solPrice";
                    const price = item.product && item.product[priceField] !== undefined ? item.product[priceField] : 0;
                    const formattedPrice = price.toFixed(order.paymentMethod === "pi" || order.paymentMethod === "usdc" ? 2 : 6);

                    return (
                      <li key={index} className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-md bg-muted overflow-hidden border">
                          {item.product?.images?.[0]?.url ? (
                            <img src={item.product.images[0].url} alt={item.product.name || "Product"} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                              <ImageIcon className="w-6 h-6" />
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="font-semibold">{item.product?.name || "Unknown Product"}</p>
                          <p className="text-sm text-muted-foreground">
                            Quantity: {item.quantity} | Price: {formattedPrice} {order.paymentMethod.toUpperCase()}
                          </p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default OrdersPage;