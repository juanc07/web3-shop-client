// src/pages/SellerDashboard.tsx
import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom"; // Added Link import
import { useAuth } from "../context/AuthContext";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { Product } from "../types";

interface ProductForm {
  name: string;
  description: string;
  price: string;
  stock: string;
}

const SellerDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [form, setForm] = useState<ProductForm>({ name: "", description: "", price: "", stock: "" });
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !user.roles.includes("seller")) {
      console.log("SellerDashboard Effect: User is not a seller, navigating home.");
      navigate("/");
      return;
    }

    const fetchProducts = async () => {
      setIsLoading(true);
      setFetchError(null);
      try {
        const token = localStorage.getItem("token");
        if (!token) throw new Error("Authentication required");
        const res = await axios.get("http://localhost:5000/api/products", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setProducts(res.data.filter((p: Product) => p.seller._id === user.id));
      } catch (error) {
        console.error("Error fetching products:", error);
        let message = "Failed to load products.";
        if (axios.isAxiosError(error)) message = error.response?.data?.message || error.message;
        setFetchError(message);
        toast.error(message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProducts();
  }, [user, navigate]);

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);
    setIsCreating(true);

    const price = parseFloat(form.price);
    const stock = parseInt(form.stock, 10);
    if (!form.name.trim() || !form.description.trim() || isNaN(price) || price <= 0 || isNaN(stock) || stock < 0) {
      setCreateError("Please fill all fields correctly (positive price, non-negative stock).");
      setIsCreating(false);
      return;
    }

    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Authentication required");
      const res = await axios.post(
        "http://localhost:5000/api/products",
        {
          name: form.name.trim(),
          description: form.description.trim(),
          price,
          stock,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setProducts((prev) => [...prev, res.data]);
      setForm({ name: "", description: "", price: "", stock: "" });
      toast.success("Product created successfully!");
    } catch (error) {
      console.error("Create product error:", error);
      let message = "Failed to create product.";
      if (axios.isAxiosError(error)) message = error.response?.data?.message || error.message;
      setCreateError(message);
      toast.error(message);
    } finally {
      setIsCreating(false);
    }
  };

  if (!user || !user.roles.includes("seller")) {
    return null;
  }

  return (
    <div className="w-full px-4 py-6 space-y-6">
      <h1 className="text-2xl sm:text-3xl font-bold text-center">Seller Dashboard</h1>
      <Card className="bg-card-light dark:bg-card-dark shadow-lg border border-border w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="text-lg sm:text-xl">Create New Product</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreateSubmit} className="space-y-4">
            {createError && (
              <Alert variant="destructive">
                <AlertDescription>{createError}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Label htmlFor="name">Product Name</Label>
              <Input
                id="name"
                name="name"
                type="text"
                placeholder="e.g., Solana Summer T-Shirt"
                value={form.name}
                onChange={handleFormChange}
                disabled={isCreating}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                name="description"
                type="text"
                placeholder="Describe your product..."
                value={form.description}
                onChange={handleFormChange}
                disabled={isCreating}
                required
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="price">Price ($)</Label>
                <Input
                  id="price"
                  name="price"
                  type="number"
                  placeholder="0.00"
                  value={form.price}
                  onChange={handleFormChange}
                  min="0.01"
                  step="0.01"
                  disabled={isCreating}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="stock">Stock Quantity</Label>
                <Input
                  id="stock"
                  name="stock"
                  type="number"
                  placeholder="0"
                  value={form.stock}
                  onChange={handleFormChange}
                  min="0"
                  step="1"
                  disabled={isCreating}
                  required
                />
              </div>
            </div>
            <Button type="submit" className="w-full sm:w-auto" disabled={isCreating}>
              {isCreating ? "Creating Product..." : "Create Product"}
            </Button>
          </form>
        </CardContent>
      </Card>
      <Card className="bg-card-light dark:bg-card-dark shadow-lg border border-border w-full max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle className="text-lg sm:text-xl">Your Products</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-center">Loading products...</p>
          ) : fetchError ? (
            <Alert variant="destructive">
              <AlertDescription>{fetchError}</AlertDescription>
            </Alert>
          ) : products.length === 0 ? (
            <p className="text-center text-muted-foreground">No products found.</p>
          ) : (
            <ul className="space-y-4">
              {products.map((product) => (
                <li key={product._id} className="flex justify-between items-center border-b pb-2">
                  <div>
                    <p className="font-semibold">{product.name}</p>
                    <p className="text-sm text-muted-foreground">${product.price.toFixed(2)} | Stock: {product.stock}</p>
                  </div>
                  <Button asChild variant="outline">
                    <Link to={`/seller/edit-product/${product._id}`}>Edit</Link>
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SellerDashboard;