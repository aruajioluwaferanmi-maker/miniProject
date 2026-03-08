import cors from "cors";
import express from "express";
import productsRoute from "./routes/products.js";
import cartRoute from "./routes/cart.js";
import monitoringRoute from "./routes/monitoring.js";
import featureFlagsRoute from "./routes/featureFlags.js";
import { observabilityMiddleware } from "./middleware/observability.js";

const app = express();

app.use(cors());
app.use(express.json());
app.use(observabilityMiddleware);

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/products", productsRoute);
app.use("/api/cart", cartRoute);
app.use("/api/monitoring", monitoringRoute);
app.use("/api/feature-flags", featureFlagsRoute);

export default app;
