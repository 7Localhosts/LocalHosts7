const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const digest = value => crypto.createHash('sha256').update(value).digest('hex');
(async () => {
  const result = { date: new Date().toISOString(), checks: [] };
  const db = await fetch('https://kays-haven-backend.onrender.com/api/health/database');
  result.checks.push({ type: 'database', status: db.status, body: await db.json() });
  const response = await fetch('https://kays-haven-backend.onrender.com/api/products');
  const catalogue = await response.json();
  result.checks.push({ type: 'invalid-catalogue-prices', products: catalogue.products.filter(p => !Number.isFinite(Number(p.price)) || Number(p.price) <= 0).map(p => ({ id: p.id, price: p.price })) });
  for (const origin of ['https://kayshaven.live', 'https://kays-haven-staging.pages.dev']) {
    for (const asset of ['script.js', 'checkout/checkout.js', 'checkout/receipt-pdf.js', 'checkout/payment-button-state.js', 'admin/app.js']) {
      const r = await fetch(origin + '/' + asset);
      const source = await r.text();
      const localFile = path.join(root, 'dist', asset);
      result.checks.push({ type: 'asset-hash', url: origin + '/' + asset, status: r.status, deployedHash: digest(source), builtHash: fs.existsSync(localFile) ? digest(fs.readFileSync(localFile)) : null, deployedNormalizedHash: digest(source.replace(/\r\n/g, '\n')), builtNormalizedHash: fs.existsSync(localFile) ? digest(fs.readFileSync(localFile, 'utf8').replace(/\r\n/g, '\n')) : null });
    }
  }
  fs.writeFileSync(path.join(root, 'docs/quality/evidence/public-followup.json'), JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));
})();
