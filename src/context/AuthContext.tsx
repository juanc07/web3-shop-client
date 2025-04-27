// src/context/AuthContext.tsx
import { createContext, useContext, useState, useEffect } from "react";
import axios from "axios";
import { User } from "../types";
import { toast } from "sonner";

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  register: (email: string, password: string, firstName: string, lastName: string) => Promise<void>;
  registerWithSolana: (solanaWallet: string) => Promise<void>;
  registerWithPi: (piWallet: string) => Promise<void>;
  updateProfile: (profile: {
    email?: string;
    firstName?: string;
    lastName?: string;
    username?: string;
    mobileNumber?: string;
  }) => Promise<void>;
  isLoggedOut: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoggedOut, setIsLoggedOut] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token && !isLoggedOut) {
      axios
        .get("http://localhost:5000/api/auth/profile", {
          headers: { Authorization: `Bearer ${token}` },
        })
        .then((res) => {
          console.log("API /auth/profile response:", res.data);
          const profile = res.data;
          setUser({
            id: profile.id || profile._id,
            email: profile.email,
            firstName: profile.firstName,
            lastName: profile.lastName,
            username: profile.username,
            mobileNumber: profile.mobileNumber,
            roles: Array.isArray(profile.roles) ? profile.roles : ["buyer", "seller"],
            solanaWallet: profile.solanaWallet,
            piWallet: profile.piWallet,
          } as User);
        })
        .catch((err) => {
          console.error("Profile fetch error:", err.response?.data);
          localStorage.removeItem("token");
          setUser(null);
          setIsLoggedOut(true);
        });
    } else {
      setUser(null);
    }
  }, [isLoggedOut]);

  const login = async (email: string, password: string) => {
    const res = await axios.post("http://localhost:5000/api/auth/login", { email, password });
    localStorage.setItem("token", res.data.token);
    console.log("Login user data:", res.data.user);
    setUser({
      id: res.data.user.id || res.data.user._id,
      email: res.data.user.email,
      firstName: res.data.user.firstName,
      lastName: res.data.user.lastName,
      username: res.data.user.username,
      mobileNumber: res.data.user.mobileNumber,
      roles: res.data.user.roles,
      solanaWallet: res.data.user.solanaWallet,
      piWallet: res.data.user.piWallet,
    } as User);
    setIsLoggedOut(false);
  };

  const register = async (email: string, password: string, firstName: string, lastName: string) => {
    const res = await axios.post("http://localhost:5000/api/auth/register", {
      email,
      password,
      firstName,
      lastName,
    });
    localStorage.setItem("token", res.data.token);
    console.log("Register user data:", res.data.user);
    setUser({
      id: res.data.user.id || res.data.user._id,
      email: res.data.user.email,
      firstName: res.data.user.firstName,
      lastName: res.data.user.lastName,
      username: res.data.user.username,
      mobileNumber: res.data.user.mobileNumber,
      roles: res.data.user.roles,
      solanaWallet: res.data.user.solanaWallet,
      piWallet: res.data.user.piWallet,
    } as User);
    setIsLoggedOut(false);
    toast.success("Registered successfully!", { id: "register-success" });
  };

  const registerWithSolana = async (solanaWallet: string) => {
    const res = await axios.post("http://localhost:5000/api/auth/register-solana", { solanaWallet });
    localStorage.setItem("token", res.data.token);
    console.log("Solana register user data:", res.data.user);
    setUser({
      id: res.data.user.id || res.data.user._id,
      email: res.data.user.email,
      firstName: res.data.user.firstName,
      lastName: res.data.user.lastName,
      username: res.data.user.username,
      mobileNumber: res.data.user.mobileNumber,
      roles: res.data.user.roles,
      solanaWallet: res.data.user.solanaWallet,
      piWallet: res.data.user.piWallet,
    } as User);
    setIsLoggedOut(false);
  };

  const registerWithPi = async (piWallet: string) => {
    const res = await axios.post("http://localhost:5000/api/auth/register-pi", { piWallet });
    localStorage.setItem("token", res.data.token);
    console.log("Pi register user data:", res.data.user);
    setUser({
      id: res.data.user.id || res.data.user._id,
      email: res.data.user.email,
      firstName: res.data.user.firstName,
      lastName: res.data.user.lastName,
      username: res.data.user.username,
      mobileNumber: res.data.user.mobileNumber,
      roles: res.data.user.roles,
      solanaWallet: res.data.user.solanaWallet,
      piWallet: res.data.user.piWallet,
    } as User);
    setIsLoggedOut(false);
    toast.success("Registered with Pi Network!", { id: "pi-register-success" });
  };

  const updateProfile = async (profile: {
    email?: string;
    firstName?: string;
    lastName?: string;
    username?: string;
    mobileNumber?: string;
  }) => {
    const token = localStorage.getItem("token");
    if (!token) throw new Error("Authentication required");
    const res = await axios.patch("http://localhost:5000/api/auth/profile", profile, {
      headers: { Authorization: `Bearer ${token}` },
    });
    setUser({
      id: res.data.user.id || res.data.user._id,
      email: res.data.user.email,
      firstName: res.data.user.firstName,
      lastName: res.data.user.lastName,
      username: res.data.user.username,
      mobileNumber: res.data.user.mobileNumber,
      roles: res.data.user.roles,
      solanaWallet: res.data.user.solanaWallet,
      piWallet: res.data.user.piWallet,
    } as User);
    setIsLoggedOut(false);
    toast.success("Profile updated successfully!", { id: "profile-update-success" });
  };

  const logout = async () => {
    try {
      localStorage.removeItem("token");
      setUser(null);
      setIsLoggedOut(true);
      toast.info("Logged out.", { id: "logout-success" }); // Simplified message
    } catch (error) {
      console.error("Logout error:", error);
      toast.error("Failed to log out.", { id: "logout-error" });
    }
  };

  return (
    <AuthContext.Provider
      value={{ user, login, logout, register, registerWithSolana, registerWithPi, updateProfile, isLoggedOut }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context as AuthContextType;
};