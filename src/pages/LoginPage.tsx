// src/pages/LoginPage.tsx
import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate, Link } from "react-router-dom"; // Import Link
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import axios from "axios"; // Import axios to use isAxiosError

const LoginPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth(); // Only need login
  const navigate = useNavigate();

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); // Prevent default form submission
    setError("");
    setIsLoading(true);

    // Basic validation
    if (!email || !password) {
      setError("Email and password are required");
      setIsLoading(false);
      return;
    }

    try {
      await login(email, password);
      navigate("/"); // Navigate to dashboard or desired page on success
    // *** FIX: Catch error as unknown and perform type checks ***
    } catch (err: unknown) {
      console.error("Login page error:", err);
      let message = "Login failed. Please check your credentials."; // Default message
      // Check if it's an Axios error re-thrown from the context
      if (axios.isAxiosError(err)) {
          // Use optional chaining and nullish coalescing for safer access
          message = err.response?.data?.message ?? err.message ?? message;
      } else if (err instanceof Error) { // Check if it's a standard Error object
          message = err.message;
      }
      // else: Keep the default message for other unknown error types
      setError(message);
      // *** END FIX ***
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full px-4 py-6 flex justify-center items-center min-h-[calc(100vh-theme(spacing.16))]"> {/* Center vertically */}
      <Card className="bg-card-light dark:bg-card-dark shadow-lg w-full max-w-md border border-border"> {/* Added border */}
        <CardHeader>
          <CardTitle className="text-lg sm:text-xl text-center">
            Login
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Use a form element for better accessibility */}
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
                required // Add required attribute
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
                required // Add required attribute
                autoComplete="current-password"
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Logging in..." : "Login"}
            </Button>
          </form>
          {/* Link to Register Page */}
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