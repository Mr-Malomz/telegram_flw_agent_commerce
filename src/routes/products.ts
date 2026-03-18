import { Router } from "express";
import { supabase } from "../database/supabase";

const router = Router();

router.get("/", async (_req, res) => {
  const { data, error } = await supabase.from("products").select("*");
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.get("/search", async (req, res) => {
  const query = (req.query.q as string) || "";
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .or(
      `name.ilike.%${query}%,brand.ilike.%${query}%,category.ilike.%${query}%,notes.ilike.%${query}%,description.ilike.%${query}%`
    );
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.get("/:id", async (req, res) => {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("id", req.params.id)
    .single();
  if (error) return res.status(404).json({ error: "Product not found" });
  res.json(data);
});

export default router;
