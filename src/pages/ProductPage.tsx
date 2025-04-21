// src/pages/ProductPage.tsx
import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom"; // Import useNavigate and Link
import axios, { isAxiosError } from "axios"; // Import isAxiosError
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"; // Added Header/Title
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert"; // Import Alert
import { Product } from "../types"; // Ensure Product type includes imageUrl
import { useCart } from "../context/CartContext";
import { toast } from "sonner"; // Import toast for notifications
import { Image as ImageIcon } from "lucide-react"; // Placeholder icon

const ProductPage = () => {
  const { id } = useParams<{ id: string }>(); // Get product ID from URL params
  const navigate = useNavigate(); // Hook for navigation
  const [product, setProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { addToCart } = useCart();

  useEffect(() => {
    if (!id) {
      setError("Product ID not found in URL.");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    console.log(`Fetching product details for ID: ${id}`);

    axios
      .get(`http://localhost:5000/api/products/${id}`)
      .then((res) => {
        console.log("Product data received:", res.data);
        // Add basic validation for the received data structure
        if (res.data && typeof res.data === 'object' && res.data._id) {
             setProduct(res.data as Product);
        } else {
            console.error("Invalid product data structure received:", res.data);
            setError("Failed to load product details: Invalid data format.");
            setProduct(null);
        }
      })
      .catch((err) => {
        console.error(`Error fetching product ${id}:`, err);
        let message = "Failed to load product details.";
         if (isAxiosError(err)) {
             if(err.response?.status === 404){
                 message = "Product not found.";
             } else {
                message = err.response?.data?.message || err.message || message;
             }
         }
        setError(message);
        setProduct(null);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [id]); // Re-fetch if the ID changes

  // --- Render States ---
  if (isLoading) {
    return <div className="w-full px-4 py-10 text-center text-muted-foreground">Loading Product...</div>;
  }

  if (error) {
    return (
      <div className="w-full px-4 py-10 flex flex-col items-center">
         <Alert variant="destructive" className="max-w-md">
             <AlertDescription>{error}</AlertDescription>
         </Alert>
         <Button variant="outline" onClick={() => navigate(-1)} className="mt-4">
             ← Go Back
         </Button>
      </div>
    );
  }

  if (!product) {
     // This case should ideally be covered by the error state after fetch fails
    return <div className="w-full px-4 py-10 text-center">Product data unavailable.</div>;
  }

  // --- Handle Add to Cart ---
  const handleAddToCart = () => {
      if (product.stock <= 0) {
          toast.error("Sorry, this product is currently out of stock.");
          return;
      }
      addToCart({
          productId: product._id, // Ensure _id is used
          name: product.name,
          price: product.price,
          quantity: 1,
          imageUrl: product.imageUrl // Pass image URL if available
      });
      toast.success(`${product.name} added to cart!`);
  }

  return (
    <div className="w-full px-4 py-6">
      {/* Back Button */}
      <Button variant="outline" onClick={() => navigate(-1)} className="mb-6">
          ← Back
      </Button>

      <Card className="bg-card-light dark:bg-card-dark shadow-lg w-full overflow-hidden border border-border">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-0"> {/* Changed gap to 0 */}
           {/* Image Column */}
           <div className="w-full aspect-square md:aspect-auto bg-muted flex items-center justify-center overflow-hidden"> {/* Maintain aspect ratio */}
               {product.imageUrl ? (
                  <img
                     src={product.imageUrl}
                     alt={product.name}
                     className="w-full h-full object-cover transition-transform duration-300 hover:scale-105" // Added hover effect
                     />
               ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground p-4">
                      <ImageIcon className="w-16 h-16 mb-2" />
                      <span>No Image Available</span>
                  </div>
               )}
            </div>

           {/* Details Column */}
           <div className="flex flex-col"> {/* Use flex column for footer positioning */}
                <CardHeader>
                    <CardTitle className="text-2xl lg:text-3xl font-bold">{product.name}</CardTitle>
                </CardHeader>
                <CardContent className="pt-0 pb-4 flex-grow space-y-3"> {/* Allow content to grow */}
                    <p className="text-gray-700 dark:text-gray-300 text-base">
                        {product.description}
                    </p>
                    <p className="text-2xl font-bold mt-2">${product.price?.toFixed(2)}</p> {/* Formatted price */}
                    {/* Stock Indicator */}
                    <p className={`text-sm font-semibold ${product.stock > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                      {product.stock > 0 ? `In Stock (${product.stock} available)` : 'Out of Stock'}
                    </p>
                    {/* Seller Info - Link to seller page? */}
                    <p className="text-sm text-muted-foreground mt-1">
                        Sold by: <span className="font-medium">{product.seller?.name || 'Unknown Seller'}</span>
                        {/* Example Link: <Link to={`/seller/${product.seller._id}`} className="text-primary hover:underline">{product.seller.name}</Link> */}
                    </p>
                </CardContent>
                <CardFooter className="border-t border-border pt-4"> {/* Ensure footer is at bottom */}
                    <Button
                        className="w-full sm:w-auto"
                        onClick={handleAddToCart}
                        disabled={product.stock <= 0} // Disable button if out of stock
                        size="lg" // Make button larger
                    >
                        {product.stock > 0 ? "Add to Cart" : "Out of Stock"}
                    </Button>
                </CardFooter>
            </div>
        </div>
      </Card>
    </div>
  );
};

export default ProductPage;