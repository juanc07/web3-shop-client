// src/hooks/useSolana.ts
import { useState } from "react";
import { Connection, PublicKey, Transaction, SystemProgram } from "@solana/web3.js";

export const useSolana = () => {
  const [wallet, setWallet] = useState<any>(null);

  const connectWallet = async () => {
    const provider = (window as any).solana;
    if (provider) {
      await provider.connect();
      setWallet(provider);
    } else {
      alert("Please install a Solana wallet like Phantom");
    }
  };

  const sendPayment = async (toPublicKey: string, amount: number) => {
    if (!wallet) throw new Error("Wallet not connected");
    const connection = new Connection("https://api.devnet.solana.com", "confirmed");
    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: new PublicKey(wallet.publicKey),
        toPubkey: new PublicKey(toPublicKey),
        lamports: amount * 1_000_000_000,
      })
    );
    const { signature } = await wallet.signAndSendTransaction(transaction);
    await connection.confirmTransaction(signature);
    return signature;
  };

  return { connectWallet, sendPayment, wallet };
};