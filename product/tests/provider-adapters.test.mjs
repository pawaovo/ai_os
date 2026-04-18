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
