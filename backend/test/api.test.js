import assert from "node:assert/strict";
import test from "node:test";
import app from "../src/app.js";
import { clearCart } from "../src/stores/cartStore.js";

process.env.USE_IN_MEMORY_PRODUCTS = "true";

let server;
let baseUrl;

test.before(() => {
  server = app.listen(0);
  const { port } = server.address();
  baseUrl = `http://127.0.0.1:${port}`;
});

test.after(() => {
  server.close();
});

test.beforeEach(async () => {
  clearCart();
  await fetch(`${baseUrl}/api/feature-flags/enableCart`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ enabled: true }),
  });
  await fetch(`${baseUrl}/api/feature-flags/enableProductDetails`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ enabled: true }),
  });
});

test("GET /api/products returns product list", async () => {
  const response = await fetch(`${baseUrl}/api/products`);
  assert.equal(response.status, 200);

  const products = await response.json();
  assert.ok(Array.isArray(products));
  assert.ok(products.length > 0);
  assert.equal(typeof products[0].description, "string");
});

test("GET /api/products/:id returns single product", async () => {
  const response = await fetch(`${baseUrl}/api/products/1`);
  assert.equal(response.status, 200);

  const product = await response.json();
  assert.equal(product.id, 1);
});

test("cart supports add and remove", async () => {
  const addResponse = await fetch(`${baseUrl}/api/cart`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ productId: 1, quantity: 2 }),
  });
  assert.equal(addResponse.status, 201);

  const cartResponse = await fetch(`${baseUrl}/api/cart`);
  assert.equal(cartResponse.status, 200);
  const cart = await cartResponse.json();
  assert.equal(cart.items.length, 1);
  assert.equal(cart.items[0].quantity, 2);

  const removeResponse = await fetch(`${baseUrl}/api/cart/1`, {
    method: "DELETE",
  });
  assert.equal(removeResponse.status, 204);

  const emptyCartResponse = await fetch(`${baseUrl}/api/cart`);
  const emptyCart = await emptyCartResponse.json();
  assert.equal(emptyCart.items.length, 0);
});

test("feature flag can disable and re-enable cart", async () => {
  const disableResponse = await fetch(`${baseUrl}/api/feature-flags/enableCart`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ enabled: false }),
  });
  assert.equal(disableResponse.status, 200);

  const blockedCartResponse = await fetch(`${baseUrl}/api/cart`);
  assert.equal(blockedCartResponse.status, 503);

  const enableResponse = await fetch(`${baseUrl}/api/feature-flags/enableCart`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ enabled: true }),
  });
  assert.equal(enableResponse.status, 200);
});

test("rollback restores previous feature flag state", async () => {
  await fetch(`${baseUrl}/api/feature-flags/enableProductDetails`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ enabled: false }),
  });

  const releaseResponse = await fetch(`${baseUrl}/api/feature-flags/releases`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ note: "disable product details" }),
  });
  assert.equal(releaseResponse.status, 201);
  const release = await releaseResponse.json();

  await fetch(`${baseUrl}/api/feature-flags/enableProductDetails`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ enabled: true }),
  });

  const rollbackResponse = await fetch(`${baseUrl}/api/feature-flags/rollback`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ targetReleaseId: release.releaseId }),
  });
  assert.equal(rollbackResponse.status, 200);

  const flagsResponse = await fetch(`${baseUrl}/api/feature-flags`);
  const payload = await flagsResponse.json();
  assert.equal(payload.flags.enableProductDetails, false);
});

test("monitoring dashboard tracks events and incidents", async () => {
  const eventResponse = await fetch(`${baseUrl}/api/monitoring/events`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      type: "manual_test",
      severity: "critical",
      message: "Synthetic alert for test",
    }),
  });
  assert.equal(eventResponse.status, 201);

  const incidentResponse = await fetch(`${baseUrl}/api/monitoring/incidents`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      title: "Synthetic incident",
      severity: "high",
    }),
  });
  assert.equal(incidentResponse.status, 201);
  const incident = await incidentResponse.json();

  const resolveResponse = await fetch(
    `${baseUrl}/api/monitoring/incidents/${incident.id}/resolve`,
    { method: "PATCH" },
  );
  assert.equal(resolveResponse.status, 200);

  const dashboardResponse = await fetch(`${baseUrl}/api/monitoring/dashboard`);
  assert.equal(dashboardResponse.status, 200);
  const dashboard = await dashboardResponse.json();
  assert.ok(dashboard.alerts.length >= 1);
  assert.ok(dashboard.incidents.length >= 1);
  assert.ok(dashboard.recentEvents.length >= 1);
});
