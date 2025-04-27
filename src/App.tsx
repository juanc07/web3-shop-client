// src/App.tsx
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { CartProvider } from "./context/CartContext";
import { ThemeProvider } from "./context/ThemeContext";
import Layout from "./components/Layout"; // Import the Layout component

// --- Page Imports ---
import Home from "./pages/Home";
import ProductPage from "./pages/ProductPage";
import Cart from "./pages/Cart";
import SellerDashboard from "./pages/SellerDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import EditProductPage from "./pages/EditProductPage"; // Import EditProductPage
// import NotFoundPage from "./pages/NotFoundPage"; // Optional

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <CartProvider>
          <BrowserRouter>
            {/* Use the Layout component to wrap Routes */}
            <Layout>
              <Routes>
                {/* Public Routes */}
                <Route path="/" element={<Home />} />
                <Route path="/product/:productId" element={<ProductPage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />

                {/* Authenticated / Role-Specific Routes (add guards if needed) */}
                <Route path="/cart" element={<Cart />} />
                <Route path="/seller/dashboard" element={<SellerDashboard />} />
                <Route path="/admin/dashboard" element={<AdminDashboard />} />

                {/* Route for Editing Products */}
                <Route path="/seller/edit-product/:productId" element={<EditProductPage />} />

                {/* Optional Catch-all Route */}
                {/* <Route path="*" element={<NotFoundPage />} /> */}
              </Routes>
            </Layout>
            {/* Navbar, Footer, Toaster are handled inside Layout */}
          </BrowserRouter>
        </CartProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;