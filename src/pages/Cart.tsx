import { useEffect, useState } from "react";
import axios from "axios";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import { useWallet } from "@solana/wallet-adapter-react";
import { useNavigate } from "react-router-dom";
import { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from "@solana/web3.js";
// Import the specific error if you want type safety, otherwise checking name/message is fine
// import { TokenAccountNotFoundError, getAssociatedTokenAddress, createTransferInstruction, getAccount } from "@solana/spl-token";
import { getAssociatedTokenAddress, createTransferInstruction, getAccount } from "@solana/spl-token";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { Trash2, Image as ImageIcon } from "lucide-react";
import { CartItem } from "../types";
import { usePiNetwork } from "../hooks/usePiNetwork"; // Ensure this hook is correctly implemented

const RECEIVER_PUBLIC_KEY = import.meta.env.VITE_WEBSITE_WALLET;
const SOLANA_ENDPOINT = import.meta.env.VITE_SOLANA_ENDPOINT || "https://api.devnet.solana.com";
const USDC_MINT_ADDRESS = import.meta.env.VITE_USDC_MINT_ADDRESS || "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU"; // Devnet USDC

const Cart = () => {
  const { user } = useAuth();
  const { cart, clearCart } = useCart(); // Assuming cart from context might be initial state, backendCart holds fetched state
  const { connected: walletConnected, publicKey, signTransaction } = useWallet();
  const navigate = useNavigate();
  const [backendCart, setBackendCart] = useState<CartItem[]>(cart); // Initialize with context cart potentially
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"usdc" | "solana" | "pi" | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showFailureDialog, setShowFailureDialog] = useState(false);
  const [serverError, setServerError] = useState<string>("");

  // Note: usePiNetwork hook usage was inside handleCheckout, which is not standard React hook usage.
  // It's better to call hooks at the top level. Let's assume usePiNetwork returns methods.
  const { initPi, payWithPi } = usePiNetwork();

  const total = backendCart.reduce((sum, item) => {
    // Ensure price properties exist and are numbers
    const price = paymentMethod === "pi" ? (item.piPrice || 0) :
                  paymentMethod === "usdc" ? (item.price || 0) :
                  (item.solPrice || 0);
    const quantity = item.quantity || 0;
    return sum + price * quantity;
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
        // Ensure API endpoint is correct
        const res = await axios.get("http://localhost:5000/api/cart", {
          headers: { Authorization: `Bearer ${token}` },
        });
        // Robust mapping: handle potentially missing fields
        setBackendCart(
          res.data.items?.map((item: any) => ({
            productId: item.product?._id ?? 'unknown',
            name: item.product?.name ?? 'Unknown Product',
            price: item.product?.price ?? 0, // Default to 0 if missing
            solPrice: item.product?.solPrice ?? 0, // Default to 0
            piPrice: item.product?.piPrice ?? 0, // Default to 0
            quantity: item?.quantity ?? 0, // Default to 0
            imageUrl: item.product?.images?.[0]?.url,
          })) ?? [] // Default to empty array if items is missing
        );
      } catch (error) {
        console.error("Error fetching cart:", error);
        let message = "Failed to load cart.";
        if (axios.isAxiosError(error) && error.response) {
             message = error.response.data?.message || error.message;
             if (error.response.status === 401) {
                 message = "Authentication error. Please log in again.";
                 // Optionally clear token and redirect
                 // localStorage.removeItem("token");
                 // navigate("/login");
             }
        } else if (error instanceof Error) {
             message = error.message;
        }
        setFetchError(message);
        toast.error(message, { id: "cart-fetch-error" });
      } finally {
        setIsLoading(false);
      }
    };

    fetchCart();
  }, [user, navigate]); // Added navigate to dependency array if used in error handling

  const handleRemoveFromCart = async (productId: string) => {
    if (!user) {
      toast.error("Please connect a wallet.", { id: "cart-remove-error" });
      return;
    }

    // Optimistic UI update (optional but good UX)
    const originalCart = [...backendCart];
    setBackendCart((prev) => prev.filter((item) => item.productId !== productId));

    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Authentication required");
      await axios.delete(`http://localhost:5000/api/cart/remove/${productId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      // No need to set state again if optimistic update was successful
      toast.success("Item removed from cart.", { id: "cart-remove-success" });
    } catch (error) {
      // Revert optimistic update on error
      setBackendCart(originalCart);
      console.error("Error removing from cart:", error);
      let message = "Failed to remove item from cart.";
       if (axios.isAxiosError(error) && error.response) {
           message = error.response.data?.message || error.message;
       } else if (error instanceof Error) {
           message = error.message;
       }
      toast.error(message, { id: "cart-remove-error" });
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
     if (total <= 0 && backendCart.length > 0) {
         console.warn("Checkout attempted with zero or negative total for non-empty cart.", { total, backendCart });
         toast.error("Cannot checkout with zero total.", { id: "checkout-zero-total" });
         return;
     }

    setIsProcessing(true);
    setServerError("");
    let orderId = null; // Keep track of order ID for potential cleanup/logging

    try {
      const token = localStorage.getItem("token");
      if (!token) {
          navigate("/login"); // Redirect if no token
          throw new Error("Authentication required. Please log in.");
      }

      console.log("Checkout: Creating order...", { paymentMethod, total, cartItems: backendCart });

      // --- 1. Create Order in Backend ---
      const orderRes = await axios.post(
        "http://localhost:5000/api/orders",
        {
          products: backendCart.map((item) => ({ product: item.productId, quantity: item.quantity })),
          total, // Ensure total is calculated correctly based on selected payment method
          paymentMethod,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      orderId = orderRes.data?._id; // Use optional chaining
      if (!orderId) {
          throw new Error("Failed to create order ID from backend response.");
      }
      console.log("Checkout: Order created", { orderId });

      // --- 2. Process Payment ---
      if (paymentMethod === "usdc" || paymentMethod === "solana") {
        // Check Solana Wallet Connection
        if (!walletConnected || !publicKey || !signTransaction) {
          toast.error(`Please connect your Solana wallet for ${paymentMethod.toUpperCase()} payment.`, { id: "checkout-wallet-error" });
          // Don't navigate away immediately, let user connect
          // navigate("/connect-wallet");
          throw new Error("Solana wallet not connected or signTransaction not available.");
        }

        // Validate Receiver Public Key
        if (!RECEIVER_PUBLIC_KEY || typeof RECEIVER_PUBLIC_KEY !== "string") {
          console.error("Missing or invalid VITE_WEBSITE_WALLET environment variable.");
          throw new Error("Store's payment address is not configured correctly. Please contact support.");
        }

        const connection = new Connection(SOLANA_ENDPOINT, "confirmed");
        let receiverPublicKey: PublicKey;
        try {
          receiverPublicKey = new PublicKey(RECEIVER_PUBLIC_KEY);
        } catch (error) {
          console.error("Invalid RECEIVER_PUBLIC_KEY format:", RECEIVER_PUBLIC_KEY, error);
          throw new Error("Store's payment address format is invalid. Please contact support.");
        }

        // --- USDC Specific Logic ---
        if (paymentMethod === "usdc") {
          console.log(`Checkout: Preparing USDC transaction for ${total} USDC`);
          let usdcMint: PublicKey;
          try {
            usdcMint = new PublicKey(USDC_MINT_ADDRESS);
          } catch (error) {
            console.error("Invalid USDC_MINT_ADDRESS:", USDC_MINT_ADDRESS, error);
            throw new Error("USDC configuration error. Please contact support.");
          }

          // Ensure total is positive before converting
          if (total <= 0) {
              throw new Error("Cannot process USDC payment for zero or negative amount.");
          }
          const usdcAmount = BigInt(Math.round(total * 1_000_000)); // Use BigInt for token amounts

          const senderATA = await getAssociatedTokenAddress(usdcMint, publicKey);
          const receiverATA = await getAssociatedTokenAddress(usdcMint, receiverPublicKey);
          console.log("Derived Sender ATA:", senderATA.toBase58());
          console.log("Derived Receiver ATA:", receiverATA.toBase58());

          // Check if receiver ATA exists (Important for robustness)
          try {
            const receiverAccountInfo = await getAccount(connection, receiverATA);
            console.log("Receiver ATA exists:", receiverAccountInfo.address.toBase58());
          } catch (error: any) {
            // Log detailed error but provide generic message to user
            console.error("Error checking receiver ATA:", {
                receiverATA: receiverATA.toBase58(),
                errorName: error.name,
                errorMessage: error.message,
            });
            // It's unlikely the receiver ATA won't exist if configured correctly, but good to check
            if (error.name === 'TokenAccountNotFoundError') {
                 throw new Error(`Store's USDC account (${receiverATA.toBase58()}) not found on ${SOLANA_ENDPOINT.includes('devnet') ? 'Devnet' : 'Mainnet'}. Please contact support.`);
            } else {
                 throw new Error(`Error verifying store's USDC account. Please contact support. Details: ${error.message}`);
            }
          }

          // *** FIXED PART: Check Sender ATA and Balance ***
          let senderAccount; // Declare outside the try block
          try {
              console.log("Checking Sender ATA:", senderATA.toBase58());
              senderAccount = await getAccount(connection, senderATA); // Fetch sender's token account
              console.log(`Sender ATA check successful. Balance: ${(Number(senderAccount.amount) / 1_000_000).toFixed(6)} USDC`);

          } catch (error: any) {
              console.error("Sender ATA check failed:", {
                  senderATA: senderATA.toBase58(),
                  publicKey: publicKey.toBase58(),
                  errorName: error.name,
                  errorMessage: error.message,
              });
              // Check if the specific error is TokenAccountNotFoundError
              if (error.name === 'TokenAccountNotFoundError' || error.message?.includes('Account not found')) {
                   // Provide a user-friendly error message
                   throw new Error(`Your wallet (${publicKey.toBase58()}) doesn't have a USDC account on ${SOLANA_ENDPOINT.includes('devnet') ? 'Devnet' : 'Mainnet'}. You might need to receive some USDC first to create it.`);
              } else {
                   // Handle other potential errors during account fetching
                   throw new Error(`Failed to fetch your USDC account information: ${error.message}`);
              }
          }

          // Now, check the balance using the successfully fetched senderAccount
          if (senderAccount.amount < usdcAmount) {
            const required = total.toFixed(2);
            const available = (Number(senderAccount.amount) / 1_000_000).toFixed(6);
            throw new Error(`Insufficient USDC balance. Required: ${required} USDC, Available: ${available} USDC.`);
          }
          // *** END OF FIXED PART ***

          // Create USDC Transfer Transaction
          const transferTx = new Transaction().add(
            createTransferInstruction(
              senderATA,       // Source account (sender's ATA)
              receiverATA,     // Destination account (receiver's ATA)
              publicKey,       // Owner of the source account (sender's wallet)
              usdcAmount       // Amount in smallest units (BigInt)
            )
          );

          // Get recent blockhash and set fee payer
          const { blockhash } = await connection.getLatestBlockhash("confirmed");
          transferTx.recentBlockhash = blockhash;
          transferTx.feePayer = publicKey;

          // Sign and send the transaction
          console.log("Requesting transaction signature from wallet...");
          const signedTx = await signTransaction(transferTx);
          console.log("Sending signed USDC transaction...");
          const signature = await connection.sendRawTransaction(signedTx.serialize());
          console.log("Checkout: USDC transaction sent", { signature });

          // Confirm the transaction
          console.log("Confirming USDC transaction...");
          await connection.confirmTransaction({
              signature,
              blockhash, // Use the same blockhash fetched earlier
              lastValidBlockHeight: (await connection.getLatestBlockhash("confirmed")).lastValidBlockHeight // Fetch the latest valid block height for confirmation
          }, "confirmed");
          console.log("Checkout: USDC transaction confirmed", { signature });

          // Verify payment on the backend
          console.log("Verifying USDC payment with backend...");
          const verifyRes = await axios.post(
            "http://localhost:5000/api/payments/verify-usdc",
            { signature, orderId },
            { headers: { Authorization: `Bearer ${token}` } }
          );
          console.log("Checkout: USDC payment verified by backend", verifyRes.data);

          // --- Post-Payment Success ---
          clearCart(); // Clear context cart
          setBackendCart([]); // Clear local cart state
          toast.success("Payment successful! Order placed.", { id: "checkout-success", duration: 5000 });

        } else if (paymentMethod === "solana") {
          // --- SOL Specific Logic ---
          console.log(`Checkout: Preparing SOL transaction for ${total} SOL`);

           // Ensure total is positive
          if (total <= 0) {
             throw new Error("Cannot process SOL payment for zero or negative amount.");
          }
          const solAmountLamports = BigInt(Math.round(total * LAMPORTS_PER_SOL));

          // Check sender's SOL balance (optional but recommended)
          const senderSolBalance = await connection.getBalance(publicKey, "confirmed");
           if (senderSolBalance < solAmountLamports) {
                // Consider adding a buffer for transaction fees
                const requiredSol = total.toFixed(9);
                const availableSol = (senderSolBalance / LAMPORTS_PER_SOL).toFixed(9);
               throw new Error(`Insufficient SOL balance. Required: ~${requiredSol} SOL (+ fee), Available: ${availableSol} SOL.`);
           }

          // Create SOL Transfer Transaction
          const transferTx = new Transaction().add(
            SystemProgram.transfer({
              fromPubkey: publicKey,
              toPubkey: receiverPublicKey,
              lamports: solAmountLamports, // Use BigInt
            })
          );

          // Get recent blockhash and set fee payer
          const { blockhash } = await connection.getLatestBlockhash("confirmed");
          transferTx.recentBlockhash = blockhash;
          transferTx.feePayer = publicKey;

          // Sign and send the transaction
          console.log("Requesting transaction signature from wallet...");
          const signedTx = await signTransaction(transferTx);
          console.log("Sending signed SOL transaction...");
          const signature = await connection.sendRawTransaction(signedTx.serialize());
          console.log("Checkout: Solana transaction sent", { signature });

          // Confirm the transaction
           console.log("Confirming SOL transaction...");
           await connection.confirmTransaction({
               signature,
               blockhash,
               lastValidBlockHeight: (await connection.getLatestBlockhash("confirmed")).lastValidBlockHeight
           }, "confirmed");
          console.log("Checkout: Solana transaction confirmed", { signature });

          // Verify payment on the backend
          console.log("Verifying SOL payment with backend...");
          const verifyRes = await axios.post(
            "http://localhost:5000/api/payments/verify-solana",
            { signature, orderId },
            { headers: { Authorization: `Bearer ${token}` } }
          );
          console.log("Checkout: Solana payment verified by backend", verifyRes.data);

          // --- Post-Payment Success ---
          clearCart();
          setBackendCart([]);
          toast.success("Payment successful! Order placed.", { id: "checkout-success", duration: 5000 });
        }
      } else if (paymentMethod === "pi") {
        // --- Pi Network Specific Logic ---
        console.log(`Checkout: Preparing Pi Network payment for ${total} Pi`);
        if (!initPi || !payWithPi) {
             throw new Error("Pi Network functions are not available. Check usePiNetwork hook.");
        }

        // Pi SDK initialization might be needed earlier or handled within the hook
        // const initialized = await initPi(); // Assuming initPi is handled appropriately
        // if (!initialized) throw new Error("Pi Network initialization failed");
        // console.log("Checkout: Pi Network initialized");

        // Ensure total is positive
        if (total <= 0) {
            throw new Error("Cannot process Pi payment for zero or negative amount.");
        }

        // Initiate Pi Payment
        const payment = await payWithPi(total, `Order #${orderId}`, orderId); // Pass orderId as memo or identifier if possible
        if (!payment || !payment.identifier) {
            throw new Error("Pi payment initiation failed or did not return an identifier.");
        }
        console.log("Checkout: Pi Network payment created", { paymentId: payment.identifier });

        // Verify payment on the backend
        console.log("Verifying Pi payment with backend...");
        const verifyRes = await axios.post(
          "http://localhost:5000/api/payments/verify-pi",
          { paymentId: payment.identifier, orderId },
          { headers: { Authorization: `Bearer ${token}` } }
        );
         // Check backend response for success
        if (!verifyRes.data?.success) { // Assuming backend returns { success: true, ... } on verification
            throw new Error(verifyRes.data?.message || "Pi payment verification failed on backend.");
        }
        console.log("Checkout: Pi payment verified by backend", verifyRes.data);

        // --- Post-Payment Success ---
        clearCart();
        setBackendCart([]);
        toast.success("Payment successful! Order placed.", { id: "checkout-success", duration: 5000 });

      } else {
          // Should not happen if validation is correct, but good failsafe
          throw new Error("Invalid payment method selected.");
      }

    } catch (err: any) {
      // --- Comprehensive Error Handling ---
      console.error("Checkout error:", {
        orderId: orderId, // Log orderId if available
        paymentMethod: paymentMethod,
        message: err.message,
        code: err.code, // Wallet error codes (e.g., 4001 for rejection)
        name: err.name, // Specific error types (e.g., TokenAccountNotFoundError)
        response: axios.isAxiosError(err) ? err.response?.data : undefined,
        stack: err.stack,
      });

      let displayMessage = "Checkout failed. Please try again."; // Default message

      if (axios.isAxiosError(err)) {
        // Backend or network errors
        displayMessage = err.response?.data?.message || err.message || displayMessage;
        console.log("Checkout: Axios error details", { status: err.response?.status, data: err.response?.data });
        if (err.response?.status === 401) {
            displayMessage = "Authentication failed. Please log in again.";
            navigate("/login");
        }
      } else if (err.message?.includes("User rejected the request") || err.code === 4001) {
        // Wallet transaction rejection
        displayMessage = "You canceled the transaction in your wallet.";
        toast.info("Transaction Canceled", { // Use info or warning instead of error
          description: displayMessage,
          duration: 4000,
          id: "checkout-cancel",
        });
        // Don't show the failure dialog for user cancellations
        setIsProcessing(false); // Ensure processing state is reset
        return; // Exit without showing the generic failure dialog
      } else if (err instanceof Error) {
          // Specific errors thrown in the code (like insufficient balance, ATA checks, config errors)
          displayMessage = err.message; // Use the specific error message thrown
      }
      // If it's any other error, use the default or err.message

      setServerError(displayMessage); // Set message for the dialog
      setShowFailureDialog(true); // Show the failure dialog
      toast.error("Checkout Failed", { // Show toast notification
        description: displayMessage,
        duration: 5000, // Longer duration for errors
        id: "checkout-error",
      });

      // Optional: Add logic here to potentially cancel the order on the backend if payment failed after order creation
      // if (orderId) {
      //   console.log(`Attempting to cancel order ${orderId} due to payment failure...`);
      //   // await axios.post(`http://localhost:5000/api/orders/${orderId}/cancel`, ...);
      // }

    } finally {
      setIsProcessing(false); // Ensure loading state is always turned off
    }
  };

  const closeFailureDialog = () => {
    setShowFailureDialog(false);
    setServerError("");
  };

  // --- Render Logic ---
  if (isLoading) return <div className="w-full px-4 py-6 text-center">Loading cart...</div>;

  // Display fetch error prominently if it exists
  if (fetchError) return (
      <div className="w-full px-4 py-6 text-center">
          <Alert variant="destructive" className="max-w-md mx-auto">
              <AlertDescription>{fetchError}</AlertDescription>
          </Alert>
      </div>
  );

  // Determine current currency symbol based on selected method
  const currencySymbol = paymentMethod === "pi" ? "Pi" : paymentMethod === "usdc" ? "USDC" : "SOL";
  const totalDecimals = paymentMethod === "solana" ? 6 : 2; // SOL usually needs more decimals

  return (
    <div className="w-full px-4 py-6 space-y-6">
      <h1 className="text-2xl sm:text-3xl font-bold text-center mb-6">Your Cart</h1>
      {backendCart.length === 0 ? (
        <p className="text-center text-muted-foreground">Your cart is empty. Add some items from the shop!</p>
      ) : (
        <Card className="bg-card-light dark:bg-card-dark shadow-lg border border-border w-full max-w-4xl mx-auto">
          <CardHeader>
            <CardTitle className="text-lg sm:text-xl">Cart Items</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-4 mb-6">
              {backendCart.map((item) => {
                // Calculate item price based on selected method for display
                 const displayPrice = paymentMethod === "pi" ? item.piPrice : paymentMethod === "usdc" ? item.price : item.solPrice;
                 const itemTotal = (displayPrice || 0) * (item.quantity || 0);

                 return (
                    <li
                      key={item.productId}
                      className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b pb-4 last:border-b-0"
                    >
                      <div className="flex items-center gap-4 w-full sm:w-auto flex-grow">
                        <div className="w-16 h-16 rounded-md bg-muted flex-shrink-0 overflow-hidden border">
                          {item.imageUrl ? (
                            <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                              <ImageIcon className="w-8 h-8" />
                            </div>
                          )}
                        </div>
                        <div className="flex-grow min-w-0 mr-2">
                          <p className="font-semibold text-sm sm:text-base truncate" title={item.name}>{item.name}</p>
                          <p className="text-xs sm:text-sm text-muted-foreground">
                           {/* Show individual price and quantity */}
                            {(displayPrice || 0).toFixed(totalDecimals)} {currencySymbol} x {item.quantity || 0}
                          </p>
                          <p className="text-sm font-medium sm:hidden"> {/* Show total on small screens */}
                              Total: {itemTotal.toFixed(totalDecimals)} {currencySymbol}
                          </p>
                        </div>
                      </div>
                       <div className="flex items-center gap-4 w-full sm:w-auto justify-between">
                           <p className="text-sm font-medium hidden sm:block min-w-[100px] text-right"> {/* Show total on larger screens */}
                               {itemTotal.toFixed(totalDecimals)} {currencySymbol}
                           </p>
                           <Button
                             variant="destructive"
                             size="sm"
                             onClick={() => handleRemoveFromCart(item.productId)}
                             disabled={isProcessing}
                           >
                             <Trash2 className="w-4 h-4 sm:mr-1" />
                             <span className="hidden sm:inline">Remove</span>
                           </Button>
                       </div>
                    </li>
                 );
              })}
            </ul>
            <div className="mt-6 pt-6 border-t space-y-4">
              <div className="flex justify-between items-center">
                  <span className="text-lg font-medium">Subtotal:</span>
                  <span className="text-lg font-bold">
                    {total.toFixed(totalDecimals)} {currencySymbol}
                  </span>
              </div>

               {/* Add more details like fees or discounts if applicable */}

              <div className="space-y-2">
                <label htmlFor="paymentMethodSelect" className="text-sm font-medium block mb-1">Select Payment Method:</label>
                <Select
                  value={paymentMethod || ""}
                  onValueChange={(value) => setPaymentMethod(value as "usdc" | "solana" | "pi")}
                  disabled={isProcessing}
                >
                  <SelectTrigger id="paymentMethodSelect" className="w-full sm:w-[250px]">
                    <SelectValue placeholder="Choose payment method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="usdc">USDC (Solana Network)</SelectItem>
                    <SelectItem value="solana">SOL (Solana Network)</SelectItem>
                    <SelectItem value="pi">Pi (Pi Network)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                className="w-full sm:w-auto text-base py-3 px-6" // Make button more prominent
                onClick={handleCheckout}
                disabled={isProcessing || !paymentMethod || backendCart.length === 0 || total <= 0}
              >
                {isProcessing ? "Processing Payment..." : `Checkout with ${currencySymbol}`}
              </Button>
               {/* Display wallet connection status if applicable */}
                {(paymentMethod === 'solana' || paymentMethod === 'usdc') && !walletConnected && (
                   <p className="text-sm text-yellow-600 dark:text-yellow-400 mt-2">Please connect your Solana wallet to pay with {currencySymbol}.</p>
                )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Failure Dialog */}
      {showFailureDialog && (
        <div
          // Use Tailwind for background opacity
          className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-65 backdrop-blur-sm"
          onClick={closeFailureDialog} // Close on backdrop click
        >
          <div
            // Use theme colors
            className="bg-background p-6 rounded-lg shadow-xl border border-border w-full max-w-md mx-4"
            onClick={(e) => e.stopPropagation()} // Prevent dialog close when clicking inside
          >
            <h3 className="text-xl font-bold mb-4 text-destructive">Checkout Failed</h3>
            <p className="text-muted-foreground mb-6">{serverError || "An unexpected error occurred."}</p>
            <div className="flex justify-end">
              <Button
                variant="outline" // Use standard button variants
                onClick={closeFailureDialog}
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