import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawn } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { createServer } from "node:http";
import { fileURLToPath } from "node:url";

const productRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const expectedHostBuildCommand = process.platform === "win32"
  ? "cd product && npm run package:win"
  : "cd product && npm run package:mac";
const expectedHostOpenCommand = process.platform === "win32"
  ? "start \"\" \"product\\build\\electron\\win-unpacked\\AI OS.exe\""
  : `open "${process.arch === "arm64" ? "product/build/electron/mac-arm64/AI OS.app" : "product/build/electron/mac/AI OS.app"}"`;
const mockMcpServerPath = resolve(productRoot, "tests/fixtures/mock-mcp-server.mjs");

execFileSync(
  process.execPath,
  ["./node_modules/typescript/bin/tsc", "-b", "apps/space-desktop/tsconfig.json"],
  { cwd: productRoot },
);

const { createSpaceDesktopShellModel } = await import("../apps/space-desktop/dist/index.js");
const {
  createInitialSpaceDemoState,
  createRunningSpaceDemoState,
  runSpaceDemoGoal,
} = await import("../apps/space-desktop/dist/demo-runtime.js");
const {
  createProviderCatalogResponse,
  createProviderSettingsResponse,
  parseChatSendRequest,
  parseProviderSettingsInput,
  parseSpaceDemoRunRequest,
  runChatSendRequest,
  runProviderDoctor,
  runSpaceDemoRequest,
} = await import("../apps/space-desktop/dist/server-runtime.js");

test("createSpaceDesktopShellModel returns the default minimal shell", () => {
  const model = createSpaceDesktopShellModel();

  assert.equal(model.appId, "space-desktop");
  assert.equal(model.title, "AI Space Desktop");
  assert.deepEqual(
    model.sections.map((section) => section.kind),
    ["chat", "run-status", "artifact-list"],
  );

  assert.deepEqual(model.sections[0], {
    kind: "chat",
    title: "Chat",
    transcriptPreview: [],
    composerPlaceholder: "Ask AI Space to help with your workspace.",
    emptyState: "No conversation loaded yet.",
  });

  assert.deepEqual(model.sections[1], {
    kind: "run-status",
    title: "Run Status",
    status: "queued",
    summary: "No run started.",
  });

  assert.deepEqual(model.sections[2], {
    kind: "artifact-list",
    title: "Artifacts",
    items: [],
    emptyState: "Run outputs will appear here.",
  });
});

test("createSpaceDesktopShellModel applies custom run and artifact state", () => {
  const transcriptPreview = ["User: summarize the repo", "Assistant: working on it"];
  const artifacts = [
    {
      id: "artifact-report",
      kind: "report",
      title: "Session report",
      path: "/tmp/session-report.md",
    },
    {
      id: "artifact-diff",
      kind: "diff",
      title: "Workspace diff",
    },
  ];

  const model = createSpaceDesktopShellModel({
    title: "Mission Shell",
    threadId: "thread-test",
    transcriptPreview,
    runStatus: "awaiting-approval",
    runStatusSummary: "Waiting for human approval.",
    artifacts,
  });

  transcriptPreview.push("Mutation after model creation");
  artifacts[0].title = "Mutated title";

  assert.equal(model.title, "Mission Shell");
  assert.deepEqual(model.sections[0], {
    kind: "chat",
    title: "Chat",
    threadId: "thread-test",
    transcriptPreview: ["User: summarize the repo", "Assistant: working on it"],
    composerPlaceholder: "Ask AI Space to help with your workspace.",
    emptyState: "Recent conversation is ready.",
  });

  assert.deepEqual(model.sections[1], {
    kind: "run-status",
    title: "Run Status",
    status: "awaiting-approval",
    summary: "Waiting for human approval.",
  });

  assert.deepEqual(model.sections[2], {
    kind: "artifact-list",
    title: "Artifacts",
    items: [
      {
        id: "artifact-report",
        kind: "report",
        title: "Session report",
        path: "/tmp/session-report.md",
      },
      {
        id: "artifact-diff",
        kind: "diff",
        title: "Workspace diff",
      },
    ],
    emptyState: "2 artifacts ready.",
  });
});

test("createInitialSpaceDemoState exposes the visible local demo shell", () => {
  const state = createInitialSpaceDemoState();

  assert.equal(state.phase, "idle");
  assert.equal(state.executorChoice, "mock");
  assert.equal(state.shell.title, "AI Space Demo");
  assert.equal(state.shell.sections[1].status, "queued");
  assert.deepEqual(state.artifacts, []);
  assert.equal(state.events[0].type, "space.ready");
});

