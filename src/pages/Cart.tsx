// src/pages/Cart.tsx
import { useEffect, useState } from "react";
import axios from "axios";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import { useWallet } from "@solana/wallet-adapter-react";
import { useNavigate } from "react-router-dom";
import { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { getAssociatedTokenAddress, createTransferInstruction, getAccount } from "@solana/spl-token";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { Trash2, Image as ImageIcon } from "lucide-react";
import { CartItem } from "../types";
import { usePiNetwork } from "../hooks/usePiNetwork";

const RECEIVER_PUBLIC_KEY = import.meta.env.VITE_WEBSITE_WALLET;
const SOLANA_ENDPOINT = import.meta.env.VITE_SOLANA_ENDPOINT || "https://api.devnet.solana.com";
const USDC_MINT_ADDRESS = "Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSdzGABd Bissett"; // Devnet USDC

const Cart = () => {
  const { user } = useAuth();
  const { cart, clearCart } = useCart();
  const { connected: walletConnected, publicKey, signTransaction } = useWallet();
  const navigate = useNavigate();
  const [backendCart, setBackendCart] = useState<CartItem[]>(cart);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"usdc" | "solana" | "pi" | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showFailureDialog, setShowFailureDialog] = useState(false);
  const [serverError, setServerError] = useState<string>("");

  const total = backendCart.reduce((sum, item) => {
    const price = paymentMethod === "pi" ? item.piPrice : paymentMethod === "usdc" ? item.price : item.solPrice;
    return sum + price * item.quantity;
  }, 0);

  useEffect(() => {
    if (!user) {
      setFetchError("Please connect a wallet to view your cart.");
      setIsLoading(false);
      return;
    }

    const fetchCart = async () => {
      setIsLoading(true);
      setFetchError(null);
      try {
        const token = localStorage.getItem("token");
        if (!token) throw new Error("Authentication required");
        const res = await axios.get("http://localhost:5000/api/cart", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setBackendCart(
          res.data.items.map((item: any) => ({
            productId: item.product._id,
            name: item.product.name,
            price: item.product.price,
            solPrice: item.product.solPrice,
            piPrice: item.product.piPrice,
            quantity: item.quantity,
            imageUrl: item.product.images?.[0]?.url,
          }))
        );
      } catch (error) {
        console.error("Error fetching cart:", error);
        let message = "Failed to load cart.";
        if (axios.isAxiosError(error)) message = error.response?.data?.message || error.message;
        setFetchError(message);
        toast.error(message, { id: "cart-fetch-error" });
      } finally {
        setIsLoading(false);
      }
    };

    fetchCart();
  }, [user]);

  const handleRemoveFromCart = async (productId: string) => {
    if (!user) {
      toast.error("Please connect a wallet.", { id: "cart-remove-error" });
      return;
    }

    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Authentication required");
      await axios.delete(`http://localhost:5000/api/cart/remove/${productId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setBackendCart((prev) => prev.filter((item) => item.productId !== productId));
      toast.success("Item removed from cart.", { id: "cart-remove-success" });
    } catch (error) {
      console.error("Error removing from cart:", error);
      toast.error("Failed to remove item from cart.", { id: "cart-remove-error" });
    }
  };

  const handleCheckout = async () => {
    if (!user) {
      toast.error("Please connect a wallet to proceed with checkout.", { id: "checkout-user-error" });
      navigate("/login");
      return;
    }
    if (!paymentMethod) {
      toast.error("Please select a payment method.", { id: "checkout-payment-error" });
      return;
    }
    if (backendCart.length === 0) {
      toast.error("Your cart is empty.", { id: "checkout-empty-error" });
      return;
    }

    setIsProcessing(true);
    setServerError("");
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Authentication required");

      console.log("Checkout: Creating order...", { paymentMethod, total, cartItems: backendCart });

      const orderRes = await axios.post(
        "http://localhost:5000/api/orders",
        {
          products: backendCart.map((item) => ({ product: item.productId, quantity: item.quantity })),
          total,
          paymentMethod,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const orderId = orderRes.data._id;
      console.log("Checkout: Order created", { orderId });

      if (paymentMethod === "usdc" || paymentMethod === "solana") {
        if (!walletConnected || !publicKey || !signTransaction) {
          toast.error(`Please connect your Solana wallet for ${paymentMethod.toUpperCase()} payment.`, { id: "checkout-wallet-error" });
          navigate("/connect-wallet");
          return;
        }

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

        if (paymentMethod === "usdc") {
          console.log("Checkout: Preparing USDC transaction", { total });
          const usdcMint = new PublicKey(USDC_MINT_ADDRESS);
          const usdcAmount = Math.round(total * 1_000_000); // USDC has 6 decimals

          const senderATA = await getAssociatedTokenAddress(usdcMint, publicKey);
          const receiverATA = await getAssociatedTokenAddress(usdcMint, receiverPublicKey);

          // Check if receiver ATA exists (optional, assume merchant has it)
          try {
            await getAccount(connection, receiverATA);
          } catch (error) {
            throw new Error("Receiver USDC account does not exist. Contact support.");
          }

          const transferTx = new Transaction().add(
            createTransferInstruction(
              senderATA,
              receiverATA,
              publicKey,
              usdcAmount
            )
          );

          const { blockhash } = await connection.getLatestBlockhash();
          transferTx.recentBlockhash = blockhash;
          transferTx.feePayer = publicKey;

          const signedTx = await signTransaction(transferTx);
          const signature = await connection.sendRawTransaction(signedTx.serialize());
          console.log("Checkout: USDC transaction sent", { signature });

          await connection.confirmTransaction(signature, "confirmed");
          console.log("Checkout: USDC transaction confirmed");

          const verifyRes = await axios.post(
            "http://localhost:5000/api/payments/verify-usdc",
            { signature, orderId },
            { headers: { Authorization: `Bearer ${token}` } }
          );
          console.log("Checkout: USDC payment verified", verifyRes.data);

          clearCart();
          setBackendCart([]);
          toast.success("Payment successful! Order placed.", { id: "checkout-success" });
        } else if (paymentMethod === "solana") {
          console.log("Checkout: Preparing Solana transaction", { total });
          const solAmount = total * LAMPORTS_PER_SOL;

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
          const signature = await connection.sendRawTransaction(signedTx.serialize());
          console.log("Checkout: Solana transaction sent", { signature });

          await connection.confirmTransaction(signature, "confirmed");
          console.log("Checkout: Solana transaction confirmed");

          const verifyRes = await axios.post(
            "http://localhost:5000/api/payments/verify-solana",
            { signature, orderId },
            { headers: { Authorization: `Bearer ${token}` } }
          );
          console.log("Checkout: Solana payment verified", verifyRes.data);

          clearCart();
          setBackendCart([]);
          toast.success("Payment successful! Order placed.", { id: "checkout-success" });
        }
      } else if (paymentMethod === "pi") {
        console.log("Checkout: Preparing Pi Network payment", { total });
        const { initPi, payWithPi } = usePiNetwork();
        if (!user.piWallet) {
          const initialized = await initPi();
          if (!initialized) throw new Error("Pi Network initialization failed");
          console.log("Checkout: Pi Network initialized");
        }
        const payment = await payWithPi(total, "Web3 Shop Purchase", orderId);
        console.log("Checkout: Pi Network payment created", { paymentId: payment.identifier });

        const verifyRes = await axios.post(
          "http://localhost:5000/api/payments/verify-pi",
          { paymentId: payment.identifier, orderId },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        console.log("Checkout: Pi payment verified", verifyRes.data);

        clearCart();
        setBackendCart([]);
        toast.success("Payment successful! Order placed.", { id: "checkout-success" });
      }
    } catch (err: any) {
      console.error("Checkout error:", {
        message: err.message,
        code: err.code,
        response: axios.isAxiosError(err) ? err.response?.data : undefined,
        stack: err.stack,
      });
      let message = "Checkout failed.";
      if (axios.isAxiosError(err)) {
        message = err.response?.data?.message || err.message || message;
        console.log("Checkout: Axios error details", { status: err.response?.status, data: err.response?.data });
      } else if (err.message.includes("User rejected the request") || err.code === 4001) {
        message = "You canceled the transaction. Please try again.";
        toast.error("Transaction Canceled", {
          description: message,
          duration: 3000,
          id: "checkout-cancel-error",
        });
        setIsProcessing(false);
        return;
      }
      setServerError(message);
      setShowFailureDialog(true);
      toast.error("Checkout Failed", {
        description: message,
        duration: 3000,
        id: "checkout-error",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const closeFailureDialog = () => {
    setShowFailureDialog(false);
    setServerError("");
  };

  if (isLoading) return <div className="w-full px-4 py-6 text-center">Loading cart...</div>;
  if (fetchError) return <div className="w-full px-4 py-6 text-center"><Alert variant="destructive"><AlertDescription>{fetchError}</AlertDescription></Alert></div>;

  return (
    <div className="w-full px-4 py-6 space-y-6">
      <h1 className="text-2xl sm:text-3xl font-bold text-center">Your Cart</h1>
      {backendCart.length === 0 ? (
        <p className="text-center text-muted-foreground">Your cart is empty.</p>
      ) : (
        <Card className="bg-card-light dark:bg-card-dark shadow-lg border border-border w-full max-w-4xl mx-auto">
          <CardHeader>
            <CardTitle className="text-lg sm:text-xl">Cart Items</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-4">
              {backendCart.map((item) => (
                <li
                  key={item.productId}
                  className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b pb-4"
                >
                  <div className="flex items-center gap-4 w-full sm:w-auto">
                    <div className="w-16 h-16 rounded-md bg-muted flex-shrink-0 overflow-hidden border">
                      {item.imageUrl ? (
                        <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                          <ImageIcon className="w-6 h-6" />
                        </div>
                      )}
                    </div>
                    <div className="flex-grow min-w-0">
                      <p className="font-semibold text-sm sm:text-base truncate">{item.name}</p>
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        {paymentMethod === "pi" ? `${item.piPrice.toFixed(2)} Pi` : paymentMethod === "usdc" ? `${item.price.toFixed(2)} USDC` : `${item.solPrice.toFixed(6)} SOL`} x {item.quantity} = {(paymentMethod === "pi" ? (item.piPrice * item.quantity).toFixed(2) : paymentMethod === "usdc" ? (item.price * item.quantity).toFixed(2) : (item.solPrice * item.quantity).toFixed(6))} {paymentMethod === "pi" ? "Pi" : paymentMethod === "usdc" ? "USDC" : "SOL"}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleRemoveFromCart(item.productId)}
                    disabled={isProcessing}
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    Remove
                  </Button>
                </li>
              ))}
            </ul>
            <div className="mt-6 space-y-4">
              <p className="text-lg font-bold">
                Total: {total.toFixed(paymentMethod === "pi" || paymentMethod === "usdc" ? 2 : 6)} {paymentMethod === "pi" ? "Pi" : paymentMethod === "usdc" ? "USDC" : "SOL"}
              </p>
              <div className="space-y-2">
                <label className="text-sm font-medium">Select Payment Method:</label>
                <Select value={paymentMethod || ""} onValueChange={(value) => setPaymentMethod(value as "usdc" | "solana" | "pi")}>
                  <SelectTrigger className="w-full sm:w-[200px]">
                    <SelectValue placeholder="Choose payment method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="usdc">USDC</SelectItem>
                    <SelectItem value="solana">Solana</SelectItem>
                    <SelectItem value="pi">Pi Network</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                className="w-full sm:w-auto"
                onClick={handleCheckout}
                disabled={isProcessing || !paymentMethod || backendCart.length === 0}
              >
                {isProcessing ? "Processing..." : "Checkout"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {showFailureDialog && (
        <div
          style={{ backgroundColor: "rgba(0, 0, 0, 0.65)" }}
          className="fixed inset-0 flex items-center justify-center z-50"
        >
          <div className="bg-[#222128] p-6 rounded-lg shadow-lg border border-[#494848] w-full max-w-md">
            <h3 className="text-xl font-bold mb-4 text-red-500">Checkout Failed</h3>
            <p className="text-gray-300 mb-6">{serverError}</p>
            <div className="flex justify-end">
              <Button
                onClick={closeFailureDialog}
                className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Cart;