const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    if (['node_modules', '.git', 'dist'].includes(entry.name)) return [];
    const file = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(file) : [file];
  });
}
function missingPrEvidence(body = '') {
  const requirements = [
    ['linked issue', /(?:closes|fixes|refs)\s+(?:#[1-9]\d*|https:\/\/github\.com\/7Localhosts\/LocalHosts7\/issues\/\d+)/i],
    ['test evidence', /Test evidence:[ \t]*[^\s<\r\n][^\r\n]{8,}/i],
    ['screenshot evidence or reason', /Screenshots:[ \t]*(?:https?:\/\/\S+|N\/A[ \t]*-[ \t]*[^\r\n]{10,})/i],
    ['AI disclosure', /AI disclosure:[ \t]*(?:used|none)\b/i]
  ];
  return requirements.filter(([, regex]) => !regex.test(body)).map(([name]) => name);
}
module.exports = { missingPrEvidence };
const mode = process.argv[2];
if (require.main === module) {
  if (mode === 'lint') {
    const files = ['src', 'deployment', 'tests'].flatMap(dir => walk(path.join(root, dir))).filter(file => file.endsWith('.js'));
    for (const file of files) {
      try { new vm.Script(fs.readFileSync(file, 'utf8'), { filename: file }); }
      catch (error) { console.error(`${file}: ${error.message}`); process.exit(1); }
    }
    console.log(`PASS: JavaScript syntax lint for all ${files.length} source, deployment and test files. No style lint claim.`);
  } else if (mode === 'pr') {
    const event = JSON.parse(fs.readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8'));
    const body = event.pull_request?.body || '';
    const missing = missingPrEvidence(body);
    if (missing.length) { console.error(`Missing PR evidence: ${missing.join(', ')}`); process.exit(1); }
    console.log('PR metadata checks passed; human review must verify linked evidence.');
  } else { throw new Error('Use lint or pr'); }
}