test("space desktop V1.0 page exposes readiness and forge controls", async () => {
  const html = await readFile(resolve(productRoot, "apps/space-desktop/public/index.html"), "utf8");
  const styles = await readFile(resolve(productRoot, "apps/space-desktop/public/styles.css"), "utf8");
  const productReadme = await readFile(resolve(productRoot, "README.md"), "utf8");
  const readme = await readFile(resolve(productRoot, "apps/space-desktop/README.md"), "utf8");
  const i18nSource = await readFile(resolve(productRoot, "apps/space-desktop/src/i18n.ts"), "utf8");
  const capabilityContractSource = await readFile(resolve(productRoot, "packages/capability/capability-contract/src/index.ts"), "utf8");
  const packageJson = JSON.parse(await readFile(resolve(productRoot, "package.json"), "utf8"));
  const packageScript = await readFile(resolve(productRoot, "apps/space-desktop/scripts/package-macos.mjs"), "utf8");
  const prepareElectronPackageScript = await readFile(resolve(productRoot, "apps/space-desktop/scripts/prepare-electron-package-output.mjs"), "utf8");
  const electronMain = await readFile(resolve(productRoot, "apps/space-desktop/electron-app/main.cjs"), "utf8");
  const electronAppPackage = JSON.parse(await readFile(resolve(productRoot, "apps/space-desktop/electron-app/package.json"), "utf8"));
  const electronConfig = await readFile(resolve(productRoot, "electron-builder.config.cjs"), "utf8");
  const electronAfterPack = await readFile(resolve(productRoot, "apps/space-desktop/scripts/after-pack-electron.mjs"), "utf8");
  const devServer = await readFile(resolve(productRoot, "apps/space-desktop/scripts/dev-server.mjs"), "utf8");
  const browserSource = await readFile(resolve(productRoot, "apps/space-desktop/src/browser.ts"), "utf8");

  assert.doesNotMatch(html, /data-layout="v0\.3-workbench"/);
  assert.doesNotMatch(html, /data-layout="v0\.4-executor-workbench"/);
  assert.doesNotMatch(html, /data-layout="v0\.5-approval-trust-workbench"/);
  assert.doesNotMatch(html, /data-layout="v0\.6-automation-workbench"/);
  assert.doesNotMatch(html, /data-layout="v0\.6\.1-product-shell"/);
  assert.doesNotMatch(html, /data-layout="v0\.7-local-memory-workbench"/);
  assert.doesNotMatch(html, /data-layout="v0\.8-capability-workbench"/);
  assert.doesNotMatch(html, /data-layout="v0\.9-forge-preview-workbench"/);
  assert.match(html, /data-layout="v1\.0-personal-ai-os"/);
  assert.match(html, /AI OS \/ V1\.0 Personal AI OS/);
  assert.match(html, /class="app-nav"/);
  assert.match(html, /data-page-target="start"/);
  assert.match(html, /data-page-target="memory"/);
  assert.match(html, /data-page-target="capabilities"/);
  assert.match(html, /data-page-target="forge"/);
  assert.match(html, /data-page-target="settings"/);
  assert.match(html, /id="language-select"/);
  assert.match(html, /id="readiness-title"/);
  assert.match(html, /id="app-readiness-status"/);
  assert.match(html, /id="app-readiness-list"/);
  assert.match(html, /id="start-title"/);
  assert.match(html, /id="start-action-list"/);
  assert.match(html, /id="metric-thread-count"/);
  assert.match(html, /id="metric-run-count"/);
  assert.match(html, /id="metric-artifact-count"/);
  assert.match(html, /id="metric-capability-count"/);
  assert.match(html, /id="install-title"/);
  assert.match(html, /id="install-status-list"/);
  assert.match(html, /Capabilities And Forge/);
  assert.match(html, /Local Install/);
  assert.match(html, /id="settings-title"/);
  assert.match(html, /id="mcp-config-form"/);
  assert.match(html, /id="mcp-config-scope"/);
  assert.match(html, /id="mcp-command-input"/);
  assert.match(html, /id="mcp-source"/);
  assert.match(html, /id="mcp-health"/);
  assert.match(html, /id="mcp-runtime-status"/);
  assert.match(html, /id="mcp-runtime-tools"/);
  assert.match(html, /id="agent-runtime-title"/);
  assert.match(html, /id="agent-runtime-list"/);
  assert.match(html, /id="agent-runtime-help"/);
  assert.match(html, /id="memory-title"/);
  assert.match(html, /id="memory-form"/);
  assert.match(html, /id="memory-scope"/);
  assert.match(html, /id="memory-sensitivity"/);
  assert.match(html, /id="memory-list"/);
  assert.match(html, /id="memory-usage-list"/);
  assert.match(html, /id="capability-title"/);
  assert.match(html, /id="capability-list"/);
  assert.match(html, /id="capability-permission-list"/);
  assert.match(html, /id="capability-toggle-button"/);
  assert.match(html, /id="capability-run-button"/);
  assert.match(html, /id="capability-run-list"/);
  assert.match(html, /id="forge-run-select"/);
  assert.match(html, /id="forge-create-button"/);
  assert.match(html, /id="recipe-list"/);
  assert.match(html, /id="recipe-form"/);
  assert.match(html, /id="recipe-title-input"/);
  assert.match(html, /id="recipe-prompt-input"/);
  assert.match(html, /id="recipe-input-spec"/);
  assert.match(html, /id="recipe-output-spec"/);
  assert.match(html, /id="prompt-app-binding-workspace"/);
  assert.match(html, /id="prompt-app-binding-execution"/);
  assert.match(html, /id="prompt-app-binding-tools"/);
  assert.match(html, /id="prompt-app-binding-artifacts"/);
  assert.match(html, /id="prompt-app-installation-capability"/);
  assert.match(html, /id="prompt-app-installation-at"/);
  assert.match(html, /id="recipe-test-button"/);
  assert.match(html, /id="recipe-export-button"/);
  assert.match(html, /id="recipe-test-list"/);
  assert.match(html, /id="workspace-select"/);
  assert.match(html, /id="workspace-trust-level"/);
  assert.match(html, /id="active-workspace-label"/);
  assert.match(html, /id="workspace-runtime-title"/);
  assert.match(html, /id="workspace-runtime-list"/);
  assert.match(html, /id="workspace-runtime-help"/);
  assert.match(html, /id="workspace-surface-title"/);
  assert.match(html, /id="workspace-artifact-surface-preview"/);
  assert.match(html, /id="workspace-terminal-surface-preview"/);
  assert.match(html, /id="executor-status-list"/);
  assert.match(html, /id="executor-timeout-input"/);
  assert.match(html, /id="run-cancel-button"/);
  assert.match(html, /id="approval-panel"/);
  assert.match(html, /id="approval-category"/);
  assert.match(html, /id="approval-risk-level"/);
  assert.match(html, /id="approval-requested-action"/);
  assert.match(html, /id="approval-decision"/);
  assert.match(html, /id="approval-resolved-at"/);
  assert.match(html, /id="approval-grant-button"/);
  assert.match(html, /id="approval-reject-button"/);
  assert.match(html, /id="approval-history-list"/);
  assert.match(html, /id="automation-form"/);
  assert.match(html, /id="automation-kind"/);
  assert.match(html, /id="automation-tick-button"/);
  assert.match(html, /id="automation-list"/);
  assert.match(html, /id="automation-run-list"/);
  assert.match(html, /id="run-history-list"/);
  assert.match(html, /id="artifact-select"/);
  assert.match(html, /id="run-artifact-preview"/);
  assert.match(styles, /\.space-workbench/);
  assert.match(styles, /\.left-rail/);
  assert.match(styles, /\.center-stage/);
  assert.match(styles, /\.right-rail/);
  assert.match(styles, /\.app-nav/);
  assert.match(styles, /\.nav-button/);
  assert.match(styles, /\.page-section\[hidden\]/);
  assert.match(styles, /\.metric-grid/);
  assert.match(styles, /\.readiness-list-item/);
  assert.match(styles, /data-source="ready"/);
  assert.match(styles, /data-source="action"/);
  assert.match(styles, /data-source="optional"/);
  assert.match(styles, /awaiting-approval/);
  assert.match(styles, /approval-detail-grid/);
  assert.match(readme, /V1\.0 Capabilities/);
  assert.match(readme, /Product Surfaces/);
  assert.match(readme, /First Successful Trial/);
  assert.match(readme, /Expected Results/);
  assert.match(readme, /Electron Install Paths/);
  assert.match(readme, /npm run package:mac/);
  assert.match(readme, /npm run package:win/);
  assert.match(readme, /win-unpacked/);
  assert.match(readme, /product desktop shell is Electron/i);
  assert.match(readme, /not signed or notarized|notarization/);
  assert.match(productReadme, /Current Product State/);
  assert.match(productReadme, /Product Surfaces/);
  assert.match(productReadme, /Expected Results When You Use It/);
  assert.match(productReadme, /Build The Electron Desktop App/);
  assert.match(productReadme, /win-unpacked/);
  assert.match(packageScript, /README\.md/);
  assert.equal(packageJson.main, "apps/space-desktop/electron-app/main.cjs");
  assert.equal(packageJson.scripts["package:mac"], "npm run package:electron:mac");
  assert.match(packageJson.scripts["package:electron:mac"], /prepare-electron-package-output\.mjs/);
  assert.equal(packageJson.scripts["package:mac:webkit"], "node ./apps/space-desktop/scripts/package-macos.mjs");
  assert.equal(packageJson.scripts["package:win"], "npm run package:electron:win");
  assert.match(packageScript, /buildRoot,\s*"webkit"/);
  assert.match(prepareElectronPackageScript, /build", "AI OS\.app"/);
  assert.match(prepareElectronPackageScript, /Removed stale legacy bundle/);
  assert.equal(electronAppPackage.main, "main.cjs");
  assert.equal(electronAppPackage.version, "1.0.0");
  assert.match(electronMain, /nodeIntegration:\s*false/);
  assert.match(electronMain, /contextIsolation:\s*true/);
  assert.match(electronMain, /sandbox:\s*true/);
  assert.match(electronMain, /webSecurity:\s*true/);
  assert.match(electronMain, /AI_SPACE_DESKTOP_SHELL/);
  assert.match(electronConfig, /appId:\s*"ai\.os\.personal"/);
  assert.match(electronConfig, /app:\s*"apps\/space-desktop\/electron-app"/);
  assert.match(electronConfig, /afterPack:\s*"apps\/space-desktop\/scripts\/after-pack-electron\.mjs"/);
  assert.match(electronConfig, /productName:\s*"AI OS"/);
  assert.match(electronConfig, /scripts\/mcp-runtime\.mjs/);
  assert.match(electronConfig, /win:\s*{/);
  assert.match(electronConfig, /target:\s*"nsis"/);
  assert.match(electronConfig, /target:\s*"portable"/);
  assert.match(electronConfig, /product\/node_modules\/@ai-os/);
  assert.match(devServer, /ElectronSafeStorageSecretStore/);
  assert.match(devServer, /WindowsProtectedFileSecretStore/);
  assert.match(devServer, /process\.platform === "darwin"\) return new KeychainSecretStore/);
  assert.match(devServer, /\/api\/settings\/language/);
  assert.match(devServer, /createAppReadinessSummary\(language\)/);
  assert.match(devServer, /resolveMacElectronAppPath/);
  assert.match(devServer, /win-unpacked/);
  assert.match(devServer, /safeStorage/);
  assert.match(browserSource, /x-ai-os-language/);
  assert.match(browserSource, /loadLanguageSetting/);
  assert.match(browserSource, /saveLanguageSetting/);
  assert.match(browserSource, /renderWorkspaceRuntime/);
  assert.match(browserSource, /workspaceRuntimeList/);
  assert.match(browserSource, /renderWorkspaceNativeSurface/);
  assert.match(browserSource, /workspaceArtifactSurfacePreview/);
  assert.match(browserSource, /workspaceTerminalSurfacePreview/);
  assert.match(browserSource, /renderPromptAppBinding/);
  assert.match(browserSource, /promptAppBindingWorkspace/);
  assert.match(browserSource, /renderPromptAppInstallation/);
  assert.match(browserSource, /promptAppInstallationCapability/);
  assert.match(browserSource, /loadMcpConfig/);
  assert.match(browserSource, /saveMcpConfigFromForm/);
  assert.match(browserSource, /loadAgentRuntimes/);
  assert.match(browserSource, /renderAgentRuntimes/);
  assert.match(browserSource, /localizeExecutorChoice/);
  assert.match(browserSource, /localizeApprovalCategory/);
  assert.match(browserSource, /dynamic\.readiness\.summary/);
  assert.match(browserSource, /dynamic\.install\.windows/);
  assert.match(browserSource, /windowsCommand/);
  assert.match(browserSource, /dynamic\.provider\.modelSelectPlaceholder/);
  assert.doesNotMatch(browserSource, /elements\.providerModel\.value = payload\.models\[0\]/);
  assert.match(i18nSource, /"language\.zh-CN": "中文"/);
  assert.match(i18nSource, /"nav\.start": "开始"/);
  assert.match(i18nSource, /"nav\.start": "Start"/);
  assert.match(i18nSource, /"recipe-editor\.binding\.workspace": "Workspace"/);
  assert.match(capabilityContractSource, /export interface PromptAppRuntimeBinding/);
  assert.match(capabilityContractSource, /export interface PromptAppDraftRecord/);
  assert.match(i18nSource, /"dynamic\.approval\.reason\.file-write":/);
  assert.match(i18nSource, /"dynamic\.capability\.permission\.workspace-read":/);
  assert.match(electronAfterPack, /package\.json/);
  assert.match(electronAfterPack, /copyFile/);
});

test("electron desktop package configuration is internally valid", () => {
  const output = execFileSync(
    process.execPath,
    ["./apps/space-desktop/scripts/validate-electron-config.mjs"],
    { cwd: productRoot, encoding: "utf8" },
  );

  assert.match(output, /Electron config is valid/);
});

test("createRunningSpaceDemoState shows an in-progress mission before completion", () => {
  const state = createRunningSpaceDemoState({
    goal: " Summarize my workspace ",
    executorChoice: "mock",
  });

  assert.equal(state.phase, "running");
  assert.equal(state.goal, "Summarize my workspace");
  assert.equal(state.shell.sections[1].status, "running");
  assert.deepEqual(state.shell.sections[0].transcriptPreview, [
    "User: Summarize my workspace",
    "Assistant: starting the local run...",
  ]);
});

test("runSpaceDemoGoal executes the V0.1 Space loop through Companion and Control Plane", async () => {
  const result = await runSpaceDemoGoal({
    goal: "Draft a workspace organization plan",
    eventDelayMs: 0,
  });

  assert.equal(result.state.phase, "completed");
  assert.equal(result.summary.missionStatus, "completed");
  assert.equal(result.summary.runStatus, "completed");
  assert.equal(result.summary.artifactCount, 1);
  assert.equal(result.state.shell.sections[1].status, "completed");
  assert.deepEqual(
    result.state.events.map((event) => event.type),
    ["run.started", "run.stream", "run.stream", "artifact.created", "run.completed"],
  );
  assert.match(
    Object.values(result.state.artifactContents)[0],
    /Goal: Draft a workspace organization plan/,
  );
});

test("runSpaceDemoGoal keeps real executor choices visible but disabled for this demo", async () => {
  await assert.rejects(
    runSpaceDemoGoal({
      goal: "Use Codex for this demo",
      executorChoice: "codex",
      eventDelayMs: 0,
    }),
    /Direct browser runtime only supports/,
  );
});

test("parseSpaceDemoRunRequest validates the local server request shape", () => {
  assert.deepEqual(
    parseSpaceDemoRunRequest({
      goal: "Run from the server",
      executorChoice: "claude-code",
    }),
    {
      goal: "Run from the server",
      executorChoice: "claude-code",
    },
  );

  assert.throws(
    () => parseSpaceDemoRunRequest({ goal: "Bad executor", executorChoice: "browser" }),
    /Unsupported executor choice/,
  );
});

test("provider settings parsing preserves an existing API key when the form leaves it blank", () => {
  const provider = parseProviderSettingsInput(
    {
      name: "Preview Provider",
      protocol: "openai-compatible",
      baseUrl: "https://example.test/v1/",
      apiKey: "",
      modelId: "demo-model",
    },
    {
      name: "Old Provider",
      protocol: "openai-compatible",
      baseUrl: "https://old.test/v1",
      apiKey: "sk-existing-key",
      modelId: "old-model",
    },
  );

  assert.deepEqual(provider, {
    name: "Preview Provider",
    protocol: "openai-compatible",
    baseUrl: "https://example.test/v1",
    apiKey: "sk-existing-key",
    modelId: "demo-model",
  });
  assert.deepEqual(createProviderSettingsResponse(provider), {
    configured: true,
    provider: {
      name: "Preview Provider",
      protocol: "openai-compatible",
      baseUrl: "https://example.test/v1",
      apiKeyPreview: "sk-...-key",
      modelId: "demo-model",
    },
  });
});

test("provider settings can detect a protocol from base URL when protocol is omitted", () => {
  const provider = parseProviderSettingsInput({
    name: "Detected Provider",
    baseUrl: "https://relay.test/anthropic/",
    apiKey: "sk-detected-key",
    modelId: "claude-demo",
  });

  assert.deepEqual(provider, {
    name: "Detected Provider",
    protocol: "anthropic-compatible",
    baseUrl: "https://relay.test/anthropic",
    apiKey: "sk-detected-key",
    modelId: "claude-demo",
  });
});

test("provider catalog response exposes supported protocols and detected protocol hints", () => {
  const response = createProviderCatalogResponse("https://api.example.test/v1");

  assert.deepEqual(
    response.providers.map((entry) => entry.protocol),
    ["openai-compatible", "anthropic-compatible"],
  );
  assert.equal(response.detectedProtocol, "openai-compatible");
});

test("runProviderDoctor returns structured checks and hints for protocol mismatch", async () => {
  const response = await runProviderDoctor({
    provider: {
      name: "Mismatch Provider",
      protocol: "openai-compatible",
      baseUrl: "https://relay.test/anthropic",
      apiKey: "sk-test",
      modelId: "demo-model",
    },
    fetch: async () => Response.json({ data: [{ id: "demo-model" }] }),
  });

  assert.equal(response.available, true);
  assert.equal(response.detectedProtocol, "anthropic-compatible");
  assert.equal(response.catalog.protocol, "openai-compatible");
  assert.equal(response.checks.some((check) => check.id === "protocol" && check.status === "warn"), true);
});

test("runProviderDoctor classifies authentication failures with a structured error code", async () => {
  const response = await runProviderDoctor({
    provider: {
      name: "Auth Provider",
      protocol: "openai-compatible",
      baseUrl: "https://api.example.test/v1",
      apiKey: "sk-bad",
      modelId: "demo-model",
    },
    fetch: async () => new Response("denied", { status: 401 }),
  });

  assert.equal(response.available, false);
  assert.equal(response.errorCode, "authentication-failed");
  assert.equal(response.checks.some((check) => check.id === "auth" && check.status === "fail"), true);
  assert.equal(response.hints.includes("Check the API key or token for the selected provider."), true);
});

test("parseChatSendRequest validates chat message and history shape", () => {
  assert.deepEqual(
    parseChatSendRequest({
      message: "Hello",
      history: [{ role: "assistant", content: "Hi" }],
    }),
    {
      message: "Hello",
      history: [{ role: "assistant", content: "Hi" }],
    },
  );

  assert.throws(
    () => parseChatSendRequest({ message: "Hello", history: [{ role: "tool", content: "bad" }] }),
    /Unsupported chat role/,
  );
});

test("runChatSendRequest sends OpenAI-compatible chat through the provider layer", async () => {
  const calls = [];
  const response = await runChatSendRequest({
    request: {
      message: "What can V0.1 do?",
      history: [{ role: "system", content: "Answer briefly." }],
    },
    provider: {
      name: "Preview Provider",
      protocol: "openai-compatible",
      baseUrl: "https://provider.test/v1",
      apiKey: "sk-test",
      modelId: "demo-model",
    },
    fetch: async (url, init) => {
      calls.push({ url, init });
      return createSseResponse('data: {"choices":[{"delta":{"content":"It can chat."}}]}\n\n');
    },
  });

  assert.equal(response.assistantMessage, "It can chat.");
  assert.deepEqual(response.messages.map((message) => message.role), ["system", "user", "assistant"]);
  assert.equal(calls[0].url, "https://provider.test/v1/chat/completions");
  assert.equal(calls[0].init.headers.Authorization, "Bearer sk-test");
  assert.match(String(calls[0].init.body), /"model":"demo-model"/);
});

test("runChatSendRequest sends Anthropic-compatible chat through the provider layer", async () => {
  const calls = [];
  const response = await runChatSendRequest({
    request: {
      message: "What can V0.1 do?",
      history: [{ role: "assistant", content: "Earlier answer" }],
    },
    provider: {
      name: "Anthropic Preview",
      protocol: "anthropic-compatible",
      baseUrl: "https://anthropic.test/v1",
      apiKey: "sk-ant-test",
      modelId: "claude-demo",
    },
    fetch: async (url, init) => {
      calls.push({ url, init });
      return createSseResponse('data: {"type":"content_block_delta","delta":{"text":"It can chat."}}\n\n');
    },
  });

  assert.equal(response.assistantMessage, "It can chat.");
  assert.equal(calls[0].url, "https://anthropic.test/v1/messages");
  assert.equal(calls[0].init.headers["x-api-key"], "sk-ant-test");
  assert.match(String(calls[0].init.body), /"model":"claude-demo"/);
});

test("space desktop dev server persists providers, threads, and messages without leaking secrets", async () => {
  const storageDir = await mkdtemp(`${tmpdir()}/ai-os-v02-`);
  const providerServer = await startMockOpenAiProvider();
  const appPort = await getAvailablePort();
  const appServer = startSpaceDesktopServer({
    port: appPort,
    storageDir,
  });
  let restartedServer;

  try {
    await waitForHttp(`http://127.0.0.1:${appPort}/`);

    const provider = await postJson(`http://127.0.0.1:${appPort}/api/providers`, {
      name: "Persistent Mock Provider",
      protocol: "openai-compatible",
      baseUrl: `http://127.0.0.1:${providerServer.port}/v1`,
      apiKey: "sk-persistent-secret",
      modelId: "mock-model",
    });

    assert.equal(provider.configured, true);
    assert.equal(provider.provider.apiKey, undefined);

    const workspace = await postJson(`http://127.0.0.1:${appPort}/api/workspaces`, {
      name: "Persistent Workspace",
      path: "/tmp/ai-os-workspace",
    });
    assert.equal(workspace.workspace.name, "Persistent Workspace");

    const thread = await postJson(`http://127.0.0.1:${appPort}/api/threads`, {
      title: "Persistent Thread",
    });
    assert.equal(thread.thread.workspaceId, workspace.workspace.id);

    const otherWorkspace = await postJson(`http://127.0.0.1:${appPort}/api/workspaces`, {
      name: "Other Workspace",
      path: "/tmp/ai-os-other-workspace",
    });
    const otherThread = await postJson(`http://127.0.0.1:${appPort}/api/threads`, {
      title: "Other Thread",
    });
    assert.equal(otherThread.thread.workspaceId, otherWorkspace.workspace.id);

    await patchJson(`http://127.0.0.1:${appPort}/api/settings/workspace-selection`, {
      workspaceId: workspace.workspace.id,
    });
    const scopedThreads = await getJson(`http://127.0.0.1:${appPort}/api/threads`);
    assert.deepEqual(scopedThreads.threads.map((item) => item.title), ["Persistent Thread"]);

    const missingWorkspace = await patchJsonAllowFailure(`http://127.0.0.1:${appPort}/api/settings/workspace-selection`, {
      workspaceId: "missing-workspace",
    });
    assert.equal(missingWorkspace.ok, false);

    await postJson(`http://127.0.0.1:${appPort}/api/threads/${thread.thread.id}/messages`, {
      message: "hello persistent server",
    });
    providerServer.mode = "fail-chat";
    const failedChat = await postJsonAllowFailure(`http://127.0.0.1:${appPort}/api/threads/${thread.thread.id}/messages`, {
      message: "this should fail with json",
    });

    assert.equal(failedChat.ok, false);
    assert.equal(typeof failedChat.payload.error, "string");

    const manualArtifact = await postJson(`http://127.0.0.1:${appPort}/api/artifacts`, {
      title: "Manual Artifact",
      content: "# Manual artifact",
      workspaceId: workspace.workspace.id,
      threadId: thread.thread.id,
      source: "manual",
    });
    assert.equal(manualArtifact.artifact.title, "Manual Artifact");

    await postJson(`http://127.0.0.1:${appPort}/api/demo/run`, {
      goal: "persist run history",
      executorChoice: "mock",
    });

    await appServer.stop();
    restartedServer = startSpaceDesktopServer({
      port: appPort,
      storageDir,
    });

    await waitForHttp(`http://127.0.0.1:${appPort}/`);

    const providers = await getJson(`http://127.0.0.1:${appPort}/api/providers`);
    assert.equal(providers.providers.length, 1);
    assert.equal(providers.providers[0].name, "Persistent Mock Provider");
    assert.equal(providers.providers[0].apiKey, undefined);

    const workspaces = await getJson(`http://127.0.0.1:${appPort}/api/workspaces`);
    assert.equal(workspaces.workspaces.length, 2);
    assert.deepEqual(
      workspaces.workspaces.map((item) => item.name).sort(),
      ["Other Workspace", "Persistent Workspace"],
    );
    assert.equal(workspaces.activeWorkspaceId, workspace.workspace.id);
    const persistentWorkspace = workspaces.workspaces.find((item) => item.id === workspace.workspace.id);
    assert.equal(persistentWorkspace.runtime.counts.threads, 1);
    assert.equal(persistentWorkspace.runtime.counts.runs, 1);
    assert.equal(persistentWorkspace.runtime.counts.artifacts >= 2, true);
    assert.equal(persistentWorkspace.runtime.counts.memories, 0);
    assert.equal(persistentWorkspace.runtime.surfaces.localPathBound, true);
    assert.equal(persistentWorkspace.runtime.surfaces.runHistoryReady, true);
    assert.equal(persistentWorkspace.runtime.latestRun.status, "completed");
    assert.equal(typeof persistentWorkspace.runtime.latestActivityAt, "string");
    const otherWorkspaceSummary = workspaces.workspaces.find((item) => item.id === otherWorkspace.workspace.id);
    assert.equal(otherWorkspaceSummary.runtime.counts.threads, 1);
    assert.equal(otherWorkspaceSummary.runtime.counts.runs, 0);
    assert.equal(otherWorkspaceSummary.runtime.surfaces.runHistoryReady, false);

    const messages = await getJson(`http://127.0.0.1:${appPort}/api/threads/${thread.thread.id}/messages`);
    assert.equal(messages.thread.title, "Persistent Thread");
    assert.equal(messages.thread.workspaceId, workspace.workspace.id);
    assert.deepEqual(
      messages.messages.map((message) => `${message.role}:${message.content}`),
      [
        "user:hello persistent server",
        "assistant:persistent chat ok",
        "user:this should fail with json",
        "system:OpenAI-compatible chat request failed with HTTP 500.",
      ],
    );

    const artifacts = await getJson(`http://127.0.0.1:${appPort}/api/artifacts`);
    assert.equal(artifacts.artifacts.some((artifact) => artifact.title === "Manual Artifact"), true);
    assert.equal(artifacts.artifacts.some((artifact) => artifact.source === "chat"), true);
    assert.equal(artifacts.artifacts.some((artifact) => artifact.source === "run"), true);

    const artifactDetail = await getJson(`http://127.0.0.1:${appPort}/api/artifacts/${manualArtifact.artifact.id}`);
    assert.equal(artifactDetail.artifact.content, "# Manual artifact");

    const runs = await getJson(`http://127.0.0.1:${appPort}/api/runs`);
    assert.equal(runs.runs.length, 1);
    assert.equal(runs.runs[0].goal, "persist run history");
    const runEvents = await getJson(`http://127.0.0.1:${appPort}/api/runs/${runs.runs[0].id}/events`);
    assert.equal(runEvents.events.length > 0, true);

    const dbBytes = await readFile(`${storageDir}/app.db`);
    assert.equal(dbBytes.includes(Buffer.from("sk-persistent-secret")), false);

    const secretStore = JSON.parse(await readFile(`${storageDir}/secrets.json`, "utf8"));
    assert.equal(Object.values(secretStore)[0], "sk-persistent-secret");
  } finally {
    await restartedServer?.stop();
    await appServer.stop();
    await providerServer.stop();
    await rm(storageDir, { recursive: true, force: true });
  }
});

test("space desktop MCP config sync resolves real runtime probes and workspace overrides", async () => {
  const storageDir = await mkdtemp(`${tmpdir()}/ai-os-mcp-`);
  const appPort = await getAvailablePort();
  const appServer = startSpaceDesktopServer({
    port: appPort,
    storageDir,
  });

  try {
    await waitForHttp(`http://127.0.0.1:${appPort}/`);

    const empty = await getJson(`http://127.0.0.1:${appPort}/api/mcp/config`);
    assert.equal(empty.resolvedConfig.source, "none");
    assert.equal(empty.resolvedConfig.health.status, "disabled");
    assert.equal(empty.resolvedConfig.runtime.status, "disabled");

    const globalConfig = await patchJson(`http://127.0.0.1:${appPort}/api/mcp/config`, {
      scope: "global",
      enabled: true,
      command: process.execPath,
      argsText: mockMcpServerPath,
    });
    assert.equal(globalConfig.globalConfig.command, process.execPath);
    assert.equal(globalConfig.resolvedConfig.source, "global");
    assert.equal(globalConfig.resolvedConfig.health.status, "ready");
    assert.equal(globalConfig.resolvedConfig.runtime.status, "ready");
    assert.equal(globalConfig.resolvedConfig.runtime.transport, "stdio");
    assert.equal(globalConfig.resolvedConfig.runtime.serverName, "fixture-mcp");
    assert.equal(globalConfig.resolvedConfig.runtime.serverVersion, "1.0.0");
    assert.equal(globalConfig.resolvedConfig.runtime.toolCount, 2);
    assert.deepEqual(globalConfig.resolvedConfig.args, [mockMcpServerPath]);

    const workspace = await postJson(`http://127.0.0.1:${appPort}/api/workspaces`, {
      name: "MCP Workspace",
      path: storageDir,
    });
    const otherWorkspace = await postJson(`http://127.0.0.1:${appPort}/api/workspaces`, {
      name: "Other MCP Workspace",
      path: storageDir,
    });
    await patchJson(`http://127.0.0.1:${appPort}/api/settings/workspace-selection`, {
      workspaceId: workspace.workspace.id,
    });

    const workspaceOverride = await patchJson(`http://127.0.0.1:${appPort}/api/mcp/config`, {
      scope: "workspace",
      enabled: true,
      command: "definitely-missing-mcp-command",
      argsText: "--stdio",
    });
    assert.equal(workspaceOverride.workspaceOverride.command, "definitely-missing-mcp-command");
    assert.equal(workspaceOverride.resolvedConfig.source, "workspace");
    assert.equal(workspaceOverride.resolvedConfig.health.status, "failed");
    assert.equal(workspaceOverride.resolvedConfig.runtime.status, "failed");

    await patchJson(`http://127.0.0.1:${appPort}/api/settings/workspace-selection`, {
      workspaceId: otherWorkspace.workspace.id,
    });
    const switched = await getJson(`http://127.0.0.1:${appPort}/api/mcp/config`);
    assert.equal(switched.resolvedConfig.source, "global");
    assert.equal(switched.workspaceOverride, undefined);
    assert.equal(switched.resolvedConfig.health.status, "ready");
    assert.equal(switched.resolvedConfig.runtime.status, "ready");
    assert.equal(switched.resolvedConfig.runtime.toolCount, 2);
  } finally {
    await appServer.stop();
    await rm(storageDir, { recursive: true, force: true });
  }
});

test("space desktop MCP runtime timeout is reported separately from config health", async () => {
  const storageDir = await mkdtemp(`${tmpdir()}/ai-os-mcp-timeout-`);
  const appPort = await getAvailablePort();
  const appServer = startSpaceDesktopServer({
    port: appPort,
    storageDir,
    envOverrides: {
      AI_SPACE_MCP_PROBE_TIMEOUT_MS: "250",
    },
  });

  try {
    await waitForHttp(`http://127.0.0.1:${appPort}/`);

    const payload = await patchJson(`http://127.0.0.1:${appPort}/api/mcp/config`, {
      scope: "global",
      enabled: true,
      command: process.execPath,
      argsText: `${mockMcpServerPath} --delay-ms 1000`,
    });

    assert.equal(payload.resolvedConfig.health.status, "ready");
    assert.equal(payload.resolvedConfig.runtime.status, "failed");
    assert.match(payload.resolvedConfig.runtime.detail, /timed out/i);
  } finally {
    await appServer.stop();
    await rm(storageDir, { recursive: true, force: true });
  }
});

test("space desktop MCP args parser preserves quoted and escaped segments", async () => {
  const storageDir = await mkdtemp(`${tmpdir()}/ai-os-mcp-args-`);
  const appPort = await getAvailablePort();
  const appServer = startSpaceDesktopServer({
    port: appPort,
    storageDir,
  });

  try {
    await waitForHttp(`http://127.0.0.1:${appPort}/`);

    const payload = await patchJson(`http://127.0.0.1:${appPort}/api/mcp/config`, {
      scope: "global",
      enabled: false,
      command: process.execPath,
      argsText: `${mockMcpServerPath} --label "value with space" 'single quoted' escaped\\ value`,
    });

    assert.deepEqual(payload.resolvedConfig.args, [
      mockMcpServerPath,
      "--label",
      "value with space",
      "single quoted",
      "escaped value",
    ]);
  } finally {
    await appServer.stop();
    await rm(storageDir, { recursive: true, force: true });
  }
});

test("agent hub skeleton projects executors, installed prompt apps, and MCP client state", async () => {
  const storageDir = await mkdtemp(`${tmpdir()}/ai-os-agent-hub-`);
  const appPort = await getAvailablePort();
  const appServer = startSpaceDesktopServer({
    port: appPort,
    storageDir,
  });

  try {
    await waitForHttp(`http://127.0.0.1:${appPort}/`);

    await patchJson(`http://127.0.0.1:${appPort}/api/mcp/config`, {
      scope: "global",
      enabled: true,
      command: process.execPath,
      argsText: mockMcpServerPath,
    });

    const workspace = await postJson(`http://127.0.0.1:${appPort}/api/workspaces`, {
      name: "Agent Hub Workspace",
      path: storageDir,
    });
    const otherWorkspace = await postJson(`http://127.0.0.1:${appPort}/api/workspaces`, {
      name: "Other Agent Hub Workspace",
      path: storageDir,
    });
    await patchJson(`http://127.0.0.1:${appPort}/api/settings/workspace-selection`, {
      workspaceId: workspace.workspace.id,
    });

    const started = await postJson(`http://127.0.0.1:${appPort}/api/runs/start`, {
      goal: "summarize workspace status for agent hub prompt app",
      executorChoice: "mock",
      timeoutMs: 5000,
    });
    await waitForLiveRun(appPort, started.live.runId, (live) => live.status === "completed");
    const created = await postJson(`http://127.0.0.1:${appPort}/api/recipes/from-run`, {
      runId: started.live.runId,
    });
    const exported = await postJson(`http://127.0.0.1:${appPort}/api/recipes/${created.recipe.id}/export`, {});

    const runtimeRegistry = await getJson(`http://127.0.0.1:${appPort}/api/agent-runtimes`);
    assert.equal(runtimeRegistry.runtimes.some((runtime) => runtime.kind === "executor" && runtime.title === "mock"), true);
    assert.equal(runtimeRegistry.runtimes.some((runtime) => runtime.kind === "executor" && runtime.title === "codex" && runtime.compatibility.transport === "process-cli"), true);
    assert.equal(
      runtimeRegistry.runtimes.some((runtime) => (
        runtime.kind === "mcp-client"
        && runtime.status === "ready"
        && runtime.mcpRuntime?.toolCount === 2
        && runtime.mcpRuntime?.serverName === "fixture-mcp"
      )),
      true,
    );
    assert.equal(runtimeRegistry.runtimes.some((runtime) => runtime.kind === "prompt-app" && runtime.capabilityId === exported.capability.id && runtime.workspaceId === workspace.workspace.id), true);

    await patchJson(`http://127.0.0.1:${appPort}/api/settings/workspace-selection`, {
      workspaceId: otherWorkspace.workspace.id,
    });
    const switchedRegistry = await getJson(`http://127.0.0.1:${appPort}/api/agent-runtimes`);
    assert.equal(switchedRegistry.runtimes.some((runtime) => runtime.kind === "prompt-app"), false);
    assert.equal(
      switchedRegistry.runtimes.some((runtime) => runtime.kind === "mcp-client" && runtime.status === "ready" && runtime.mcpRuntime?.toolCount === 2),
      true,
    );
  } finally {
    await appServer.stop();
    await rm(storageDir, { recursive: true, force: true });
  }
});

test("space desktop provider catalog, model loading, and model selection stay compatible", async () => {
  const storageDir = await mkdtemp(`${tmpdir()}/ai-os-provider-governance-`);
  const providerServer = await startMockOpenAiProvider();
  const appPort = await getAvailablePort();
  const appServer = startSpaceDesktopServer({
    port: appPort,
    storageDir,
  });

  try {
    await waitForHttp(`http://127.0.0.1:${appPort}/`);

    const saved = await postJson(`http://127.0.0.1:${appPort}/api/providers`, {
      name: "Catalog Provider",
      protocol: "openai-compatible",
      baseUrl: `http://127.0.0.1:${providerServer.port}/v1`,
      apiKey: "sk-provider-governance",
      modelId: "mock-model",
    });

    const catalogResponse = await fetch(
      `http://127.0.0.1:${appPort}/api/providers/catalog?baseUrl=${encodeURIComponent(`http://127.0.0.1:${providerServer.port}/v1`)}`,
    );
    assert.equal(catalogResponse.ok, true);
    const catalog = await catalogResponse.json();
    assert.deepEqual(
      catalog.providers.map((entry) => entry.protocol),
      ["openai-compatible", "anthropic-compatible"],
    );
    assert.equal(catalog.detectedProtocol, "openai-compatible");

    const modelResponse = await getJson(
      `http://127.0.0.1:${appPort}/api/providers/${saved.provider.id}/models`,
    );
    assert.equal(modelResponse.available, true);
    assert.equal(modelResponse.catalog.protocol, "openai-compatible");
    assert.equal(modelResponse.models.includes("mock-model"), true);

    const selectedModelId = "mock-model-alt";
    const selection = await patchJson(`http://127.0.0.1:${appPort}/api/settings/model-selection`, {
      providerId: saved.provider.id,
      modelId: selectedModelId,
    });
    assert.equal(selection.activeProviderId, saved.provider.id);
    assert.equal(selection.activeModelId, selectedModelId);

    const activeProvider = await getJson(`http://127.0.0.1:${appPort}/api/provider`);
    assert.equal(activeProvider.provider.modelId, selectedModelId);
  } finally {
    await appServer.stop();
    await providerServer.stop();
    await rm(storageDir, { recursive: true, force: true });
  }
});

test("space desktop V0.5 run workflow records approval history and trust decisions", async () => {
  const storageDir = await mkdtemp(`${tmpdir()}/ai-os-v05-`);
  const appPort = await getAvailablePort();
  const appServer = startSpaceDesktopServer({
    port: appPort,
    storageDir,
  });

  try {
    await waitForHttp(`http://127.0.0.1:${appPort}/`);

    const missingWorkspace = await postJsonAllowFailure(`http://127.0.0.1:${appPort}/api/runs/start`, {
      goal: "try without workspace",
      executorChoice: "mock",
    });
    assert.equal(missingWorkspace.ok, false);
    assert.match(missingWorkspace.payload.error, /Select a workspace/);

    const executors = await getJson(`http://127.0.0.1:${appPort}/api/executors`);
    assert.deepEqual(
      executors.executors.map((executor) => executor.choice),
      ["mock", "codex", "claude-code"],
    );
    assert.equal(executors.executors[0].available, true);
    assert.equal(executors.executors[0].compatibility.transport, "embedded");
    assert.equal(executors.executors[0].compatibility.capabilities.artifactCollection, "native");
    assert.equal(executors.executors[1].compatibility.transport, "process-cli");
    assert.equal(executors.executors[1].compatibility.capabilities.approvalBridge, "product-pre-run");
    assert.equal(executors.executors[1].compatibility.capabilities.artifactCollection, "fallback-only");
    assert.equal(executors.executors[2].compatibility.capabilities.sessionContinuation, "product-pre-run");

    await postJson(`http://127.0.0.1:${appPort}/api/workspaces`, {
      name: "V0.5 Workspace",
      path: storageDir,
    });

    const approvingRun = await postJson(`http://127.0.0.1:${appPort}/api/runs/start`, {
      goal: "write a mock approval workflow report",
      executorChoice: "mock",
      timeoutMs: 5000,
    });
    assert.equal(approvingRun.run.status, "awaiting-approval");
    assert.match(approvingRun.live.sessionId, /^session-run-live-/);
    assert.match(approvingRun.live.currentTurn.turnId, /^turn-live-/);
    assert.equal(approvingRun.live.currentTurn.status, "awaiting-approval");
    assert.equal(approvingRun.live.queryLoop.phase, "awaiting-approval");
    assert.equal(approvingRun.live.queryLoop.interceptions.some((entry) => entry.stage === "pre-run" && entry.status === "pending"), true);
    assert.equal(approvingRun.live.queryLoop.retrySites.find((entry) => entry.site === "pre-run-approval").status, "blocked");
    assert.equal(approvingRun.live.items.some((item) => item.kind === "approval"), true);
    const startApprovalItem = approvingRun.live.items.find((item) => item.kind === "approval");
    assert.equal(startApprovalItem.status, "blocked");
    assert.equal(approvingRun.live.currentTurn.itemIds.includes(startApprovalItem.itemId), true);
    assert.equal(startApprovalItem.eventIds.length, 1);

    const pending = await waitForLiveRun(appPort, approvingRun.live.runId, (live) => Boolean(live.pendingApproval));
    assert.equal(pending.status, "awaiting-approval");
    assert.equal(pending.pendingApproval.category, "file-write");
    assert.equal(pending.pendingApproval.riskLevel, "medium");
    assert.match(pending.pendingApproval.reason, /File mutation/);
    const workspaceRuntimeDuringApproval = await getJson(`http://127.0.0.1:${appPort}/api/workspaces`);
    const activeRuntimeDuringApproval = workspaceRuntimeDuringApproval.workspaces.find((item) => item.id === approvingRun.run.workspaceId).runtime;
    assert.equal(activeRuntimeDuringApproval.counts.activeRuns, 1);
    assert.equal(activeRuntimeDuringApproval.currentRun.runId, approvingRun.live.runId);
    assert.equal(activeRuntimeDuringApproval.currentRun.queryLoop.phase, "awaiting-approval");
    assert.equal(activeRuntimeDuringApproval.currentRun.pendingApproval.stage, "pre-run");

    await postJson(`http://127.0.0.1:${appPort}/api/runs/${approvingRun.live.runId}/approval`, {
      decision: "grant",
    });
    const completed = await waitForLiveRun(appPort, approvingRun.live.runId, (live) => live.status === "completed");
    assert.equal(completed.sessionId, approvingRun.live.sessionId);
    assert.equal(completed.currentTurn.status, "completed");
    assert.equal(typeof completed.currentTurn.completedAt, "string");
    assert.equal(completed.queryLoop.phase, "completed");
    assert.equal(completed.queryLoop.retrySites.find((entry) => entry.site === "executor-stream").status, "completed");
    assert.equal(completed.queryLoop.retrySites.find((entry) => entry.site === "artifact-persist").status, "completed");
    assert.equal(completed.queryLoop.interceptions.some((entry) => entry.stage === "pre-run" && entry.status === "granted"), true);
    const completedApprovalItem = completed.items.find((item) => item.kind === "approval");
    assert.equal(completedApprovalItem.status, "completed");
    assert.equal(completedApprovalItem.eventIds.length >= 2, true);
    const executorItem = completed.items.find((item) => item.kind === "executor-run");
    assert.equal(executorItem.status, "completed");
    assert.equal(executorItem.eventIds.length >= 3, true);
    const artifactPersistItem = completed.items.find((item) => item.kind === "artifact-persist");
    assert.equal(artifactPersistItem.status, "completed");
    assert.equal(artifactPersistItem.eventIds.length >= 1, true);
    assert.equal(completed.artifacts.some((artifact) => artifact.kind === "diff"), true);
    assert.equal(completed.events.some((event) => event.type === "approval.granted"), true);

    const persistedEvents = await getJson(`http://127.0.0.1:${appPort}/api/runs/${approvingRun.live.runId}/events`);
    assert.equal(persistedEvents.events.some((event) => event.type === "approval.granted"), true);
    assert.equal(persistedEvents.events.some((event) => event.type === "run.completed"), true);
    const approvalHistory = await getJson(`http://127.0.0.1:${appPort}/api/approvals`);
    const grantedApproval = approvalHistory.approvals.find((approval) => approval.runId === approvingRun.live.runId);
    assert.equal(grantedApproval.category, "file-write");
    assert.equal(grantedApproval.riskLevel, "medium");
    assert.equal(grantedApproval.status, "granted");
    assert.equal(grantedApproval.decision, "grant");
    assert.equal(typeof grantedApproval.resolvedAt, "string");

    const artifacts = await getJson(`http://127.0.0.1:${appPort}/api/artifacts`);
    assert.equal(artifacts.artifacts.some((artifact) => artifact.runId === approvingRun.live.runId && artifact.kind === "diff"), true);
    assert.equal(artifacts.artifacts.some((artifact) => artifact.runId === approvingRun.live.runId && artifact.kind === "report"), true);

    const cancelRun = await postJson(`http://127.0.0.1:${appPort}/api/runs/start`, {
      goal: "write a second mock approval workflow report",
      executorChoice: "mock",
      timeoutMs: 5000,
    });
    await waitForLiveRun(appPort, cancelRun.live.runId, (live) => Boolean(live.pendingApproval));
    const cancelled = await postJson(`http://127.0.0.1:${appPort}/api/runs/${cancelRun.live.runId}/cancel`, {});
    assert.equal(cancelled.live.status, "interrupted");
    assert.equal(cancelled.live.events.some((event) => event.type === "run.interrupted"), true);

    const shellRun = await postJson(`http://127.0.0.1:${appPort}/api/runs/start`, {
      goal: "run npm install command",
      executorChoice: "mock",
      timeoutMs: 5000,
    });
    const shellPending = await waitForLiveRun(appPort, shellRun.live.runId, (live) => Boolean(live.pendingApproval));
    assert.equal(shellPending.pendingApproval.category, "shell-command");
    await postJson(`http://127.0.0.1:${appPort}/api/runs/${shellRun.live.runId}/approval`, {
      decision: "reject",
    });
    const shellFailed = await waitForLiveRun(appPort, shellRun.live.runId, (live) => live.status === "failed");
    assert.equal(shellFailed.queryLoop.phase, "failed");
    assert.equal(shellFailed.queryLoop.lastFailure.site, "pre-run-approval");
    assert.equal(shellFailed.queryLoop.lastFailure.retryable, true);
    assert.equal(shellFailed.events.some((event) => event.type === "approval.rejected"), true);
    const rejectedHistory = await getJson(`http://127.0.0.1:${appPort}/api/approvals`);
    const rejectedApproval = rejectedHistory.approvals.find((approval) => approval.runId === shellRun.live.runId);
    assert.equal(rejectedApproval.status, "rejected");
    assert.equal(rejectedApproval.decision, "reject");

    const networkRun = await postJson(`http://127.0.0.1:${appPort}/api/runs/start`, {
      goal: "download and upload a report",
      executorChoice: "mock",
      timeoutMs: 5000,
    });
    const networkPending = await waitForLiveRun(appPort, networkRun.live.runId, (live) => Boolean(live.pendingApproval));
    assert.equal(networkPending.pendingApproval.category, "network");

    await patchJson(`http://127.0.0.1:${appPort}/api/workspaces/${approvingRun.run.workspaceId}`, {
      name: "V0.5 Workspace",
      path: storageDir,
      trustLevel: "trusted-local-writes",
    });

    const runtimeRun = await postJson(`http://127.0.0.1:${appPort}/api/runs/start`, {
      goal: "review the current workspace and pause for approval before the final summary",
      executorChoice: "mock",
      timeoutMs: 5000,
    });
    assert.equal(runtimeRun.live.pendingApproval, undefined);
    const runtimePending = await waitForLiveRun(appPort, runtimeRun.live.runId, (live) => Boolean(live.pendingApproval));
    assert.equal(runtimePending.pendingApproval.category, "shell-command");
    assert.equal(runtimePending.currentTurn.status, "awaiting-approval");
    assert.equal(runtimePending.queryLoop.phase, "awaiting-approval");
    const runtimeApprovalId = runtimePending.pendingApproval.approvalId;
    assert.equal(runtimePending.queryLoop.interceptions.some((entry) => entry.approvalId === runtimeApprovalId && entry.stage === "runtime" && entry.status === "pending"), true);
    assert.equal(runtimePending.queryLoop.retrySites.find((entry) => entry.site === "runtime-approval").status, "blocked");
    const runtimeApprovalItem = runtimePending.items.find((item) => item.approvalId === runtimeApprovalId);
    assert.equal(runtimeApprovalItem.title, "Runtime Approval");
    assert.equal(runtimeApprovalItem.status, "blocked");
    assert.equal(runtimePending.items.some((item) => item.kind === "executor-run"), true);
    await postJson(`http://127.0.0.1:${appPort}/api/runs/${runtimeRun.live.runId}/approval`, {
      decision: "grant",
    });
    const runtimeCompleted = await waitForLiveRun(
      appPort,
      runtimeRun.live.runId,
      (live) => live.status === "completed" && !live.pendingApproval,
    );
    assert.equal(runtimeCompleted.queryLoop.phase, "completed");
    assert.equal(runtimeCompleted.queryLoop.interceptions.some((entry) => entry.approvalId === runtimeApprovalId && entry.status === "granted"), true);
    assert.equal(runtimeCompleted.queryLoop.retrySites.find((entry) => entry.site === "runtime-approval").status, "completed");
    const runtimeCompletedApprovalItem = runtimeCompleted.items.find((item) => item.approvalId === runtimeApprovalId);
    assert.equal(runtimeCompletedApprovalItem.status, "completed");
    assert.equal(runtimeCompleted.items.some((item) => item.kind === "executor-run" && item.status === "completed"), true);

    const autoRun = await postJson(`http://127.0.0.1:${appPort}/api/runs/start`, {
      goal: "edit a trusted local note",
      executorChoice: "mock",
      timeoutMs: 5000,
    });
    assert.equal(autoRun.live.pendingApproval, undefined);
    const autoCompleted = await waitForLiveRun(appPort, autoRun.live.runId, (live) => live.status === "completed");
    assert.equal(autoCompleted.events.some((event) => event.type === "approval.granted"), true);
    const autoHistory = await getJson(`http://127.0.0.1:${appPort}/api/approvals`);
    const autoApproval = autoHistory.approvals.find((approval) => approval.runId === autoRun.live.runId);
    assert.equal(autoApproval.status, "granted");
    assert.equal(autoApproval.decision, "grant");
    assert.match(autoApproval.note, /Auto-granted/);
  } finally {
    await appServer.stop();
    await rm(storageDir, { recursive: true, force: true });
  }
});

test("space desktop V0.6 automations run locally and respect approvals", async () => {
  const storageDir = await mkdtemp(`${tmpdir()}/ai-os-v06-`);
  const appPort = await getAvailablePort();
  const appServer = startSpaceDesktopServer({
    port: appPort,
    storageDir,
  });

  try {
    await waitForHttp(`http://127.0.0.1:${appPort}/`);

    const workspace = await postJson(`http://127.0.0.1:${appPort}/api/workspaces`, {
      name: "V0.6 Workspace",
      path: storageDir,
    });

    const reminder = await postJson(`http://127.0.0.1:${appPort}/api/automations`, {
      title: "Review reminder",
      kind: "one-off",
      prompt: "remind me to review this workspace",
      intervalMs: 1000,
    });
    assert.equal(reminder.automation.kind, "one-off");

    const heartbeat = await postJson(`http://127.0.0.1:${appPort}/api/automations`, {
      title: "Heartbeat check",
      kind: "heartbeat",
      prompt: "heartbeat check workspace status",
      intervalMs: 1000,
    });
    assert.equal(heartbeat.automation.kind, "heartbeat");

    const tick = await postJson(`http://127.0.0.1:${appPort}/api/automations/tick`, {});
    assert.equal(tick.runs.length >= 2, true);
    const automationRuns = await getJson(`http://127.0.0.1:${appPort}/api/automation-runs`);
    assert.equal(automationRuns.runs.some((run) => run.status === "completed"), true);
    assert.equal(automationRuns.runs.some((run) => run.automationId === reminder.automation.id), true);

    const artifacts = await getJson(`http://127.0.0.1:${appPort}/api/artifacts`);
    assert.equal(artifacts.artifacts.some((artifact) => artifact.source === "automation"), true);

    const paused = await patchJson(`http://127.0.0.1:${appPort}/api/automations/${heartbeat.automation.id}`, {
      status: "paused",
    });
    assert.equal(paused.automation.status, "paused");
    const resumed = await patchJson(`http://127.0.0.1:${appPort}/api/automations/${heartbeat.automation.id}`, {
      status: "active",
    });
    assert.equal(resumed.automation.status, "active");

    await postJson(`http://127.0.0.1:${appPort}/api/automations`, {
      title: "Risky automation",
      kind: "scheduled",
      prompt: "run npm install command",
      intervalMs: 1000,
    });
    const riskyTick = await postJson(`http://127.0.0.1:${appPort}/api/automations/tick`, {});
    assert.equal(riskyTick.runs.some((run) => run.status === "waiting-approval"), true);
    const approvals = await getJson(`http://127.0.0.1:${appPort}/api/approvals`);
    assert.equal(approvals.approvals.some((approval) => approval.executorChoice === "automation" && approval.category === "shell-command"), true);

    await patchJson(`http://127.0.0.1:${appPort}/api/workspaces/${workspace.workspace.id}`, {
      name: "V0.6 Workspace",
      path: storageDir,
      trustLevel: "trusted-local-writes",
    });
    await postJson(`http://127.0.0.1:${appPort}/api/automations`, {
      title: "Trusted automation",
      kind: "scheduled",
      prompt: "edit a local automation note",
      intervalMs: 1000,
    });
    const trustedTick = await postJson(`http://127.0.0.1:${appPort}/api/automations/tick`, {});
    assert.equal(trustedTick.runs.some((run) => run.status === "completed"), true);
    const trustedApprovals = await getJson(`http://127.0.0.1:${appPort}/api/approvals`);
    assert.equal(trustedApprovals.approvals.some((approval) => approval.executorChoice === "automation" && /Auto-granted automation/.test(approval.note ?? "")), true);

    await fetch(`http://127.0.0.1:${appPort}/api/automations/${heartbeat.automation.id}`, { method: "DELETE" });
    const automations = await getJson(`http://127.0.0.1:${appPort}/api/automations`);
    assert.equal(automations.automations.some((automation) => automation.id === heartbeat.automation.id), false);
  } finally {
    await appServer.stop();
    await rm(storageDir, { recursive: true, force: true });
  }
});

test("workspace native artifact preview and terminal summary stay scoped to the active workspace", async () => {
  const storageDir = await mkdtemp(`${tmpdir()}/ai-os-p1-surface-`);
  const workspaceDir = await mkdtemp(`${tmpdir()}/ai-os-p1-worktree-`);
  const secondWorkspaceDir = await mkdtemp(`${tmpdir()}/ai-os-p1-worktree-other-`);
  const appPort = await getAvailablePort();
  const appServer = startSpaceDesktopServer({
    port: appPort,
    storageDir,
  });

  try {
    execFileSync("git", ["init", "-b", "main"], { cwd: workspaceDir });
    await writeFile(resolve(workspaceDir, "notes.md"), "# Workspace Notes\n");

    await waitForHttp(`http://127.0.0.1:${appPort}/`);

    const workspace = await postJson(`http://127.0.0.1:${appPort}/api/workspaces`, {
      name: "Surface Workspace",
      path: workspaceDir,
    });
    const otherWorkspace = await postJson(`http://127.0.0.1:${appPort}/api/workspaces`, {
      name: "Other Surface Workspace",
      path: secondWorkspaceDir,
    });

    await patchJson(`http://127.0.0.1:${appPort}/api/settings/workspace-selection`, {
      workspaceId: workspace.workspace.id,
    });
    await postJson(`http://127.0.0.1:${appPort}/api/artifacts`, {
      title: "Workspace Surface Note",
      content: "# Preview me from workspace runtime",
      workspaceId: workspace.workspace.id,
      source: "manual",
    });

    const scoped = await getJson(`http://127.0.0.1:${appPort}/api/workspaces`);
    const activeWorkspace = scoped.workspaces.find((item) => item.id === workspace.workspace.id);
    const inactiveWorkspace = scoped.workspaces.find((item) => item.id === otherWorkspace.workspace.id);
    assert.equal(activeWorkspace.runtime.artifactPreview.title, "Workspace Surface Note");
    assert.match(activeWorkspace.runtime.artifactPreview.contentPreview, /Preview me from workspace runtime/);
    assert.equal(activeWorkspace.runtime.terminal.cwd, workspaceDir);
    assert.equal(activeWorkspace.runtime.terminal.gitAvailable, true);
    assert.equal(activeWorkspace.runtime.terminal.branch, "main");
    assert.match(activeWorkspace.runtime.terminal.preview, /\$ git status --short/);
    assert.match(activeWorkspace.runtime.terminal.preview, /notes\.md/);
    assert.equal(activeWorkspace.runtime.surfaces.artifactPreviewReady, true);
    assert.equal(activeWorkspace.runtime.surfaces.terminalCandidate, true);
    assert.equal(inactiveWorkspace.runtime.artifactPreview, undefined);
    assert.equal(inactiveWorkspace.runtime.terminal, undefined);
  } finally {
    await appServer.stop();
    await rm(storageDir, { recursive: true, force: true });
    await rm(workspaceDir, { recursive: true, force: true });
    await rm(secondWorkspaceDir, { recursive: true, force: true });
  }
});

test("workspace long run continuation resumes pre-run approval after restart", async () => {
  const storageDir = await mkdtemp(`${tmpdir()}/ai-os-p1-pre-run-`);
  const appPort = await getAvailablePort();
  const appServer = startSpaceDesktopServer({
    port: appPort,
    storageDir,
  });
  let restartedServer;

  try {
    await waitForHttp(`http://127.0.0.1:${appPort}/`);

    await postJson(`http://127.0.0.1:${appPort}/api/workspaces`, {
      name: "P1 Continuation Workspace",
      path: storageDir,
    });

    const run = await postJson(`http://127.0.0.1:${appPort}/api/runs/start`, {
      goal: "write a resumable approval workflow report",
      executorChoice: "mock",
      timeoutMs: 5000,
    });
    const pending = await waitForLiveRun(appPort, run.live.runId, (live) => Boolean(live.pendingApproval));
    assert.equal(pending.pendingApproval.stage, "pre-run");

    await appServer.stop();
    restartedServer = startSpaceDesktopServer({
      port: appPort,
      storageDir,
    });
    await waitForHttp(`http://127.0.0.1:${appPort}/`);

    const resumedLive = await getJson(`http://127.0.0.1:${appPort}/api/runs/${run.live.runId}/live`);
    assert.equal(resumedLive.live.status, "awaiting-approval");
    assert.equal(resumedLive.live.continuationState.kind, "resume-pre-run-approval");
    assert.equal(resumedLive.live.continuationState.resumable, true);
    assert.equal(resumedLive.live.pendingApproval.stage, "pre-run");

    await postJson(`http://127.0.0.1:${appPort}/api/runs/${run.live.runId}/approval`, {
      decision: "grant",
    });
    const completed = await waitForLiveRun(appPort, run.live.runId, (live) => live.status === "completed");
    assert.equal(completed.events.some((event) => event.type === "approval.granted"), true);
  } finally {
    if (restartedServer) {
      await restartedServer.stop();
    } else {
      await appServer.stop();
    }
    await rm(storageDir, { recursive: true, force: true });
  }
});

test("workspace long run continuation marks runtime approval restarts as rerun-required", async () => {
  const storageDir = await mkdtemp(`${tmpdir()}/ai-os-p1-runtime-`);
  const appPort = await getAvailablePort();
  const appServer = startSpaceDesktopServer({
    port: appPort,
    storageDir,
  });
  let restartedServer;

  try {
    await waitForHttp(`http://127.0.0.1:${appPort}/`);

    await postJson(`http://127.0.0.1:${appPort}/api/workspaces`, {
      name: "P1 Runtime Approval Workspace",
      path: storageDir,
    });

    const run = await postJson(`http://127.0.0.1:${appPort}/api/runs/start`, {
      goal: "review the workspace and pause for approval before the final summary",
      executorChoice: "mock",
      timeoutMs: 5000,
    });
    const runtimePending = await waitForLiveRun(appPort, run.live.runId, (live) => Boolean(live.pendingApproval));
    assert.equal(runtimePending.pendingApproval.stage, "runtime");

    await appServer.stop();
    restartedServer = startSpaceDesktopServer({
      port: appPort,
      storageDir,
    });
    await waitForHttp(`http://127.0.0.1:${appPort}/`);

    const restartedLive = await getJson(`http://127.0.0.1:${appPort}/api/runs/${run.live.runId}/live`);
    assert.equal(restartedLive.live.status, "interrupted");
    assert.equal(restartedLive.live.continuationState.kind, "history-only");
    assert.equal(restartedLive.live.continuationState.resumable, false);
    assert.equal(restartedLive.live.queryLoop.phase, "interrupted");
    assert.equal(restartedLive.live.queryLoop.lastFailure.site, "runtime-approval");

    const retryApproval = await postJsonAllowFailure(`http://127.0.0.1:${appPort}/api/runs/${run.live.runId}/approval`, {
      decision: "grant",
    });
    assert.equal(retryApproval.ok, false);
    assert.match(retryApproval.payload.error, /Run session not found/);
  } finally {
    if (restartedServer) {
      await restartedServer.stop();
    } else {
      await appServer.stop();
    }
    await rm(storageDir, { recursive: true, force: true });
  }
});

test("space desktop V0.7 memories persist and are injected into chat and runs", async () => {
  const storageDir = await mkdtemp(`${tmpdir()}/ai-os-v07-`);
  const providerServer = await startMockOpenAiProvider();
  const appPort = await getAvailablePort();
  const appServer = startSpaceDesktopServer({
    port: appPort,
    storageDir,
  });

  try {
    await waitForHttp(`http://127.0.0.1:${appPort}/`);

    await postJson(`http://127.0.0.1:${appPort}/api/providers`, {
      name: "Memory Provider",
      protocol: "openai-compatible",
      baseUrl: `http://127.0.0.1:${providerServer.port}/v1`,
      apiKey: "sk-memory-secret",
      modelId: "memory-model",
    });

    const workspace = await postJson(`http://127.0.0.1:${appPort}/api/workspaces`, {
      name: "V0.7 Workspace",
      path: storageDir,
    });

    const memory = await postJson(`http://127.0.0.1:${appPort}/api/memories`, {
      title: "Planning preference",
      content: "Prefer concise plans and local-first defaults.",
      scope: "workspace",
      sensitivity: "low",
    });
    assert.equal(memory.memory.title, "Planning preference");

    const thread = await postJson(`http://127.0.0.1:${appPort}/api/threads`, {
      title: "Memory Thread",
    });

    const chat = await postJson(`http://127.0.0.1:${appPort}/api/threads/${thread.thread.id}/messages`, {
      message: "Give me a plan using my local-first preference",
    });
    assert.equal(chat.memoryUsage.length > 0, true);
    assert.equal(chat.memoryUsage[0].title, "Planning preference");
    assert.equal(chat.memoryTrace.mode, "search");
    assert.equal(chat.memoryTrace.entries[0].memoryId, memory.memory.id);

    const memoriesAfterChat = await getJson(`http://127.0.0.1:${appPort}/api/memories`);
    const usedMemory = memoriesAfterChat.memories.find((item) => item.id === memory.memory.id);
    assert.equal(typeof usedMemory.lastUsedAt, "string");

    const run = await postJson(`http://127.0.0.1:${appPort}/api/runs/start`, {
      goal: "use my local-first preference to write a report",
      executorChoice: "mock",
      timeoutMs: 5000,
    });
    assert.equal(run.live.memoryUsage.length > 0, true);
    assert.equal(run.live.memoryUsage[0].title, "Planning preference");
    assert.equal(run.live.memoryTrace.mode, "search");
    assert.equal(run.live.memoryTrace.entries[0].memoryId, memory.memory.id);

    await postJson(`http://127.0.0.1:${appPort}/api/runs/${run.live.runId}/approval`, {
      decision: "grant",
    });
    await waitForLiveRun(appPort, run.live.runId, (live) => live.status === "completed");
    const persistedRun = await getJson(`http://127.0.0.1:${appPort}/api/runs/${run.live.runId}/events`);
    assert.equal(persistedRun.memoryUsage.length > 0, true);
    assert.equal(persistedRun.memoryUsage[0].title, "Planning preference");
    assert.equal(persistedRun.memoryTrace.mode, "search");

    await deleteJson(`http://127.0.0.1:${appPort}/api/memories/${memory.memory.id}`);
    const memoriesAfterDelete = await getJson(`http://127.0.0.1:${appPort}/api/memories`);
    assert.equal(memoriesAfterDelete.memories.some((item) => item.id === memory.memory.id), false);
    const persistedAfterDelete = await getJson(`http://127.0.0.1:${appPort}/api/runs/${run.live.runId}/events`);
    assert.equal(persistedAfterDelete.memoryUsage.length > 0, true);
    assert.equal(persistedAfterDelete.memoryUsage[0].title, "Planning preference");
  } finally {
    await appServer.stop();
    await providerServer.stop();
    await rm(storageDir, { recursive: true, force: true });
  }
});

test("space desktop V0.8 capabilities can be inspected, toggled, and run", async () => {
  const storageDir = await mkdtemp(`${tmpdir()}/ai-os-v08-`);
  const appPort = await getAvailablePort();
  const appServer = startSpaceDesktopServer({
    port: appPort,
    storageDir,
  });

  try {
    await waitForHttp(`http://127.0.0.1:${appPort}/`);

    const workspace = await postJson(`http://127.0.0.1:${appPort}/api/workspaces`, {
      name: "V0.8 Workspace",
      path: storageDir,
    });
    assert.equal(workspace.workspace.name, "V0.8 Workspace");

    const capabilities = await getJson(`http://127.0.0.1:${appPort}/api/capabilities`);
    assert.equal(capabilities.capabilities.length >= 3, true);
    const workspaceSummary = capabilities.capabilities.find((capability) => capability.id === "capability-workspace-summary");
    assert.equal(workspaceSummary.enabled, true);
    assert.equal(workspaceSummary.permissions.some((permission) => permission.category === "workspace-read"), true);

    const disabled = await patchJson(`http://127.0.0.1:${appPort}/api/capabilities/${workspaceSummary.id}`, {
      enabled: false,
    });
    assert.equal(disabled.capability.enabled, false);

    const disabledRun = await postJsonAllowFailure(`http://127.0.0.1:${appPort}/api/capabilities/${workspaceSummary.id}/run`, {});
    assert.equal(disabledRun.ok, false);
    assert.match(disabledRun.payload.error, /disabled/i);

    const enabledAgain = await patchJson(`http://127.0.0.1:${appPort}/api/capabilities/${workspaceSummary.id}`, {
      enabled: true,
    });
    assert.equal(enabledAgain.capability.enabled, true);

    const executed = await postJson(`http://127.0.0.1:${appPort}/api/capabilities/${workspaceSummary.id}/run`, {});
    assert.equal(executed.run.status, "completed");
    assert.equal(executed.artifact.source, "capability");

    const capabilityRuns = await getJson(`http://127.0.0.1:${appPort}/api/capability-runs`);
    assert.equal(capabilityRuns.runs.some((run) => run.capabilityId === workspaceSummary.id), true);

    const artifacts = await getJson(`http://127.0.0.1:${appPort}/api/artifacts`);
    assert.equal(artifacts.artifacts.some((artifact) => artifact.source === "capability"), true);
  } finally {
    await appServer.stop();
    await rm(storageDir, { recursive: true, force: true });
  }
});

test("space desktop V0.9 forge recipes can be created, tested, exported, and rerun", async () => {
  const storageDir = await mkdtemp(`${tmpdir()}/ai-os-v09-`);
  const appPort = await getAvailablePort();
  const appServer = startSpaceDesktopServer({
    port: appPort,
    storageDir,
  });

  try {
    await waitForHttp(`http://127.0.0.1:${appPort}/`);

    const workspace = await postJson(`http://127.0.0.1:${appPort}/api/workspaces`, {
      name: "V0.9 Workspace",
      path: storageDir,
    });
    assert.equal(workspace.workspace.name, "V0.9 Workspace");

    const started = await postJson(`http://127.0.0.1:${appPort}/api/runs/start`, {
      goal: "summarize workspace status for recipe preview",
      executorChoice: "mock",
      timeoutMs: 5000,
    });
    const completed = await waitForLiveRun(appPort, started.live.runId, (live) => live.status === "completed");
    assert.equal(completed.status, "completed");

    const created = await postJson(`http://127.0.0.1:${appPort}/api/recipes/from-run`, {
      runId: started.live.runId,
    });
    assert.match(created.recipe.title, /Recipe:/);
    assert.equal(created.recipe.prompt, "summarize workspace status for recipe preview");
    assert.equal(created.recipe.sourceRunId, started.live.runId);
    assert.equal(created.recipe.workspaceId, workspace.workspace.id);
    assert.equal(created.promptApp.runtimeBinding.workspaceId, workspace.workspace.id);
    assert.equal(created.promptApp.runtimeBinding.executionMode, "workspace-runtime");
    assert.equal(created.promptApp.runtimeBinding.toolPolicy, "workspace-default");
    assert.equal(created.promptApp.runtimeBinding.artifactPolicy, "workspace-artifact");

    const updated = await patchJson(`http://127.0.0.1:${appPort}/api/recipes/${created.recipe.id}`, {
      title: "Workspace Digest Recipe",
      prompt: "Create a concise workspace digest.",
      inputSpec: "Workspace goal and recent run context",
      outputSpec: "Markdown digest with next actions",
    });
    assert.equal(updated.recipe.title, "Workspace Digest Recipe");
    assert.equal(updated.recipe.prompt, "Create a concise workspace digest.");
    assert.equal(updated.promptApp.runtimeBinding.workspaceId, workspace.workspace.id);

    const tested = await postJson(`http://127.0.0.1:${appPort}/api/recipes/${created.recipe.id}/test`, {});
    assert.equal(tested.test.status, "completed");
    assert.equal(tested.test.recipeId, created.recipe.id);
    assert.match(tested.test.result, /Workspace Digest Recipe/);
    assert.match(tested.test.result, /Create a concise workspace digest/);

    const exported = await postJson(`http://127.0.0.1:${appPort}/api/recipes/${created.recipe.id}/export`, {});
    assert.equal(exported.recipe.capabilityId, exported.capability.id);
    assert.equal(exported.promptApp.runtimeBinding.workspaceId, workspace.workspace.id);
    assert.equal(exported.promptApp.installation.installedCapabilityId, exported.capability.id);
    assert.equal(typeof exported.promptApp.installation.installedAt, "string");
    assert.equal(exported.capability.kind, "local");
    assert.equal(exported.capability.enabled, true);

    await patchJson(`http://127.0.0.1:${appPort}/api/recipes/${created.recipe.id}`, {
      title: "Workspace Digest Recipe V2",
      outputSpec: "Markdown digest with risks and next actions",
    });
    const reexported = await postJson(`http://127.0.0.1:${appPort}/api/recipes/${created.recipe.id}/export`, {});
    assert.equal(reexported.capability.id, exported.capability.id);
    assert.equal(reexported.capability.title, "Workspace Digest Recipe V2");

    const rerun = await postJson(`http://127.0.0.1:${appPort}/api/capabilities/${reexported.capability.id}/run`, {});
    assert.equal(rerun.run.status, "completed");
    assert.equal(rerun.artifact.source, "capability");
    assert.match(rerun.artifact.content, /Prompt App bridge replay/);
    assert.match(rerun.artifact.content, /Installed Capability:/);
    assert.match(rerun.run.result, /Prompt App bridge replay/);
    assert.match(rerun.artifact.content, /Workspace Digest Recipe V2/);
    assert.match(rerun.artifact.content, /Markdown digest with risks and next actions/);

    const capabilityRuns = await getJson(`http://127.0.0.1:${appPort}/api/capability-runs`);
    assert.equal(capabilityRuns.runs.some((run) => run.capabilityId === reexported.capability.id), true);

    const recipes = await getJson(`http://127.0.0.1:${appPort}/api/recipes`);
    assert.equal(recipes.recipes.some((recipe) => recipe.id === created.recipe.id && recipe.capabilityId === reexported.capability.id), true);

    const recipeTests = await getJson(`http://127.0.0.1:${appPort}/api/recipe-tests`);
    assert.equal(recipeTests.tests.some((testRun) => testRun.recipeId === created.recipe.id), true);
  } finally {
    await appServer.stop();
    await rm(storageDir, { recursive: true, force: true });
  }
});

test("space desktop V1.0 readiness summarizes local setup without leaking secrets", async () => {
  const storageDir = await mkdtemp(`${tmpdir()}/ai-os-v10-`);
  const appPort = await getAvailablePort();
  const appServer = startSpaceDesktopServer({
    port: appPort,
    storageDir,
  });

  try {
    await waitForHttp(`http://127.0.0.1:${appPort}/`);

    const initial = await getJson(`http://127.0.0.1:${appPort}/api/app/readiness`);
    assert.equal(initial.version, "1.0.0");
    assert.equal(initial.releaseName, "Personal AI OS");
    assert.equal(initial.layout, "v1.0-personal-ai-os");
    assert.equal(initial.install.signed, false);
    assert.equal(initial.install.notarized, false);
    assert.equal(initial.install.nodeRequired, true);
    assert.equal(initial.install.buildCommand, expectedHostBuildCommand);
    assert.equal(initial.install.openCommand, expectedHostOpenCommand);
    assert.equal(initial.install.windowsCommand, "cd product && npm run package:win");
    assert.match(initial.install.note, /without the Electron desktop shell/);
    assert.equal(initial.checks.some((check) => check.id === "workspace" && check.status === "action"), true);
    assert.deepEqual(
      initial.checks.map((check) => check.id),
      [
        "workspace",
        "provider",
        "chat",
        "executors",
        "approvals",
        "artifacts",
        "automations",
        "memory",
        "capabilities",
        "forge",
      ],
    );

    await postJson(`http://127.0.0.1:${appPort}/api/workspaces`, {
      name: "V1.0 Workspace",
      path: storageDir,
    });
    await postJson(`http://127.0.0.1:${appPort}/api/providers`, {
      name: "V1 Provider",
      protocol: "openai-compatible",
      baseUrl: "http://127.0.0.1:1/v1",
      apiKey: "sk-v1-secret",
      modelId: "v1-model",
    });
    await postJson(`http://127.0.0.1:${appPort}/api/memories`, {
      title: "V1 Preference",
      content: "Use local-first defaults.",
      scope: "personal",
      sensitivity: "low",
    });
    await postJson(`http://127.0.0.1:${appPort}/api/automations`, {
      title: "V1 Follow-up",
      kind: "one-off",
      prompt: "remind me to review the workspace",
      intervalMs: 1000,
    });

    const ready = await getJson(`http://127.0.0.1:${appPort}/api/app/readiness`);
    assert.equal(JSON.stringify(ready).includes("sk-v1-secret"), false);
    assert.equal(ready.activeWorkspace.name, "V1.0 Workspace");
    assert.equal(ready.activeProvider.name, "V1 Provider");
    assert.equal(ready.activeProvider.apiKeyPreview.includes("sk-v1-secret"), false);
    assert.equal(ready.counts.workspaces, 1);
    assert.equal(ready.counts.providers, 1);
    assert.equal(ready.counts.memories, 1);
    assert.equal(ready.counts.automations, 1);
    assert.equal(ready.counts.enabledCapabilities >= 3, true);
    assert.equal(ready.install.buildCommand, expectedHostBuildCommand);
    assert.equal(ready.install.openCommand, expectedHostOpenCommand);
    assert.equal(ready.install.windowsCommand, "cd product && npm run package:win");
    assert.equal(ready.checks.some((check) => check.id === "workspace" && check.status === "ready"), true);
    assert.equal(ready.checks.some((check) => check.id === "provider" && check.status === "ready"), true);
    assert.equal(ready.checks.some((check) => check.id === "memory" && check.status === "ready"), true);
    assert.equal(ready.checks.some((check) => check.id === "automations" && check.status === "ready"), true);
    assert.equal(ready.nextActions.length > 0, true);

    await patchJson(`http://127.0.0.1:${appPort}/api/settings/language`, {
      language: "zh-CN",
    });
    const localized = await getJson(`http://127.0.0.1:${appPort}/api/app/readiness`, {
      "x-ai-os-language": "zh-CN",
    });
    assert.equal(localized.language, "zh-CN");
    assert.equal(localized.checks.some((check) => check.id === "workspace" && check.title === "本地工作空间"), true);
    assert.equal(localized.checks.some((check) => check.id === "provider" && check.title === "自定义提供方"), true);
    assert.match(localized.install.note, /当前本地 V1\.0/);
  } finally {
    await appServer.stop();
    await rm(storageDir, { recursive: true, force: true });
  }
});

test("P0 vertical baseline covers provider, memory, chat, run approval, artifacts, and readiness", async () => {
  const storageDir = await mkdtemp(`${tmpdir()}/ai-os-p0-vertical-`);
  const providerServer = await startMockOpenAiProvider();
  const appPort = await getAvailablePort();
  const appServer = startSpaceDesktopServer({
    port: appPort,
    storageDir,
  });

  try {
    await waitForHttp(`http://127.0.0.1:${appPort}/`);

    const missingWorkspace = await postJsonAllowFailure(`http://127.0.0.1:${appPort}/api/runs/start`, {
      goal: "try the vertical baseline without a workspace",
      executorChoice: "mock",
    });
    assert.equal(missingWorkspace.ok, false);
    assert.match(missingWorkspace.payload.error, /Select a workspace/);

    await postJson(`http://127.0.0.1:${appPort}/api/providers`, {
      name: "Vertical Provider",
      protocol: "openai-compatible",
      baseUrl: `http://127.0.0.1:${providerServer.port}/v1`,
      apiKey: "sk-vertical-secret",
      modelId: "vertical-model",
    });

    const workspace = await postJson(`http://127.0.0.1:${appPort}/api/workspaces`, {
      name: "P0 Vertical Workspace",
      path: storageDir,
    });
    const memory = await postJson(`http://127.0.0.1:${appPort}/api/memories`, {
      title: "Release note preference",
      content: "Prefer local-first release notes with concise highlights.",
      scope: "workspace",
      sensitivity: "low",
    });
    const thread = await postJson(`http://127.0.0.1:${appPort}/api/threads`, {
      title: "P0 Vertical Thread",
    });

    const chat = await postJson(`http://127.0.0.1:${appPort}/api/threads/${thread.thread.id}/messages`, {
      message: "Use my local-first release note preference for the summary",
    });
    assert.equal(chat.memoryUsage.length > 0, true);
    assert.equal(chat.memoryUsage[0].title, "Release note preference");
    assert.equal(chat.memoryTrace.mode, "search");

    const readinessBeforeRun = await getJson(`http://127.0.0.1:${appPort}/api/app/readiness`);
    assert.equal(readinessBeforeRun.activeWorkspace.id, workspace.workspace.id);
    assert.equal(readinessBeforeRun.activeProvider.name, "Vertical Provider");
    assert.equal(readinessBeforeRun.counts.providers >= 1, true);
    assert.equal(readinessBeforeRun.counts.memories >= 1, true);
    assert.equal(readinessBeforeRun.counts.messages >= 2, true);

    const run = await postJson(`http://127.0.0.1:${appPort}/api/runs/start`, {
      goal: "use my local-first release note preference to write a release note",
      executorChoice: "mock",
      timeoutMs: 5000,
    });
    assert.match(run.live.sessionId, /^session-run-live-/);
    assert.equal(run.live.memoryUsage.length > 0, true);
    assert.equal(run.live.memoryUsage[0].memoryId, memory.memory.id);
    assert.equal(run.live.queryLoop.phase, "awaiting-approval");

    await postJson(`http://127.0.0.1:${appPort}/api/runs/${run.live.runId}/approval`, {
      decision: "grant",
    });
    const completed = await waitForLiveRun(appPort, run.live.runId, (live) => live.status === "completed");
    assert.equal(completed.currentTurn.status, "completed");
    assert.equal(completed.queryLoop.phase, "completed");
    assert.equal(completed.items.some((item) => item.kind === "artifact-persist" && item.status === "completed"), true);
    assert.equal(completed.artifacts.some((artifact) => artifact.kind === "report"), true);
    assert.equal(completed.artifacts.some((artifact) => artifact.kind === "diff"), true);

    const persistedRun = await getJson(`http://127.0.0.1:${appPort}/api/runs/${run.live.runId}/events`);
    assert.equal(persistedRun.events.some((event) => event.type === "approval.granted"), true);
    assert.equal(persistedRun.memoryUsage.length > 0, true);
    assert.equal(persistedRun.memoryUsage[0].memoryId, memory.memory.id);
    assert.equal(persistedRun.memoryTrace.mode, "search");

    const artifacts = await getJson(`http://127.0.0.1:${appPort}/api/artifacts`);
    assert.equal(artifacts.artifacts.some((artifact) => artifact.runId === run.live.runId && artifact.kind === "report"), true);
    assert.equal(artifacts.artifacts.some((artifact) => artifact.runId === run.live.runId && artifact.kind === "diff"), true);
    assert.equal(artifacts.artifacts.some((artifact) => artifact.threadId === thread.thread.id && artifact.source === "chat"), true);

    const readinessAfterRun = await getJson(`http://127.0.0.1:${appPort}/api/app/readiness`);
    assert.equal(readinessAfterRun.counts.completedRuns >= 1, true);
    assert.equal(readinessAfterRun.counts.pendingApprovals, 0);
    assert.equal(readinessAfterRun.counts.artifacts >= 3, true);
    assert.equal(readinessAfterRun.nextActions.includes("Create your first workspace to anchor provider, memory, and automation state."), false);
  } finally {
    await appServer.stop();
    await providerServer.stop();
    await rm(storageDir, { recursive: true, force: true });
  }
});

test("runSpaceDemoRequest executes the mock path through the server runtime", async () => {
  const response = await runSpaceDemoRequest(
    {
      goal: "Run mock through server",
      executorChoice: "mock",
    },
    {
      runner: createUnavailableRunner(),
    },
  );

  assert.equal(response.state.phase, "completed");
  assert.equal(response.state.executorChoice, "mock");
  assert.equal(response.state.artifacts.length, 1);
});

test("runSpaceDemoRequest surfaces unavailable real executors as failed state", async () => {
  const response = await runSpaceDemoRequest(
    {
      goal: "Run Codex through server",
      executorChoice: "codex",
    },
    {
      runner: createUnavailableRunner(),
    },
  );

  assert.equal(response.state.phase, "failed");
  assert.equal(response.state.executorChoice, "codex");
  assert.match(response.state.error, /Codex command not found|not available/);
});

test("runSpaceDemoRequest can normalize Codex output without launching a real CLI", async () => {
  const runner = createFakeProcessRunner([
    '{"type":"thread.started"}',
    '{"type":"item.completed","item":{"type":"agent_message","text":"Codex result"}}',
    '{"type":"turn.completed","message":"done"}',
  ]);
  const response = await runSpaceDemoRequest(
    {
      goal: "Run Codex through fake process",
      executorChoice: "codex",
    },
    {
      runner,
    },
  );

  assert.equal(response.state.phase, "completed");
  assert.equal(response.state.executorChoice, "codex");
  assert.deepEqual(
    response.state.events.map((event) => event.type),
    ["run.started", "run.stream", "run.completed"],
  );
  assert.equal(response.state.artifacts[0].title, "Executor Transcript");
  assert.match(response.state.artifactContents[response.state.artifacts[0].id], /Codex result/);
  assert.deepEqual(runner.calls[0].args.slice(0, 5), [
    "exec",
    "--json",
    "--sandbox",
    "read-only",
    "--skip-git-repo-check",
  ]);
});

test("runSpaceDemoRequest can normalize Claude Code output without launching a real CLI", async () => {
  const runner = createFakeProcessRunner([
    '{"type":"system","subtype":"init"}',
    '{"type":"assistant","message":{"content":[{"type":"text","text":"Claude result"}]}}',
    '{"type":"result","subtype":"success","is_error":false,"result":"done"}',
  ]);
  const response = await runSpaceDemoRequest(
    {
      goal: "Run Claude through fake process",
      executorChoice: "claude-code",
    },
    {
      runner,
    },
  );

  assert.equal(response.state.phase, "completed");
  assert.equal(response.state.executorChoice, "claude-code");
  assert.deepEqual(
    response.state.events.map((event) => event.type),
    ["run.started", "run.stream", "run.completed"],
  );
  assert.equal(response.state.artifacts[0].title, "Executor Transcript");
  assert.match(response.state.artifactContents[response.state.artifacts[0].id], /Claude result/);
});

function createUnavailableRunner() {
  return {
    async isAvailable() {
      return false;
    },
    async *run() {
      throw new Error("Should not run unavailable executor.");
    },
  };
}

function createFakeProcessRunner(lines) {
  const calls = [];

  return {
    calls,
    async isAvailable() {
      return true;
    },
    run(command) {
      calls.push(command);
      return (async function* () {
        for (const line of lines) yield line;
      })();
    },
  };
}

function createSseResponse(text) {
  return new Response(
    new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(text));
        controller.close();
      },
    }),
    {
      status: 200,
    },
  );
}

