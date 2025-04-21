// src/pages/Home.tsx
import { useEffect, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Product } from "../types";

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
              {/* Ensure only ONE child Link inside Button with asChild */}
              <Button asChild size="lg">
                <Link to="/login">Login</Link>
              </Button>
              {/* Ensure only ONE child Link inside Button with asChild */}
              <Button variant="outline" asChild size="lg">
                <Link to="/register">Register</Link>
              </Button>
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {products.map((product) => (
            <Card
              key={product._id}
              className="bg-card-light dark:bg-card-dark shadow-lg hover:shadow-xl transition-shadow w-full overflow-hidden border border-border flex flex-col"
            >
              <CardHeader className="pb-2">
                 <CardTitle className="text-lg sm:text-xl font-semibold line-clamp-1" title={product.name}>
                     {product.name}
                  </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 pb-4 flex-grow">
                <p className="text-gray-600 dark:text-gray-300 text-sm sm:text-base mt-1 line-clamp-3">
                  {product.description}
                </p>
                <p className="text-lg font-bold mt-2">${product.price?.toFixed(2)}</p>
                {product.stock != null && (
                   <p className={`text-xs sm:text-sm mt-1 ${product.stock > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                      {product.stock > 0 ? `In Stock: ${product.stock}` : 'Out of Stock'}
                   </p>
                )}
              </CardContent>
              <CardFooter className="flex flex-col sm:flex-row justify-between gap-2 border-t border-border pt-4">
                 {/* *** ENSURE THIS STRUCTURE IS EXACT *** */}
                 <Button variant="outline" className="w-full sm:w-auto" asChild>
                   <Link to={`/product/${product._id}`}>
                     View Details {/* Text must be INSIDE the Link */}
                   </Link>
                 </Button>
                 {/* *** END CHECK *** */}
                <Button
                  className="w-full sm:w-auto"
                  onClick={() => {
                      if (product._id) {
                          addToCart({
                              productId: product._id,
                              name: product.name,
                              price: product.price,
                              quantity: 1,
                          });
                      } else {
                          console.error("Product ID missing, cannot add to cart", product);
                      }
                  }}
                  disabled={product.stock <= 0}
                >
                  Add to Cart
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