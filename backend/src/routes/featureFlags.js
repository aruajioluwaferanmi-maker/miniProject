import express from "express";
import {
  createRelease,
  getFeatureFlags,
  getReleaseState,
  rollbackRelease,
  setFeatureFlag,
} from "../stores/featureFlagStore.js";

const router = express.Router();

router.get("/", (_req, res) => {
  res.json({ flags: getFeatureFlags() });
});

router.patch("/:flagName", (req, res) => {
  const { flagName } = req.params;
  const { enabled } = req.body;

  if (typeof enabled !== "boolean") {
    return res.status(400).json({ message: "enabled must be true or false." });
  }

  const updated = setFeatureFlag(flagName, enabled);
  if (!updated) {
    return res.status(404).json({ message: "Feature flag not found." });
  }

  return res.json(updated);
});

router.get("/releases/history", (_req, res) => {
  res.json(getReleaseState());
});

router.post("/releases", (req, res) => {
  const release = createRelease(req.body.note);
  res.status(201).json(release);
});

router.post("/rollback", (req, res) => {
  const targetReleaseId = req.body.targetReleaseId
    ? Number(req.body.targetReleaseId)
    : undefined;
  if (req.body.targetReleaseId && Number.isNaN(targetReleaseId)) {
    return res.status(400).json({ message: "targetReleaseId must be numeric." });
  }

  const rolledBack = rollbackRelease(targetReleaseId);
  if (!rolledBack) {
    return res.status(404).json({ message: "No release available to rollback to." });
  }

  return res.json(rolledBack);
});

export default router;
