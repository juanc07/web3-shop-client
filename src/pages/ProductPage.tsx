// src/pages/ProductPage.tsx
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Product } from "../types";
import { useCart } from "../context/CartContext";

const ProductPage = () => {
  const { id } = useParams();
  const [product, setProduct] = useState<Product | null>(null);
  const { addToCart } = useCart();

  useEffect(() => {
    axios
      .get(`http://localhost:5000/api/products/${id}`)
      .then((res) => setProduct(res.data))
      .catch((err) => console.error(err));
  }, [id]);

  if (!product) return <div className="w-full px-4 py-6 text-center">Loading...</div>;

  return (
    <div className="w-full px-4 py-6 flex justify-center">
      <Card className="bg-card-light dark:bg-card-dark shadow-lg w-full max-w-2xl">
        <CardContent className="pt-4">
          <h1 className="text-xl sm:text-2xl font-bold">{product.name}</h1>
          <p className="text-gray-600 dark:text-gray-300 text-sm sm:text-base mt-2">
            {product.description}
          </p>
          <p className="text-lg sm:text-xl font-bold mt-2">${product.price}</p>
          <p className="text-xs sm:text-sm mt-1">Stock: {product.stock}</p>
          <p className="text-xs sm:text-sm mt-1">Seller: {product.seller.name}</p>
        </CardContent>
        <CardFooter>
          <Button
            className="w-full sm:w-auto"
            onClick={() =>
              addToCart({
                productId: product._id,
                name: product.name,
                price: product.price,
                quantity: 1,
              })
            }
          >
            Add to Cart
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default ProductPage;