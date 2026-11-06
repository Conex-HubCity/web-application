import assert from "node:assert/strict";
import { test } from "node:test";
import { hasAllowedRequestOrigin } from "../lib/request-origin";

const internalUrl = "http://127.0.0.1:4050/api/project-images/upload";
const productionEnv = {
  APP_URL: "https://cnx.hubcity.africa",
  NODE_ENV: "production",
};

test("the configured public origin is accepted behind a reverse proxy", () => {
  const request = new Request(internalUrl, {
    headers: { origin: "https://cnx.hubcity.africa" },
  });

  assert.equal(hasAllowedRequestOrigin(request, productionEnv), true);
});

test("missing, malformed, and foreign origins are rejected", () => {
  assert.equal(hasAllowedRequestOrigin(new Request(internalUrl), productionEnv), false);
  assert.equal(
    hasAllowedRequestOrigin(
      new Request(internalUrl, { headers: { origin: "not-an-origin" } }),
      productionEnv,
    ),
    false,
  );
  assert.equal(
    hasAllowedRequestOrigin(
      new Request(internalUrl, { headers: { origin: "https://example.com" } }),
      productionEnv,
    ),
    false,
  );
});

test("production fails closed without a configured public origin", () => {
  const request = new Request(internalUrl, {
    headers: { origin: "http://127.0.0.1:4050" },
  });

  assert.equal(hasAllowedRequestOrigin(request, { NODE_ENV: "production" }), false);
});
