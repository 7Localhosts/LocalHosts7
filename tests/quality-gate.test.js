const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
function check(body) {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'kays-qa-event-'));
  const file = path.join(temp, 'event.json');
  fs.writeFileSync(file, JSON.stringify({ pull_request: { body } }));
  try {
    return spawnSync(process.execPath, [path.resolve(__dirname, '../deployment/quality-gate.js'), 'pr'], { encoding: 'utf8', env: { ...process.env, GITHUB_EVENT_PATH: file } });
  } finally { fs.unlinkSync(file); fs.rmdirSync(temp); }
}
test('placeholder PR evidence is rejected', () => {
  const result = check('Closes #\nTest evidence:\nScreenshots:\nAI disclosure:');
  assert.ifError(result.error);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /linked issue.*test evidence.*screenshot.*AI disclosure/);
});
test('explicit PR evidence fields are accepted for human review', () => {
  const result = check('Refs #4\nTest evidence: npm test passed; docs/quality/evidence/node22-regression.log\nScreenshots: N/A - backend validation change only\nAI disclosure: used - AI_USAGE.md');
  assert.ifError(result.error);
  assert.equal(result.status, 0, result.stderr);
});
