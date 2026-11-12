const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
process.env.NODE_ENV = 'test';
const path = require('path');
const fs = require('fs-extra');

const {
    startWorker,
    stopWorker,
    isWorkerRunning,
    processPendingJobs,
    runPeriodicSweep,
    QUEUE_DIR,
    PID_FILE
} = require('../services/recommendationWorker');
const { parseSections } = require('../services/recommendationEngine');

const TEST_WORKER_USER = 'worker_test_user';
const USER_DIR = path.join(__dirname, '..', 'user_data', TEST_WORKER_USER);

describe('Standalone Recommendation Worker Service', () => {

    before(async () => {
        await fs.remove(USER_DIR);
        await fs.remove(QUEUE_DIR);
        await fs.remove(PID_FILE);
    });

    after(async () => {
        stopWorker();
        await fs.remove(USER_DIR);
        await fs.remove(QUEUE_DIR);
        await fs.remove(PID_FILE);
    });

    it('1. correctly reports worker is not running when PID file does not exist', () => {
        assert.equal(isWorkerRunning(), false);
    });

    it('2. starts worker, creates PID file, and reports isWorkerRunning as true', async () => {
        await startWorker({ intervalMs: 60000, pollIntervalMs: 100 });
        assert.equal(isWorkerRunning(), true);
        assert.ok(await fs.pathExists(PID_FILE));

        const pidData = await fs.readJson(PID_FILE);
        assert.equal(pidData.pid, process.pid);
    });

    it('3. consumes .job file from queue directory and recalculates recommendations', async () => {
        const userMd = path.join(USER_DIR, 'md');
        await fs.ensureDir(userMd);

        const mdContent = '# Worker Test Topic\nTopic Content\n\n---\n\nSection Two Body';
        await fs.writeFile(path.join(userMd, 'worker-sample.md'), mdContent);

        const sections = parseSections(mdContent);
        const meta = {
            _pageMeta: { title: 'Worker Sample', lastViewedAt: new Date().toISOString() },
            [sections[0].id]: { done: true, count: 1, lastTrackedAt: new Date().toISOString() },
            [sections[1].id]: { done: true, count: 1, lastTrackedAt: new Date().toISOString() }
        };
        await fs.writeJson(path.join(userMd, 'worker-sample.md.meta.json'), meta);

        // Write a job file into QUEUE_DIR
        await fs.ensureDir(QUEUE_DIR);
        const jobPath = path.join(QUEUE_DIR, `${TEST_WORKER_USER}.job`);
        await fs.writeJson(jobPath, { username: TEST_WORKER_USER, timestamp: new Date().toISOString() });

        // Wait a short time for worker watcher/polling to pick up the job
        let jobConsumed = false;
        for (let i = 0; i < 20; i++) {
            await new Promise(r => setTimeout(r, 100));
            if (!await fs.pathExists(jobPath)) {
                jobConsumed = true;
                break;
            }
        }

        assert.ok(jobConsumed, 'Worker should consume and remove .job file from queue directory');

        // Check that recommendations were persisted
        const recFile = path.join(USER_DIR, 'recommendations.json');
        assert.ok(await fs.pathExists(recFile), 'Recommendations file should be created by worker');

        const recData = await fs.readJson(recFile);
        assert.equal(recData.userId, TEST_WORKER_USER);
        assert.ok(Array.isArray(recData.recommendations));
        const item = recData.recommendations.find(r => r.fileId === 'worker-sample.md');
        assert.ok(item, 'worker-sample.md should be in recommendations');
        assert.equal(item.coveragePercentage, 100);
    });

    it('4. processPendingJobs handles orphaned job files safely', async () => {
        await fs.ensureDir(QUEUE_DIR);
        const orphanJob = path.join(QUEUE_DIR, `${TEST_WORKER_USER}.job`);
        await fs.writeJson(orphanJob, { username: TEST_WORKER_USER });

        await processPendingJobs();
        assert.equal(await fs.pathExists(orphanJob), false, 'Orphaned job file should be consumed');
    });

    it('5. stops worker cleanly and cleans up PID file', () => {
        stopWorker();
        assert.equal(isWorkerRunning(), false);
        assert.equal(fs.existsSync(PID_FILE), false, 'PID file should be deleted on stop');
    });
});
