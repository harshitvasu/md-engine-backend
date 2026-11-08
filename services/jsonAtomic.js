const path = require('path');
const fs = require('fs-extra');

/**
 * In-memory map of write queues keyed by absolute file path.
 * Ensures that concurrent writes to the same file are executed sequentially.
 */
const fileWriteQueues = new Map();

/**
 * Finds the ending character index of the root JSON object or array.
 * Respects escaped quotes and nested objects/arrays to accurately find the closing bracket.
 *
 * @param {string} str - Raw string containing JSON
 * @returns {number} Index of root closing bracket, or -1 if not found
 */
function findRootJsonEnd(str) {
    let depth = 0;
    let inString = false;
    let escaped = false;
    let openChar = null;
    let closeChar = null;

    for (let i = 0; i < str.length; i++) {
        const char = str[i];
        if (escaped) {
            escaped = false;
            continue;
        }
        if (char === '\\' && inString) {
            escaped = true;
            continue;
        }
        if (char === '"') {
            inString = !inString;
            continue;
        }
        if (inString) continue;

        if (!openChar) {
            if (char === '{') {
                openChar = '{';
                closeChar = '}';
                depth = 1;
            } else if (char === '[') {
                openChar = '[';
                closeChar = ']';
                depth = 1;
            }
        } else {
            if (char === openChar) {
                depth++;
            } else if (char === closeChar) {
                depth--;
                if (depth === 0) {
                    return i;
                }
            }
        }
    }
    return -1;
}

/**
 * Safely parse a JSON string with automatic recovery from common file corruption:
 * - Empty string or pure whitespace -> returns defaultValue
 * - Trailing garbage characters (e.g., non-whitespace character after JSON closing brace) -> recovers valid root JSON
 *
 * @param {string} rawStr - Raw JSON text
 * @param {*} defaultValue - Fallback value if parsing fails
 * @returns {*} Parsed object or defaultValue
 */
function parseJsonSafely(rawStr, defaultValue = {}) {
    if (!rawStr || typeof rawStr !== 'string') return defaultValue;
    const trimmed = rawStr.trim();
    if (!trimmed) return defaultValue;

    try {
        return JSON.parse(trimmed);
    } catch (err) {
        // Recovery attempt 1: extract balanced root JSON structure
        const rootEnd = findRootJsonEnd(trimmed);
        if (rootEnd > 0) {
            try {
                return JSON.parse(trimmed.slice(0, rootEnd + 1));
            } catch (innerErr) {
                // Ignore and try fallback
            }
        }

        // Recovery attempt 2: check if valid JSON exists up to the last closing brace '}'
        const lastBrace = trimmed.lastIndexOf('}');
        if (lastBrace > 0 && lastBrace !== rootEnd) {
            try {
                return JSON.parse(trimmed.slice(0, lastBrace + 1));
            } catch (fallbackErr) {
                // Recovery failed
            }
        }

        return defaultValue;
    }
}

/**
 * Synchronously read and parse a JSON file with safe error recovery.
 * Returns defaultValue if the file does not exist, is empty, or is corrupted.
 *
 * @param {string} filePath - Absolute path to file
 * @param {*} defaultValue - Fallback value
 * @returns {*} Parsed JSON data or defaultValue
 */
function readJsonSafelySync(filePath, defaultValue = {}) {
    try {
        if (!fs.existsSync(filePath)) return defaultValue;
        const content = fs.readFileSync(filePath, 'utf8');
        return parseJsonSafely(content, defaultValue);
    } catch (err) {
        return defaultValue;
    }
}

/**
 * Asynchronously read and parse a JSON file with safe error recovery.
 * Returns defaultValue if the file does not exist, is empty, or is corrupted.
 *
 * @param {string} filePath - Absolute path to file
 * @param {*} defaultValue - Fallback value
 * @returns {Promise<*>} Parsed JSON data or defaultValue
 */
async function readJsonSafelyAsync(filePath, defaultValue = {}) {
    try {
        if (!await fs.pathExists(filePath)) return defaultValue;
        const content = await fs.readFile(filePath, 'utf8');
        return parseJsonSafely(content, defaultValue);
    } catch (err) {
        return defaultValue;
    }
}

/**
 * Atomically writes data as JSON to filePath:
 * 1. Serializes concurrent writes to the same filePath via a promise chain in fileWriteQueues.
 * 2. Writes to a temporary file in the same directory (.tmp.<name>.<timestamp>.<rand>).
 * 3. Uses fs.rename to atomically swap the temporary file into place (POSIX atomic rename).
 * This ensures readers never encounter 0-byte truncated files or partial data.
 *
 * @param {string} filePath - Target file path
 * @param {*} data - JSON-serializable data
 * @returns {Promise<void>} Resolves when atomic write and rename complete
 */
async function writeJsonAtomic(filePath, data) {
    const queue = fileWriteQueues.get(filePath) || Promise.resolve();

    const currentOperation = queue.then(async () => {
        const jsonString = JSON.stringify(data, null, 2);
        const dir = path.dirname(filePath);
        await fs.ensureDir(dir);

        const tempPath = path.join(dir, `.${path.basename(filePath)}.tmp.${Date.now()}.${Math.random().toString(36).slice(2, 8)}`);

        try {
            await fs.writeFile(tempPath, jsonString, 'utf8');
            await fs.rename(tempPath, filePath);
        } catch (err) {
            try {
                if (await fs.pathExists(tempPath)) {
                    await fs.unlink(tempPath);
                }
            } catch (_) {}
            throw err;
        }
    }).finally(() => {
        if (fileWriteQueues.get(filePath) === currentOperation) {
            fileWriteQueues.delete(filePath);
        }
    });

    fileWriteQueues.set(filePath, currentOperation.catch(() => {}));
    return currentOperation;
}

module.exports = {
    parseJsonSafely,
    readJsonSafelySync,
    readJsonSafelyAsync,
    writeJsonAtomic
};
