// src/pages/EditProductPage.tsx
import { useEffect, useState, useCallback, useRef } from "react";
import axios, { isAxiosError } from "axios";
import { useParams, useNavigate} from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { Product } from "../types"; // Use your defined Product type
import { useAuth } from "../context/AuthContext";
import { UploadCloud, X } from 'lucide-react';

interface EditProductFormState {
  name: string;
  description: string;
  price: string;
  stock: string;
}

const EditProductPage = () => {
  const { productId } = useParams<{ productId: string }>(); // Get ID from URL
  const { user } = useAuth();
  const navigate = useNavigate();
  const [productDetails, setProductDetails] = useState<Product | null>(null);
  const [editForm, setEditForm] = useState<EditProductFormState>({ name: "", description: "", price: "", stock: "" });
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false); // For text update
  const [isUploadingImage, setIsUploadingImage] = useState(false); // For image update
  const [updateError, setUpdateError] = useState<string | null>(null);

  // Image State
  const [newImageFile, setNewImageFile] = useState<File | null>(null);
  const [newImagePreview, setNewImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getToken = useCallback((): string | null => localStorage.getItem("token"), []);

  // --- Fetch Product Details ---
  useEffect(() => {
    if (!productId) {
      setFetchError("Product ID is missing.");
      setIsLoading(false);
      return;
    }
    if (!user) { // Redirect if user logs out while on page
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
    axios.get(`http://localhost:5000/api/products/${productId}`, {
         // No auth needed if GET /:id is public, add if needed
         // headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => {
        const product: Product = res.data;
        // Authorization Check: Ensure seller owns this product
        if (user.role !== 'admin' && product.seller?._id !== user.id) {
             toast.error("You are not authorized to edit this product.");
             navigate('/seller/dashboard'); // Or to home
             return;
        }
        setProductDetails(product);
        // Initialize form state with fetched data
        setEditForm({
          name: product.name,
          description: product.description,
          price: product.price.toString(), // Convert numbers to string for input value
          stock: product.stock.toString(),
        });
        console.log("Product details fetched:", product);
      })
      .catch(err => {
        console.error("Error fetching product details:", err);
        let message = "Failed to load product details.";
        if (isAxiosError(err)) message = err.response?.data?.message || err.message || message;
        setFetchError(message);
        toast.error(message);
      })
      .finally(() => {
        setIsLoading(false);
      });

  }, [productId, user, navigate, getToken]); // Depend on productId and user

  // --- Image Handlers ---
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
     if (file) {
        const maxSizeMB = 5;
        if (file.size > maxSizeMB * 1024 * 1024) {
           toast.error(`Image file too large. Max ${maxSizeMB}MB.`);
           if(fileInputRef.current) fileInputRef.current.value = "";
           return;
        }
        setNewImageFile(file);
        if (newImagePreview) URL.revokeObjectURL(newImagePreview);
        setNewImagePreview(URL.createObjectURL(file));
     } else {
         removeSelectedImage(); // Clear if no file selected
     }
  };
  const removeSelectedImage = () => {
      setNewImageFile(null);
      if (newImagePreview) URL.revokeObjectURL(newImagePreview);
      setNewImagePreview(null);
      if(fileInputRef.current) fileInputRef.current.value = "";
  }
  useEffect(() => { // Cleanup preview
      return () => { if (newImagePreview) URL.revokeObjectURL(newImagePreview); };
  }, [newImagePreview]);
  // --- End Image Handlers ---


  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setEditForm(prevForm => ({ ...prevForm, [name]: value }));
  };

  // --- Handle Update Submission ---
  const handleUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdateError(null); // Clear previous errors
    setIsUpdating(true); // Indicate text update is starting
    if (newImageFile) setIsUploadingImage(true); // Also indicate image upload if needed

    const token = getToken();
    if (!token || !productId) {
        const errMsg = "Authentication or Product ID missing.";
        setUpdateError(errMsg); toast.error(errMsg);
        setIsUpdating(false); setIsUploadingImage(false); return;
    }

    // --- Validation ---
    const price = parseFloat(editForm.price);
    const stock = parseInt(editForm.stock, 10);
    if (!editForm.name.trim() || !editForm.description.trim() || isNaN(price) || price <= 0 || isNaN(stock) || stock < 0 || !Number.isInteger(stock)) {
       const errMsg = "Please fill all fields correctly (positive price, non-negative integer stock).";
       setUpdateError(errMsg); toast.error(errMsg);
       setIsUpdating(false); setIsUploadingImage(false); return;
    }
    // --- End Validation ---    
    let imageUploadSuccess = !newImageFile; // Assume success if no new image

    try {
        // --- Step 1: Update Text Data ---
        const productData = {
            name: editForm.name.trim(),
            description: editForm.description.trim(),
            price: price,
            stock: stock,
        };
        console.log(`Updating product ${productId} with data:`, productData);
        await axios.put(`http://localhost:5000/api/products/${productId}`, productData, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log(`Product ${productId} text data updated successfully.`);        
        setIsUpdating(false); // Text update finished

        // --- Step 2: Upload New Image (if provided) ---
        if (newImageFile) {
            console.log(`Uploading new image for product ${productId}`);
            const formData = new FormData();
            formData.append("image", newImageFile);
            await axios.post(`http://localhost:5000/api/products/${productId}/image`, formData, {
                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' },
            });
            console.log(`New image for product ${productId} uploaded successfully.`);
            imageUploadSuccess = true;
            setNewImageFile(null); // Clear file state after successful upload
            removeSelectedImage(); // Clear preview and input
        }

        // --- Final Success ---
        toast.success("Product updated successfully!");
        // Optionally navigate back after a short delay
        setTimeout(() => navigate('/seller/dashboard'), 1500);

    } catch (error) {
        console.error("Update product error:", error);
        let message = "Failed to update product.";
        if (isAxiosError(error)) {
            message = error.response?.data?.message || error.message || message;
        }
        setUpdateError(message); toast.error(message);
        // Reset relevant loading state based on where it failed
        if (isUpdating) setIsUpdating(false); // Failed during text update
        if (isUploadingImage && !imageUploadSuccess) setIsUploadingImage(false); // Failed during image upload
    } finally {
         // Ensure loading states are reset if they haven't been already
         if (isUpdating) setIsUpdating(false);
         if (isUploadingImage) setIsUploadingImage(false);
    }
  };


  // --- Render Loading/Error ---
  if (isLoading) return <div className="w-full px-4 py-6 text-center">Loading product details...</div>;
  if (fetchError) return <div className="w-full px-4 py-6 text-center"><Alert variant="destructive"><AlertDescription>{fetchError}</AlertDescription></Alert></div>;
  if (!productDetails) return <div className="w-full px-4 py-6 text-center">Product not found.</div>; // Should be caught by fetch error usually

  const isProcessing = isUpdating || isUploadingImage; // Combined loading state for button

  return (
    <div className="w-full px-4 py-6 space-y-6">
        {/* Back Button */}
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
                {updateError && ( <Alert variant="destructive"><AlertDescription>{updateError}</AlertDescription></Alert> )}

                {/* Current & New Image Upload */}
                <div className="space-y-2">
                    <Label>Product Image</Label>
                    <div className="flex flex-col sm:flex-row items-center gap-4">
                         {/* Current Image */}
                         <div className="w-32 h-32 bg-muted rounded-md border flex items-center justify-center overflow-hidden flex-shrink-0">
                             {productDetails.imageUrl ? (
                                 <img src={productDetails.imageUrl} alt="Current Product" className="object-contain w-full h-full"/>
                             ) : (
                                 <span className="text-xs text-muted-foreground">No Image</span>
                             )}
                         </div>
                         {/* New Image Selection */}
                         <div className="flex-grow w-full">
                            <Label htmlFor="product-image-edit" className="text-sm text-muted-foreground mb-1 block">Replace Image (Optional)</Label>
                             <div
                                className={`w-full h-32 bg-muted rounded-lg border-2 border-dashed border-border flex items-center justify-center text-muted-foreground relative group ${newImagePreview ? 'border-solid' : ''} hover:border-primary transition-colors`}
                                onClick={() => fileInputRef.current?.click()}
                            >
                                {newImagePreview ? (
                                    <>
                                        <img src={newImagePreview} alt="New Preview" className="object-contain h-full w-full rounded-md" />
                                        <Button type="button" variant="destructive" size="icon" className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity z-10 rounded-full h-6 w-6" onClick={(e) => { e.stopPropagation(); removeSelectedImage(); }}>
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </>
                                ) : (
                                     <div className="text-center cursor-pointer p-2">
                                        <UploadCloud className="h-8 w-8 mx-auto mb-1" />
                                        <span className="text-sm">Select new image</span>
                                        <p className="text-xs mt-1">(Max 5MB)</p>
                                    </div>
                                )}
                                <Input ref={fileInputRef} id="product-image-edit" name="image" type="file" accept="image/*" onChange={handleImageChange} className="hidden" disabled={isProcessing}/>
                            </div>
                         </div>
                    </div>
                </div>

                {/* Text Inputs */}
                <div className="space-y-2"><Label htmlFor="edit-product-name">Product Name</Label><Input id="edit-product-name" name="name" type="text" value={editForm.name} onChange={handleFormChange} disabled={isProcessing} required /></div>
                <div className="space-y-2"><Label htmlFor="edit-product-description">Description</Label><Textarea id="edit-product-description" name="description" value={editForm.description} onChange={handleFormChange} className="min-h-[80px]" disabled={isProcessing} required /></div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2"><Label htmlFor="edit-product-price">Price ($)</Label><Input id="edit-product-price" name="price" type="number" value={editForm.price} onChange={handleFormChange} min="0.01" step="0.01" disabled={isProcessing} required /></div>
                    <div className="space-y-2"><Label htmlFor="edit-product-stock">Stock Quantity</Label><Input id="edit-product-stock" name="stock" type="number" value={editForm.stock} onChange={handleFormChange} min="0" step="1" disabled={isProcessing} required /></div>
                </div>

                {/* Submit Button */}
                <Button type="submit" className="w-full sm:w-auto" disabled={isProcessing}>
                    {isUpdating ? "Updating Details..." : isUploadingImage ? "Uploading Image..." : "Save Changes"}
                </Button>
            </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default EditProductPage;