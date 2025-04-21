// src/components/Navbar.tsx
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { ThemeToggle } from "./ThemeToggle";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Menu, ShoppingCart, User } from "lucide-react";

const Navbar = () => {
  const { user, logout } = useAuth();
  const { cart } = useCart();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/login");
    setIsOpen(false);
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
                  {user.name}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-card-light dark:bg-card-dark text-text-light dark:text-text-dark">
                {user.role === "seller" && (
                  <DropdownMenuItem asChild>
                    <Link to="/seller/dashboard">Seller Dashboard</Link>
                  </DropdownMenuItem>
                )}
                {user.role === "admin" && (
                  <DropdownMenuItem asChild>
                    <Link to="/admin/dashboard">Admin Dashboard</Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={handleLogout}>Logout</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Link to="/login" className="hover:text-gray-500 dark:hover:text-gray-400">
              Login
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
          {user ? (
            <>
              {user.role === "seller" && (
                <Link
                  to="/seller/dashboard"
                  className="block hover:text-gray-500 dark:hover:text-gray-400"
                  onClick={() => setIsOpen(false)}
                >
                  Seller Dashboard
                </Link>
              )}
              {user.role === "admin" && (
                <Link
                  to="/admin/dashboard"
                  className="block hover:text-gray-500 dark:hover:text-gray-400"
                  onClick={() => setIsOpen(false)}
                >
                  Admin Dashboard
                </Link>
              )}
              <Button
                variant="ghost"
                onClick={handleLogout}
                className="w-full text-left hover:text-gray-500 dark:hover:text-gray-400"
              >
                Logout
              </Button>
            </>
          ) : (
            <Link
              to="/login"
              className="block hover:text-gray-500 dark:hover:text-gray-400"
              onClick={() => setIsOpen(false)}
            >
              Login
            </Link>
          )}
          <ThemeToggle />
        </div>
      )}
    </nav>
  );
};

export default Navbar;