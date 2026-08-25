import assert from "node:assert/strict";

import {
  buildTelemetryRequest,
  sendTelemetryEvent,
  telemetryEventTypeForEdits,
} from "./telemetry.ts";

const payload = {
  idempotency_key: "meal-review-1",
  locale: "tr",
  event_type: "CANDIDATE_SWAPPED",
  input_mode: "image",
  items: [{ predicted_food_id: "tr.pilav", selected_food_id: "tr.bulgur_pilavi" }],
};

const request = buildTelemetryRequest("http://192.0.2.10:4310/", "client-123", payload);
assert.equal(request.url, "http://192.0.2.10:4310/v1/telemetry/events");
assert.equal(request.init.method, "POST");
assert.deepEqual(request.init.headers, {
  "Content-Type": "application/json",
  "X-User-Id": "client-123",
});
assert.deepEqual(JSON.parse(request.init.body), payload);
assert.equal(telemetryEventTypeForEdits(true, false), "CANDIDATE_SWAPPED");
assert.equal(telemetryEventTypeForEdits(false, true), "PORTION_ADJUSTED");
assert.equal(telemetryEventTypeForEdits(false, false), "CONFIRMED_AS_IS");

const originalFetch = globalThis.fetch;
let observed;
globalThis.fetch = async (url, init) => {
  observed = { url, init };
  return new Response(null, { status: 202 });
};

try {
  await sendTelemetryEvent("http://api.example.test", "client-456", payload);
} finally {
  globalThis.fetch = originalFetch;
}

assert.equal(observed.url, "http://api.example.test/v1/telemetry/events");
assert.equal(observed.init.headers["X-User-Id"], "client-456");

console.log("mobile telemetry routing checks passed");
