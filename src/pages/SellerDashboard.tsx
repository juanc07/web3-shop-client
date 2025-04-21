// src/pages/SellerDashboard.tsx
import { useEffect, useState } from "react";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Product } from "../types";
import { useAuth } from "../context/AuthContext";

const SellerDashboard = () => {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [form, setForm] = useState({ name: "", description: "", price: 0, stock: 0 });

  useEffect(() => {
    if (user) {
      axios
        .get("http://localhost:5000/api/products/my-products", {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        })
        .then((res) => setProducts(res.data))
        .catch((err) => console.error(err));
    }
  }, [user]);

  const handleAddProduct = async () => {
    try {
      const res = await axios.post(
        "http://localhost:5000/api/products",
        form,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }
      );
      setProducts([...products, res.data]);
      setForm({ name: "", description: "", price: 0, stock: 0 });
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="w-full px-4 py-6">
      <h1 className="text-xl sm:text-2xl font-bold mb-4 text-center">Seller Dashboard</h1>
      <Card className="bg-card-light dark:bg-card-dark shadow-lg mb-6 w-full">
        <CardHeader>
          <CardTitle className="text-lg sm:text-xl">Add Product</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            type="text"
            placeholder="Name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="text-sm sm:text-base"
          />
          <Input
            type="text"
            placeholder="Description"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="text-sm sm:text-base"
          />
          <Input
            type="number"
            placeholder="Price"
            value={form.price}
            onChange={(e) => setForm({ ...form, price: parseFloat(e.target.value) })}
            className="text-sm sm:text-base"
          />
          <Input
            type="number"
            placeholder="Stock"
            value={form.stock}
            onChange={(e) => setForm({ ...form, stock: parseInt(e.target.value) })}
            className="text-sm sm:text-base"
          />
          <Button className="w-full sm:w-auto" onClick={handleAddProduct}>
            Add Product
          </Button>
        </CardContent>
      </Card>
      <Card className="bg-card-light dark:bg-card-dark shadow-lg w-full">
        <CardHeader>
          <CardTitle className="text-lg sm:text-xl">Your Products</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {products.map((product) => (
              <li
                key={product._id}
                className="flex flex-col sm:flex-row justify-between text-sm sm:text-base"
              >
                <span>{product.name} - ${product.price}</span>
                <span className="text-gray-600 dark:text-gray-300">Stock: {product.stock}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};

export default SellerDashboard;