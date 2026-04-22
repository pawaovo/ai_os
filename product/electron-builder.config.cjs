const workspacePackages = [
  ["packages/companion/companion-core", "companion-core"],
  ["packages/control/approval-core", "approval-core"],
  ["packages/capability/capability-contract", "capability-contract"],
  ["packages/control/control-plane", "control-plane"],
  ["packages/conversation/conversation-core", "conversation-core"],
  ["packages/conversation/conversation-runtime", "conversation-runtime"],
  ["packages/executors/executor-claude-code", "executor-claude-code"],
  ["packages/executors/executor-codex", "executor-codex"],
  ["packages/executors/executor-protocol", "executor-protocol"],
  ["packages/kernel/kernel-events", "kernel-events"],
  ["packages/kernel/kernel-memory", "kernel-memory"],
  ["packages/kernel/kernel-objects", "kernel-objects"],
  ["packages/model-providers/provider-anthropic-compatible", "provider-anthropic-compatible"],
  ["packages/model-providers/provider-openai-compatible", "provider-openai-compatible"],
  ["packages/model-providers/provider-protocol", "provider-protocol"],
  ["packages/model-providers/provider-registry", "provider-registry"],
  ["packages/workspace/artifact-core", "artifact-core"],
  ["packages/workspace/workspace-core", "workspace-core"],
];

module.exports = {
  appId: "ai.os.personal",
  productName: "AI OS",
  copyright: "Copyright © 2026 AI OS",
  asar: false,
  afterPack: "apps/space-desktop/scripts/after-pack-electron.mjs",
  extraMetadata: {
    name: "ai-os-desktop",
    version: "1.0.0",
    description: "Electron desktop shell for AI OS Personal",
    author: "AI OS",
    main: "main.cjs",
  },
  directories: {
    app: "apps/space-desktop/electron-app",
    output: "build/electron",
  },
  extraResources: [
    { from: "package.json", to: "product/package.json" },
    {
      from: "apps/space-desktop",
      to: "product/apps/space-desktop",
      filter: [
        "package.json",
        "README.md",
        "dist/**",
        "public/**",
        "scripts/dev-server.mjs",
        "scripts/mcp-hosted-server.mjs",
        "scripts/mcp-runtime.mjs",
      ],
    },
    {
      from: "packages",
      to: "product/packages",
      filter: [
        "**/package.json",
        "**/dist/**",
      ],
    },
    ...workspacePackages.map(([sourcePath, packageName]) => ({
      from: sourcePath,
      to: `product/node_modules/@ai-os/${packageName}`,
      filter: [
        "package.json",
        "dist/**",
      ],
    })),
  ],
  mac: {
    category: "public.app-category.productivity",
    target: ["dir"],
  },
  win: {
    target: [
      {
        target: "nsis",
        arch: ["x64", "arm64"],
      },
      {
        target: "portable",
        arch: ["x64"],
      },
    ],
  },
  nsis: {
    oneClick: false,
    perMachine: false,
    allowToChangeInstallationDirectory: true,
  },
};
