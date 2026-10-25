const { test } = require('node:test');
const assert = require('node:assert/strict');
const { missingPrEvidence } = require('../deployment/quality-gate');

test('placeholder PR evidence is rejected', () => {
  assert.deepEqual(missingPrEvidence('Closes #\nTest evidence:\nScreenshots:\nAI disclosure:'), [
    'linked issue',
    'test evidence',
    'screenshot evidence or reason',
    'AI disclosure'
  ]);
});

test('explicit PR evidence fields are accepted for human review', () => {
  assert.deepEqual(missingPrEvidence('Refs #4\nTest evidence: npm test passed; docs/quality/evidence/node22-regression.log\nScreenshots: N/A - backend validation change only\nAI disclosure: used - AI_USAGE.md'), []);
});
