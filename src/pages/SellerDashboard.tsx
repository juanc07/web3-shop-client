// src/pages/SellerDashboard.tsx
import { useEffect, useState, useCallback } from "react";
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

interface ApiErrorData {
  message?: string;
}

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

  const getToken = useCallback((): string | null => localStorage.getItem("token"), []);

  // --- Extracted Function to Fetch Products ---
  const fetchProducts = useCallback(async (isInitialLoad = true) => { // Renamed flag
    console.log(`fetchProducts called. Is initial load: ${isInitialLoad}`); // Debug log
    if (isInitialLoad) setIsLoadingProducts(true); // Only show full loading on initial load
    setFetchError(null); // Clear previous fetch errors

    const token = getToken();
    if (!token) {
      setFetchError("Authentication token not found. Please login again.");
      setIsLoadingProducts(false);
      setProducts([]); // Clear products if not authenticated
      return;
    }

    try {
      console.log("Attempting to fetch seller products...");
      const res = await axios.get("http://localhost:5000/api/products/my-products", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (Array.isArray(res.data)) {
        console.log(`Successfully fetched ${res.data.length} products. Data:`, res.data); // Log fetched data
        setProducts(res.data); // Update state with potentially new data
      } else {
        console.error("API Error: My Products response is not an array", res.data);
        setFetchError("Failed to load products: Invalid data format.");
        setProducts([]); // Clear on invalid format
      }
    } catch (err) {
      console.error("API Error fetching seller products:", err);
      let message = "Failed to load your products.";
      if (isAxiosError(err)) {
          message = err.response?.data?.message || err.message || message;
          if (err.response?.status === 401) {
             toast.error("Session expired or invalid. Please login again.");
             navigate('/login');
             return; // Stop further execution
          }
      }
      setFetchError(message);
      setProducts([]); // Clear products on error
    } finally {
      if (isInitialLoad) setIsLoadingProducts(false); // Turn off main loading indicator
    }
  }, [getToken, navigate]);


  // Effect to check user and fetch products on mount/user change
  useEffect(() => {
    // Initial checks and navigation moved inside for clarity
    if (!user) {
      console.log("SellerDashboard Effect: No user found, navigating to login.");
      navigate("/login");
      return; // Stop effect if no user
    }
    if (user.role !== "seller") {
      console.log(`SellerDashboard Effect: User role is ${user.role}, navigating to home.`);
      navigate("/");
      return; // Stop effect if not seller
    }
    console.log("SellerDashboard Effect: User is seller, fetching initial products.");
    fetchProducts(true); // Call fetch on mount (and trigger loading state)
  }, [user, navigate, fetchProducts]); // fetchProducts is stable due to useCallback


  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const { name, value } = e.target;
      setForm(prevForm => ({ ...prevForm, [name]: value }));
  };

  // --- Handle Add Product ---
  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError(null);
    const token = getToken();

    if (!token) { /* ... auth error handling ... */ return; }
    const price = parseFloat(form.price);
    const stock = parseInt(form.stock, 10);
    if (!form.name.trim() || !form.description.trim() || isNaN(price) || price <= 0 || isNaN(stock) || stock < 0 || !Number.isInteger(stock)) { /* ... validation error handling ... */ return; }

    try {
      const productData = { name: form.name.trim(), description: form.description.trim(), price: price, stock: stock };
      console.log("Attempting to add product:", productData);
      await axios.post("http://localhost:5000/api/products", productData, { headers: { Authorization: `Bearer ${token}` } });

      toast.success(`Product "${productData.name}" added successfully!`);
      setForm({ name: "", description: "", price: "", stock: "" });
      console.log("Add successful, calling fetchProducts to refresh list...");
      await fetchProducts(false); // <-- **RE-FETCH THE LIST** (don't show global loading)

    } catch (error) {
      console.error("Add product error:", error);
      let message = "Failed to add product.";
       if (isAxiosError(error)) message = error.response?.data?.message || error.message || message;
      setSubmitError(message); toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- Handle Product Deletion ---
  const handleDeleteProduct = async (productId: string, productName: string) => {
     const token = getToken();
     if (!token) { toast.error("Authentication failed. Please login again."); return; }

     setDeletingProductId(productId);
     try {
         console.log(`Attempting to delete product ID: ${productId}`);
         await axios.delete(`http://localhost:5000/api/products/${productId}`, {
             headers: { Authorization: `Bearer ${token}` }
         });
         toast.success(`Product "${productName}" deleted successfully!`);
         console.log("Delete successful, calling fetchProducts to refresh list...");
         await fetchProducts(false); // <-- **RE-FETCH THE LIST** (don't show global loading)
     } catch (error) {
         console.error(`Error deleting product ${productId}:`, error);
         let message = "Failed to delete product.";
         if (isAxiosError(error)) message = error.response?.data?.message || error.message || message;
         toast.error(message);
     } finally {
         setDeletingProductId(null);
     }
  };

   // Placeholder for Edit functionality
   const handleEditProduct = (productId: string) => {
      console.log("Edit product clicked:", productId);
      toast.info("Edit functionality not yet implemented.");
      // TODO: Implement navigation or modal for editing
      // navigate(`/seller/edit-product/${productId}`);
  };

  // --- Render Logic ---
  if (!user || user.role !== "seller") {
     return <div className="w-full px-4 py-6 text-center">Verifying access...</div>; // Slightly better message
  }

  return (
    <div className="w-full px-4 py-6 space-y-8">
      <h1 className="text-2xl sm:text-3xl font-bold text-center">Seller Dashboard</h1>

      {/* Add Product Form Card */}
      <Card className="bg-card-light dark:bg-card-dark shadow-lg border border-border w-full max-w-2xl mx-auto">
        <CardHeader><CardTitle className="text-lg sm:text-xl">Add New Product</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleAddProduct} className="space-y-4">
            {submitError && ( <Alert variant="destructive"><AlertDescription>{submitError}</AlertDescription></Alert> )}
            {/* Inputs remain the same */}
            <div className="space-y-2"><Label htmlFor="product-name">Product Name</Label><Input id="product-name" name="name" type="text" placeholder="e.g., Solana Summer T-Shirt" value={form.name} onChange={handleFormChange} disabled={isSubmitting} required /></div>
            <div className="space-y-2"><Label htmlFor="product-description">Description</Label><Textarea id="product-description" name="description" placeholder="Describe your product..." value={form.description} onChange={handleFormChange} className="min-h-[80px]" disabled={isSubmitting} required /></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2"><Label htmlFor="product-price">Price ($)</Label><Input id="product-price" name="price" type="number" placeholder="0.00" value={form.price} onChange={handleFormChange} min="0.01" step="0.01" disabled={isSubmitting} required /></div>
              <div className="space-y-2"><Label htmlFor="product-stock">Stock Quantity</Label><Input id="product-stock" name="stock" type="number" placeholder="0" value={form.stock} onChange={handleFormChange} min="0" step="1" disabled={isSubmitting} required /></div>
            </div>
            <Button type="submit" className="w-full sm:w-auto" disabled={isSubmitting}>
              {isSubmitting ? "Adding Product..." : "Add Product"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Your Products List Card */}
      <Card className="bg-card-light dark:bg-card-dark shadow-lg border border-border w-full max-w-4xl mx-auto">
        <CardHeader><CardTitle className="text-lg sm:text-xl">Your Products</CardTitle></CardHeader>
        <CardContent>
          {isLoadingProducts ? (
            <p className="text-center text-muted-foreground py-4">Loading your products...</p> // Added padding
          ) : fetchError ? (
            <Alert variant="destructive"><AlertDescription>{fetchError}</AlertDescription></Alert>
          ) : products.length === 0 ? (
             <p className="text-center text-muted-foreground py-4">You haven't added any products yet.</p> // Added padding
          ) : (
            <ul className="space-y-3">
              {products.map((product) => {
                const isDeleting = deletingProductId === product._id;
                return (
                  <li key={product._id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 p-3 border rounded-md hover:bg-muted/50 transition-colors"> {/* Added hover effect */}
                    {/* Product Info */}
                    <div className="flex-grow min-w-0 mr-4">
                      <Link to={`/product/${product._id}`} className="font-medium block truncate hover:underline" title={product.name}>{product.name}</Link> {/* Link title */}
                      <span className="text-sm text-muted-foreground"> - ${product.price?.toFixed(2)}</span>
                    </div>
                    {/* Stock & Actions */}
                    <div className="flex items-center gap-2 flex-shrink-0 w-full sm:w-auto justify-end mt-2 sm:mt-0"> {/* Ensure wrapping on small screens */}
                       <span className={`text-xs font-semibold px-2 py-1 rounded-full whitespace-nowrap ${product.stock > 0 ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'}`}>
                         {product.stock > 0 ? `Stock: ${product.stock}` : 'Out of Stock'} {/* Improved text */}
                       </span>
                       <Button variant="outline" size="sm" asChild disabled={isDeleting}>
                           <Link to={`/product/${product._id}`}>View</Link>
                       </Button>
                       <Button variant="secondary" size="sm" onClick={() => handleEditProduct(product._id)} disabled={isDeleting}>
                           Edit
                       </Button>
                       <AlertDialog>
                           <AlertDialogTrigger asChild>
                               <Button variant="destructive" size="sm" disabled={isDeleting}>
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
                                   {/* Make sure the onClick here calls the delete handler */}
                                   <AlertDialogAction
                                      onClick={() => handleDeleteProduct(product._id, product.name)}
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90" // Style confirm button
                                    >
                                       Yes, delete product
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