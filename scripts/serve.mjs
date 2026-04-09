import { createServer } from "node:http";
import { createReadStream } from "node:fs";
import { access, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const host = process.env.HOST || "127.0.0.1";
const port = Number.parseInt(process.env.PORT || "3000", 10);
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const mimeTypes = new Map([
  [".html", "text/html; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".js", "application/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".svg", "image/svg+xml"],
  [".png", "image/png"],
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".gif", "image/gif"],
  [".ico", "image/x-icon"],
  [".mp3", "audio/mpeg"],
  [".wav", "audio/wav"],
  [".pdf", "application/pdf"],
  [".txt", "text/plain; charset=utf-8"],
]);

function sendError(res, statusCode, message) {
  res.writeHead(statusCode, { "Content-Type": "text/plain; charset=utf-8" });
  res.end(message);
}

async function pathExists(candidatePath) {
  try {
    await access(candidatePath);
    return true;
  } catch {
    return false;
  }
}

async function resolveRequestPath(urlPathname) {
  const safePath = path.normalize(decodeURIComponent(urlPathname)).replace(/^(\.\.[/\\])+/, "");
  const basePath = path.resolve(rootDir, `.${safePath}`);
  const candidates = [];

  if (safePath.endsWith("/")) {
    candidates.push(path.join(basePath, "index.html"));
  } else {
    candidates.push(basePath);
    if (!path.extname(basePath)) {
      candidates.push(`${basePath}.html`);
      candidates.push(path.join(basePath, "index.html"));
    }
  }

  for (const candidate of candidates) {
    if (!candidate.startsWith(rootDir)) {
      continue;
    }

    if (!(await pathExists(candidate))) {
      continue;
    }

    const details = await stat(candidate);
    if (details.isFile()) {
      return candidate;
    }
  }

  return null;
}

const server = createServer(async (req, res) => {
  if (!req.url) {
    sendError(res, 400, "Bad request");
    return;
  }

  const url = new URL(req.url, `http://${host}:${port}`);
  const filePath = await resolveRequestPath(url.pathname);

  if (!filePath) {
    sendError(res, 404, "Not found");
    return;
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = mimeTypes.get(ext) || "application/octet-stream";

  res.writeHead(200, {
    "Content-Type": contentType,
    "Cache-Control": "no-store",
  });

  if (req.method === "HEAD") {
    res.end();
    return;
  }

  const stream = createReadStream(filePath);
  stream.on("error", () => sendError(res, 500, "Failed to read file"));
  stream.pipe(res);
});

server.listen(port, host, () => {
  console.log(`Static site running at http://${host}:${port}`);
  console.log(`Serving ${rootDir}`);
});
