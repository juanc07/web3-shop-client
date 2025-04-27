// src/pages/SellerDashboard.tsx
import { useEffect, useState } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
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
  solPrice: string;
  piPrice: string;
  stock: string;
}

const SellerDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation(); // To detect navigation changes
  const [products, setProducts] = useState<Product[]>([]);
  const [form, setForm] = useState<ProductForm>({
    name: "",
    description: "",
    price: "",
    solPrice: "",
    piPrice: "",
    stock: "",
  });
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const fetchProducts = async () => {
    setIsLoading(true);
    setFetchError(null);
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Authentication required");
      const res = await axios.get("http://localhost:5000/api/products", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setProducts(res.data.filter((p: Product) => p.seller._id === user!.id));
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

  useEffect(() => {
    if (!user || !user.roles.includes("seller")) {
      console.log("SellerDashboard Effect: User is not a seller, navigating home.");
      navigate("/");
      return;
    }

    fetchProducts();
  }, [user, navigate, location.pathname]); // Refetch on pathname change

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);
    setIsCreating(true);

    const price = parseFloat(form.price);
    const solPrice = parseFloat(form.solPrice);
    const piPrice = parseFloat(form.piPrice);
    const stock = parseInt(form.stock, 10);
    if (
      !form.name.trim() ||
      !form.description.trim() ||
      isNaN(price) ||
      price <= 0 ||
      isNaN(solPrice) ||
      solPrice <= 0 ||
      isNaN(piPrice) ||
      piPrice <= 0 ||
      isNaN(stock) ||
      stock < 0
    ) {
      setCreateError("Please fill all fields correctly (positive prices, non-negative stock).");
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
          solPrice,
          piPrice,
          stock,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setProducts((prev) => [...prev, res.data]);
      setForm({ name: "", description: "", price: "", solPrice: "", piPrice: "", stock: "" });
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

  const handleDelete = async (productId: string) => {
    if (!window.confirm("Are you sure you want to delete this product?")) return;

    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Authentication required");
      await axios.delete(`http://localhost:5000/api/products/${productId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setProducts((prev) => prev.filter((p) => p._id !== productId));
      toast.success("Product deleted successfully!");
    } catch (error) {
      console.error("Delete product error:", error);
      let message = "Failed to delete product.";
      if (axios.isAxiosError(error)) message = error.response?.data?.message || error.message;
      toast.error(message);
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
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
                <Label htmlFor="solPrice">Price (SOL)</Label>
                <Input
                  id="solPrice"
                  name="solPrice"
                  type="number"
                  placeholder="0.00"
                  value={form.solPrice}
                  onChange={handleFormChange}
                  min="0.01"
                  step="0.01"
                  disabled={isCreating}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="piPrice">Price (Pi)</Label>
                <Input
                  id="piPrice"
                  name="piPrice"
                  type="number"
                  placeholder="0.00"
                  value={form.piPrice}
                  onChange={handleFormChange}
                  min="0.01"
                  step="0.01"
                  disabled={isCreating}
                  required
                />
              </div>
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
                <li
                  key={product._id}
                  className="flex items-center border-b pb-2 space-x-4"
                >
                  <div className="flex-shrink-0">
                    {product.images && product.images.length > 0 ? (
                      <img
                        src={product.images[0].url}
                        alt={product.name}
                        className="w-16 h-16 object-contain rounded-md border"
                      />
                    ) : (
                      <div className="w-16 h-16 bg-muted rounded-md flex items-center justify-center text-muted-foreground text-xs text-center border">
                        No image available
                      </div>
                    )}
                  </div>
                  <div className="flex-grow">
                    <p className="font-semibold">{product.name}</p>
                    <p className="text-sm text-muted-foreground">
                      ${product.price.toFixed(2)} | SOL {product.solPrice.toFixed(2)} | Pi {product.piPrice.toFixed(2)} | Stock: {product.stock}
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    <Button asChild variant="outline">
                      <Link to={`/product/${product._id}`}>View</Link>
                    </Button>
                    <Button asChild variant="outline">
                      <Link to={`/seller/edit-product/${product._id}`}>Edit</Link>
                    </Button>
                    <Button variant="destructive" onClick={() => handleDelete(product._id)}>
                      Delete
                    </Button>
                  </div>
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