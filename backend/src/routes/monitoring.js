import express from "express";
import {
  createIncident,
  getMonitoringDashboard,
  resolveIncident,
  trackEvent,
} from "../stores/monitoringStore.js";
import { isFeatureEnabled } from "../stores/featureFlagStore.js";

const router = express.Router();

router.use((req, res, next) => {
  if (!isFeatureEnabled("enableMonitoringDashboard")) {
    return res.status(503).json({ message: "Monitoring dashboard is disabled." });
  }
  return next();
});

router.get("/dashboard", (_req, res) => {
  res.json(getMonitoringDashboard());
});

router.post("/events", (req, res) => {
  const { type, severity, message, metadata } = req.body;
  if (!message || typeof message !== "string") {
    return res.status(400).json({ message: "message is required." });
  }

  const event = trackEvent({ type, severity, message, metadata });
  return res.status(201).json(event);
});

router.post("/incidents", (req, res) => {
  const { title, severity, alertId } = req.body;
  if (!title || typeof title !== "string") {
    return res.status(400).json({ message: "title is required." });
  }

  const incident = createIncident({ title, severity, alertId });
  return res.status(201).json(incident);
});

router.patch("/incidents/:id/resolve", (req, res) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) {
    return res.status(400).json({ message: "id must be numeric." });
  }

  const incident = resolveIncident(id);
  if (!incident) {
    return res.status(404).json({ message: "Incident not found." });
  }

  return res.json(incident);
});

export default router;
