// src/pages/EditProductPage.tsx
import { useEffect, useState, useCallback, useRef } from "react";
import axios, { isAxiosError } from "axios";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { Product } from "../types";
import { useAuth } from "../context/AuthContext";
import { UploadCloud, X, Trash2 } from "lucide-react";

interface EditProductFormState {
  name: string;
  description: string;
  price: string;
  stock: string;
}

const EditProductPage = () => {
  const { productId } = useParams<{ productId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [productDetails, setProductDetails] = useState<Product | null>(null);
  const [editForm, setEditForm] = useState<EditProductFormState>({ name: "", description: "", price: "", stock: "" });
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isUploadingImages, setIsUploadingImages] = useState(false);
  const [isDeletingImage, setIsDeletingImage] = useState<string | null>(null);
  const [updateError, setUpdateError] = useState<string | null>(null);

  const [newImageFiles, setNewImageFiles] = useState<File[]>([]);
  const [newImagePreviews, setNewImagePreviews] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getToken = useCallback((): string | null => localStorage.getItem("token"), []);

  useEffect(() => {
    if (!productId) {
      setFetchError("Product ID is missing.");
      setIsLoading(false);
      return;
    }
    if (!user) {
      navigate("/login");
      return;
    }

    const token = getToken();
    if (!token) {
      toast.error("Authentication required.");
      navigate("/login");
      return;
    }

    setIsLoading(true);
    setFetchError(null);
    console.log(`Fetching details for product ID: ${productId}`);
    axios
      .get(`http://localhost:5000/api/products/${productId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => {
        const product: Product = res.data;
        if (!user.roles.includes("admin") && product.seller?._id !== user.id) {
          toast.error("You are not authorized to edit this product.");
          navigate("/seller/dashboard");
          return;
        }
        setProductDetails(product);
        setEditForm({
          name: product.name,
          description: product.description,
          price: product.price.toString(),
          stock: product.stock.toString(),
        });
        console.log("Product details fetched:", product);
      })
      .catch((err) => {
        console.error("Error fetching product details:", err);
        let message = "Failed to load product details.";
        if (isAxiosError(err)) message = err.response?.data?.message || err.message || message;
        setFetchError(message);
        toast.error(message);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [productId, user, navigate, getToken]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (files.length > 0) {
      const maxSizeMB = 5;
      const maxImages = 6;
      const currentImageCount = productDetails?.images?.length || 0;

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

      if (currentImageCount + newImageFiles.length + validFiles.length > maxImages) {
        toast.error(`Cannot exceed ${maxImages} images total.`);
        return;
      }

      setNewImageFiles((prev) => [...prev, ...validFiles]);
      const newPreviews = validFiles.map((file) => URL.createObjectURL(file));
      setNewImagePreviews((prev) => [...prev, ...newPreviews]);

      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const removeNewImage = (index: number) => {
    setNewImageFiles((prev) => prev.filter((_, i) => i !== index));
    setNewImagePreviews((prev) => {
      const preview = prev[index];
      URL.revokeObjectURL(preview);
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleDeleteExistingImage = async (publicId: string) => {
    const token = getToken();
    if (!token || !productId) {
      toast.error("Authentication or Product ID missing.");
      return;
    }

    setIsDeletingImage(publicId);
    try {
      await axios.delete(`http://localhost:5000/api/products/${productId}/images/${publicId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setProductDetails((prev) =>
        prev
          ? { ...prev, images: prev.images?.filter((img) => img.publicId !== publicId) || [] }
          : null
      );
      toast.success("Image deleted successfully.");
    } catch (error) {
      console.error("Error deleting image:", error);
      let message = "Failed to delete image.";
      if (isAxiosError(error)) message = error.response?.data?.message || error.message || message;
      toast.error(message);
    } finally {
      setIsDeletingImage(null);
    }
  };

  useEffect(() => {
    return () => {
      newImagePreviews.forEach((preview) => URL.revokeObjectURL(preview));
    };
  }, [newImagePreviews]);

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setEditForm((prevForm) => ({ ...prevForm, [name]: value }));
  };

  const handleUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdateError(null);
    setIsUpdating(true);
    if (newImageFiles.length > 0) setIsUploadingImages(true);

    const token = getToken();
    if (!token || !productId) {
      const errMsg = "Authentication or Product ID missing.";
      setUpdateError(errMsg);
      toast.error(errMsg);
      setIsUpdating(false);
      setIsUploadingImages(false);
      return;
    }

    const price = parseFloat(editForm.price);
    const stock = parseInt(editForm.stock, 10);
    if (!editForm.name.trim() || !editForm.description.trim() || isNaN(price) || price <= 0 || isNaN(stock) || stock < 0 || !Number.isInteger(stock)) {
      const errMsg = "Please fill all fields correctly (positive price, non-negative integer stock).";
      setUpdateError(errMsg);
      toast.error(errMsg);
      setIsUpdating(false);
      setIsUploadingImages(false);
      return;
    }

    let imageUploadSuccess = !newImageFiles.length;

    try {
      const productData = {
        name: editForm.name.trim(),
        description: editForm.description.trim(),
        price: price,
        stock: stock,
      };
      console.log(`Updating product ${productId} with data:`, productData);
      await axios.put(`http://localhost:5000/api/products/${productId}`, productData, {
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log(`Product ${productId} text data updated successfully.`);
      setIsUpdating(false);

      if (newImageFiles.length > 0) {
        console.log(`Uploading ${newImageFiles.length} new images for product ${productId}`);
        const formData = new FormData();
        newImageFiles.forEach((file) => formData.append("image", file)); // Changed to "image" for Multer
        const res = await axios.post(`http://localhost:5000/api/products/${productId}/images`, formData, {
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "multipart/form-data" },
        });
        console.log(`New images for product ${productId} uploaded successfully.`);
        imageUploadSuccess = true;
        setNewImageFiles([]);
        setNewImagePreviews([]);
        setProductDetails((prev) =>
          prev ? { ...prev, images: [...(prev.images || []), ...res.data.image]} : null
        );
      }

      toast.success("Product updated successfully!");
      setTimeout(() => navigate("/seller/dashboard"), 1500);
    } catch (error) {
      console.error("Update product error:", error);
      let message = "Failed to update product.";
      if (isAxiosError(error)) {
        message = error.response?.data?.message || error.message || message;
      }
      setUpdateError(message);
      toast.error(message);
      if (isUpdating) setIsUpdating(false);
      if (isUploadingImages && !imageUploadSuccess) setIsUploadingImages(false);
    } finally {
      if (isUpdating) setIsUpdating(false);
      if (isUploadingImages) setIsUploadingImages(false);
    }
  };

  if (isLoading) return <div className="w-full px-4 py-6 text-center">Loading product details...</div>;
  if (fetchError) return <div className="w-full px-4 py-6 text-center"><Alert variant="destructive"><AlertDescription>{fetchError}</AlertDescription></Alert></div>;
  if (!productDetails) return <div className="w-full px-4 py-6 text-center">Product not found.</div>;

  const isProcessing = isUpdating || isUploadingImages || !!isDeletingImage;

  return (
    <div className="w-full px-4 py-6 space-y-6">
      <Button variant="outline" onClick={() => navigate(-1)} className="mb-4">
        ← Back
      </Button>

      <h1 className="text-2xl sm:text-3xl font-bold text-center">Edit Product</h1>

      <Card className="bg-card-light dark:bg-card-dark shadow-lg border border-border w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="text-lg sm:text-xl">Update Product Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpdateSubmit} className="space-y-4">
            {updateError && <Alert variant="destructive"><AlertDescription>{updateError}</AlertDescription></Alert>}

            <div className="space-y-2">
              <Label>Product Images (up to 6)</Label>
              <div className="space-y-4">
                {productDetails.images && productDetails.images.length > 0 && (
                  <div>
                    <Label className="text-sm text-muted-foreground mb-2 block">Current Images</Label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {productDetails.images.map((image) => (
                        <div key={image.publicId} className="relative group">
                          <img
                            src={image.url}
                            alt="Current Product"
                            className="w-full h-24 object-contain rounded-md border"
                          />
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity rounded-full h-6 w-6"
                            onClick={() => handleDeleteExistingImage(image.publicId)}
                            disabled={isProcessing || isDeletingImage === image.publicId}
                          >
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">Delete image</span>
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div>
                  <Label htmlFor="product-images-edit" className="text-sm text-muted-foreground mb-2 block">
                    Add New Images (Optional)
                  </Label>
                  <div
                    className="w-full h-32 bg-muted rounded-lg border-2 border-dashed border-border flex items-center justify-center text-muted-foreground hover:border-primary transition-colors cursor-pointer"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <div className="text-center p-2">
                      <UploadCloud className="h-8 w-8 mx-auto mb-2" />
                      <span>Click or drag files to upload</span>
                      <p className="text-xs mt-1">(Max 5MB each, up to 6 images total)</p>
                    </div>
                    <Input
                      ref={fileInputRef}
                      id="product-images-edit"
                      name="image"
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleImageChange}
                      className="hidden"
                      disabled={isProcessing}
                    />
                  </div>
                  {newImagePreviews.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
                      {newImagePreviews.map((preview, index) => (
                        <div key={index} className="relative group">
                          <img src={preview} alt={`New Preview ${index + 1}`} className="w-full h-24 object-contain rounded-md border" />
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity rounded-full h-6 w-6"
                            onClick={() => removeNewImage(index)}
                            disabled={isProcessing}
                          >
                            <X className="h-4 w-4" />
                            <span className="sr-only">Remove new image</span>
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="product-name">Product Name</Label>
              <Input
                id="product-name"
                name="name"
                type="text"
                placeholder="e.g., Solana Summer T-Shirt"
                value={editForm.name}
                onChange={handleFormChange}
                disabled={isProcessing}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="product-description">Description</Label>
              <Textarea
                id="product-description"
                name="description"
                placeholder="Describe your product..."
                value={editForm.description}
                onChange={handleFormChange}
                className="min-h-[80px]"
                disabled={isProcessing}
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
                  value={editForm.price}
                  onChange={handleFormChange}
                  min="0.01"
                  step="0.01"
                  disabled={isProcessing}
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
                  value={editForm.stock}
                  onChange={handleFormChange}
                  min="0"
                  step="1"
                  disabled={isProcessing}
                  required
                />
              </div>
            </div>
            <Button type="submit" className="w-full sm:w-auto" disabled={isProcessing}>
              {isProcessing ? "Updating Product..." : "Update Product"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default EditProductPage;