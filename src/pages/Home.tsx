// src/pages/Home.tsx
import { useEffect, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Product } from "../types"; // Ensure Product type includes imageUrl
import { toast } from "sonner"; // Import toast for Add to Cart feedback
import { Image as ImageIcon } from "lucide-react"; // Placeholder icon

const Home = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const { addToCart } = useCart();

  useEffect(() => {
    setIsLoading(true);
    setError(null);
    axios
      .get("http://localhost:5000/api/products")
      .then((res) => {
        if (Array.isArray(res.data)) {
          setProducts(res.data);
        } else {
          console.error("API Error: Products response is not an array", res.data);
          setError("Failed to load products: Invalid data format.");
          setProducts([]);
        }
      })
      .catch((err) => {
        console.error("API Error fetching products:", err);
        setError("Failed to load products. Please try again later.");
        setProducts([]);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

   // --- Handle Add to Cart ---
   const handleAddToCart = (product: Product) => {
      if (!product._id) {
          console.error("Product ID missing, cannot add to cart", product);
          toast.error("Cannot add item to cart (missing ID).");
          return;
      }
      if (product.stock <= 0) {
          toast.error("Sorry, this product is currently out of stock.");
          return;
      }
      addToCart({
          productId: product._id,
          name: product.name,
          price: product.price,
          quantity: 1,
          imageUrl: product.imageUrl // Pass image if available
      });
      toast.success(`${product.name} added to cart!`);
  }


  return (
    <div className="w-full">
      <h1 className="text-2xl sm:text-3xl font-bold mb-6 text-center">
        Welcome to Web3 Shop
      </h1>

      {/* Call to Action Section */}
      {!user && (
        <Card className="bg-card-light dark:bg-card-dark shadow-lg w-full max-w-2xl mx-auto mb-8 border border-border">
          <CardHeader>
            <CardTitle className="text-lg sm:text-xl text-center">
              Shop with Solana or Pi Network
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-center">
            <p className="text-sm sm:text-base text-muted-foreground">
              Sign up or log in to buy products or start selling with secure crypto payments.
            </p>
            <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
              <Button asChild size="lg"><Link to="/login">Login</Link></Button>
              <Button variant="outline" asChild size="lg"><Link to="/register">Register</Link></Button>
            </div>
          </CardContent>
        </Card>
      )}

       {/* Product Grid Section */}
      {isLoading ? (
        <p className="text-center text-muted-foreground mt-8">Loading products...</p>
      ) : error ? (
         <p className="text-center text-destructive mt-8">{error}</p>
      ) : products.length === 0 ? (
         <p className="text-center text-muted-foreground mt-8">No products available at the moment.</p>
      ) :(
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6"> {/* Responsive columns & gap */}
          {products.map((product) => (
            <Card
              key={product._id}
              className="bg-card-light dark:bg-card-dark shadow-md hover:shadow-lg transition-shadow w-full overflow-hidden border border-border flex flex-col group" // Added group for hover effects
            >
               {/* --- Image Section --- */}
              <Link to={`/product/${product._id}`} className="block relative overflow-hidden aspect-square bg-muted"> {/* Aspect ratio for consistent size */}
                 {product.imageUrl ? (
                      <img
                          src={product.imageUrl}
                          alt={product.name}
                          // Use width/height or fill based on next/image if using Next.js
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" // Zoom effect on hover
                      />
                  ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                          <ImageIcon className="w-1/3 h-1/3 opacity-50" /> {/* Placeholder */}
                      </div>
                  )}
              </Link>
              {/* --- End Image Section --- */}

              {/* Card Content below image */}
              <div className="p-4 flex flex-col flex-grow"> {/* Use padding instead of CardHeader/CardContent for flexibility */}
                  <CardTitle className="text-base sm:text-lg font-semibold line-clamp-1 mb-1" title={product.name}> {/* Adjusted size */}
                     <Link to={`/product/${product._id}`} className="hover:underline">{product.name}</Link>
                  </CardTitle>
                  <p className="text-muted-foreground text-xs sm:text-sm mb-2 line-clamp-2 flex-grow"> {/* Allow description to grow */}
                     {product.description}
                  </p>
                  {/* Price and Stock */}
                  <div className="flex justify-between items-center mt-2">
                     <p className="text-lg font-bold">${product.price?.toFixed(2)}</p>
                     {product.stock != null && (
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${product.stock > 0 ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'}`}>
                           {product.stock > 0 ? `Stock: ${product.stock}` : 'Out of Stock'}
                        </span>
                     )}
                  </div>
              </div>

              {/* Footer with Actions */}
              <CardFooter className="flex flex-col sm:flex-row justify-between items-center gap-2 border-t border-border p-4"> {/* Consistent padding */}
                 <Button variant="outline" size="sm" className="w-full sm:w-auto" asChild>
                   <Link to={`/product/${product._id}`}>View Details</Link>
                 </Button>
                 <Button
                   size="sm"
                   className="w-full sm:w-auto"
                   onClick={() => handleAddToCart(product)} // Use handler
                   disabled={product.stock <= 0}
                 >
                   {product.stock > 0 ? "Add to Cart" : "Out of Stock"}
                 </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default Home;