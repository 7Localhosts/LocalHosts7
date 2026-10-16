const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const { URL } = require("node:url");

const repository = path.resolve(__dirname, "..");
const frontendRoot = path.join(repository, "src", "frontend");
const adminRoot = path.join(repository, "src", "admin");
// Keep the source preview away from the commonly occupied Live Server ports.
const port = Number(process.env.STATIC_PORT || 5502);
const apiPort = Number(process.env.API_PORT || 8000);
const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".woff2": "font/woff2"
};

function localFileForUrl(requestUrl) {
  const pathname = decodeURIComponent(new URL(requestUrl, "http://localhost").pathname);
  let base;
  let relativePath;
  if (pathname === "/admin" || pathname === "/admin/") {
    base = adminRoot;
    relativePath = "index.html";
  } else if (pathname.startsWith("/admin/")) {
    base = adminRoot;
    relativePath = pathname.slice("/admin/".length);
  } else if (pathname.startsWith("/frontend/")) {
    base = frontendRoot;
    relativePath = pathname.slice("/frontend/".length);
  } else {
    base = frontendRoot;
    relativePath = pathname.replace(/^\/+/, "") || "index.html";
  }

  const absoluteBase = path.resolve(base);
  const absoluteFile = path.resolve(absoluteBase, relativePath);
  const relativeCheck = path.relative(absoluteBase, absoluteFile);
  if (relativeCheck.startsWith("..") || path.isAbsolute(relativeCheck)) return null;
  return absoluteFile;
}

const server = http.createServer((request, response) => {
  if (request.method !== "GET" && request.method !== "HEAD") {
    response.writeHead(405, { Allow: "GET, HEAD" }).end();
    return;
  }

  let file;
  try {
    file = localFileForUrl(request.url);
  } catch {
    file = null;
  }
  if (!file) {
    response.writeHead(404).end("Not found");
    return;
  }

  fs.stat(file, (error, stats) => {
    if (error || !stats.isFile()) {
      response.writeHead(404).end("Not found");
      return;
    }
    const headers = {
      "Content-Type": mimeTypes[path.extname(file).toLowerCase()] || "application/octet-stream",
      "Cache-Control": "no-cache"
    };
    if (request.method === "HEAD") {
      response.writeHead(200, { ...headers, "Content-Length": stats.size }).end();
      return;
    }
    if (path.extname(file).toLowerCase() === ".html") {
      fs.readFile(file, (readError, content) => {
        if (readError) {
          response.writeHead(500).end("Could not read page");
          return;
        }
        const html = content.toString("utf8").replace(
          /(<meta\s+name="api-base"\s+content=")[^"]*(">)/i,
          `$1http://localhost:${apiPort}$2`
        );
        const output = Buffer.from(html, "utf8");
        response.writeHead(200, { ...headers, "Content-Length": output.length }).end(output);
      });
      return;
    }
    response.writeHead(200, { ...headers, "Content-Length": stats.size });
    fs.createReadStream(file).pipe(response);
  });
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Kay's Haven source site: http://localhost:${port}/`);
  console.log(`Staff login: http://localhost:${port}/admin/`);
});
