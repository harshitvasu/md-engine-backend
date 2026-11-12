const path = require('path');
const fs = require('fs-extra');
const { generateAndPersistRecommendations } = require('./recommendationEngine');
const {
    QUEUE_DIR,
    PID_FILE,
    isWorkerRunning,
    ensureWorkerRunning,
    processPendingJobs
} = require('./recommendationWorker');

const userJobStates = new Map();

/**
 * Get or initialize job state for in-process fallback execution.
 */
function getUserState(username) {
    const safeUser = username.replace(/[^a-zA-Z0-9_-]/g, '').toLowerCase();
    if (!userJobStates.has(safeUser)) {
        userJobStates.set(safeUser, {
            isRunning: false,
            pendingRerun: false
        });
    }
    return { state: userJobStates.get(safeUser), safeUser };
}

/**
 * Run recalculation asynchronously ensuring strictly serial execution per user.
 * Used when the standalone worker process is not active (e.g. tests or fallback).
 */
async function processUserQueue(safeUser) {
    const state = userJobStates.get(safeUser);
    if (!state || state.isRunning) return;

    state.isRunning = true;

    try {
        await generateAndPersistRecommendations(safeUser);
        // Clean up corresponding queue job file if still present
        const jobPath = path.join(QUEUE_DIR, `${safeUser}.job`);
        if (await fs.pathExists(jobPath)) {
            await fs.remove(jobPath).catch(() => {});
        }
    } catch (err) {
        console.error(`[BackgroundQueue] Recommendation recalculation error for ${safeUser}:`, err);
    } finally {
        state.isRunning = false;

        // If another request arrived while recalculating, run once more with the latest data
        if (state.pendingRerun) {
            state.pendingRerun = false;
            setImmediate(() => processUserQueue(safeUser));
        }
    }
}

/**
 * Enqueue a background recalculation job for a user.
 * Non-blocking: returns immediately.
 * Writes a .job file into data/queue for the standalone worker service.
 * If the worker service is running, it picks up the job.
 * If the worker is not active, executes via in-process async queue fallback.
 */
function enqueueRecalculation(username) {
    if (!username) return;
    const safeUser = username.replace(/[^a-zA-Z0-9_-]/g, '').toLowerCase();

    // 1. Write persistent job file for the background worker
    try {
        fs.ensureDirSync(QUEUE_DIR);
        const jobPath = path.join(QUEUE_DIR, `${safeUser}.job`);
        fs.writeJsonSync(jobPath, {
            username: safeUser,
            enqueuedAt: new Date().toISOString()
        });
    } catch (err) {
        console.error(`[BackgroundQueue] Failed to write queue job for ${safeUser}:`, err);
    }

    // 2. If the standalone background worker is running, it will consume the job file
    if (isWorkerRunning()) {
        return;
    }

    // 3. Fallback: Process via in-process queue if worker is not actively running
    const { state } = getUserState(username);
    if (state.isRunning) {
        state.pendingRerun = true;
        return;
    }
    setImmediate(() => {
        processUserQueue(safeUser);
    });
}

/**
 * Trigger immediate execution and return promise (useful for tests or explicit sync awaits).
 */
async function executeRecalculationNow(username) {
    if (!username) return null;
    const safeUser = username.replace(/[^a-zA-Z0-9_-]/g, '').toLowerCase();
    return await generateAndPersistRecommendations(safeUser);
}

/**
 * Legacy compatibility stub: Periodic sweeps are now handled by the standalone worker (worker.js).
 */
function startPeriodicRecalculation() {
    ensureWorkerRunning();
}

function stopPeriodicRecalculation() {
    // Worker manages its own timers
}

module.exports = {
    enqueueRecalculation,
    executeRecalculationNow,
    startPeriodicRecalculation,
    stopPeriodicRecalculation,
    isWorkerRunning,
    ensureWorkerRunning,
    processUserQueue,
    processPendingJobs,
    userJobStates,
    QUEUE_DIR,
    PID_FILE
};
