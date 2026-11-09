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
 * - Spliced duplicate header corruption (e.g. premature root closing brace } followed by spliced leftover JSON fragment) -> heals and parses full JSON
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
        // Recovery attempt 1: Spliced header corruption recovery
        // When a concurrent write overwrites the beginning of a file without truncating,
        // it leaves a premature root closing brace followed by a leftover fragment like:
        //   } "lastViewedAt": "..."\n  },\n  "sectionId": ...
        // Replacing that premature closing brace and fragment with a comma restores the full structure with all sections.
        const splicedRegex = /\}\s*"[a-zA-Z0-9_-]+"[^}]*\},?/;
        if (splicedRegex.test(trimmed)) {
            try {
                const repaired = trimmed.replace(splicedRegex, ',');
                return JSON.parse(repaired);
            } catch (_) {}
        }

        // Recovery attempt 2: extract balanced root JSON structure
        const rootEnd = findRootJsonEnd(trimmed);
        if (rootEnd > 0) {
            try {
                return JSON.parse(trimmed.slice(0, rootEnd + 1));
            } catch (innerErr) {
                // Ignore and try fallback
            }
        }

        // Recovery attempt 3: check if valid JSON exists up to the last closing brace '}'
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
 * 1. Validates that data is a non-null object/array.
 * 2. Pre-validates JSON serialization with dry-run JSON.parse before disk I/O.
 * 3. Section-loss safety guard: If writing to a .meta.json file and new data has 0 sections,
 *    merges any existing sections from disk to prevent accidental metadata wipeouts.
 * 4. Serializes concurrent writes to the same filePath via fileWriteQueues promise chain.
 * 5. Writes to a temporary file (.tmp.<name>.<timestamp>.<rand>) in the same folder.
 * 6. Reads back and verifies temp file JSON integrity on disk before renaming.
 * 7. Atomically renames temporary file over filePath (POSIX atomic rename).
 *
 * @param {string} filePath - Target file path
 * @param {*} data - JSON-serializable data
 * @returns {Promise<void>} Resolves when atomic write and rename complete
 */
async function writeJsonAtomic(filePath, data) {
    if (!data || typeof data !== 'object') {
        throw new Error(`[writeJsonAtomic] Invalid data passed to writeJsonAtomic for ${filePath}: expected non-null object, got ${typeof data}`);
    }

    const queue = fileWriteQueues.get(filePath) || Promise.resolve();

    const currentOperation = queue.then(async () => {
        // 1. Dry-run JSON serialization and syntax validation
        let jsonString;
        try {
            jsonString = JSON.stringify(data, null, 2);
            JSON.parse(jsonString); // Strict check: guarantee it can be parsed back
        } catch (err) {
            throw new Error(`[writeJsonAtomic] JSON validation check failed before write for ${filePath}: ${err.message}`);
        }

        // 2. Data-loss prevention guard for .meta.json files:
        // Never allow writing a 0-section metadata payload over an existing metadata file that already contains tracked sections.
        if (filePath.endsWith('.meta.json')) {
            const newSectionKeys = Object.keys(data).filter(k => k !== '_pageMeta');
            if (newSectionKeys.length === 0 && await fs.pathExists(filePath)) {
                try {
                    const diskContent = await fs.readFile(filePath, 'utf8');
                    const existingData = parseJsonSafely(diskContent, null);
                    if (existingData && typeof existingData === 'object') {
                        const existingSectionKeys = Object.keys(existingData).filter(k => k !== '_pageMeta');
                        if (existingSectionKeys.length > 0) {
                            console.warn(`[writeJsonAtomic] PREVENTED SECTION WIPEOUT for ${filePath}: preserving ${existingSectionKeys.length} sections from disk.`);
                            for (const secKey of existingSectionKeys) {
                                if (!data[secKey]) {
                                    data[secKey] = existingData[secKey];
                                }
                            }
                            jsonString = JSON.stringify(data, null, 2);
                            JSON.parse(jsonString);
                        }
                    }
                } catch (readErr) {
                    console.error(`[writeJsonAtomic] Error inspecting existing file ${filePath}:`, readErr);
                }
            }
        }

        const dir = path.dirname(filePath);
        await fs.ensureDir(dir);

        const tempPath = path.join(dir, `.${path.basename(filePath)}.tmp.${Date.now()}.${Math.random().toString(36).slice(2, 8)}`);

        try {
            await fs.writeFile(tempPath, jsonString, 'utf8');

            // 3. Strict verification: read back the temp file from disk before atomic rename to guarantee it is valid JSON
            const writtenContent = await fs.readFile(tempPath, 'utf8');
            JSON.parse(writtenContent);

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
