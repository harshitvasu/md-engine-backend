const path = require('path');
const { startWorker } = require('./services/recommendationWorker');

// Load environment variables from .env if available (Node 20.6+)
if (typeof process.loadEnvFile === 'function') {
    try {
        process.loadEnvFile();
    } catch (e) {
        // .env file not present or unreadable, fall back to environment variables
    }
}

console.log('[Worker] Starting standalone Spaced-Repetition Recommendation Worker...');

startWorker({
    intervalMs: parseInt(process.env.WORKER_SWEEP_INTERVAL_MS, 10) || 30 * 60 * 1000,
    pollIntervalMs: parseInt(process.env.WORKER_POLL_INTERVAL_MS, 10) || 2000
}).then(({ pid, queueDir }) => {
    console.log(`[Worker] Recommendation worker active (PID: ${pid})`);
    console.log(`[Worker] Watching queue directory: ${queueDir}`);
}).catch((err) => {
    console.error('[Worker] Fatal error initializing worker:', err);
    process.exit(1);
});
