import { useEffect, useMemo, useState } from "react";
import "./App.css";
import uiConfig from "./uiConfig.js";

const apiBaseUrl =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";
let activeApiBaseUrl = apiBaseUrl;
const currencyFormatter = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  maximumFractionDigits: 2,
});

function getApiCandidates() {
  const host = window.location.hostname || "localhost";
  return [
    ...new Set([
      apiBaseUrl,
      `http://${host}:5000/api`,
      `http://${host}:5001/api`,
      `http://${host}:5002/api`,
    ]),
  ];
}

async function resolveApiBaseUrl() {
  const candidates = getApiCandidates();

  for (const candidate of candidates) {
    try {
      const response = await fetch(`${candidate}/health`);
      if (response.ok) {
        activeApiBaseUrl = candidate;
        return candidate;
      }
    } catch {
      // Try next candidate.
    }
  }

  return null;
}

async function apiRequest(path, options) {
  const response = await fetch(`${activeApiBaseUrl}${path}`, options);
  if (!response.ok && response.status !== 204) {
    const errorPayload = await response.json().catch(() => ({}));
    throw new Error(errorPayload.message || "Request failed");
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

function App() {
  const [activeTab, setActiveTab] = useState("shop");
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [cart, setCart] = useState({ items: [], total: 0 });
  const [featureFlags, setFeatureFlags] = useState({
    enableCart: true,
    enableProductDetails: true,
    enableMonitoringDashboard: true,
  });
  const [monitoring, setMonitoring] = useState({
    summary: {
      totalRequests: 0,
      totalErrors: 0,
      avgLatencyMs: 0,
      errorRate: 0,
    },
    alerts: [],
    incidents: [],
    recentEvents: [],
    routes: [],
  });
  const [releaseState, setReleaseState] = useState({
    currentReleaseId: null,
    history: [],
  });
  const [statusMessage, setStatusMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [resolvedApiBaseUrl, setResolvedApiBaseUrl] = useState(apiBaseUrl);

  const cartCount = useMemo(
    () => cart.items.reduce((sum, item) => sum + item.quantity, 0),
    [cart.items],
  );

  async function fetchProducts() {
    try {
      const items = await apiRequest("/products");
      setProducts(items);
      if (items.length > 0 && !selectedProduct) {
        setSelectedProduct(items[0]);
      }
    } catch (error) {
      setErrorMessage(error.message);
    }
  }

  async function fetchCart() {
    if (!featureFlags.enableCart) {
      setCart({ items: [], total: 0 });
      return;
    }

    try {
      const cartPayload = await apiRequest("/cart");
      setCart(cartPayload);
    } catch (error) {
      setErrorMessage(error.message);
    }
  }

  async function loadProductDetails(productId) {
    if (!featureFlags.enableProductDetails) {
      setStatusMessage("Product details are disabled.");
      return;
    }

    try {
      const product = await apiRequest(`/products/${productId}`);
      setSelectedProduct(product);
      setStatusMessage("");
    } catch (error) {
      setErrorMessage(error.message);
    }
  }

  async function addProductToCart(productId) {
    if (!featureFlags.enableCart) {
      setStatusMessage("Cart is disabled by feature flag.");
      return;
    }

    try {
      await apiRequest("/cart", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ productId, quantity: 1 }),
      });
      await fetchCart();
      setStatusMessage("Product added to cart.");
      setErrorMessage("");
    } catch (error) {
      setErrorMessage(error.message);
    }
  }

  async function removeProductFromCart(productId) {
    if (!featureFlags.enableCart) {
      setStatusMessage("Cart is disabled by feature flag.");
      return;
    }

    try {
      await apiRequest(`/cart/${productId}`, { method: "DELETE" });
      await fetchCart();
      setStatusMessage("Product removed from cart.");
      setErrorMessage("");
    } catch (error) {
      setErrorMessage(error.message);
    }
  }

  async function fetchFeatureFlags() {
    try {
      const payload = await apiRequest("/feature-flags");
      setFeatureFlags(payload.flags);
    } catch (error) {
      setErrorMessage(error.message);
    }
  }

  async function fetchMonitoring() {
    if (!featureFlags.enableMonitoringDashboard) {
      return;
    }

    try {
      const payload = await apiRequest("/monitoring/dashboard");
      setMonitoring(payload);
    } catch (error) {
      setErrorMessage(error.message);
    }
  }

  async function fetchReleases() {
    try {
      const payload = await apiRequest("/feature-flags/releases/history");
      setReleaseState(payload);
    } catch (error) {
      setErrorMessage(error.message);
    }
  }

  async function toggleFeatureFlag(flagName, enabled) {
    try {
      await apiRequest(`/feature-flags/${flagName}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ enabled }),
      });
      await Promise.all([
        fetchFeatureFlags(),
        fetchReleases(),
        fetchMonitoring(),
      ]);
      setStatusMessage(`Flag ${flagName} set to ${enabled}.`);
      setErrorMessage("");
    } catch (error) {
      setErrorMessage(error.message);
    }
  }

  async function createReleaseSnapshot() {
    try {
      await apiRequest("/feature-flags/releases", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ note: "Manual snapshot from dashboard" }),
      });
      await Promise.all([fetchReleases(), fetchMonitoring()]);
      setStatusMessage("New release snapshot created.");
    } catch (error) {
      setErrorMessage(error.message);
    }
  }

  async function rollbackRelease() {
    try {
      await apiRequest("/feature-flags/rollback", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      });
      await Promise.all([
        fetchFeatureFlags(),
        fetchReleases(),
        fetchMonitoring(),
        fetchProducts(),
        fetchCart(),
      ]);
      setStatusMessage("Rollback executed.");
    } catch (error) {
      setErrorMessage(error.message);
    }
  }

  async function logTestEvent() {
    try {
      await apiRequest("/monitoring/events", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          type: "manual_test",
          severity: "info",
          message: "Manual dashboard tracking event",
        }),
      });
      await fetchMonitoring();
      setStatusMessage("Tracking event logged.");
    } catch (error) {
      setErrorMessage(error.message);
    }
  }

  async function createTestIncident() {
    try {
      await apiRequest("/monitoring/incidents", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: "Checkout latency investigation",
          severity: "medium",
        }),
      });
      await fetchMonitoring();
      setStatusMessage("Incident created.");
    } catch (error) {
      setErrorMessage(error.message);
    }
  }

  async function resolveIncident(incidentId) {
    try {
      await apiRequest(`/monitoring/incidents/${incidentId}/resolve`, {
        method: "PATCH",
      });
      await fetchMonitoring();
      setStatusMessage(`Incident ${incidentId} resolved.`);
    } catch (error) {
      setErrorMessage(error.message);
    }
  }

  useEffect(() => {
    (async () => {
      const resolvedUrl = await resolveApiBaseUrl();
      if (resolvedUrl) {
        setResolvedApiBaseUrl(resolvedUrl);
      }
      await Promise.all([
        fetchFeatureFlags(),
        fetchProducts(),
        fetchCart(),
        fetchMonitoring(),
        fetchReleases(),
      ]);

      if (!resolvedUrl) {
        setErrorMessage(
          "Backend is unreachable. Start backend server and refresh the page.",
        );
      }
    })();
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      fetchMonitoring();
    }, 10000);

    return () => clearInterval(timer);
  }, [featureFlags.enableMonitoringDashboard]);

  function renderSection(section) {
    switch (section) {
      case "products":
        return (
          <div className="panel">
            <h2>Products</h2>
            <div className="productGrid">
              {products.map((product) => (
                <article className="productCard" key={product.id}>
                  <img src={product.image} alt={product.name} />
                  <h3>{product.name}</h3>
                  <p className="price">
                    {currencyFormatter.format(product.price)}
                  </p>
                  <div className="actions">
                    <button
                      onClick={() => loadProductDetails(product.id)}
                      disabled={!featureFlags.enableProductDetails}
                    >
                      View details
                    </button>
                    <button
                      onClick={() => addProductToCart(product.id)}
                      disabled={!featureFlags.enableCart}
                    >
                      Add to cart
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </div>
        );
      case "details":
        return (
          <aside className="panel detailsPanel">
            <h2>Product Details</h2>
            {!featureFlags.enableProductDetails ? (
              <p>Product details are disabled by feature flag.</p>
            ) : selectedProduct ? (
              <>
                <img
                  src={selectedProduct.image}
                  alt={selectedProduct.name}
                  className="detailImage"
                />
                <h3>{selectedProduct.name}</h3>
                <p className="price">
                  {currencyFormatter.format(selectedProduct.price)}
                </p>
                <p>{selectedProduct.description}</p>
                <button onClick={() => addProductToCart(selectedProduct.id)}>
                  Add selected item
                </button>
              </>
            ) : (
              <p>Select a product to see more description.</p>
            )}
          </aside>
        );
      case "cart":
        return (
          <section className="panel">
            <h2>Cart</h2>
            {!featureFlags.enableCart ? (
              <p>Cart is disabled by feature flag.</p>
            ) : cart.items.length === 0 ? (
              <p>Your cart is empty.</p>
            ) : (
              <ul className="cartList">
                {cart.items.map((item) => (
                  <li key={item.product.id}>
                    <span>
                      {item.product.name} x {item.quantity}
                    </span>
                    <span>{currencyFormatter.format(item.lineTotal)}</span>
                    <button
                      onClick={() => removeProductFromCart(item.product.id)}
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <p className="cartTotal">
              Total: {currencyFormatter.format(cart.total)}
            </p>
          </section>
        );
      case "opsFlags":
        return (
          <article className="panel">
            <h2>Feature Flags</h2>
            <div className="flagList">
              {Object.entries(featureFlags).map(([key, value]) => (
                <label key={key} className="flagItem">
                  <span>{key}</span>
                  <input
                    type="checkbox"
                    checked={value}
                    onChange={(event) =>
                      toggleFeatureFlag(key, event.target.checked)
                    }
                  />
                </label>
              ))}
            </div>
            <div className="actions">
              <button onClick={createReleaseSnapshot}>
                Create release snapshot
              </button>
              <button onClick={rollbackRelease}>
                Rollback to previous release
              </button>
            </div>
            <p>
              Current release:{" "}
              <strong>{releaseState.currentReleaseId || "N/A"}</strong>
            </p>
            <ul className="opsList">
              {releaseState.history.slice(0, 5).map((release) => (
                <li key={release.releaseId}>
                  <strong>#{release.releaseId}</strong> - {release.note}
                </li>
              ))}
            </ul>
          </article>
        );
      case "opsMonitoring":
        return (
          <article className="panel">
            <h2>Monitoring</h2>
            <p>Total Requests: {monitoring.summary.totalRequests}</p>
            <p>Total Errors: {monitoring.summary.totalErrors}</p>
            <p>Avg Latency: {monitoring.summary.avgLatencyMs}ms</p>
            <p>Error Rate: {monitoring.summary.errorRate}%</p>
            <div className="actions">
              <button onClick={logTestEvent}>Log tracking event</button>
              <button onClick={createTestIncident}>Create incident</button>
            </div>
          </article>
        );
      case "opsAlerts":
        return (
          <article className="panel">
            <h2>Alerts</h2>
            <ul className="opsList">
              {monitoring.alerts.length === 0 ? (
                <li>No active alerts.</li>
              ) : null}
              {monitoring.alerts.slice(0, 6).map((alert) => (
                <li key={alert.id}>
                  [{alert.severity}] {alert.message}
                </li>
              ))}
            </ul>

            <h2>Incidents</h2>
            <ul className="opsList">
              {monitoring.incidents.length === 0 ? (
                <li>No incidents.</li>
              ) : null}
              {monitoring.incidents.slice(0, 6).map((incident) => (
                <li key={incident.id}>
                  <span>
                    #{incident.id} {incident.title} ({incident.status})
                  </span>
                  {incident.status !== "resolved" ? (
                    <button onClick={() => resolveIncident(incident.id)}>
                      Resolve
                    </button>
                  ) : null}
                </li>
              ))}
            </ul>

            <h2>Tracking Events</h2>
            <ul className="opsList">
              {monitoring.recentEvents.slice(0, 8).map((event) => (
                <li key={event.id}>
                  [{event.severity}] {event.type}: {event.message}
                </li>
              ))}
            </ul>
          </article>
        );
      default:
        return null;
    }
  }

  const shopSections = uiConfig.shopSections.filter(
    (section) => section.enabled,
  );
  const opsSections = uiConfig.opsSections.filter((section) => section.enabled);
  const shopLayoutSections = shopSections.filter(
    (section) => section.location === "layout",
  );
  const shopFullSections = shopSections.filter(
    (section) => section.location === "full",
  );

  return (
    <main className="storefront">
      <header className="hero">
        <p className="eyebrow">Mini Commerce</p>
        <h1>Discover Products, View Details, and Manage Your Cart</h1>
        <p>
          Environment: <strong>{import.meta.env.MODE}</strong> | API:{" "}
          <strong>{resolvedApiBaseUrl}</strong> | Cart Items:{" "}
          <strong>{cartCount}</strong>
        </p>
      </header>

      <div className="tabBar">
        <button
          className={activeTab === "shop" ? "tabButton activeTab" : "tabButton"}
          onClick={() => setActiveTab("shop")}
        >
          Storefront
        </button>
        <button
          className={activeTab === "ops" ? "tabButton activeTab" : "tabButton"}
          onClick={() => setActiveTab("ops")}
          disabled={!featureFlags.enableMonitoringDashboard}
        >
          Operations Dashboard
        </button>
      </div>

      {statusMessage ? (
        <p className="message success">{statusMessage}</p>
      ) : null}
      {errorMessage ? <p className="message error">{errorMessage}</p> : null}

      {activeTab === "shop" ? (
        <>
          <section className="layout">
            {shopLayoutSections.map((section) => (
              <div key={section.id}>{renderSection(section.id)}</div>
            ))}
          </section>
          {shopFullSections.map((section) => (
            <div key={section.id}>{renderSection(section.id)}</div>
          ))}
        </>
      ) : featureFlags.enableMonitoringDashboard ? (
        <section className="opsLayout">
          {opsSections.map((section) => (
            <div key={section.id}>{renderSection(section.id)}</div>
          ))}
        </section>
      ) : (
        <section className="panel">
          <h2>Operations Dashboard</h2>
          <p>Monitoring dashboard is disabled by feature flag.</p>
        </section>
      )}
    </main>
  );
}

export default App;
