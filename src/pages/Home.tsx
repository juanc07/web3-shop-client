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
  const { user } = useAuth();
  const { addToCart } = useCart();

  useEffect(() => {
    axios
      .get("http://localhost:5000/api/products")
      .then((res) => setProducts(res.data))
      .catch((err) => console.error(err));
  }, []);

  return (
    <div className="w-full px-4 py-6">
      <h1 className="text-2xl sm:text-3xl font-bold mb-6 text-center">
        Welcome to Web3 Shop
      </h1>
      {!user && (
        <Card className="bg-card-light dark:bg-card-dark shadow-lg w-full max-w-2xl mx-auto mb-8">
          <CardHeader>
            <CardTitle className="text-lg sm:text-xl text-center">
              Shop with Solana or Pi Network
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-center">
            <p className="text-sm sm:text-base text-muted-foreground">
              Sign up or log in to buy products or start selling with secure crypto payments.
            </p>
            <div className="flex justify-center space-x-4">
              <Button asChild>
                <Link to="/login">Login</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/login">Register</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {products.map((product) => (
          <Card
            key={product._id}
            className="bg-card-light dark:bg-card-dark shadow-lg hover:shadow-xl transition-shadow w-full"
          >
            <CardContent className="pt-4">
              <h2 className="text-lg sm:text-xl font-semibold">{product.name}</h2>
              <p className="text-gray-600 dark:text-gray-300 text-sm sm:text-base mt-2 line-clamp-2">
                {product.description}
              </p>
              <p className="text-lg font-bold mt-2">${product.price}</p>
              <p className="text-xs sm:text-sm mt-1">Stock: {product.stock}</p>
            </CardContent>
            <CardFooter className="flex flex-col sm:flex-row justify-between gap-2">
              <Link to={`/product/${product._id}`} className="w-full sm:w-auto">
                <Button variant="outline" className="w-full">
                  View Details
                </Button>
              </Link>
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
        ))}
      </div>
    </div>
  );
};

export default Home;