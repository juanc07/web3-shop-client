// src/context/AuthContext.tsx
import { createContext, useContext, useState, useEffect } from "react";
import axios from "axios";
import { User } from "../types";

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  register: (email: string, password: string, name: string, role: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
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
            name: profile.name,
            role: ["buyer", "seller", "admin"].includes(profile.role) ? profile.role : "buyer",
          } as User);
        })
        .catch((err) => {
          console.error("Profile fetch error:", err.response?.data);
          localStorage.removeItem("token");
        });
    }
  }, []);

  const login = async (email: string, password: string) => {
    const res = await axios.post("http://localhost:5000/api/auth/login", { email, password });
    localStorage.setItem("token", res.data.token);
    console.log("Login user data:", res.data.user);
    setUser({
      id: res.data.user.id || res.data.user._id,
      email: res.data.user.email,
      name: res.data.user.name,
      role: res.data.user.role,
    } as User);
  };

  const register = async (email: string, password: string, name: string, role: string) => {
    const res = await axios.post("http://localhost:5000/api/auth/register", {
      email,
      password,
      name,
      role,
    });
    localStorage.setItem("token", res.data.token);
    console.log("Register user data:", res.data.user);
    setUser({
      id: res.data.user.id || res.data.user._id,
      email: res.data.user.email,
      name: res.data.user.name,
      role: res.data.user.role,
    } as User);
  };

  const logout = () => {
    localStorage.removeItem("token");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, register }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context as AuthContextType;
};