import test from "node:test";
import assert from "node:assert/strict";

import { ProviderRegistry, ProviderRegistryError } from "../packages/model-providers/provider-registry/dist/index.js";

function createProvider(protocol, calls) {
  return {
    id: `${protocol}-adapter`,
    protocol,
    async testConnection(request) {
      calls.push(["testConnection", request.config.protocol]);
      return { available: true };
    },
    async listModels(request) {
      calls.push(["listModels", request.config.protocol]);
      return [
        {
          id: `${protocol}-model`,
          supportsTools: true,
          supportsVision: false,
          supportsReasoning: false,
        },
      ];
    },
    async *streamChat(request, chat) {
      calls.push(["streamChat", request.config.protocol, chat.modelId]);
      yield { type: "text.delta", delta: "ok" };
    },
  };
}

const runtime = {
  async resolveSecret() {
    return "unused";
  },
  async fetch() {
    throw new Error("fetch should not be called by registry tests");
  },
};

const baseConfig = {
  id: "provider-test",
  name: "Test Provider",
  baseUrl: "https://example.test/v1",
  apiKeyRef: "secret:test-key",
};

const chatRequest = {
  threadId: "thread-test",
  providerId: "provider-test",
  modelId: "model-test",
  messages: [],
};

test("ProviderRegistry routes operations by provider protocol", async () => {
  const calls = [];
  const registry = new ProviderRegistry();
  registry.register(createProvider("openai-compatible", calls));
  registry.register(createProvider("anthropic-compatible", calls));

  const openAiConfig = { ...baseConfig, protocol: "openai-compatible" };
  const anthropicConfig = { ...baseConfig, protocol: "anthropic-compatible" };

  assert.deepEqual(await registry.testConnection(openAiConfig, runtime), { available: true });
  assert.deepEqual(await registry.listModels(anthropicConfig, runtime), [
    {
      id: "anthropic-compatible-model",
      supportsTools: true,
      supportsVision: false,
      supportsReasoning: false,
    },
  ]);

  const events = [];
  for await (const event of registry.streamChat(openAiConfig, runtime, chatRequest)) {
    events.push(event);
  }

  assert.deepEqual(events, [{ type: "text.delta", delta: "ok" }]);
  assert.deepEqual(calls, [
    ["testConnection", "openai-compatible"],
    ["listModels", "anthropic-compatible"],
    ["streamChat", "openai-compatible", "model-test"],
  ]);
});

test("ProviderRegistry rejects duplicate protocols", () => {
  const registry = new ProviderRegistry();
  registry.register(createProvider("openai-compatible", []));

  assert.throws(
    () => registry.register(createProvider("openai-compatible", [])),
    ProviderRegistryError,
  );
});

test("ProviderRegistry reports missing protocols", () => {
  const registry = new ProviderRegistry();

  assert.throws(
    () => registry.get("openai-compatible"),
    ProviderRegistryError,
  );
});

test("ProviderRegistry exposes provider catalog and protocol detection helpers", () => {
  const registry = new ProviderRegistry();

  assert.deepEqual(
    registry.listCatalog().map((entry) => entry.protocol),
    ["openai-compatible", "anthropic-compatible"],
  );
  assert.equal(registry.describe("openai-compatible").displayName, "OpenAI-Compatible");
  assert.equal(registry.detectProtocol("https://example.test/anthropic"), "anthropic-compatible");
  assert.equal(registry.detectProtocol("https://api.example.test/v1"), "openai-compatible");
});
