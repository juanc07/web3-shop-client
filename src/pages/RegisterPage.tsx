// src/pages/RegisterPage.tsx
import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import axios from "axios"; // Import axios to use isAxiosError

const RegisterPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState("buyer");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    if (!email || !password || !name || !role) {
      setError("All fields (Name, Email, Password, Role) are required");
      setIsLoading(false);
      return;
    }
    if (!["buyer", "seller"].includes(role)) {
       setError("Invalid role selected. Please choose Buyer or Seller.");
       setIsLoading(false);
       return;
    }
     if (password.length < 6) {
       setError("Password must be at least 6 characters long.");
       setIsLoading(false);
       return;
    }

    try {
      await register(email, password, name, role);
      navigate("/");
    // *** FIX: Catch error as unknown and perform type checks ***
    } catch (err: unknown) {
      console.error("Register page error:", err);
      let message = "Registration failed. Please try again."; // Default message
      // Check if it's an Axios error re-thrown from the context
      if (axios.isAxiosError(err)) {
          message = err.response?.data?.message || err.message || message;
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
    <div className="w-full px-4 py-6 flex justify-center items-center min-h-[calc(100vh-theme(spacing.16))]">
      <Card className="bg-card-light dark:bg-card-dark shadow-lg w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-lg sm:text-xl text-center">
            Register
          </CardTitle>
        </CardHeader>
        <CardContent>
           <form onSubmit={handleRegisterSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            {/* Name Input */}
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name" type="text" placeholder="Enter your name"
                value={name} onChange={(e) => setName(e.target.value)}
                className="text-sm sm:text-base" disabled={isLoading} required autoComplete="name"
              />
            </div>
            {/* Email Input */}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email" type="email" placeholder="Enter your email"
                value={email} onChange={(e) => setEmail(e.target.value)}
                className="text-sm sm:text-base" disabled={isLoading} required autoComplete="email"
              />
            </div>
            {/* Password Input */}
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password" type="password" placeholder="Enter your password (min 6 chars)"
                value={password} onChange={(e) => setPassword(e.target.value)}
                className="text-sm sm:text-base" disabled={isLoading} required autoComplete="new-password"
              />
            </div>
             {/* Role Select */}
             <div className="space-y-2">
              <Label htmlFor="role">Register As</Label>
              <Select value={role} onValueChange={setRole} disabled={isLoading} required>
                <SelectTrigger id="role" className="text-sm sm:text-base">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent className="bg-background text-foreground border border-border shadow-lg">
                  <SelectItem value="buyer">Buyer</SelectItem>
                  <SelectItem value="seller">Seller</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {/* Submit Button */}
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Registering..." : "Register"}
            </Button>
           </form>
           {/* Link to Login */}
           <div className="mt-4 text-center text-sm">
             Already have an account?{' '}
             <Link to="/login" className="underline text-primary hover:text-primary/90">
               Login
             </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default RegisterPage;