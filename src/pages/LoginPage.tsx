// src/pages/LoginPage.tsx
import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import axios from "axios";

const LoginPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    if (!email || !password) {
      setError("Email and password are required");
      setIsLoading(false);
      return;
    }

    try {
      await login(email, password);
      navigate("/");
    } catch (err: unknown) {
      console.error("Login page error:", err);
      let message = "Login failed. Please check your credentials.";
      if (axios.isAxiosError(err)) {
        message = err.response?.data?.message ?? err.message ?? message;
      } else if (err instanceof Error) {
        message = err.message;
      }
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full px-4 py-6 flex justify-center items-center min-h-[calc(100vh-theme(spacing.16))]">
      <Card className="bg-card-light dark:bg-card-dark shadow-lg w-full max-w-md border border-border">
        <CardHeader>
          <CardTitle className="text-lg sm:text-xl text-center">Login</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="text-sm sm:text-base"
                disabled={isLoading}
                required
                autoComplete="email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="text-sm sm:text-base"
                disabled={isLoading}
                required
                autoComplete="current-password"
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Logging in..." : "Login"}
            </Button>
          </form>
          <div className="mt-4 text-center text-sm">
            Need an account?{' '}
            <Link to="/register" className="underline text-primary hover:text-primary/90">
              Register
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default LoginPage;