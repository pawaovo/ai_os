import test from "node:test";
import assert from "node:assert/strict";

import {
  detectProviderProtocol,
  getProviderCatalogEntry,
  listProviderCatalog,
  normalizeProviderBaseUrl,
} from "../packages/model-providers/provider-protocol/dist/index.js";

test("provider protocol catalog exposes supported protocols", () => {
  assert.deepEqual(
    listProviderCatalog().map((entry) => entry.protocol),
    ["openai-compatible", "anthropic-compatible"],
  );
  assert.equal(getProviderCatalogEntry("openai-compatible").chatPath, "/chat/completions");
  assert.equal(getProviderCatalogEntry("anthropic-compatible").chatPath, "/messages");
});

test("provider protocol helpers normalize base URLs and detect known protocols", () => {
  assert.equal(normalizeProviderBaseUrl("https://api.example.test/v1/"), "https://api.example.test/v1");
  assert.equal(detectProviderProtocol("https://api.example.test/v1"), "openai-compatible");
  assert.equal(detectProviderProtocol("https://relay.example.test/anthropic/"), "anthropic-compatible");
  assert.equal(detectProviderProtocol("https://relay.example.test/custom"), undefined);
});
