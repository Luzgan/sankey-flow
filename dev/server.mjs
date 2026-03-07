import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { join, extname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const PROJECT_ROOT = join(__dirname, "..");
const MOCK_TABLEAU_PATH = join(__dirname, "mock-tableau.js");
const PORT = process.env.PORT || 8765;

const MIME_TYPES = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".mjs": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".csv": "text/csv",
  ".map": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".txt": "text/plain",
};

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  let pathname = url.pathname;

  // Intercept requests for the real Tableau Extensions API → serve mock
  if (pathname.includes("tableau.extensions") && pathname.endsWith(".js")) {
    return serveFile(res, MOCK_TABLEAU_PATH);
  }

  // Serve from the sankey-tableau-extension subdirectory path
  // (matches how the .trex manifest references files)
  if (pathname.startsWith("/sankey-tableau-extension/")) {
    pathname = pathname.replace("/sankey-tableau-extension", "");
  }

  // Default to index → SankeyViz.html
  if (pathname === "/" || pathname === "/index.html") {
    pathname = "/SankeyViz.html";
  }

  const filePath = join(PROJECT_ROOT, pathname);

  // Security: prevent path traversal
  if (!filePath.startsWith(PROJECT_ROOT)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  return serveFile(res, filePath);
});

async function serveFile(res, filePath) {
  try {
    const fileStat = await stat(filePath);
    if (!fileStat.isFile()) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }

    const ext = extname(filePath);
    const contentType = MIME_TYPES[ext] || "application/octet-stream";
    const content = await readFile(filePath);

    res.writeHead(200, {
      "Content-Type": contentType,
      "Cache-Control": "no-cache",
      "Access-Control-Allow-Origin": "*",
    });
    res.end(content);
  } catch {
    res.writeHead(404);
    res.end("Not found");
  }
}

server.listen(PORT, () => {
  console.log(`Dev server running at http://localhost:${PORT}`);
  console.log(`  Main viz:  http://localhost:${PORT}/SankeyViz.html`);
  console.log(`  Config:    http://localhost:${PORT}/SankeyConfig.html`);
  console.log(`\n  Tableau API is mocked — no Tableau needed.`);
  console.log(`  Press Ctrl+C to stop.\n`);
});
