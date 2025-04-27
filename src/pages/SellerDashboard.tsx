// src/pages/SellerDashboard.tsx
import { useEffect, useState, useCallback, useRef } from "react";
import axios, { isAxiosError } from "axios";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { Product } from "../types";
import { useAuth } from "../context/AuthContext";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { UploadCloud, X, Image as ImageIcon } from "lucide-react";

interface ProductFormState {
  name: string;
  description: string;
  price: string;
  stock: string;
}

const SellerDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [form, setForm] = useState<ProductFormState>({ name: "", description: "", price: "", stock: "" });
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [deletingProductId, setDeletingProductId] = useState<string | null>(null);

  // Image State for multiple images
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getToken = useCallback((): string | null => localStorage.getItem("token"), []);

  const fetchProducts = useCallback(
    async (isInitialLoad = true) => {
      console.log(`fetchProducts called. Is initial load: ${isInitialLoad}`);
      if (isInitialLoad) {
        setIsLoadingProducts(true);
        setProducts([]);
      }
      setFetchError(null);

      const token = getToken();
      if (!token) {
        setFetchError("Authentication failed. Please login again.");
        setIsLoadingProducts(false);
        setProducts([]);
        toast.error("Authentication failed. Please login again.");
        navigate("/login");
        return;
      }

      try {
        console.log("Attempting to fetch seller products...");
        const res = await axios.get<{ data: Product[] } | Product[]>("http://localhost:5000/api/products/my-products", {
          headers: { Authorization: `Bearer ${token}` },
        });

        const productData = Array.isArray(res.data) ? res.data : res.data?.data && Array.isArray(res.data.data) ? res.data.data : null;

        if (productData !== null) {
          console.log(`Successfully fetched ${productData.length} products.`);
          setProducts(productData);
        } else {
          console.error("API Error: My Products response is not a valid array", res.data);
          setFetchError("Failed to load products: Invalid data format received.");
          setProducts([]);
        }
      } catch (err) {
        console.error("API Error fetching seller products:", err);
        let message = "Failed to load your products.";
        if (isAxiosError(err)) {
          message = err.response?.data?.message || err.message || message;
          if (err.response?.status === 401) {
            toast.error("Session expired or invalid. Please login again.");
            navigate("/login");
            return;
          }
        }
        setFetchError(message);
        setProducts([]);
      } finally {
        if (isInitialLoad) setIsLoadingProducts(false);
      }
    },
    [getToken, navigate]
  );

  useEffect(() => {
    if (!user) {
      console.log("SellerDashboard Effect: No user, navigating to login.");
      navigate("/login");
      return;
    }
    if (user.role !== "seller") {
      console.log(`SellerDashboard Effect: User role ${user.role}, navigating home.`);
      navigate("/");
      return;
    }
    console.log("SellerDashboard Effect: User is seller, fetching initial products.");
    fetchProducts(true);
  }, [user, navigate, fetchProducts]);

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm((prevForm) => ({ ...prevForm, [name]: value }));
  };

  // Handle Multiple Image Selection
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (files.length > 0) {
      const maxSizeMB = 5;
      const maxImages = 6;

      // Validate files
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

      if (imageFiles.length + validFiles.length > maxImages) {
        toast.error(`Cannot select more than ${maxImages} images.`);
        return;
      }

      // Update state with new files
      setImageFiles((prev) => [...prev, ...validFiles]);

      // Generate previews
      const newPreviews = validFiles.map((file) => URL.createObjectURL(file));
      setImagePreviews((prev) => [...prev, ...newPreviews]);

      // Reset input
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const removeSelectedImage = (index: number) => {
    setImageFiles((prev) => prev.filter((_, i) => i !== index));
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

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError(null);
    const token = getToken();

    if (!token) {
      const m = "Auth failed.";
      setSubmitError(m);
      toast.error(m);
      setIsSubmitting(false);
      return;
    }
    const price = parseFloat(form.price);
    const stock = parseInt(form.stock, 10);
    if (!form.name.trim() || !form.description.trim() || imageFiles.length === 0 || isNaN(price) || price <= 0 || isNaN(stock) || stock < 0 || !Number.isInteger(stock)) {
      const m = "Please fill all fields correctly (Name, Desc, at least one Image, valid Price & Stock).";
      setSubmitError(m);
      toast.error(m);
      setIsSubmitting(false);
      return;
    }

    let newProductId: string | null = null;
    try {
      const productData = { name: form.name.trim(), description: form.description.trim(), price: price, stock: stock };
      console.log("Step 1: Creating product with text data:", productData);
      const createRes = await axios.post("http://localhost:5000/api/products", productData, {
        headers: { Authorization: `Bearer ${token}` },
      });
      newProductId = createRes.data?._id;
      if (!newProductId) throw new Error("Failed to create product or get ID.");
      console.log(`Step 1 Success: Product created ID: ${newProductId}`);

      console.log(`Step 2: Uploading ${imageFiles.length} images for product ID: ${newProductId}`);
      const formData = new FormData();
      imageFiles.forEach((file) => formData.append("images", file));
      await axios.post(`http://localhost:5000/api/products/${newProductId}/images`, formData, {
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log(`Step 2 Success: Images uploaded for product ID: ${newProductId}`);

      toast.success(`Product "${productData.name}" added!`);
      setForm({ name: "", description: "", price: "", stock: "" });
      setImageFiles([]);
      setImagePreviews([]);
      console.log("Add successful, refreshing product list...");
      await fetchProducts(false);
    } catch (error) {
      console.error("Add product error:", error);
      let message = "Failed to add product.";
      if (isAxiosError(error)) {
        if (newProductId && error.config?.url?.includes(`${newProductId}/images`)) {
          message = `Product created, but image upload failed: ${error.response?.data?.message || error.message}`;
          toast.warning(message);
          fetchProducts(false);
        } else {
          message = error.response?.data?.message || error.message || message;
          setSubmitError(message);
          toast.error(message);
        }
      } else if (error instanceof Error) {
        message = error.message;
        setSubmitError(message);
        toast.error(message);
      } else {
        setSubmitError(message);
        toast.error(message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteProduct = async (productId: string, productName: string) => {
    const token = getToken();
    if (!token) {
      toast.error("Auth failed.");
      return;
    }
    setDeletingProductId(productId);
    try {
      console.log(`Attempting to delete product ID: ${productId}`);
      await axios.delete(`http://localhost:5000/api/products/${productId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success(`Product "${productName}" deleted!`);
      console.log("Delete successful, refreshing product list...");
      await fetchProducts(false);
    } catch (error) {
      console.error(`Error deleting product ${productId}:`, error);
      let message = "Failed to delete product.";
      if (isAxiosError(error)) message = error.response?.data?.message || error.message || message;
      toast.error(message);
    } finally {
      setDeletingProductId(null);
    }
  };

  const handleEditProduct = (productId: string) => {
    console.log("Navigating to edit product:", productId);
    navigate(`/seller/edit-product/${productId}`);
  };

  if (!user || user.role !== "seller") {
    return <div className="w-full px-4 py-6 text-center">Verifying access...</div>;
  }

  return (
    <div className="w-full px-4 py-6 space-y-8">
      <h1 className="text-2xl sm:text-3xl font-bold text-center">Seller Dashboard</h1>

      <Card className="bg-card-light dark:bg-card-dark shadow-lg border border-border w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="text-lg sm:text-xl">Add New Product</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAddProduct} className="space-y-4">
            {submitError && <Alert variant="destructive"><AlertDescription>{submitError}</AlertDescription></Alert>}

            <div className="space-y-2">
              <Label htmlFor="product-images-add">Product Images (up to 6)</Label>
              <div
                className="w-full bg-muted rounded-lg border-2 border-dashed border-border flex items-center justify-center text-muted-foreground p-4 hover:border-primary transition-colors cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="text-center">
                  <UploadCloud className="h-10 w-10 mx-auto mb-2" />
                  <span>Click or drag files to upload</span>
                  <p className="text-xs mt-1">(Max 5MB each, up to 6 images)</p>
                </div>
                <Input
                  ref={fileInputRef}
                  id="product-images-add"
                  name="images"
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageChange}
                  className="hidden"
                  disabled={isSubmitting}
                />
              </div>
              {imagePreviews.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
                  {imagePreviews.map((preview, index) => (
                    <div key={index} className="relative group">
                      <img src={preview} alt={`Preview ${index + 1}`} className="w-full h-24 object-contain rounded-md border" />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity rounded-full h-6 w-6"
                        onClick={() => removeSelectedImage(index)}
                        disabled={isSubmitting}
                      >
                        <X className="h-4 w-4" />
                        <span className="sr-only">Remove image</span>
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              {imageFiles.length === 0 && <p className="text-sm text-destructive mt-1">At least one image is required.</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="product-name">Product Name</Label>
              <Input
                id="product-name"
                name="name"
                type="text"
                placeholder="e.g., Solana Summer T-Shirt"
                value={form.name}
                onChange={handleFormChange}
                disabled={isSubmitting}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="product-description">Description</Label>
              <Textarea
                id="product-description"
                name="description"
                placeholder="Describe your product..."
                value={form.description}
                onChange={handleFormChange}
                className="min-h-[80px]"
                disabled={isSubmitting}
                required
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="product-price">Price ($)</Label>
                <Input
                  id="product-price"
                  name="price"
                  type="number"
                  placeholder="0.00"
                  value={form.price}
                  onChange={handleFormChange}
                  min="0.01"
                  step="0.01"
                  disabled={isSubmitting}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="product-stock">Stock Quantity</Label>
                <Input
                  id="product-stock"
                  name="stock"
                  type="number"
                  placeholder="0"
                  value={form.stock}
                  onChange={handleFormChange}
                  min="0"
                  step="1"
                  disabled={isSubmitting}
                  required
                />
              </div>
            </div>
            <Button type="submit" className="w-full sm:w-auto" disabled={isSubmitting}>
              {isSubmitting ? "Adding Product..." : "Add Product"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="bg-card-light dark:bg-card-dark shadow-lg border border-border w-full max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle className="text-lg sm:text-xl">Your Products</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingProducts ? (
            <p className="text-center text-muted-foreground py-4">Loading your products...</p>
          ) : fetchError ? (
            <Alert variant="destructive"><AlertDescription>{fetchError}</AlertDescription></Alert>
          ) : products.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">You haven't added any products yet.</p>
          ) : (
            <ul className="space-y-3">
              {products.map((product) => {
                const isDeleting = deletingProductId === product._id;
                return (
                  <li
                    key={product._id}
                    className="flex flex-col sm:flex-row justify-between items-center gap-3 p-3 border rounded-md hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-grow min-w-0 w-full sm:w-auto">
                      <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-md bg-muted flex-shrink-0 overflow-hidden border">
                        {product.images && product.images.length > 0 ? (
                          <img
                            src={product.images[0].url}
                            alt={product.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs p-1 text-center">
                            <ImageIcon className="w-6 h-6" />
                          </div>
                        )}
                      </div>
                      <div className="flex-grow min-w-0">
                        <Link
                          to={`/product/${product._id}`}
                          className="font-medium block truncate hover:underline"
                          title={product.name}
                        >
                          {product.name}
                        </Link>
                        <span className="text-sm text-muted-foreground block">${product.price?.toFixed(2)}</span>
                        <span
                          className={`text-xs font-semibold mt-1 inline-block px-2 py-0.5 rounded-full ${
                            product.stock > 0
                              ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                              : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                          }`}
                        >
                          {product.stock > 0 ? `Stock: ${product.stock}` : "Out of Stock"}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0 w-full sm:w-auto justify-end mt-2 sm:mt-0 pt-2 sm:pt-0 border-t sm:border-none">
                      <Button
                        variant="outline"
                        size="sm"
                        asChild
                        disabled={isDeleting}
                        title="View Product Details"
                      >
                        <Link to={`/product/${product._id}`}>View</Link>
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleEditProduct(product._id)}
                        disabled={isDeleting}
                        title="Edit Product"
                      >
                        Edit
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="destructive"
                            size="sm"
                            disabled={isDeleting}
                            title="Delete Product"
                          >
                            {isDeleting ? "Deleting..." : "Delete"}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This action cannot be undone. This will permanently delete the product "{product.name}".
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeleteProduct(product._id, product.name)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Delete Product
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SellerDashboard;