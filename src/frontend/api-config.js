(() => {
  const configured = document.querySelector('meta[name="api-base"]')?.content?.trim();
  window.KAYS_HAVEN_API_URL = (configured || "http://localhost:8000").replace(/\/$/, "");
})();
