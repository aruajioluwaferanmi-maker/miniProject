const MAX_EVENTS = 300;

let eventId = 1;
let alertId = 1;
let incidentId = 1;

const events = [];
const alerts = [];
const incidents = [];

const requestMetrics = {
  totalRequests: 0,
  totalErrors: 0,
  totalLatencyMs: 0,
  perRoute: {},
};

function pushWithLimit(collection, item, max = 200) {
  collection.unshift(item);
  if (collection.length > max) {
    collection.length = max;
  }
}

export function trackEvent({
  type = "custom",
  severity = "info",
  message,
  metadata = {},
}) {
  const event = {
    id: eventId++,
    type,
    severity,
    message,
    metadata,
    timestamp: new Date().toISOString(),
  };
  pushWithLimit(events, event, MAX_EVENTS);

  if (severity === "high" || severity === "critical") {
    const alert = {
      id: alertId++,
      severity,
      message,
      createdAt: event.timestamp,
      acknowledged: false,
    };
    pushWithLimit(alerts, alert, 100);
  }

  return event;
}

export function recordHttpMetric({ method, path, status, durationMs }) {
  requestMetrics.totalRequests += 1;
  requestMetrics.totalLatencyMs += durationMs;

  if (status >= 500) {
    requestMetrics.totalErrors += 1;
    trackEvent({
      type: "http_error",
      severity: "high",
      message: `${method} ${path} returned ${status}`,
      metadata: { method, path, status, durationMs },
    });
  }

  const routeKey = `${method} ${path}`;
  if (!requestMetrics.perRoute[routeKey]) {
    requestMetrics.perRoute[routeKey] = {
      count: 0,
      errors: 0,
      totalLatencyMs: 0,
    };
  }

  requestMetrics.perRoute[routeKey].count += 1;
  requestMetrics.perRoute[routeKey].totalLatencyMs += durationMs;
  if (status >= 500) {
    requestMetrics.perRoute[routeKey].errors += 1;
  }
}

export function createIncident({ title, severity = "medium", alertId: linkedAlertId }) {
  const incident = {
    id: incidentId++,
    title,
    severity,
    status: "open",
    alertId: linkedAlertId || null,
    createdAt: new Date().toISOString(),
    resolvedAt: null,
  };
  pushWithLimit(incidents, incident, 100);
  return incident;
}

export function resolveIncident(id) {
  const incident = incidents.find((item) => item.id === id);
  if (!incident) {
    return null;
  }
  incident.status = "resolved";
  incident.resolvedAt = new Date().toISOString();
  return incident;
}

export function getMonitoringDashboard() {
  const avgLatencyMs =
    requestMetrics.totalRequests === 0
      ? 0
      : Number((requestMetrics.totalLatencyMs / requestMetrics.totalRequests).toFixed(2));
  const errorRate =
    requestMetrics.totalRequests === 0
      ? 0
      : Number(((requestMetrics.totalErrors / requestMetrics.totalRequests) * 100).toFixed(2));

  const routes = Object.entries(requestMetrics.perRoute).map(([route, data]) => ({
    route,
    count: data.count,
    errors: data.errors,
    avgLatencyMs: Number((data.totalLatencyMs / data.count).toFixed(2)),
  }));

  return {
    summary: {
      totalRequests: requestMetrics.totalRequests,
      totalErrors: requestMetrics.totalErrors,
      avgLatencyMs,
      errorRate,
    },
    alerts,
    incidents,
    recentEvents: events.slice(0, 50),
    routes,
  };
}
