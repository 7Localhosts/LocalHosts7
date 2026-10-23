// Pattern scan with redacted findings. Not a credential validity check.
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const findings = [];
const patterns = [ /sk_(?:live|test)_[A-Za-z0-9]{20,}/g, /eyJ[A-Za-z0-9_-]{15,}\.eyJ[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]{15,}/g, /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g ];
function scan(label, data) {
  if (data.includes(0) || data.length > 3e6) return;
  const text = data.toString('utf8');
  for (const [index, regex] of patterns.entries()) {
    for (const match of text.matchAll(regex)) findings.push({ file: label, line: text.slice(0, match.index).split('\n').length, kind: index, value: '[REDACTED]' });
  }
}
const tracked = execFileSync('git', ['ls-files', '-z'], { cwd: root }).toString().split('\0').filter(Boolean);
for (const name of tracked) { const file = path.join(root, name); if (fs.existsSync(file)) scan(name, fs.readFileSync(file)); }
function walk(dir) { return fs.existsSync(dir) ? fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]) : []; }
for (const file of [...walk(path.join(root, 'dist')), ...walk(path.join(root, 'docs/quality/evidence'))]) scan(path.relative(root, file), fs.readFileSync(file));
const result = { at: new Date().toISOString(), sha: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root }).toString().trim(), scope: 'tracked working tree, built assets, QA evidence; no full-history or credential validity claim', trackedFiles: tracked.length, findings };
fs.writeFileSync(path.join(root, 'docs/quality/evidence/secret-scan.json'), JSON.stringify(result, null, 2));
console.log(JSON.stringify(result));
if (findings.length) process.exitCode = 1;
