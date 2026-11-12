const path = require('path');
const fs = require('fs-extra');
const child_process = require('child_process');
const { generateAndPersistRecommendations } = require('./recommendationEngine');

const QUEUE_DIR = path.join(__dirname, '..', 'data', 'queue');
const PID_FILE = path.join(__dirname, '..', 'data', 'worker.pid');

let periodicTimer = null;
let pollTimer = null;
let queueWatcher = null;
let isShuttingDown = false;
let isProcessingQueue = false;
let pendingQueueSweep = false;

// Per-user job execution serialization
const activeUserJobs = new Map();

/**
 * Get or initialize job state for a user.
 */
function getUserJobState(safeUser) {
    if (!activeUserJobs.has(safeUser)) {
        activeUserJobs.set(safeUser, {
            isRunning: false,
            pendingRerun: false
        });
    }
    return activeUserJobs.get(safeUser);
}

/**
 * Process a single user's recommendation recalculation serially.
 */
async function processUserJob(username) {
    if (!username) return;
    const safeUser = username.replace(/[^a-zA-Z0-9_-]/g, '').toLowerCase();
    const state = getUserJobState(safeUser);

    if (state.isRunning) {
        state.pendingRerun = true;
        return;
    }

    state.isRunning = true;

    try {
        console.log(`[Recommendation Worker] Recalculating recommendations for user: ${safeUser}`);
        await generateAndPersistRecommendations(safeUser);
        console.log(`[Recommendation Worker] Finished recalculating recommendations for user: ${safeUser}`);
    } catch (err) {
        console.error(`[Recommendation Worker] Error calculating recommendations for ${safeUser}:`, err);
    } finally {
        state.isRunning = false;

        // If another request arrived while recalculating, run once more with the latest data
        if (state.pendingRerun) {
            state.pendingRerun = false;
            setImmediate(() => processUserJob(safeUser));
        }
    }
}

/**
 * Scan and process all pending jobs in the queue directory.
 */
async function processPendingJobs() {
    if (isShuttingDown) return;
    if (isProcessingQueue) {
        pendingQueueSweep = true;
        return;
    }
    isProcessingQueue = true;

    try {
        if (!await fs.pathExists(QUEUE_DIR)) {
            await fs.ensureDir(QUEUE_DIR);
            return;
        }

        const files = await fs.readdir(QUEUE_DIR);
        const jobFiles = files.filter(f => f.endsWith('.job'));

        for (const file of jobFiles) {
            const jobPath = path.join(QUEUE_DIR, file);
            try {
                let username = file.replace(/\.job$/, '');
                if (await fs.pathExists(jobPath)) {
                    try {
                        const data = await fs.readJson(jobPath);
                        if (data && data.username) username = data.username;
                    } catch (e) {
                        // Fallback to username from filename
                    }
                    await fs.remove(jobPath);
                }
                if (username) {
                    await processUserJob(username);
                }
            } catch (err) {
                console.error(`[Recommendation Worker] Failed to process job ${file}:`, err);
            }
        }
    } catch (err) {
        console.error('[Recommendation Worker] Error reading queue directory:', err);
    } finally {
        isProcessingQueue = false;
        if (pendingQueueSweep) {
            pendingQueueSweep = false;
            setImmediate(processPendingJobs);
        }
    }
}

/**
 * Periodic sweep across all registered users.
 */
async function runPeriodicSweep() {
    try {
        const usersFile = process.env.USERS_FILE || path.join(__dirname, '..', 'data', 'users.json');
        if (await fs.pathExists(usersFile)) {
            const users = await fs.readJson(usersFile);
            const usernames = Object.keys(users);
            for (const u of usernames) {
                await processUserJob(u);
            }
        }
    } catch (err) {
        console.error('[Recommendation Worker] Periodic recalculation failed:', err);
    }
}

/**
 * Write worker PID file.
 */
async function writePidFile() {
    await fs.ensureDir(path.dirname(PID_FILE));
    await fs.writeJson(PID_FILE, {
        pid: process.pid,
        startedAt: new Date().toISOString()
    }, { spaces: 2 });
}

