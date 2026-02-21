const { Queue, Worker, QueueEvents } = require('bullmq');
const IORedis = require('ioredis');
const config = require('./config');
const { runJudgeJob } = require('./judge-runner');
const { writeAudit } = require('./audit-log');
const { writeReport } = require('./artifacts');

const connection = new IORedis(config.redisUrl, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

const judgeQueue = new Queue(config.queueName, { connection });
const queueEvents = new QueueEvents(config.queueName, { connection });

let io = null;

function setSocketServer(socketServer) {
  io = socketServer;
}

function emitJobUpdate(jobId, payload) {
  if (!io) return;
  io.to(`job:${jobId}`).emit('judge:job:update', payload);
}

const worker = new Worker(
  config.queueName,
  async (job) => {
    writeAudit({ action: 'judge.job.started', jobId: job.id, user: job.data?.meta?.userEmail || '' });
    emitJobUpdate(job.id, { status: 'running' });
    const result = runJudgeJob(job.data);
    const reportPayload = {
      jobId: job.id,
      queuedAt: job.timestamp ? new Date(job.timestamp).toISOString() : new Date().toISOString(),
      finishedAt: new Date().toISOString(),
      request: {
        language: job.data?.language || '',
        timeLimitMs: job.data?.timeLimitMs || 0,
        memoryLimitMb: job.data?.memoryLimitMb || 0,
        testCaseCount: Array.isArray(job.data?.testCases) ? job.data.testCases.length : 0,
        meta: job.data?.meta || {},
      },
      result,
    };
    writeReport(job.id, reportPayload);
    result.reportUrl = `${config.publicBaseUrl}/api/v1/judge/jobs/${encodeURIComponent(job.id)}/report`;
    return result;
  },
  { connection, concurrency: 2 }
);

worker.on('completed', (job, result) => {
  writeAudit({
    action: 'judge.job.completed',
    jobId: job.id,
    verdict: result?.verdict || '',
    runtimeMs: result?.runtimeMs || 0,
  });
  emitJobUpdate(job.id, { status: 'completed', result });
});

worker.on('failed', (job, err) => {
  writeAudit({ action: 'judge.job.failed', jobId: job?.id || '', error: err?.message || 'unknown' });
  emitJobUpdate(job?.id, { status: 'failed', message: err?.message || 'Job failed' });
});

async function enqueueJudgeJob(payload) {
  const job = await judgeQueue.add('judge', payload, {
    removeOnComplete: { age: 3600, count: 1000 },
    removeOnFail: { age: 3600, count: 1000 },
  });
  writeAudit({ action: 'judge.job.enqueued', jobId: job.id, user: payload?.meta?.userEmail || '' });
  return job.id;
}

async function getJobStatus(jobId) {
  const job = await judgeQueue.getJob(jobId);
  if (!job) return null;
  const state = await job.getState();
  const progress = job.progress || 0;
  const returnvalue = job.returnvalue || null;
  const failedReason = job.failedReason || '';
  return {
    id: job.id,
    state,
    progress,
    returnvalue,
    failedReason,
    data: {
      language: job.data?.language || '',
      meta: job.data?.meta || {},
    },
  };
}

module.exports = {
  enqueueJudgeJob,
  getJobStatus,
  setSocketServer,
  queueEvents,
};
