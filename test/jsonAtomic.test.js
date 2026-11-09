const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs-extra');
const {
    parseJsonSafely,
    readJsonSafelySync,
    readJsonSafelyAsync,
    writeJsonAtomic
} = require('../services/jsonAtomic');

const TEST_DIR = path.join(__dirname, '..', 'user_data', 'json_atomic_test');

describe('Atomic JSON Utilities (services/jsonAtomic.js)', () => {
    before(async () => {
        await fs.ensureDir(TEST_DIR);
    });

    after(async () => {
        await fs.remove(TEST_DIR);
    });

    describe('parseJsonSafely', () => {
        it('returns default value for empty, null, or undefined inputs', () => {
            assert.deepEqual(parseJsonSafely(''), {});
            assert.deepEqual(parseJsonSafely('   \n\t'), {});
            assert.deepEqual(parseJsonSafely(null), {});
            assert.deepEqual(parseJsonSafely(undefined), {});
            assert.deepEqual(parseJsonSafely(12345, { custom: true }), { custom: true });
        });

        it('parses valid JSON string', () => {
            const raw = JSON.stringify({ _pageMeta: { title: 'Test Document', checkCounter: 3 } });
            const result = parseJsonSafely(raw);
            assert.equal(result._pageMeta.title, 'Test Document');
            assert.equal(result._pageMeta.checkCounter, 3);
        });

        it('recovers from trailing non-whitespace characters after valid JSON (position 97 corruption fix)', () => {
            const valid = JSON.stringify({ _pageMeta: { title: 'Test Document', lastViewedAt: '2026-11-08T19:55:32.969Z' } }, null, 2);
            // Append corrupted trailing bytes mimicking concurrent write race
            const corrupted = valid + '\n}\n[junk]';
            const result = parseJsonSafely(corrupted);
            assert.equal(result._pageMeta.title, 'Test Document');
            assert.equal(result._pageMeta.lastViewedAt, '2026-11-08T19:55:32.969Z');
        });

        it('recovers all sections from spliced premature closing brace corruption (dbms-gemini position 97 bug)', () => {
            const userCorrupted = `{
  "_pageMeta": {
    "lastViewedAt": "2026-11-09T09:55:20.045Z",
    "title": "dbms-gemini"
  }
} "lastViewedAt": "2026-11-09T09:55:19.921Z"
  },
  "whatgone3957": {
    "done": false,
    "count": 0
  },
  "requemas9400": {
    "done": true,
    "count": 2
  }
}`;
            const result = parseJsonSafely(userCorrupted);
            assert.equal(result._pageMeta.title, 'dbms-gemini');
            assert.equal(result._pageMeta.lastViewedAt, '2026-11-09T09:55:20.045Z');
            assert.ok(result.whatgone3957, 'Section whatgone3957 must be recovered');
            assert.equal(result.whatgone3957.done, false);
            assert.ok(result.requemas9400, 'Section requemas9400 must be recovered');
            assert.equal(result.requemas9400.done, true);
            assert.equal(result.requemas9400.count, 2);
        });

        it('returns defaultValue for completely unparseable syntax errors without throwing', () => {
            const invalid = '{ "title": "Incomplete unclosed...';
            const result = parseJsonSafely(invalid, { fallback: true });
            assert.deepEqual(result, { fallback: true });
        });
    });

    describe('readJsonSafelySync & readJsonSafelyAsync', () => {
        const filePath = path.join(TEST_DIR, 'sync-async-test.json');

        it('returns default value when file does not exist', async () => {
            const nonExistent = path.join(TEST_DIR, 'does-not-exist.json');
            assert.deepEqual(readJsonSafelySync(nonExistent), {});
            assert.deepEqual(await readJsonSafelyAsync(nonExistent), {});
        });

        it('reads and parses existing file correctly', async () => {
            await fs.writeJson(filePath, { status: 'ok', count: 42 });
            assert.deepEqual(readJsonSafelySync(filePath), { status: 'ok', count: 42 });
            assert.deepEqual(await readJsonSafelyAsync(filePath), { status: 'ok', count: 42 });
        });

        it('gracefully handles 0-byte truncated file without throwing Unexpected end of JSON input', async () => {
            const emptyFile = path.join(TEST_DIR, 'empty.json');
            await fs.writeFile(emptyFile, '');
            assert.deepEqual(readJsonSafelySync(emptyFile, { empty: true }), { empty: true });
            assert.deepEqual(await readJsonSafelyAsync(emptyFile, { empty: true }), { empty: true });
        });
    });

    describe('writeJsonAtomic', () => {
        it('writes JSON atomically and cleans up temporary files', async () => {
            const targetFile = path.join(TEST_DIR, 'subfolder', 'atomic-write.json');
            await writeJsonAtomic(targetFile, { test: 123 });

            // File exists and has expected content
            assert.ok(await fs.pathExists(targetFile));
            const data = await fs.readJson(targetFile);
            assert.deepEqual(data, { test: 123 });

            // Ensure no temporary files remain in folder
            const files = await fs.readdir(path.dirname(targetFile));
            const tempFiles = files.filter(f => f.includes('.tmp.'));
            assert.equal(tempFiles.length, 0, 'Temporary files should be cleaned up');
        });

        it('handles concurrent writes to the same file without race conditions or corruption', async () => {
            const sharedFile = path.join(TEST_DIR, 'concurrent-test.json');

            // Fire 25 concurrent atomic writes
            const writePromises = [];
            for (let i = 0; i < 25; i++) {
                writePromises.push(
                    writeJsonAtomic(sharedFile, {
                        iteration: i,
                        timestamp: new Date().toISOString()
                    })
                );
            }

            await Promise.all(writePromises);

            // Verify file is completely valid JSON and readable
            const finalData = await readJsonSafelyAsync(sharedFile);
            assert.ok(typeof finalData.iteration === 'number');
            assert.ok(typeof finalData.timestamp === 'string');

            // Ensure no temp files leaked
            const files = await fs.readdir(TEST_DIR);
            const tempFiles = files.filter(f => f.includes('.tmp.'));
            assert.equal(tempFiles.length, 0);
        });

        it('rejects invalid inputs that are not serializable objects', async () => {
            const testFile = path.join(TEST_DIR, 'invalid-test.json');
            await assert.rejects(async () => {
                await writeJsonAtomic(testFile, null);
            }, /Invalid data passed to writeJsonAtomic/);

            await assert.rejects(async () => {
                await writeJsonAtomic(testFile, undefined);
            }, /Invalid data passed to writeJsonAtomic/);
        });

        it('prevents accidental section loss when writing 0-section metadata over existing meta file', async () => {
            const metaFile = path.join(TEST_DIR, 'sample-topic.md.meta.json');
            // 1. Initial write with 3 sections
            await writeJsonAtomic(metaFile, {
                _pageMeta: { title: 'Sample Topic', lastViewedAt: '2026-11-08T10:00:00.000Z' },
                sec1: { done: true, count: 5 },
                sec2: { done: false, count: 0 },
                sec3: { done: true, count: 1 }
            });

            // 2. Erroneous / race write passing 0 sections (only _pageMeta)
            await writeJsonAtomic(metaFile, {
                _pageMeta: { title: 'Sample Topic', lastViewedAt: '2026-11-09T12:00:00.000Z' }
            });

            // 3. Verify sections were preserved and not deleted
            const saved = await readJsonSafelyAsync(metaFile);
            assert.equal(saved._pageMeta.lastViewedAt, '2026-11-09T12:00:00.000Z');
            assert.ok(saved.sec1, 'sec1 must be preserved');
            assert.equal(saved.sec1.count, 5);
            assert.ok(saved.sec2, 'sec2 must be preserved');
            assert.ok(saved.sec3, 'sec3 must be preserved');
        });
    });
});
