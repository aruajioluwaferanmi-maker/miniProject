import express from "express";
import { addToCart, listCartItems, removeFromCart } from "../stores/cartStore.js";
import { getProductById } from "../services/productService.js";
import { isFeatureEnabled } from "../stores/featureFlagStore.js";

const router = express.Router();

router.use((req, res, next) => {
  if (!isFeatureEnabled("enableCart")) {
    return res.status(503).json({ message: "Cart feature is disabled by feature flag." });
  }
  return next();
});

router.get("/", async (_req, res) => {
  const items = await Promise.all(
    listCartItems().map(async (item) => {
      const product = await getProductById(item.productId);
      if (!product) {
        return null;
      }

      return {
        product,
        quantity: item.quantity,
        lineTotal: Number((product.price * item.quantity).toFixed(2)),
      };
    }),
  );

  const cartItems = items.filter(Boolean);
  const total = Number(
    cartItems.reduce((sum, item) => sum + item.lineTotal, 0).toFixed(2),
  );

  res.json({ items: cartItems, total });
});

router.post("/", async (req, res) => {
  const productId = Number(req.body.productId);
  const quantity = Number(req.body.quantity ?? 1);

  if (!Number.isInteger(productId) || productId <= 0) {
    return res.status(400).json({ message: "productId must be a positive integer." });
  }

  const product = await getProductById(productId);
  if (!product) {
    return res.status(404).json({ message: "Product not found." });
  }

  addToCart(productId, quantity);
  return res.status(201).json({ message: "Added to cart." });
});

router.delete("/:productId", (req, res) => {
  const productId = Number(req.params.productId);
  if (!Number.isInteger(productId) || productId <= 0) {
    return res.status(400).json({ message: "productId must be a positive integer." });
  }

  removeFromCart(productId);
  return res.status(204).send();
});

export default router;
