// src/App.tsx
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { CartProvider } from "./context/CartContext";
import { ThemeProvider } from "./context/ThemeContext";
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { PhantomWalletAdapter } from "@solana/wallet-adapter-wallets";
import { clusterApiUrl } from "@solana/web3.js";
import Layout from "./components/Layout";
import ErrorBoundary from "./components/ErrorBoundary";

// Page Imports
import Home from "./pages/Home";
import ProductPage from "./pages/ProductPage";
import Cart from "./pages/Cart";
import SellerDashboard from "./pages/SellerDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import EditProductPage from "./pages/EditProductPage";
import ProfilePage from "./pages/ProfilePage";
import ConnectWalletPage from "./pages/ConnectWalletPage";
import RegisterPage from "./pages/RegisterPage";
import LoginPage from "./pages/LoginPage";
import OrdersPage from "./pages/OrdersPage";

// Import wallet adapter UI styles
import "@solana/wallet-adapter-react-ui/styles.css";

const wallets = [new PhantomWalletAdapter()];

function App() {
  const network = import.meta.env.VITE_SOLANA_ENDPOINT || "https://api.devnet.solana.com";
  const endpoint = network.startsWith("http") ? network : clusterApiUrl(network as any);

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <ThemeProvider>
            <AuthProvider>
              <CartProvider>
                <BrowserRouter>
                  <Layout>
                    <ErrorBoundary>
                      <Routes>
                        {/* Public Routes */}
                        <Route path="/" element={<Home />} />
                        <Route path="/product/:productId" element={<ProductPage />} />
                        <Route path="/connect-wallet" element={<ConnectWalletPage />} />
                        <Route path="/register" element={<RegisterPage />} />
                        <Route path="/login" element={<LoginPage />} />

                        {/* Authenticated Routes */}
                        <Route path="/profile" element={<ProfilePage />} />
                        <Route path="/cart" element={<Cart />} />
                        <Route path="/orders" element={<OrdersPage />} />
                        <Route path="/seller/dashboard" element={<SellerDashboard />} />
                        <Route path="/seller/edit-product/:productId" element={<EditProductPage />} />
                        <Route path="/admin/dashboard" element={<AdminDashboard />} />
                      </Routes>
                    </ErrorBoundary>
                  </Layout>
                </BrowserRouter>
              </CartProvider>
            </AuthProvider>
          </ThemeProvider>
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}

export default App;