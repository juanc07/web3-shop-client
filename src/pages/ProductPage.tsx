// src/pages/ProductPage.tsx
import { useEffect, useState } from "react";
import axios, { isAxiosError } from "axios";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { Product } from "../types";
import { useAuth } from "../context/AuthContext";
import { Image as ImageIcon, ChevronLeft, ChevronRight } from "lucide-react";

const ProductPage = () => {
  const { productId } = useParams<{ productId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [product, setProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [quantity, setQuantity] = useState<number>(1);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [cartError, setCartError] = useState<string | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0); // Carousel state

  useEffect(() => {
    console.log("ProductPage: productId from useParams:", productId);
    if (!productId) {
      setFetchError("Product ID is missing.");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setFetchError(null);
    console.log(`ProductPage: Fetching product details for ID: ${productId}`);
    axios
      .get(`http://localhost:5000/api/products/${productId}`)
      .then((res) => {
        console.log("ProductPage: Product fetched:", res.data);
        setProduct(res.data);
      })
      .catch((err) => {
        console.error("ProductPage: Error fetching product:", err);
        let message = "Failed to load product.";
        if (isAxiosError(err)) message = err.response?.data?.message || err.message || message;
        setFetchError(message);
        toast.error(message);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [productId]);

  const handleAddToCart = async () => {
    if (!user) {
      toast.error("Please login to add items to your cart.");
      navigate("/login");
      return;
    }
    if (!product || quantity < 1 || quantity > product.stock) {
      const message = "Invalid quantity or product not available.";
      setCartError(message);
      toast.error(message);
      return;
    }

    setIsAddingToCart(true);
    setCartError(null);
    const token = localStorage.getItem("token");
    console.log("ProductPage: Token:", token ? "Present" : "Missing");
    if (!token) {
      toast.error("Authentication required.");
      setIsAddingToCart(false);
      navigate("/login");
      return;
    }

    try {
      console.log("ProductPage: Sending cart request:", {
        productId: product._id,
        quantity,
      });
      const response = await axios.post(
        "http://localhost:5000/api/cart/add",
        {
          productId: product._id,
          quantity,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      console.log("ProductPage: Cart response:", response.data);
      toast.success(`${product.name} added to cart!`);
      setQuantity(1);
    } catch (error) {
      console.error("ProductPage: Error adding to cart:", error);
      let message = "Failed to add item to cart.";
      if (isAxiosError(error)) {
        message = error.response?.data?.message || error.message || message;
        console.log("ProductPage: Error response:", error.response?.data);
      }
      setCartError(message);
      toast.error(message);
    } finally {
      setIsAddingToCart(false);
    }
  };

  // Carousel navigation
  const handlePrevImage = () => {
    if (!product) return;
    const images = product.images && product.images.length > 0 ? product.images : product.imageUrl ? [{ url: product.imageUrl, publicId: product.imagePublicId || "legacy" }] : [];
    setCurrentImageIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const handleNextImage = () => {
    if (!product) return;
    const images = product.images && product.images.length > 0 ? product.images : product.imageUrl ? [{ url: product.imageUrl, publicId: product.imagePublicId || "legacy" }] : [];
    setCurrentImageIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  if (isLoading) return <div className="w-full px-4 py-6 text-center">Loading product...</div>;
  if (fetchError) return <div className="w-full px-4 py-6 text-center"><Alert variant="destructive"><AlertDescription>{fetchError}</AlertDescription></Alert></div>;
  if (!product) return <div className="w-full px-4 py-6 text-center">Product not found.</div>;

  const images = product.images && product.images.length > 0 ? product.images : product.imageUrl ? [{ url: product.imageUrl, publicId: product.imagePublicId || "legacy" }] : [];
  const currentImage = images[currentImageIndex];

  return (
    <div className="w-full px-4 py-6 space-y-6">
      <Button variant="outline" onClick={() => navigate(-1)} className="mb-4">
        ← Back
      </Button>

      <Card className="bg-card-light dark:bg-card-dark shadow-lg border border-border w-full max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle className="text-lg sm:text-xl">{product.name}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            {images.length > 0 ? (
              <div className="relative">
                <img
                  src={currentImage.url}
                  alt={`${product.name} image ${currentImageIndex + 1}`}
                  className="w-full h-[400px] object-contain rounded-md border"
                  onError={() => console.error(`ProductPage: Failed to load image: ${currentImage.url}`)}
                />
                {images.length > 1 && (
                  <>
                    <Button
                      variant="outline"
                      size="icon"
                      className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-white dark:bg-gray-800"
                      onClick={handlePrevImage}
                    >
                      <ChevronLeft className="h-6 w-6" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-white dark:bg-gray-800"
                      onClick={handleNextImage}
                    >
                      <ChevronRight className="h-6 w-6" />
                    </Button>
                  </>
                )}
              </div>
            ) : (
              <div className="w-full h-[400px] bg-muted rounded-md flex items-center justify-center text-muted-foreground">
                <ImageIcon className="w-12 h-12" />
                <span className="ml-2">No images available</span>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <p className="text-muted-foreground">{product.description}</p>
            <p className="text-lg font-semibold">Price: ${product.price.toFixed(2)}</p>
            <p
              className={`text-sm ${
                product.stock > 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
              }`}
            >
              {product.stock > 0 ? `In Stock: ${product.stock} available` : "Out of Stock"}
            </p>
            <p className="text-sm">
              Sold by: {product.seller.username || product.seller.firstName || product.seller.lastName || "N/A"}
            </p>
          </div>

          {product.stock > 0 && (
            <div className="space-y-4">
              {cartError && <Alert variant="destructive"><AlertDescription>{cartError}</AlertDescription></Alert>}
              <div className="flex items-center gap-4 max-w-xs">
                <Label htmlFor="quantity" className="flex-shrink-0">
                  Quantity:
                </Label>
                <Input
                  id="quantity"
                  type="number"
                  min="1"
                  max={product.stock}
                  value={quantity}
                  onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                  className="w-20"
                  disabled={isAddingToCart}
                />
              </div>
              <Button
                onClick={handleAddToCart}
                disabled={isAddingToCart || quantity < 1 || quantity > product.stock}
              >
                {isAddingToCart ? "Adding to Cart..." : "Add to Cart"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ProductPage;