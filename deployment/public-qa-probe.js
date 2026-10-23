// Read-only public checks. Never log catalogue/customer payloads or credentials.
const fs = require('node:fs');
const dns = require('node:dns').promises;
const path = require('node:path');
const output = path.resolve(__dirname, '../docs/quality/evidence/public-probes.json');
(async () => {
  const results = [];
  for (const host of ['kayshaven.live', 'www.kayshaven.live', 'kays-haven-staging.pages.dev', 'kays-haven-backend.onrender.com']) {
    try { results.push({ type: 'dns', host, addresses: await dns.resolve4(host), date: new Date().toISOString() }); }
    catch (e) { results.push({ type: 'dns', host, error: e.code, date: new Date().toISOString() }); }
  }
  for (const origin of ['https://kayshaven.live', 'https://kays-haven-staging.pages.dev']) {
    for (const route of ['/', '/shop.html', '/cart/cart.html', '/checkout/checkout.html', '/admin/', '/api-config.js']) {
      const url = origin + route;
      try {
        const response = await fetch(url, { signal: AbortSignal.timeout(30000) });
        const body = await response.text();
        results.push({ type: 'static', url, status: response.status, finalUrl: response.url, contentType: response.headers.get('content-type'), apiCorrect: route === '/api-config.js' ? body.includes('https://kays-haven-backend.onrender.com') : undefined, date: new Date().toISOString() });
      } catch (e) { results.push({ type: 'static', url, error: e.cause?.code || e.name, date: new Date().toISOString() }); }
    }
  }
  for (const url of ['http://kayshaven.live', 'https://www.kayshaven.live']) {
    try { const r = await fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(30000) }); results.push({ type: 'redirect', url, status: r.status, location: r.headers.get('location'), date: new Date().toISOString() }); }
    catch (e) { results.push({ type: 'redirect', url, error: e.cause?.code || e.name, date: new Date().toISOString() }); }
  }
  const api = 'https://kays-haven-backend.onrender.com';
  for (const route of ['/api/health', '/api/health/ready', '/api/products', '/api/orders']) {
    try {
      const r = await fetch(api + route, { signal: AbortSignal.timeout(45000) });
      const body = await r.json().catch(() => null);
      const rows = Array.isArray(body?.products) ? body.products : null;
      results.push({ type: 'api', route, status: r.status, productCount: rows?.length, invalidPrices: rows?.filter(p => !Number.isFinite(Number(p.price)) || Number(p.price) <= 0).length, date: new Date().toISOString() });
    } catch (e) { results.push({ type: 'api', route, error: e.cause?.code || e.name, date: new Date().toISOString() }); }
  }
  for (const origin of ['https://kayshaven.live', 'https://kays-haven-staging.pages.dev', 'https://evil.example', 'https://kayshaven.live.evil.example', 'https://*.pages.dev', 'null']) {
    try {
      const r = await fetch(api + '/api/health', { method: 'OPTIONS', headers: { Origin: origin, 'Access-Control-Request-Method': 'GET' }, signal: AbortSignal.timeout(30000) });
      results.push({ type: 'cors', origin, status: r.status, allowOrigin: r.headers.get('access-control-allow-origin'), date: new Date().toISOString() });
    } catch (e) { results.push({ type: 'cors', origin, error: e.cause?.code || e.name, date: new Date().toISOString() }); }
  }
  fs.writeFileSync(output, JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results, null, 2));
})();
