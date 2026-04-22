const { app, BrowserWindow, shell } = require("electron");
const net = require("node:net");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const appName = "AI OS";
const hostedMcpServerMode = process.argv.includes("--mcp-hosted-server");

let mainWindow;
let serverUrl;

app.setName(appName);

if (!hostedMcpServerMode) {
  const singleInstanceLock = app.requestSingleInstanceLock();
  if (!singleInstanceLock) {
    app.quit();
  }
}

if (hostedMcpServerMode) {
  runHostedMcpServerMode().catch((error) => {
    process.stderr.write(`Electron hosted MCP server failed: ${error instanceof Error ? error.message : String(error)}\n`);
    app.exit(1);
  });
} else {
  app.on("second-instance", () => {
    if (!mainWindow) return;
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  });

  app.whenReady().then(async () => {
    const port = await resolvePort();
    const productRoot = resolveProductRoot();
    serverUrl = `http://127.0.0.1:${port}`;

    process.env.PORT = String(port);
    process.env.AI_SPACE_SKIP_BUILD = "1";
    process.env.AI_SPACE_DESKTOP_SHELL = "electron";
    process.env.AI_SPACE_STORAGE_DIR = process.env.AI_SPACE_STORAGE_DIR
      ?? path.join(app.getPath("userData"), "profile");

    await import(pathToFileURL(path.join(productRoot, "apps/space-desktop/scripts/dev-server.mjs")).href);
    await waitForServer(`${serverUrl}/api/app/readiness`);
    createMainWindow();
  }).catch((error) => {
    process.stderr.write(`Electron main process failed: ${error instanceof Error ? error.message : String(error)}\n`);
    app.exit(1);
  });

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0 && serverUrl) createMainWindow();
  });

  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit();
  });
}

function resolveProductRoot() {
  if (app.isPackaged) return path.join(process.resourcesPath, "product");
  return path.resolve(__dirname, "../../..");
}

async function runHostedMcpServerMode() {
  await app.whenReady();
  process.env.AI_SPACE_SKIP_BUILD = "1";
  process.env.AI_SPACE_DESKTOP_SHELL = "electron";
  process.env.AI_SPACE_STORAGE_DIR = resolveHostedMcpStorageRoot();
  const productRoot = resolveProductRoot();
  const hostedServer = await import(pathToFileURL(path.join(productRoot, "apps/space-desktop/scripts/mcp-hosted-server.mjs")).href);
  await hostedServer.runHostedMcpServer({
    storageRoot: process.env.AI_SPACE_STORAGE_DIR,
  });
}

function resolveHostedMcpStorageRoot() {
  const flagIndex = process.argv.indexOf("--storage-dir");
  if (flagIndex >= 0 && process.argv[flagIndex + 1]) {
    return path.resolve(process.argv[flagIndex + 1]);
  }
  return process.env.AI_SPACE_STORAGE_DIR
    ?? path.join(app.getPath("userData"), "profile");
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 980,
    minHeight: 720,
    title: appName,
    backgroundColor: "#ece5c9",
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
    },
  });

  mainWindow.once("ready-to-show", showMainWindow);
  mainWindow.webContents.once("did-finish-load", showMainWindow);
  setTimeout(showMainWindow, 4000);

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (isExternalUrl(url)) void shell.openExternal(url);
    return { action: "deny" };
  });

  mainWindow.webContents.on("will-navigate", (event, url) => {
    if (!serverUrl || url.startsWith(serverUrl)) return;
    event.preventDefault();
    if (isExternalUrl(url)) void shell.openExternal(url);
  });

  void mainWindow.loadURL(serverUrl);
}

function showMainWindow() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  if (!mainWindow.isVisible()) mainWindow.show();
  mainWindow.focus();
}

async function resolvePort() {
  const requestedPort = Number.parseInt(process.env.AI_SPACE_APP_PORT ?? "", 10);
  if (Number.isInteger(requestedPort) && requestedPort > 0) return requestedPort;

  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      server.close(() => {
        if (typeof address === "object" && address?.port) {
          resolve(address.port);
          return;
        }
        reject(new Error("Unable to allocate a local AI OS port."));
      });
    });
  });
}

async function waitForServer(url) {
  let lastError;
  for (let attempt = 0; attempt < 120; attempt += 1) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw lastError ?? new Error(`AI OS server did not become ready: ${url}`);
}

function isExternalUrl(url) {
  return /^https?:\/\//.test(url) && (!serverUrl || !url.startsWith(serverUrl));
}
