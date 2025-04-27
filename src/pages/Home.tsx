// src/pages/Home.tsx
import { useState, useEffect } from "react";
import axios from "axios";
import { useCart } from "../context/CartContext";
import { Product, CartItem } from "../types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Image as ImageIcon } from "lucide-react";

const Home = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { addToCart } = useCart();

  useEffect(() => {
    const fetchProducts = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await axios.get("http://localhost:5000/api/products");
        setProducts(res.data);
      } catch (error) {
        console.error("Error fetching products:", error);
        setError("Failed to load products.");
        toast.error("Failed to load products.", { id: "products-error" });
      } finally {
        setIsLoading(false);
      }
    };

    fetchProducts();
  }, []);

  const handleAddToCart = async (product: Product) => {
    try {
      const cartItem: CartItem = {
        productId: product._id,
        name: product.name,
        price: product.price,
        solPrice: product.solPrice,
        piPrice: product.piPrice,
        quantity: 1,
        imageUrl: product.images?.[0]?.url,
      };
      await addToCart(cartItem);
      toast.success("Added to cart!", { id: "add-to-cart-success" });
    } catch (error) {
      console.error("Error adding to cart:", error);
      toast.error("Failed to add to cart.", { id: "add-to-cart-error" });
    }
  };

  if (isLoading) return <div className="w-full px-4 py-6 text-center">Loading products...</div>;
  if (error) return <div className="w-full px-4 py-6 text-center">{error}</div>;

  return (
    <div className="w-full px-4 py-6 space-y-6">
      <h1 className="text-2xl sm:text-3xl font-bold text-center">Products</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {products.map((product) => (
          <Card key={product._id} className="bg-card-light dark:bg-card-dark shadow-lg border">
            <CardHeader>
              <CardTitle className="text-lg">{product.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="w-full h-48 rounded-md bg-muted overflow-hidden border mb-4">
                {product.images?.[0]?.url ? (
                  <img src={product.images[0].url} alt={product.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                    <ImageIcon className="w-12 h-12" />
                  </div>
                )}
              </div>
              <p className="text-sm text-muted-foreground mb-2">{product.description}</p>
              <p className="text-lg font-bold mb-4">${product.price.toFixed(2)} USDC</p>
              <Button onClick={() => handleAddToCart(product)}>Add to Cart</Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Home;