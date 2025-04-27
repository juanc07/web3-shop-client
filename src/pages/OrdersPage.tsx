// src/pages/OrdersPage.tsx
import { useState, useEffect } from "react";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import { useWallet } from "@solana/wallet-adapter-react";
import { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { getAssociatedTokenAddress, createTransferInstruction, getAccount } from "@solana/spl-token";
import { Order, OrderProductInfo } from "../types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Image as ImageIcon } from "lucide-react";

const OrdersPage = () => {
  const { user } = useAuth();
  const { connected: walletConnected, publicKey, signTransaction } = useWallet();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const RECEIVER_PUBLIC_KEY = import.meta.env.VITE_WEBSITE_WALLET;
  const SOLANA_ENDPOINT = import.meta.env.VITE_SOLANA_ENDPOINT || "https://api.devnet.solana.com";
  const USDC_MINT_ADDRESS = "Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSdzGABd Bissett"; // Devnet USDC
  const PENDING_TIMEOUT_MINUTES = 5; // Allow retry after 5 minutes for pending orders

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

  const canRetryPayment = (order: Order) => {
    if (order.status !== "pending" && order.status !== "failed") return false;
    if (order.status === "failed") return true;
    // For pending orders, allow retry if no paymentSignature or after timeout
    if (!order.paymentSignature) return true;
    const createdAt = new Date(order.createdAt || Date.now());
    const minutesSinceCreation = (Date.now() - createdAt.getTime()) / 1000 / 60;
    return minutesSinceCreation >= PENDING_TIMEOUT_MINUTES;
  };

  const handleRetryPayment = async (order: Order) => {
    if (!user) {
      toast.error("Please log in to retry payment.", { id: "retry-login-error" });
      return;
    }
    if (!walletConnected || !publicKey || !signTransaction) {
      toast.error(`Please connect your Solana wallet for ${order.paymentMethod.toUpperCase()} payment.`, { id: "retry-wallet-error" });
      return;
    }

    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Authentication required");

      if (!RECEIVER_PUBLIC_KEY || typeof RECEIVER_PUBLIC_KEY !== "string") {
        throw new Error("SOLANA_PAYMENT_WALLET is invalid or undefined. Check your .env file.");
      }

      const connection = new Connection(SOLANA_ENDPOINT, "confirmed");
      let receiverPublicKey: PublicKey;
      try {
        receiverPublicKey = new PublicKey(RECEIVER_PUBLIC_KEY);
      } catch (error) {
        console.error("Invalid RECEIVER_PUBLIC_KEY:", error);
        throw new Error("Invalid Solana receiver public key in .env file.");
      }

      let signature: string;
      if (order.paymentMethod === "usdc") {
        console.log("Retrying USDC payment for order:", { orderId: order._id, total: order.total });
        const usdcMint = new PublicKey(USDC_MINT_ADDRESS);
        const usdcAmount = Math.round(order.total * 1_000_000); // USDC has 6 decimals

        const senderATA = await getAssociatedTokenAddress(usdcMint, publicKey);
        const receiverATA = await getAssociatedTokenAddress(usdcMint, receiverPublicKey);

        try {
          await getAccount(connection, receiverATA);
        } catch (error) {
          throw new Error("Receiver USDC account does not exist. Contact support.");
        }

        const transferTx = new Transaction().add(
          createTransferInstruction(senderATA, receiverATA, publicKey, usdcAmount)
        );

        const { blockhash } = await connection.getLatestBlockhash();
        transferTx.recentBlockhash = blockhash;
        transferTx.feePayer = publicKey;

        const signedTx = await signTransaction(transferTx);
        signature = await connection.sendRawTransaction(signedTx.serialize());
        console.log("Retry USDC payment sent:", { signature });

        await connection.confirmTransaction(signature, "confirmed");
        console.log("Retry USDC payment confirmed");
      } else if (order.paymentMethod === "solana") {
        console.log("Retrying Solana payment for order:", { orderId: order._id, total: order.total });
        const solAmount = order.total * LAMPORTS_PER_SOL;

        const transferTx = new Transaction().add(
          SystemProgram.transfer({
            fromPubkey: publicKey,
            toPubkey: receiverPublicKey,
            lamports: solAmount,
          })
        );

        const { blockhash } = await connection.getLatestBlockhash();
        transferTx.recentBlockhash = blockhash;
        transferTx.feePayer = publicKey;

        const signedTx = await signTransaction(transferTx);
        signature = await connection.sendRawTransaction(signedTx.serialize());
        console.log("Retry Solana payment sent:", { signature });

        await connection.confirmTransaction(signature, "confirmed");
        console.log("Retry Solana payment confirmed");
      } else if (order.paymentMethod === "pi") {
        throw new Error("Pi Network retry not implemented. Contact support or provide usePiNetwork.ts.");
      } else {
        throw new Error(`Unsupported payment method: ${order.paymentMethod}`);
      }

      // Verify the payment
      const verifyRes = await axios.post(
        `http://localhost:5000/api/payments/verify-${order.paymentMethod}`,
        { signature, orderId: order._id },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      console.log("Retry payment verified:", verifyRes.data);

      // Refresh orders
      const res = await axios.get("http://localhost:5000/api/orders", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setOrders(res.data);

      toast.success("Payment successful! Order updated.", { id: "retry-success" });
    } catch (err: any) {
      console.error("Retry payment error:", {
        message: err.message,
        response: axios.isAxiosError(err) ? err.response?.data : undefined,
      });
      let message = "Retry payment failed.";
      if (axios.isAxiosError(err)) message = err.response?.data?.error || err.message;
      toast.error(message, { id: "retry-error" });
    }
  };

  if (isLoading) return <div className="w-full px-4 py-6 text-center">Loading orders...</div>;
  if (error) return <div className="w-full px-4 py-6 text-center"><Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert></div>;

  return (
    <div className="w-full px-4 py-6 space-y-6">
      <h1 className="text-2xl sm:text-3xl font-bold text-center">Your Orders</h1>
      {orders.length === 0 ? (
        <p className="text-center text-muted-foreground">You have no orders.</p>
      ) : (
        <div className="space-y-6">
          {orders.map((order) => {
            const priceField = order.paymentMethod === "pi" ? "piPrice" : order.paymentMethod === "usdc" ? "price" : "solPrice";
            return (
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
                  {canRetryPayment(order) && (
                    <Button
                      className="mt-4"
                      onClick={() => handleRetryPayment(order)}
                      disabled={!walletConnected || !user}
                    >
                      Retry Payment
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default OrdersPage;