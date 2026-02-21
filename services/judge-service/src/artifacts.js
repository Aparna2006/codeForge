const fs = require('fs');
const path = require('path');

const artifactsDir = path.join(process.cwd(), 'services', 'judge-service', 'artifacts');

function ensureDir() {
  if (!fs.existsSync(artifactsDir)) fs.mkdirSync(artifactsDir, { recursive: true });
}

function writeReport(jobId, payload) {
  ensureDir();
  const reportPath = path.join(artifactsDir, `${jobId}.json`);
  fs.writeFileSync(reportPath, JSON.stringify(payload, null, 2));
  return reportPath;
}

function readReport(jobId) {
  const reportPath = path.join(artifactsDir, `${jobId}.json`);
  if (!fs.existsSync(reportPath)) return null;
  return fs.readFileSync(reportPath, 'utf-8');
}

module.exports = {
  writeReport,
  readReport,
};
