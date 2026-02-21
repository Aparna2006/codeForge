const fs = require('fs');
const path = require('path');

const auditPath = path.join(process.cwd(), 'services', 'judge-service', 'audit.log.jsonl');

function writeAudit(event) {
  const row = {
    at: new Date().toISOString(),
    ...event,
  };
  try {
    fs.appendFileSync(auditPath, JSON.stringify(row) + '\n');
  } catch (_err) {
    // best effort
  }
}

function readRecent(limit = 200) {
  try {
    if (!fs.existsSync(auditPath)) return [];
    const lines = fs.readFileSync(auditPath, 'utf-8').trim().split('\n').filter(Boolean);
    return lines.slice(-Math.max(1, limit)).map((line) => JSON.parse(line));
  } catch (_err) {
    return [];
  }
}

module.exports = {
  writeAudit,
  readRecent,
};
