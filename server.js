const http = require("http");
const fs = require("fs");
const path = require("path");

const root = __dirname;
const port = Number(process.env.PORT) || 3000;

const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".gif": "image/gif",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".mp3": "audio/mpeg",
  ".pdf": "application/pdf",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
  ".wav": "audio/wav",
  ".webp": "image/webp"
};

function send(response, statusCode, body, type) {
  response.writeHead(statusCode, {
    "Content-Type": type
  });
  response.end(body);
}

function safePathname(urlPath) {
  const decoded = decodeURIComponent(urlPath.split("?")[0]);
  const normalized = path.normalize(decoded).replace(/^(\.\.[/\\])+/, "");
  return normalized === path.sep ? "index.html" : normalized.replace(/^[/\\]+/, "");
}

const server = http.createServer((request, response) => {
  const relativePath = safePathname(request.url || "/");
  let filePath = path.join(root, relativePath);

  if (!filePath.startsWith(root)) {
    send(response, 403, "Forbidden", "text/plain; charset=utf-8");
    return;
  }

  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, "index.html");
  }

  if (!fs.existsSync(filePath)) {
    send(response, 404, "Not Found", "text/plain; charset=utf-8");
    return;
  }

  const extension = path.extname(filePath).toLowerCase();
  const contentType = mimeTypes[extension] || "application/octet-stream";

  fs.readFile(filePath, (error, data) => {
    if (error) {
      send(response, 500, "Internal Server Error", "text/plain; charset=utf-8");
      return;
    }

    send(response, 200, data, contentType);
  });
});

server.listen(port, () => {
  console.log(`Website running at http://localhost:${port}`);
});
