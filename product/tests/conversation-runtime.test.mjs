import test from "node:test";
import assert from "node:assert/strict";

import { streamConversation } from "../packages/conversation/conversation-runtime/dist/index.js";

const providerConfig = {
  id: "provider-test",
  name: "Test Provider",
  protocol: "openai-compatible",
  baseUrl: "https://example.test/v1",
  apiKeyRef: "secret:test-key",
};

const providerRuntime = {
  async resolveSecret() {
    return "unused";
  },
  async fetch() {
    throw new Error("fetch should not be called by conversation-runtime tests");
  },
};

const chatRequest = {
  threadId: "thread-test",
  providerId: "provider-test",
  modelId: "model-test",
  messages: [],
};

test("streamConversation forwards to the provider registry", async () => {
  const calls = [];
  const registry = {
    streamChat(config, runtime, chat) {
      calls.push({ config, runtime, chat });
      return (async function* () {
        yield { type: "text.delta", delta: "hello" };
      })();
    },
  };

  const events = [];
  for await (const event of streamConversation({
    registry,
    providerConfig,
    providerRuntime,
    chatRequest,
  })) {
    events.push(event);
  }

  assert.deepEqual(events, [{ type: "text.delta", delta: "hello" }]);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].config, providerConfig);
  assert.equal(calls[0].runtime, providerRuntime);
  assert.equal(calls[0].chat, chatRequest);
});

