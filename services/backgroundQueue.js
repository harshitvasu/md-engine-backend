const { generateAndPersistRecommendations } = require('./recommendationEngine');
const path = require('path');
const fs = require('fs-extra');

const userJobStates = new Map();
let periodicTimer = null;

/**
 * Get or initialize job state for a user.
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
 */
async function processUserQueue(safeUser) {
    const state = userJobStates.get(safeUser);
    if (!state || state.isRunning) return;

    state.isRunning = true;

    try {
        await generateAndPersistRecommendations(safeUser);
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
 */
function enqueueRecalculation(username) {
    if (!username) return;
    const { state, safeUser } = getUserState(username);

    if (state.isRunning) {
        state.pendingRerun = true;
        return;
    }

    // Run asynchronously outside the request-response lifecycle
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
 * Start periodic recalculation fallback for all active users.
 */
function startPeriodicRecalculation(intervalMs = 30 * 60 * 1000) {
    if (periodicTimer) return;

    periodicTimer = setInterval(async () => {
        try {
            const usersFile = path.join(__dirname, '..', 'data', 'users.json');
            if (await fs.pathExists(usersFile)) {
                const users = await fs.readJson(usersFile);
                const usernames = Object.keys(users);
                for (const u of usernames) {
                    enqueueRecalculation(u);
                }
            }
        } catch (e) {
            console.error('[BackgroundQueue] Periodic recalculation failed:', e);
        }
    }, intervalMs);

    if (periodicTimer.unref) {
        periodicTimer.unref(); // Don't prevent Node process from exiting
    }
}

function stopPeriodicRecalculation() {
    if (periodicTimer) {
        clearInterval(periodicTimer);
        periodicTimer = null;
    }
}

module.exports = {
    enqueueRecalculation,
    executeRecalculationNow,
    startPeriodicRecalculation,
    stopPeriodicRecalculation,
    userJobStates
};
