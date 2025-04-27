// src/pages/ProfilePage.tsx
import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import axios from "axios";

interface ProfileForm {
  email?: string;
  firstName?: string;
  lastName?: string;
  username?: string;
  mobileNumber?: string;
}

const ProfilePage = () => {
  const { user, updateProfile } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState<ProfileForm>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      navigate("/connect-wallet");
    } else {
      setForm({
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        username: user.username,
        mobileNumber: user.mobileNumber,
      });
    }
  }, [user, navigate]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    if (form.email && !/\S+@\S+\.\S+/.test(form.email)) {
      setError("Invalid email format");
      setIsLoading(false);
      return;
    }

    try {
      await updateProfile(form);
      setError(null);
    } catch (err) {
      console.error("Profile update error:", err);
      let message = "Failed to update profile.";
      if (axios.isAxiosError(err)) {
        message = err.response?.data?.message || err.message;
      } else if (err instanceof Error) {
        message = err.message;
      }
      setError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) return <div className="w-full px-4 py-6 text-center">Loading...</div>;

  return (
    <div className="w-full px-4 py-6 space-y-6 flex justify-center">
      <Card className="bg-card-light dark:bg-card-dark shadow-lg border border-border w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-lg sm:text-xl text-center">Your Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <h3 className="text-sm font-medium">Wallet Information</h3>
            <p className="text-sm text-muted-foreground">
              Solana Wallet: {user.solanaWallet || "Not connected"}
            </p>
            <p className="text-sm text-muted-foreground">
              Pi Wallet: {user.piWallet || "Not connected"}
            </p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="Enter your email"
                value={form.email || ""}
                onChange={handleInputChange}
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name</Label>
              <Input
                id="firstName"
                name="firstName"
                type="text"
                placeholder="Enter your first name"
                value={form.firstName || ""}
                onChange={handleInputChange}
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name</Label>
              <Input
                id="lastName"
                name="lastName"
                type="text"
                placeholder="Enter your last name"
                value={form.lastName || ""}
                onChange={handleInputChange}
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                name="username"
                type="text"
                placeholder="Enter your username"
                value={form.username || ""}
                onChange={handleInputChange}
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mobileNumber">Mobile Number</Label>
              <Input
                id="mobileNumber"
                name="mobileNumber"
                type="tel"
                placeholder="Enter your mobile number"
                value={form.mobileNumber || ""}
                onChange={handleInputChange}
                disabled={isLoading}
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Updating..." : "Update Profile"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProfilePage;