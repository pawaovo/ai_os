#!/usr/bin/env node
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { dirname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const productRoot = resolve(appRoot, "../..");
const publicRoot = join(appRoot, "public");
const port = Number.parseInt(process.env.PORT ?? "5173", 10);

buildProduct();

const server = createServer(async (request, response) => {
  try {
    const filePath = await resolveRequestPath(request.url ?? "/");
    const content = await readFile(filePath);

    response.writeHead(200, {
      "content-type": contentType(filePath),
      "cache-control": "no-store",
    });
    response.end(content);
  } catch (error) {
    const status = error instanceof NotFoundError ? 404 : 500;
    response.writeHead(status, { "content-type": "text/plain; charset=utf-8" });
    response.end(status === 404 ? "Not found" : "Internal server error");
  }
});

server.listen(port, () => {
  process.stdout.write(`AI Space Demo: http://localhost:${port}\n`);
});

function buildProduct() {
  execFileSync(process.execPath, ["./node_modules/typescript/bin/tsc", "-b"], {
    cwd: productRoot,
    stdio: "inherit",
  });
}

async function resolveRequestPath(rawUrl) {
  const url = new URL(rawUrl, "http://localhost");

  if (url.pathname === "/" || url.pathname === "/index.html") {
    return join(publicRoot, "index.html");
  }

  if (url.pathname === "/assets/styles.css") {
    return join(publicRoot, "styles.css");
  }

  if (url.pathname.startsWith("/apps/") || url.pathname.startsWith("/packages/")) {
    const filePath = normalize(join(productRoot, decodeURIComponent(url.pathname)));

    if (!filePath.startsWith(productRoot)) {
      throw new NotFoundError();
    }

    const info = await stat(filePath);
    if (!info.isFile()) {
      throw new NotFoundError();
    }

    return filePath;
  }

  throw new NotFoundError();
}

function contentType(filePath) {
  if (filePath.endsWith(".html")) return "text/html; charset=utf-8";
  if (filePath.endsWith(".css")) return "text/css; charset=utf-8";
  if (filePath.endsWith(".js")) return "text/javascript; charset=utf-8";
  if (filePath.endsWith(".map")) return "application/json; charset=utf-8";
  return "application/octet-stream";
}

class NotFoundError extends Error {}
