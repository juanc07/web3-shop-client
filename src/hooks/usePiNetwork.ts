// src/hooks/usePiNetwork.ts
import { useState } from "react";

export const usePiNetwork = () => {
  const [pi, setPi] = useState<any>(null);

  const initPi = () => {
    const Pi = (window as any).Pi;
    if (Pi) {
      Pi.init({ version: "2.0", sandbox: true });
      setPi(Pi);
    } else {
      alert("Pi Network SDK not available");
    }
  };

  const payWithPi = async (amount: number, memo: string, orderId: string) => {
    if (!pi) throw new Error("Pi Network not initialized");
    const payment = await pi.createPayment({
      amount,
      memo,
      metadata: { orderId },
    });
    return payment;
  };

  return { initPi, payWithPi };
};