(() => {
  const configured = document.querySelector('meta[name="api-base"]')?.content?.trim();
  const hostname = window.location.hostname;
  const isLocalDevelopment = !hostname || ["localhost", "127.0.0.1", "::1"].includes(hostname) || hostname.endsWith(".localhost");
  // Production source deployments must use the public API when no build-time
  // api-base value was injected. The static build may still override this
  // with its explicitly configured HTTPS endpoint.
  const fallback = isLocalDevelopment
    ? "http://localhost:8000"
    : "https://kays-haven-backend.onrender.com";
  window.KAYS_HAVEN_API_URL = (window.KAYS_HAVEN_API_URL || configured || fallback).replace(/\/$/, "");
})();
