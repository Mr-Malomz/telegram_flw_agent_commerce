import { Router } from "express";
import { supabase } from "../database/supabase";

const router = Router();

router.post("/", async (req, res) => {
  const { product_id, user_id } = req.body;

  const { data: product, error: productError } = await supabase
    .from("products")
    .select("price")
    .eq("id", product_id)
    .single();

  if (productError || !product)
    return res.status(404).json({ error: "Product not found" });

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert({ product_id, user_id, amount: product.price, status: "pending" })
    .select()
    .single();

  if (orderError) return res.status(500).json({ error: orderError.message });
  res.json(order);
});

export default router;
