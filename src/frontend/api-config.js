(() => {
  const configured = document.querySelector('meta[name="api-base"]')?.content?.trim();
  const hostname = window.location.hostname;
  const isLocalDevelopment = !hostname || ["localhost", "127.0.0.1", "::1"].includes(hostname) || hostname.endsWith(".localhost");
  const fallback = isLocalDevelopment ? "http://localhost:8000" : window.location.origin;
  window.KAYS_HAVEN_API_URL = (window.KAYS_HAVEN_API_URL || configured || fallback).replace(/\/$/, "");
})();
