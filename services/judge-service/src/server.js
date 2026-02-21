const http = require('http');
const express = require('express');
const cors = require('cors');
const { Server } = require('socket.io');
const rateLimit = require('express-rate-limit');
const config = require('./config');
const { registerAuthRoutes, requireAuth, requireRole, requireServiceToken } = require('./auth');
const { enqueueJudgeJob, getJobStatus, setSocketServer } = require('./queue');
const { readRecent, writeAudit } = require('./audit-log');
const { readReport } = require('./artifacts');

const app = express();
app.use(cors({ origin: config.corsOrigin }));
app.use(express.json({ limit: '512kb' }));

app.use(
  '/api/v1/judge',
  rateLimit({
    windowMs: 60 * 1000,
    max: 120,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

registerAuthRoutes(app);

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'judge-service', ts: new Date().toISOString() });
});

app.post('/api/v1/judge/jobs', requireServiceToken, async (req, res) => {
  const { code, language, testCases, timeLimitMs = 1000, memoryLimitMb = 256, meta = {} } = req.body || {};
  if (!code || !language || !Array.isArray(testCases)) {
    return res.status(400).json({ success: false, message: 'Missing code/language/testCases' });
  }
  try {
    const jobId = await enqueueJudgeJob({
      code,
      language,
      testCases,
      timeLimitMs,
      memoryLimitMb,
      meta,
    });
    return res.status(202).json({ success: true, jobId, status: 'queued' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error?.message || 'Failed to queue job' });
  }
});

app.get('/api/v1/judge/jobs/:id', requireServiceToken, async (req, res) => {
  try {
    const status = await getJobStatus(req.params.id);
    if (!status) return res.status(404).json({ success: false, message: 'Job not found' });
    return res.json({ success: true, job: status });
  } catch (error) {
    return res.status(500).json({ success: false, message: error?.message || 'Failed to fetch job' });
  }
});

app.get('/api/v1/judge/jobs/:id/report', requireServiceToken, (req, res) => {
  const content = readReport(req.params.id);
  if (!content) return res.status(404).json({ success: false, message: 'Report not found' });
  res.setHeader('Content-Type', 'application/json');
  return res.status(200).send(content);
});

app.get('/api/v1/admin/audit', requireAuth, requireRole('admin'), (req, res) => {
  const limit = Number(req.query.limit || 200);
  return res.json({ success: true, events: readRecent(limit) });
});

app.post('/api/v1/contests/rank-update', requireServiceToken, (req, res) => {
  const { contestId, leaderboard = [] } = req.body || {};
  if (!contestId) return res.status(400).json({ success: false, message: 'Missing contestId' });
  io.to(`contest:${contestId}`).emit('contest:rank:update', { contestId, leaderboard, at: new Date().toISOString() });
  writeAudit({ action: 'contest.rank_update.emit', contestId, size: Array.isArray(leaderboard) ? leaderboard.length : 0 });
  return res.json({ success: true });
});

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: config.corsOrigin },
});

setSocketServer(io);

io.on('connection', (socket) => {
  socket.on('judge:job:subscribe', (jobId) => {
    if (!jobId) return;
    socket.join(`job:${jobId}`);
    writeAudit({ action: 'socket.subscribe', jobId, socketId: socket.id });
  });
  socket.on('contest:subscribe', (contestId) => {
    if (!contestId) return;
    socket.join(`contest:${contestId}`);
    writeAudit({ action: 'socket.contest_subscribe', contestId, socketId: socket.id });
  });
});

server.listen(config.port, () => {
  writeAudit({ action: 'service.started', port: config.port });
  console.log(`[judge-service] listening on ${config.port}`);
});
