import test from "node:test";
import assert from "node:assert/strict";

import { OpenAiCompatibleProvider } from "../packages/model-providers/provider-openai-compatible/dist/index.js";
import { AnthropicCompatibleProvider } from "../packages/model-providers/provider-anthropic-compatible/dist/index.js";

function createRuntime(handler) {
  return {
    async resolveSecret(ref) {
      assert.equal(ref, "secret:test-key");
      return "resolved-key";
    },
    fetch: handler,
  };
}

function sseResponse(lines) {
  return new Response(lines.join("\n"), {
    status: 200,
    headers: { "Content-Type": "text/event-stream" },
  });
}

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
  messages: [
    {
      id: "message-user",
      role: "user",
      parts: [{ type: "text", text: "hello" }],
    },
  ],
};

test("OpenAiCompatibleProvider lists models", async () => {
  const provider = new OpenAiCompatibleProvider("provider-test");
  const runtime = createRuntime(async (url, init) => {
    assert.equal(url, "https://example.test/v1/models");
    assert.equal(init.headers.Authorization, "Bearer resolved-key");
    return Response.json({ data: [{ id: "gpt-test" }] });
  });

  const models = await provider.listModels({
    config: { ...baseConfig, protocol: "openai-compatible" },
    runtime,
  });

  assert.deepEqual(models, [
    {
      id: "gpt-test",
      supportsTools: true,
      supportsVision: false,
      supportsReasoning: false,
    },
  ]);
});

test("OpenAiCompatibleProvider classifies authentication failures during connection tests", async () => {
  const provider = new OpenAiCompatibleProvider("provider-test");
  const status = await provider.testConnection({
    config: { ...baseConfig, protocol: "openai-compatible" },
    runtime: createRuntime(async () => new Response("denied", { status: 401 })),
  });

  assert.deepEqual(status, {
    available: false,
    message: "OpenAI-compatible models request failed with HTTP 401.",
    errorCode: "authentication-failed",
  });
});

test("OpenAiCompatibleProvider streams text deltas", async () => {
  const provider = new OpenAiCompatibleProvider("provider-test");
  const runtime = createRuntime(async (url, init) => {
    assert.equal(url, "https://example.test/v1/chat/completions");
    assert.equal(init.method, "POST");
    assert.equal(init.headers.Authorization, "Bearer resolved-key");
    return sseResponse([
      'data: {"choices":[{"delta":{"content":"hel"}}]}',
      'data: {"choices":[{"delta":{"content":"lo"}}]}',
      "data: [DONE]",
    ]);
  });

  const events = [];
  for await (const event of provider.streamChat(
    { config: { ...baseConfig, protocol: "openai-compatible" }, runtime },
    chatRequest,
  )) {
    events.push(event);
  }

  assert.deepEqual(events, [
    { type: "text.delta", delta: "hel" },
    { type: "text.delta", delta: "lo" },
  ]);
});

test("OpenAiCompatibleProvider surfaces network failures during chat streaming", async () => {
  const provider = new OpenAiCompatibleProvider("provider-test");
  const runtime = createRuntime(async () => {
    throw new Error("fetch failed");
  });

  const events = [];
  for await (const event of provider.streamChat(
    { config: { ...baseConfig, protocol: "openai-compatible" }, runtime },
    chatRequest,
  )) {
    events.push(event);
  }

  assert.deepEqual(events, [{ type: "error", message: "fetch failed" }]);
});

test("AnthropicCompatibleProvider lists models", async () => {
  const provider = new AnthropicCompatibleProvider("provider-test");
  const runtime = createRuntime(async (url, init) => {
    assert.equal(url, "https://example.test/v1/models");
    assert.equal(init.headers["x-api-key"], "resolved-key");
    assert.equal(init.headers["anthropic-version"], "2023-06-01");
    return Response.json({ data: [{ id: "claude-test", display_name: "Claude Test" }] });
  });

  const models = await provider.listModels({
    config: { ...baseConfig, protocol: "anthropic-compatible" },
    runtime,
  });

  assert.deepEqual(models, [
    {
      id: "claude-test",
      displayName: "Claude Test",
      supportsTools: true,
      supportsVision: false,
      supportsReasoning: true,
    },
  ]);
});

test("AnthropicCompatibleProvider classifies protocol mismatches during connection tests", async () => {
  const provider = new AnthropicCompatibleProvider("provider-test");
  const status = await provider.testConnection({
    config: { ...baseConfig, protocol: "anthropic-compatible" },
    runtime: createRuntime(async () => new Response("missing", { status: 404 })),
  });

  assert.deepEqual(status, {
    available: false,
    message: "Anthropic-compatible models request failed with HTTP 404.",
    errorCode: "protocol-mismatch",
  });
});

test("AnthropicCompatibleProvider streams text deltas", async () => {
  const provider = new AnthropicCompatibleProvider("provider-test");
  const runtime = createRuntime(async (url, init) => {
    assert.equal(url, "https://example.test/v1/messages");
    assert.equal(init.method, "POST");
    assert.equal(init.headers["x-api-key"], "resolved-key");
    return sseResponse([
      'event: content_block_delta',
      'data: {"type":"content_block_delta","delta":{"text":"hel"}}',
      'event: content_block_delta',
      'data: {"type":"content_block_delta","delta":{"text":"lo"}}',
    ]);
  });

  const events = [];
  for await (const event of provider.streamChat(
    { config: { ...baseConfig, protocol: "anthropic-compatible" }, runtime },
    chatRequest,
  )) {
    events.push(event);
  }

  assert.deepEqual(events, [
    { type: "text.delta", delta: "hel" },
    { type: "text.delta", delta: "lo" },
  ]);
});

test("AnthropicCompatibleProvider surfaces empty stream bodies as chat errors", async () => {
  const provider = new AnthropicCompatibleProvider("provider-test");
  const runtime = createRuntime(async () => new Response(null, { status: 200 }));

  const events = [];
  for await (const event of provider.streamChat(
    { config: { ...baseConfig, protocol: "anthropic-compatible" }, runtime },
    chatRequest,
  )) {
    events.push(event);
  }

  assert.deepEqual(events, [
    {
      type: "error",
      message: "Anthropic-compatible provider returned an empty stream body.",
    },
  ]);
});