function startSpaceDesktopServer({ port, storageDir, envOverrides = {} }) {
  const child = spawn(
    process.execPath,
    ["./apps/space-desktop/scripts/dev-server.mjs"],
    {
      cwd: productRoot,
      env: {
        ...process.env,
        PORT: String(port),
        AI_SPACE_SKIP_BUILD: "1",
        AI_SPACE_STORAGE_DIR: storageDir,
        AI_SPACE_SECRET_BACKEND: "file",
        ...envOverrides,
      },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  let stderr = "";

  child.stderr.setEncoding("utf8");
  child.stderr.on("data", (chunk) => {
    stderr += chunk;
  });

  return {
    process: child,
    async stop() {
      if (child.exitCode !== null || child.signalCode !== null) return;

      child.kill("SIGTERM");
      await new Promise((resolve) => {
        child.once("close", resolve);
        setTimeout(resolve, 1000);
      });
    },
    stderr() {
      return stderr;
    },
  };
}

async function startMockOpenAiProvider() {
  const state = {
    mode: "ok",
  };
  const server = createServer((request, response) => {
    if (request.url?.endsWith("/chat/completions")) {
      request.resume();
      if (state.mode === "fail-chat") {
        response.writeHead(500, { "content-type": "application/json" });
        response.end(JSON.stringify({ error: "forced failure" }));
        return;
      }

      response.writeHead(200, { "content-type": "text/event-stream" });
      response.end('data: {"choices":[{"delta":{"content":"persistent chat ok"}}]}\n\n');
      return;
    }

    if (request.url?.endsWith("/models")) {
      response.writeHead(200, { "content-type": "application/json" });
      response.end(JSON.stringify({ data: [{ id: "mock-model" }] }));
      return;
    }

    response.writeHead(404);
    response.end("not found");
  });
  const port = await listenOnRandomPort(server);

  return {
    port,
    get mode() {
      return state.mode;
    },
    set mode(value) {
      state.mode = value;
    },
    async stop() {
      await new Promise((resolve) => server.close(resolve));
    },
  };
}

async function listenOnRandomPort(server) {
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  assert.equal(typeof address, "object");
  assert.notEqual(address, null);
  return address.port;
}

async function getAvailablePort() {
  const server = createServer();
  const port = await listenOnRandomPort(server);
  await new Promise((resolve) => server.close(resolve));
  return port;
}

async function waitForHttp(url) {
  const startedAt = Date.now();
  let lastError;

  while (Date.now() - startedAt < 5000) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch (error) {
      lastError = error;
    }

    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  throw lastError ?? new Error(`Timed out waiting for ${url}`);
}

async function waitForLiveRun(port, runId, predicate) {
  const startedAt = Date.now();
  let lastLive;

  while (Date.now() - startedAt < 5000) {
    const payload = await getJson(`http://127.0.0.1:${port}/api/runs/${runId}/live`);
    lastLive = payload.live;
    if (predicate(lastLive)) return lastLive;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  throw new Error(`Timed out waiting for live run ${runId}: ${JSON.stringify(lastLive)}`);
}

async function getJson(url, headers = undefined) {
  const response = await fetch(url, headers ? { headers } : undefined);
  assert.equal(response.ok, true);
  return response.json();
}

async function postJson(url, body) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });

  assert.equal(response.ok, true);
  return response.json();
}

async function postJsonAllowFailure(url, body) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });

  return {
    ok: response.ok,
    status: response.status,
    payload: await response.json(),
  };
}

async function patchJson(url, body) {
  const response = await fetch(url, {
    method: "PATCH",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });

  assert.equal(response.ok, true);
  return response.json();
}

async function patchJsonAllowFailure(url, body) {
  const response = await fetch(url, {
    method: "PATCH",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });

  return {
    ok: response.ok,
    status: response.status,
    payload: await response.json(),
  };
}

async function deleteJson(url) {
  const response = await fetch(url, { method: "DELETE" });
  assert.equal(response.ok, true);
  return response.json();
}
