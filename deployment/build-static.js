const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

function copyTree(source, destination) {
  fs.mkdirSync(destination, { recursive: true });
  for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
    const from = path.join(source, entry.name);
    const to = path.join(destination, entry.name);
    if (entry.isDirectory()) copyTree(from, to);
    else fs.copyFileSync(from, to);
  }
}

function validateApiBase(apiBase) {
  let parsedApiBase;
  try { parsedApiBase = new URL(apiBase); } catch {}
  if (!parsedApiBase || parsedApiBase.protocol !== "https:" || ["localhost", "127.0.0.1", "::1"].includes(parsedApiBase.hostname)) {
    throw new Error("Set KAYS_HAVEN_API_URL to the public HTTPS backend base URL before building the production site.");
  }
}

function assembleSite(output, apiBase) {
  const root = path.resolve(__dirname, "..");
  fs.mkdirSync(output, { recursive: false });
  copyTree(path.join(root, "src", "frontend"), output);
  copyTree(path.join(root, "src", "admin"), path.join(output, "admin"));

  const pages = [
    "index.html",
    "shop.html",
    "cart/cart.html",
    "checkout/checkout.html",
    "products/product.html",
    "policies.html",
    "admin/index.html"
  ];
  for (const relativePath of pages) {
    const file = path.join(output, relativePath);
    let html = fs.readFileSync(file, "utf8");
    if (apiBase) {
      html = html.replace(/(<meta\s+name="api-base"\s+content=")[^"]*(">)/i,
        (_match, before, after) => `${before}${apiBase.replace(/\/$/, "")}${after}`);
    }
    if (relativePath === "admin/index.html") {
      html = html.replace("../frontend/product-images.js", "../product-images.js");
      html = html.replace("../frontend/api-config.js", "../api-config.js");
      html = html.replace("../frontend/brand-system.css", "../brand-system.css");
      html = html.replace("../frontend/site-assets/Kay%E2%80%99s%20Haven%20Lavender%20Emblem.png", "../site-assets/Kay%E2%80%99s%20Haven%20Lavender%20Emblem.png");
      html = html.replace("../frontend/site-assets/landing-mother-and-baby-clean.png", "../site-assets/landing-mother-and-baby-clean.png");
    }
    fs.writeFileSync(file, html, "utf8");
  }
  const adminScript = path.join(output, "admin", "app.js");
  const adminScriptSource = fs.readFileSync(adminScript, "utf8");
  fs.writeFileSync(adminScript, adminScriptSource.replaceAll("../frontend/product-images/", "../product-images/"), "utf8");
  return output;
}

function buildStaticSite(outputDirectory = path.resolve(__dirname, "..", "dist"), apiBase = process.env.KAYS_HAVEN_API_URL) {
  validateApiBase(apiBase);
  const root = path.resolve(__dirname, "..");
  const output = path.resolve(outputDirectory);
  if (output !== path.join(root, "dist")) {
    throw new Error("Production static build output is restricted to the repository's dist directory.");
  }
  fs.rmSync(output, { recursive: true, force: true });
  return assembleSite(output, apiBase);
}

function buildStaticPreview(outputDirectory) {
  const output = path.resolve(outputDirectory);
  const tempRoot = path.resolve(os.tmpdir());
  const relative = path.relative(tempRoot, output);
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error("Preview build output must be a new child directory of the system temporary directory.");
  }
  if (fs.existsSync(output)) throw new Error("Preview build output already exists; refusing to overwrite it.");
  fs.mkdirSync(path.dirname(output), { recursive: true });
  return assembleSite(output, "");
}

if (require.main === module) {
  try {
    console.log(`Static site built at ${buildStaticSite()}`);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

module.exports = { buildStaticSite, buildStaticPreview };
