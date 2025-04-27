// src/hooks/usePiNetwork.ts
import { useState } from "react";
import { toast } from "sonner";
import { useAuth } from "../context/AuthContext";

interface PiNetworkSDK {
  init: (options: { version: string; sandbox: boolean }) => void;
  createPayment: (options: {
    amount: number;
    memo: string;
    metadata: { orderId: string };
  }) => Promise<any>;
  authenticate: (scopes: string[], onIncompletePaymentFound: (payment: any) => void) => Promise<{
    accessToken: string;
    user: { uid: string; username?: string };
  }>;
}

export const usePiNetwork = () => {
  const [pi, setPi] = useState<PiNetworkSDK | null>(null);
  const { registerWithPi } = useAuth();

  const initPi = async (): Promise<boolean> => {
    try {
      const Pi = (window as any).Pi as PiNetworkSDK;
      if (!Pi) {
        toast.error("Pi Network SDK not available. Ensure you're in the Pi Browser.");
        return false;
      }

      Pi.init({ version: "2.0", sandbox: import.meta.env.VITE_NODE_ENV !== "production" });
      setPi(Pi);

      const authResult = await Pi.authenticate(
        ["username", "payments"],
        (payment) => console.log("Incomplete payment found:", payment)
      );
      const piWallet = authResult.user.uid;
      await registerWithPi(piWallet);
      return true;
    } catch (error) {
      console.error("Pi Network initialization error:", error);
      toast.error("Failed to initialize Pi Network.");
      return false;
    }
  };

  const payWithPi = async (amount: number, memo: string, orderId: string) => {
    if (!pi) throw new Error("Pi Network not initialized");
    try {
      const payment = await pi.createPayment({
        amount,
        memo,
        metadata: { orderId },
      });
      return payment;
    } catch (error) {
      console.error("Pi Network payment error:", error);
      throw new Error("Pi payment failed");
    }
  };

  return { initPi, payWithPi };
};