import express from "express";
import { getProductById, getProducts } from "../services/productService.js";
import { isFeatureEnabled } from "../stores/featureFlagStore.js";

const router = express.Router();

router.get("/", async (req, res) => {
  const allProducts = await getProducts();
  res.json(allProducts);
});

router.get("/:id", async (req, res) => {
  if (!isFeatureEnabled("enableProductDetails")) {
    return res.status(503).json({ message: "Product details feature is disabled." });
  }

  const product = await getProductById(req.params.id);
  if (!product) {
    return res.status(404).json({ message: "Product not found." });
  }

  return res.json(product);
});

export default router;
