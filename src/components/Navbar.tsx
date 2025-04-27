// src/components/Navbar.tsx
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { useWallet } from "@solana/wallet-adapter-react";
import { ThemeToggle } from "./ThemeToggle";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Menu, ShoppingCart, User, LogOut } from "lucide-react";
import { toast } from "sonner";

const Navbar = () => {
  const { user, logout } = useAuth();
  const { cart } = useCart();
  const { disconnect, connected: walletConnected } = useWallet();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      await logout();
      if (walletConnected) {
        await disconnect();
        console.log("Wallet disconnected during logout");
      }
      setIsOpen(false);
      navigate("/connect-wallet");
    } catch (error) {
      console.error("Logout error:", error);
      toast.error("Failed to log out.", { id: "logout-error" });
    } finally {
      setIsLoggingOut(false);
    }
  };

  const handleDisconnectWallet = async () => {
    try {
      await disconnect();
      toast.info("Wallet disconnected.", { id: "wallet-disconnect" });
    } catch (error) {
      console.error("Wallet disconnection error:", error);
      toast.error("Failed to disconnect wallet.", { id: "wallet-disconnect-error" });
    }
  };

  return (
    <nav className="bg-primary-light dark:bg-primary-dark text-text-dark dark:text-text-light w-full sticky top-0 z-50 shadow-md">
      <div className="w-full px-4 py-3 flex justify-between items-center">
        <Link to="/" className="text-xl font-bold sm:text-2xl">
          Web3 Shop
        </Link>
        <div className="hidden md:flex space-x-4 items-center">
          <Link to="/" className="hover:text-gray-500 dark:hover:text-gray-400">
            Home
          </Link>
          <Link to="/cart" className="hover:text-gray-500 dark:hover:text-gray-400 flex items-center">
            <ShoppingCart className="mr-1" size={18} />
            Cart ({cart.length})
          </Link>
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="hover:text-gray-500 dark:hover:text-gray-400">
                  <User className="mr-1" size={18} />
                  {user.username || user.firstName || user.email || "User"}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-card-light dark:bg-card-dark text-text-light dark:text-text-dark">
                <DropdownMenuItem asChild>
                  <Link to="/orders">Orders</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/profile">Profile</Link>
                </DropdownMenuItem>
                {user.roles.includes("seller") && (
                  <DropdownMenuItem asChild>
                    <Link to="/seller/dashboard">Seller Dashboard</Link>
                  </DropdownMenuItem>
                )}
                {user.roles.includes("admin") && (
                  <DropdownMenuItem asChild>
                    <Link to="/admin/dashboard">Admin Dashboard</Link>
                  </DropdownMenuItem>
                )}
                {walletConnected && (
                  <DropdownMenuItem onClick={handleDisconnectWallet}>
                    Disconnect Wallet
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={handleLogout} disabled={isLoggingOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Link to="/connect-wallet" className="hover:text-gray-500 dark:hover:text-gray-400">
              Connect Wallet
            </Link>
          )}
          <ThemeToggle />
        </div>
        <Button
          variant="ghost"
          className="md:hidden"
          onClick={() => setIsOpen(!isOpen)}
        >
          <Menu size={24} />
        </Button>
      </div>
      {isOpen && (
        <div className="md:hidden bg-primary-light dark:bg-primary-dark px-4 py-2 space-y-2">
          <Link
            to="/"
            className="block hover:text-gray-500 dark:hover:text-gray-400"
            onClick={() => setIsOpen(false)}
          >
            Home
          </Link>
          <Link
            to="/cart"
            className="block hover:text-gray-500 dark:hover:text-gray-400 flex items-center"
            onClick={() => setIsOpen(false)}
          >
            <ShoppingCart className="mr-1" size={18} />
            Cart ({cart.length})
          </Link>
          {user && (
            <Link
              to="/orders"
              className="block hover:text-gray-500 dark:hover:text-gray-400"
              onClick={() => setIsOpen(false)}
            >
              Orders
            </Link>
          )}
          {user ? (
            <>
              <Link
                to="/profile"
                className="block hover:text-gray-500 dark:hover:text-gray-400"
                onClick={() => setIsOpen(false)}
              >
                Profile
              </Link>
              {user.roles.includes("seller") && (
                <Link
                  to="/seller/dashboard"
                  className="block hover:text-gray-500 dark:hover:text-gray-400"
                  onClick={() => setIsOpen(false)}
                >
                  Seller Dashboard
                </Link>
              )}
              {user.roles.includes("admin") && (
                <Link
                  to="/admin/dashboard"
                  className="block hover:text-gray-500 dark:hover:text-gray-400"
                  onClick={() => setIsOpen(false)}
                >
                  Admin Dashboard
                </Link>
              )}
              {walletConnected && (
                <Button
                  variant="ghost"
                  onClick={handleDisconnectWallet}
                  className="w-full text-left hover:text-gray-500 dark:hover:text-gray-400"
                >
                  Disconnect Wallet
                </Button>
              )}
              <Button
                variant="ghost"
                onClick={handleLogout}
                className="w-full text-left hover:text-gray-500 dark:hover:text-gray-400"
                disabled={isLoggingOut}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </Button>
            </>
          ) : (
            <Link
              to="/connect-wallet"
              className="block hover:text-gray-500 dark:hover:text-gray-400"
              onClick={() => setIsOpen(false)}
            >
              Connect Wallet
            </Link>
          )}
          <ThemeToggle />
        </div>
      )}
    </nav>
  );
};

export default Navbar;