// src/pages/Home.tsx
import { useEffect, useState } from "react";
import axios, { isAxiosError } from "axios";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { Product } from "../types";
import { Image as ImageIcon } from "lucide-react";

const Home = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProducts = async () => {
      setIsLoading(true);
      setFetchError(null);
      try {
        const res = await axios.get("http://localhost:5000/api/products");
        console.log("Home: Fetched products:", res.data);
        setProducts(res.data);
      } catch (err) {
        console.error("Home: Error fetching products:", err);
        let message = "Failed to load products.";
        if (isAxiosError(err)) message = err.response?.data?.message || err.message || message;
        setFetchError(message);
        toast.error(message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProducts();
  }, []);

  const handleAddToCart = async (product: Product) => {
    const token = localStorage.getItem("token");
    console.log("Home: Token:", token ? "Present" : "Missing");
    if (!token) {
      toast.error("Please login to add items to your cart.");
      return;
    }

    if (!product._id) {
      toast.error("Invalid product ID.");
      console.error(`Home: Invalid product ID for ${product.name}`);
      return;
    }

    try {
      console.log("Home: Sending cart request:", {
        productId: product._id,
        quantity: 1,
      });
      const response = await axios.post(
        "http://localhost:5000/api/cart/add",
        {
          productId: product._id,
          quantity: 1,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      console.log("Home: Cart response:", response.data);
      toast.success(`${product.name} added to cart!`);
    } catch (error) {
      console.error("Home: Error adding to cart:", error);
      let message = "Failed to add item to cart.";
      if (isAxiosError(error)) {
        message = error.response?.data?.message || error.message || message;
        console.log("Home: Error response:", error.response?.data);
      }
      toast.error(message);
    }
  };

  if (isLoading) return <div className="w-full px-4 py-6 text-center">Loading products...</div>;
  if (fetchError) return <div className="w-full px-4 py-6 text-center"><Alert variant="destructive"><AlertDescription>{fetchError}</AlertDescription></Alert></div>;

  return (
    <div className="w-full px-4 py-6 space-y-6">
      <h1 className="text-2xl sm:text-3xl font-bold text-center">Welcome to Web3 Shop</h1>

      {products.length === 0 ? (
        <p className="text-center text-muted-foreground">No products available.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((product) => {
            const imageSrc =
              product.images && product.images.length > 0
                ? product.images[0].url
                : product.imageUrl || undefined;

            return (
              <Card key={product._id} className="bg-card-light dark:bg-card-dark shadow-lg border border-border">
                <CardHeader>
                  <CardTitle className="text-lg truncate">{product.name}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="w-full h-48 rounded-md bg-muted flex-shrink-0 overflow-hidden border">
                    {imageSrc ? (
                      <img
                        src={imageSrc}
                        alt={product.name}
                        className="w-full h-full object-cover"
                        onError={() => console.error(`Home: Failed to load image for ${product.name}: ${imageSrc}`)}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                        <ImageIcon className="w-12 h-12" />
                        <span className="ml-2">No image</span>
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground line-clamp-2">{product.description}</p>
                    <p className="text-lg font-semibold">${product.price.toFixed(2)}</p>
                    <p
                      className={`text-sm ${
                        product.stock > 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                      }`}
                    >
                      {product.stock > 0 ? `In Stock: ${product.stock}` : "Out of Stock"}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" asChild disabled={!product._id}>
                      <Link
                        to={`/product/${product._id}`}
                        onClick={() => console.log(`Home: Navigating to product: ${product._id}`)}
                      >
                        View Details
                      </Link>
                    </Button>
                    {product.stock > 0 && (
                      <Button onClick={() => handleAddToCart(product)} disabled={!product._id}>
                        Add to Cart
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Home;