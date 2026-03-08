import { recordHttpMetric } from "../stores/monitoringStore.js";

export function observabilityMiddleware(req, res, next) {
  const startedAt = process.hrtime.bigint();

  res.on("finish", () => {
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
    recordHttpMetric({
      method: req.method,
      path: req.path,
      status: res.statusCode,
      durationMs: Number(durationMs.toFixed(2)),
    });
  });

  next();
}