/**
 * Remove worker PID file.
 */
function removePidFileSync() {
    try {
        if (fs.existsSync(PID_FILE)) {
            const data = fs.readJsonSync(PID_FILE, { throws: false });
            // Only remove if this process owns the PID file
            if (!data || data.pid === process.pid) {
                fs.removeSync(PID_FILE);
            }
        }
    } catch (e) {}
}

/**
 * Check if background worker is actively running.
 */
function isWorkerRunning() {
    try {
        if (!fs.existsSync(PID_FILE)) return false;
        const data = fs.readJsonSync(PID_FILE, { throws: false });
        if (!data || !data.pid) return false;
        process.kill(data.pid, 0);
        return true;
    } catch (e) {
        if (e && e.code === 'ESRCH') {
            try { fs.removeSync(PID_FILE); } catch (_) {}
        }
        return false;
    }
}

/**
 * Ensure standalone worker is running, spawning it if needed.
 */
function ensureWorkerRunning() {
    if (isWorkerRunning()) {
        return true;
    }
    if (process.env.NODE_ENV === 'test') {
        return false;
    }
    try {
        const workerScript = path.join(__dirname, '..', 'worker.js');
        if (!fs.existsSync(workerScript)) return false;

        const child = child_process.spawn(process.execPath, [workerScript], {
            detached: true,
            stdio: 'ignore',
            env: { ...process.env }
        });
        child.unref();
        return true;
    } catch (err) {
        console.error('[Recommendation Worker] Failed to auto-spawn worker:', err);
        return false;
    }
}

/**
 * Start the standalone worker service.
 */
async function startWorker(options = {}) {
    isShuttingDown = false;
    const intervalMs = options.intervalMs || 30 * 60 * 1000;
    const pollIntervalMs = options.pollIntervalMs || 2000;

    await fs.ensureDir(QUEUE_DIR);
    await writePidFile();

    console.log(`[Recommendation Worker] Started background worker service (PID: ${process.pid})`);

    // Process any jobs left over from before worker started
    await processPendingJobs();

    // Watch queue directory for instant job pickup
    try {
        queueWatcher = fs.watch(QUEUE_DIR, (eventType, filename) => {
            if (filename && filename.endsWith('.job')) {
                setImmediate(processPendingJobs);
            }
        });
        queueWatcher.on('error', (err) => {
            console.error('[Recommendation Worker] Queue watcher error:', err);
        });
    } catch (err) {
        console.warn('[Recommendation Worker] fs.watch not supported or failed, relying on polling:', err);
    }

    // Polling fallback
    pollTimer = setInterval(processPendingJobs, pollIntervalMs);
    if (pollTimer.unref) pollTimer.unref();

    // Periodic sweep for all users
    periodicTimer = setInterval(runPeriodicSweep, intervalMs);
    if (periodicTimer.unref) periodicTimer.unref();

    // Register process exit hooks
    const cleanup = () => {
        stopWorker();
        process.exit(0);
    };

    process.once('SIGINT', cleanup);
    process.once('SIGTERM', cleanup);
    process.once('exit', removePidFileSync);

    return {
        pid: process.pid,
        queueDir: QUEUE_DIR
    };
}

/**
 * Stop the worker service cleanly.
 */
function stopWorker() {
    isShuttingDown = true;
    if (queueWatcher) {
        try { queueWatcher.close(); } catch (e) {}
        queueWatcher = null;
    }
    if (pollTimer) {
        clearInterval(pollTimer);
        pollTimer = null;
    }
    if (periodicTimer) {
        clearInterval(periodicTimer);
        periodicTimer = null;
    }
    removePidFileSync();
    console.log(`[Recommendation Worker] Stopped background worker service (PID: ${process.pid})`);
}

module.exports = {
    startWorker,
    stopWorker,
    processPendingJobs,
    processUserJob,
    runPeriodicSweep,
    isWorkerRunning,
    ensureWorkerRunning,
    activeUserJobs,
    QUEUE_DIR,
    PID_FILE
};
