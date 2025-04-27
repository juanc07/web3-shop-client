// src/pages/SellerDashboard.tsx
import { useEffect, useState, useRef } from "react";
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
import { Image as ImageIcon, UploadCloud, X } from "lucide-react";

interface ProductForm {
  name: string;
  description: string;
  price: string;
  solPrice: string;
  piPrice: string;
  stock: string;
  images: File[];
}

const SellerDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [products, setProducts] = useState<Product[]>([]);
  const [form, setForm] = useState<ProductForm>({
    name: "",
    description: "",
    price: "",
    solPrice: "",
    piPrice: "",
    stock: "",
    images: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<{ id: string; name: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
  }, [user, navigate, location.pathname]);

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (files.length > 0) {
      const maxSizeMB = 25;
      const maxImages = 6;
      const currentImageCount = form.images.length;

      const validFiles = files.filter((file) => {
        if (file.size > maxSizeMB * 1024 * 1024) {
          toast.error(`Image "${file.name}" is too large. Max ${maxSizeMB}MB.`);
          return false;
        }
        if (!file.type.startsWith("image/")) {
          toast.error(`File "${file.name}" is not an image.`);
          return false;
        }
        return true;
      });

      if (currentImageCount + validFiles.length > maxImages) {
        toast.error(`Cannot exceed ${maxImages} images total.`);
        return;
      }

      setForm((prev) => ({ ...prev, images: [...prev.images, ...validFiles] }));
      const newPreviews = validFiles.map((file) => URL.createObjectURL(file));
      setImagePreviews((prev) => ([...prev, ...newPreviews]));

      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const removeImage = (index: number) => {
    setForm((prev) => ({ ...prev, images: prev.images.filter((_, i) => i !== index) }));
    setImagePreviews((prev) => {
      const preview = prev[index];
      URL.revokeObjectURL(preview);
      return prev.filter((_, i) => i !== index);
    });
  };

  useEffect(() => {
    return () => {
      imagePreviews.forEach((preview) => URL.revokeObjectURL(preview));
    };
  }, [imagePreviews]);

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

    if (form.images.length === 0) {
      setCreateError("At least one image is required.");
      setIsCreating(false);
      return;
    }

    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Authentication required");

      // Create product
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
      const newProduct = res.data;

      // Upload images
      if (form.images.length > 0) {
        const formData = new FormData();
        form.images.forEach((file) => formData.append("images", file));
        const imageRes = await axios.post(
          `http://localhost:5000/api/products/${newProduct._id}/images`,
          formData,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        newProduct.images = imageRes.data.images;
      }

      setProducts((prev) => ([...prev, newProduct]));
      setForm({ name: "", description: "", price: "", solPrice: "", piPrice: "", stock: "", images: [] });
      setImagePreviews([]);
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

  const handleDelete = async () => {
    if (!productToDelete) return;

    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Authentication required");
      await axios.delete(`http://localhost:5000/api/products/${productToDelete.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setProducts((prev) => prev.filter((p) => p._id !== productToDelete.id));
      toast.success(`Product "${productToDelete.name}" deleted successfully!`);
    } catch (error) {
      console.error("Delete product error:", error);
      let message = "Failed to delete product.";
      if (axios.isAxiosError(error)) message = error.response?.data?.message || error.message;
      toast.error(message);
    } finally {
      setIsDeleteDialogOpen(false);
      setProductToDelete(null);
    }
  };

  const openDeleteDialog = (productId: string, productName: string) => {
    setProductToDelete({ id: productId, name: productName });
    setIsDeleteDialogOpen(true);
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
              <Label>Product Images (1–6 required)</Label>
              <div
                className="w-full h-32 bg-muted rounded-lg border-2 border-dashed border-border flex items-center justify-center text-muted-foreground hover:border-primary transition-colors cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="text-center p-2">
                  <UploadCloud className="h-8 w-8 mx-auto mb-2" />
                  <span>Click or drag files to upload</span>
                  <p className="text-xs mt-1">(Max 25MB each, 1–6 images)</p>
                </div>
                <Input
                  ref={fileInputRef}
                  id="product-images"
                  name="images"
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageChange}
                  className="hidden"
                  disabled={isCreating}
                />
              </div>
              {imagePreviews.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
                  {imagePreviews.map((preview, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={preview}
                        alt={`Preview ${index + 1}`}
                        className="w-full h-24 object-contain rounded-md border"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity rounded-full h-6 w-6"
                        onClick={() => removeImage(index)}
                        disabled={isCreating}
                      >
                        <X className="h-4 w-4" />
                        <span className="sr-only">Remove image</span>
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
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
                <li key={product._id} className="flex items-center border-b pb-2 space-x-4">
                  <div className="flex-shrink-0 w-16 h-16">
                    {product.images && product.images.length > 0 ? (
                      <img
                        src={product.images[0].url}
                        alt={product.name}
                        className="w-full h-full object-contain rounded-md border"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground bg-muted rounded-md border">
                        <ImageIcon className="w-8 h-8" />
                      </div>
                    )}
                  </div>
                  <div className="flex-grow">
                    <p className="font-semibold">{product.name}</p>
                    <p className="text-sm text-muted-foreground">
                      ${product.price.toFixed(2)} | SOL {product.solPrice.toFixed(2)} | Pi{" "}
                      {product.piPrice.toFixed(2)} | Stock: {product.stock}
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    <Button asChild variant="outline">
                      <Link to={`/product/${product._id}`}>View</Link>
                    </Button>
                    <Button asChild variant="outline">
                      <Link to={`/seller/edit-product/${product._id}`}>Edit</Link>
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => openDeleteDialog(product._id, product.name)}
                    >
                      Delete
                    </Button>
                    {isDeleteDialogOpen && (
                      <div
                        className="fixed inset-0 flex items-center justify-center z-50 px-4"
                        style={{ backgroundColor: "rgba(0, 0, 0, 0.3)" }}
                      >
                        <div className="bg-white dark:bg-[#222128] p-6 rounded-lg shadow-lg border border-[#494848] w-full max-w-md opacity-100">
                          <h3 className="text-xl font-bold mb-4">Are you absolutely sure?</h3>
                          <p className="text-muted-foreground mb-6">
                            This action cannot be undone. This will permanently delete the product "{productToDelete?.name}".
                          </p>
                          <div className="flex justify-end gap-4">
                            <Button
                              variant="outline"
                              onClick={() => {
                                setIsDeleteDialogOpen(false);
                                setProductToDelete(null);
                              }}
                            >
                              Cancel
                            </Button>
                            <Button
                              variant="destructive"
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              onClick={handleDelete}
                            >
                              Delete Product
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
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