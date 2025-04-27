// src/pages/ConnectWalletPage.tsx
import { useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { usePiNetwork } from "../hooks/usePiNetwork";

const ConnectWalletPage = () => {
  const { connected: walletConnected, publicKey } = useWallet();
  const { registerWithSolana, user, isLoggedOut } = useAuth();
  const { initPi } = usePiNetwork();
  const navigate = useNavigate();
  const [isConnectingPi, setIsConnectingPi] = useState(false);
  const [hasRegistered, setHasRegistered] = useState(false);

  // Automatically register Solana wallet when connected, if not logged in or logged out
  useEffect(() => {
    if (walletConnected && publicKey && !hasRegistered && !user && isLoggedOut) {
      const register = async () => {
        try {
          setHasRegistered(true);
          await registerWithSolana(publicKey.toString());
          toast.success("Solana wallet connected!", { id: "solana-connect" });
          navigate("/");
        } catch (error) {
          console.error("Solana wallet registration error:", error);
          toast.error("Failed to register Solana wallet.", { id: "solana-error" });
          setHasRegistered(false);
        }
      };
      register();
    }
  }, [walletConnected, publicKey, registerWithSolana, navigate, hasRegistered, user, isLoggedOut]);

  const handlePiConnect = async () => {
    try {
      setIsConnectingPi(true);
      const initialized = await initPi();
      if (initialized) {
        toast.success("Pi Network connected!", { id: "pi-connect" });
        navigate("/");
      } else {
        toast.error("Failed to initialize Pi Network.", { id: "pi-error" });
      }
    } catch (error) {
      console.error("Pi Network connection error:", error);
      toast.error("Failed to connect Pi Network.", { id: "pi-error" });
    } finally {
      setIsConnectingPi(false);
    }
  };

  return (
    <div className="w-full px-4 py-6 flex justify-center items-center min-h-[calc(100vh-theme(spacing.16))]">
      <Card className="bg-card-light dark:bg-card-dark shadow-lg w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-lg sm:text-xl text-center">Connect Wallet</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <WalletMultiButton
            className="!w-full !bg-primary !text-primary-foreground !hover:bg-primary/90 !rounded-md !py-2 !px-4"
            style={{ height: "40px" }}
          />
          <Button
            className="w-full"
            onClick={handlePiConnect}
            disabled={isConnectingPi}
          >
            {isConnectingPi ? "Connecting..." : "Connect Pi Network"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default ConnectWalletPage;