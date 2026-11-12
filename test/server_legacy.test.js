const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs-extra');
const { Readable } = require('stream');
const { EventEmitter } = require('events');

// Configure isolated test users file before loading server
process.env.NODE_ENV = 'test';
const TEST_USERS_FILE = path.join(__dirname, '..', 'user_data', 'test_legacy_users.json');
process.env.USERS_FILE = TEST_USERS_FILE;

const { app, getUserMdDir, getUserImagesDir } = require('../server');

const TEST_USER = 'legacy_test_user';
const TEST_PASSWORD = 'Password123!';
const USER_DIR = path.join(__dirname, '..', 'user_data', TEST_USER);

// In-memory request dispatcher for Express 5 without network socket binding
function makeRequest(appInstance, { method = 'GET', url = '/', headers = {}, body = null, cookies = {} }) {
    return new Promise((resolve) => {
        const bodyBuffer = body !== null
            ? Buffer.from(typeof body === 'string' ? body : JSON.stringify(body))
            : null;

        const req = new Readable({
            read() {
                if (bodyBuffer) this.push(bodyBuffer);
                this.push(null);
            }
        });

        req.method = method.toUpperCase();
        req.url = url;
        req.headers = Object.fromEntries(
            Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v])
        );

        if (bodyBuffer && !req.headers['content-type']) {
            req.headers['content-type'] = 'application/json';
        }
        if (bodyBuffer && !req.headers['content-length']) {
            req.headers['content-length'] = String(bodyBuffer.length);
        }

        req.cookies = { ...cookies };

        if (headers.Cookie || headers.cookie) {
            const rawCookie = headers.Cookie || headers.cookie;
            rawCookie.split(';').forEach(c => {
                const [k, v] = c.trim().split('=');
                if (k && v) req.cookies[k] = decodeURIComponent(v);
            });
        }

        const res = new EventEmitter();
        let resBody = '';
        res.statusCode = 200;
        res.headers = {};

        res.setHeader = (k, v) => { res.headers[k.toLowerCase()] = v; };
        res.getHeader = (k) => res.headers[k.toLowerCase()];
        res.removeHeader = (k) => { delete res.headers[k.toLowerCase()]; };
        res.status = (code) => { res.statusCode = code; return res; };
        res.cookie = (k, v) => { res.headers['set-cookie'] = `${k}=${v}`; };
        res.clearCookie = (k) => { res.headers['set-cookie'] = `${k}=; Max-Age=0`; };

        res.json = (data) => {
            res.setHeader('content-type', 'application/json');
            resBody = JSON.stringify(data);
            res.emit('finish');
            resolve({
                status: res.statusCode,
                headers: res.headers,
                json: async () => data,
                text: async () => resBody,
                data
            });
        };

        res.send = (data) => {
            resBody = typeof data === 'object' ? JSON.stringify(data) : String(data);
            res.emit('finish');
            let parsed = null;
            try { parsed = JSON.parse(resBody); } catch (e) { parsed = resBody; }
            resolve({
                status: res.statusCode,
                headers: res.headers,
                json: async () => parsed,
                text: async () => resBody,
                data: parsed
            });
        };

        res.sendFile = (filePath) => {
            try {
                if (!fs.existsSync(filePath)) {
                    res.statusCode = 404;
                    return res.send('File not found');
                }
                const fileData = fs.readFileSync(filePath);
                res.setHeader('content-length', String(fileData.length));
                res.emit('finish');
                resolve({
                    status: res.statusCode,
                    headers: res.headers,
                    body: fileData,
                    text: async () => fileData.toString(),
                    json: async () => { throw new Error('Not JSON'); },
                    data: fileData
                });
            } catch (err) {
                res.statusCode = 500;
                res.send(err.message);
            }
        };

        res.render = (view, data) => {
            res.emit('finish');
            resolve({
                status: res.statusCode,
                headers: res.headers,
                view,
                data
            });
        };

        res.end = (chunk) => {
            if (chunk) resBody += chunk;
            res.emit('finish');
            let parsed = null;
            try { parsed = JSON.parse(resBody); } catch (e) { parsed = resBody; }
            resolve({
                status: res.statusCode,
                headers: res.headers,
                json: async () => parsed,
                text: async () => resBody,
                data: parsed
            });
        };

        appInstance(req, res);
    });
}

describe('Legacy Backend Core Suite (server.js)', () => {
    let authToken = null;
    let authHeader = null;

    before(async () => {
        await fs.remove(USER_DIR);
        await fs.remove(TEST_USERS_FILE);
        await fs.ensureDir(path.dirname(TEST_USERS_FILE));
        await fs.writeJson(TEST_USERS_FILE, {});
    });

    after(async () => {
        await new Promise(r => setTimeout(r, 100));
        try { await fs.remove(USER_DIR); } catch (e) {}
        try { await fs.remove(TEST_USERS_FILE); } catch (e) {}
    });

    // =========================================================================
    // 1. AUTHENTICATION & SESSION MANAGEMENT
    // =========================================================================
    describe('1. Authentication Endpoints (/api/auth/*)', () => {

        it('POST /api/auth/register -> successfully registers a new user with bcrypt password and returns token', async () => {
            const res = await makeRequest(app, {
                method: 'POST',
                url: '/api/auth/register',
                body: { username: TEST_USER, password: TEST_PASSWORD }
            });

            assert.equal(res.status, 200);
            assert.equal(res.data.success, true);
            assert.equal(res.data.user.username, TEST_USER);
            assert.ok(res.data.token, 'Should return JWT token upon registration');

            authToken = res.data.token;
            authHeader = { Authorization: `Bearer ${authToken}` };

            // Verify directory initialization
            const userMd = getUserMdDir(TEST_USER);
            assert.ok(await fs.pathExists(userMd), 'User markdown directory should be created');
        });

        it('POST /api/auth/register -> rejects registration with missing username or password (400)', async () => {
            const res = await makeRequest(app, {
                method: 'POST',
                url: '/api/auth/register',
                body: { username: '', password: '' }
            });
            assert.equal(res.status, 400);
            assert.equal(res.data.success, false);
        });

        it('POST /api/auth/register -> rejects duplicate username registration (409)', async () => {
            const res = await makeRequest(app, {
                method: 'POST',
                url: '/api/auth/register',
                body: { username: TEST_USER, password: 'AnotherPassword123!' }
            });
            assert.equal(res.status, 409);
            assert.equal(res.data.success, false);
            assert.match(res.data.message, /already taken/i);
        });

        it('POST /api/auth/login -> logs in successfully with valid credentials and sets cookie', async () => {
            const res = await makeRequest(app, {
                method: 'POST',
                url: '/api/auth/login',
                body: { username: TEST_USER, password: TEST_PASSWORD }
            });

            assert.equal(res.status, 200);
            assert.equal(res.data.success, true);
            assert.equal(res.data.user.username, TEST_USER);
            assert.ok(res.data.token);
            assert.ok(res.headers['set-cookie'], 'Login should set auth cookie');
        });

        it('POST /api/auth/login -> rejects invalid password (401)', async () => {
            const res = await makeRequest(app, {
                method: 'POST',
                url: '/api/auth/login',
                body: { username: TEST_USER, password: 'WrongPassword!' }
            });
            assert.equal(res.status, 401);
            assert.equal(res.data.success, false);
        });

        it('POST /api/auth/login -> rejects non-existent username (401)', async () => {
            const res = await makeRequest(app, {
                method: 'POST',
                url: '/api/auth/login',
                body: { username: 'non_existent_user_999', password: 'SomePassword!' }
            });
            assert.equal(res.status, 401);
            assert.equal(res.data.success, false);
        });

        it('GET /api/auth/me -> returns authenticated user details', async () => {
            const res = await makeRequest(app, {
                method: 'GET',
                url: '/api/auth/me',
                headers: authHeader
            });
            assert.equal(res.status, 200);
            assert.equal(res.data.success, true);
            assert.equal(res.data.user.username, TEST_USER);
        });

        it('GET /api/auth/me -> rejects unauthenticated requests (401)', async () => {
            const res = await makeRequest(app, {
                method: 'GET',
                url: '/api/auth/me'
            });
            assert.equal(res.status, 401);
            assert.equal(res.data.success, false);
        });

        it('POST /api/auth/change-password -> changes user password successfully', async () => {
            const newPassword = 'NewSecretPassword456!';
            const res = await makeRequest(app, {
                method: 'POST',
                url: '/api/auth/change-password',
                headers: authHeader,
                body: { currentPassword: TEST_PASSWORD, newPassword }
            });

            assert.equal(res.status, 200);
            assert.equal(res.data.success, true);

            // Verify login with new password works
            const loginRes = await makeRequest(app, {
                method: 'POST',
                url: '/api/auth/login',
                body: { username: TEST_USER, password: newPassword }
            });
            assert.equal(loginRes.status, 200);
            authToken = loginRes.data.token;
            authHeader = { Authorization: `Bearer ${authToken}` };
        });

        it('POST /api/auth/change-password -> rejects when current password is wrong (401)', async () => {
            const res = await makeRequest(app, {
                method: 'POST',
                url: '/api/auth/change-password',
                headers: authHeader,
                body: { currentPassword: 'IncorrectPassword', newPassword: 'AnyNewPassword' }
            });
            assert.equal(res.status, 401);
            assert.equal(res.data.success, false);
        });

        it('POST /api/auth/logout -> clears authentication cookie', async () => {
            const res = await makeRequest(app, {
                method: 'POST',
                url: '/api/auth/logout'
            });
            assert.equal(res.status, 200);
            assert.equal(res.data.success, true);
            assert.ok(res.headers['set-cookie']);
        });
    });

    // =========================================================================
    // 2. PROJECT LOCATIONS & FILE TREE
    // =========================================================================
    describe('2. Project Locations & File Tree (/api/project-locations, /api/file-tree)', () => {

        it('GET /api/project-locations -> returns available subdirectories', async () => {
            const userMd = getUserMdDir(TEST_USER);
            await fs.ensureDir(path.join(userMd, 'projects', 'alpha'));
            await fs.ensureDir(path.join(userMd, 'docs'));

            const res = await makeRequest(app, {
                method: 'GET',
                url: '/api/project-locations',
                headers: authHeader
            });

            assert.equal(res.status, 200);
            assert.ok(Array.isArray(res.data));
            assert.ok(res.data.includes('docs'));
            assert.ok(res.data.includes('projects/alpha'));
        });

        it('GET /api/file-tree -> returns recursive file and directory tree with titles', async () => {
            const userMd = getUserMdDir(TEST_USER);
            const testFilePath = path.join(userMd, 'docs', 'guide.md');
            await fs.writeFile(testFilePath, '# Quick Guide\nSome instructions here.');
            await fs.writeJson(`${testFilePath}.meta.json`, {
                _pageMeta: { title: 'Custom Quick Guide' }
            });

            const res = await makeRequest(app, {
                method: 'GET',
                url: '/api/file-tree',
                headers: authHeader
            });

            assert.equal(res.status, 200);
            assert.equal(res.data.success, true);
            assert.ok(Array.isArray(res.data.tree));

            const docsDir = res.data.tree.find(n => n.name === 'docs');
            assert.ok(docsDir, 'docs directory should be in tree');
            assert.equal(docsDir.type, 'directory');

            const guideFile = docsDir.children.find(f => f.name === 'guide.md');
            assert.ok(guideFile, 'guide.md should be in docs directory');
            assert.equal(guideFile.title, 'Custom Quick Guide', 'Should resolve custom title from .meta.json');
        });

        it('GET / -> renders legacy EJS file tree index view with user context', async () => {
            const res = await makeRequest(app, {
                method: 'GET',
                url: '/',
                cookies: { token: authToken }
            });

            assert.equal(res.status, 200);
            assert.equal(res.view, 'index');
            assert.ok(res.data);
            assert.equal(res.data.username, TEST_USER);
            assert.ok(Array.isArray(res.data.tree));
        });
    });

    // =========================================================================
    // 3. PAGE CREATION & SECURITY VALIDATION
    // =========================================================================
    describe('3. Page Creation & Security Validation (/api/create-page)', () => {

        it('POST /api/create-page -> creates markdown file and initializes companion .meta.json', async () => {
            const res = await makeRequest(app, {
                method: 'POST',
                url: '/api/create-page',
                headers: authHeader,
                body: { fileName: 'architecture-notes', projectLocation: 'docs' }
            });

            assert.equal(res.status, 200);
            assert.equal(res.data.success, true);
            assert.equal(res.data.filePath, 'docs/architecture-notes.md');

            const userMd = getUserMdDir(TEST_USER);
            const createdFile = path.join(userMd, 'docs', 'architecture-notes.md');
            const metaFile = `${createdFile}.meta.json`;

            assert.ok(await fs.pathExists(createdFile));
            assert.ok(await fs.pathExists(metaFile));

            const meta = await fs.readJson(metaFile);
            assert.equal(meta._pageMeta.title, 'Architecture Notes');
            assert.equal(meta._pageMeta.checkCounter, 0);
        });

        it('POST /api/create-page -> rejects invalid file names (regex ^[a-zA-Z0-9\\-]+$)', async () => {
            const res = await makeRequest(app, {
                method: 'POST',
                url: '/api/create-page',
                headers: authHeader,
                body: { fileName: 'bad file name with spaces!', projectLocation: '/' }
            });
            assert.equal(res.status, 400);
            assert.equal(res.data.success, false);
            assert.match(res.data.message, /invalid file name/i);
        });

        it('POST /api/create-page -> prevents directory traversal attack (403)', async () => {
            const res = await makeRequest(app, {
                method: 'POST',
                url: '/api/create-page',
                headers: authHeader,
                body: { fileName: 'hacked', projectLocation: '../../outside' }
            });
            assert.equal(res.status, 403);
            assert.equal(res.data.success, false);
        });

        it('POST /api/create-page -> rejects duplicate file creation (400)', async () => {
            const res = await makeRequest(app, {
                method: 'POST',
                url: '/api/create-page',
                headers: authHeader,
                body: { fileName: 'architecture-notes', projectLocation: 'docs' }
            });
            assert.equal(res.status, 400);
            assert.equal(res.data.success, false);
            assert.match(res.data.message, /already exists/i);
        });
    });

    // =========================================================================
    // 4. MARKDOWN FETCHING & SECTION PARSING
    // =========================================================================
    describe('4. Markdown Fetching & Parsing (GET /api/md/*)', () => {

        it('GET /api/md/* -> parses markdown, splits sections by HR tags, and returns sections with meta', async () => {
            const userMd = getUserMdDir(TEST_USER);
            const samplePath = path.join(userMd, 'docs', 'sections-test.md');
            await fs.writeFile(
                samplePath,
                '# Topic Title\n\nFirst paragraph.\n\n---\n\nSecond section paragraph.\n\n---\n\nThird section paragraph.'
            );
            await fs.writeJson(`${samplePath}.meta.json`, {
                _pageMeta: { title: 'Topic Title' }
            });

            const res = await makeRequest(app, {
                method: 'GET',
                url: '/api/md/docs/sections-test.md',
                headers: authHeader
            });

            assert.equal(res.status, 200);
            assert.equal(res.data.success, true);
            assert.equal(res.data.title, 'Topic Title');
            assert.equal(res.data.sections.length, 3, 'Should split into 3 distinct sections by HR');

            // Verify each section has an ID and html
            res.data.sections.forEach((sec, idx) => {
                assert.ok(sec.id, `Section ${idx} should have an id`);
                assert.ok(sec.html, `Section ${idx} should have html`);
                assert.equal(typeof sec.done, 'boolean');
                assert.equal(typeof sec.count, 'number');
            });

            // Verify view metadata was updated
            const meta = await fs.readJson(`${samplePath}.meta.json`);
            assert.ok(meta._pageMeta.lastViewedAt);
        });

        it('GET /api/md/* -> returns 404 for non-existent file', async () => {
            const res = await makeRequest(app, {
                method: 'GET',
                url: '/api/md/non-existent-folder/missing.md',
                headers: authHeader
            });
            assert.equal(res.status, 404);
            assert.equal(res.data.success, false);
        });

        it('GET /api/md/* -> prevents directory traversal (403)', async () => {
            const res = await makeRequest(app, {
                method: 'GET',
                url: '/api/md/../../package.json',
                headers: authHeader
            });
            assert.equal(res.status, 403);
            assert.equal(res.data.success, false);
        });
    });

    // =========================================================================
    // 5. MARKDOWN UPDATES (TURNDOWN HTML -> MD)
    // =========================================================================
    describe('5. Markdown Updates (POST /api/md/update)', () => {

        it('POST /api/md/update -> converts HTML content to Markdown via Turndown and saves to disk', async () => {
            const userMd = getUserMdDir(TEST_USER);
            const filePath = 'docs/update-test.md';
            const fullPath = path.join(userMd, filePath);

            const htmlContent = '<h1>Updated Heading</h1><p>This is updated paragraph text with <strong>bold</strong> words.</p>';

            const res = await makeRequest(app, {
                method: 'POST',
                url: '/api/md/update',
                headers: authHeader,
                body: { filePath, htmlContent }
            });

            assert.equal(res.status, 200);
            assert.equal(res.data.success, true);

            const savedMd = await fs.readFile(fullPath, 'utf8');
            assert.ok(savedMd.includes('Updated Heading'));
            assert.ok(savedMd.includes('**bold**'));
        });

        it('POST /api/md/update -> preserves LaTeX block and inline math formulas without backslash corruption or escaped underscores', async () => {
            const userMd = getUserMdDir(TEST_USER);
            const filePath = 'docs/math-formula-test.md';
            const fullPath = path.join(userMd, filePath);

            const mathFormulaHtml = `
                <h2>Mathematical Specification</h2>
                <p>$$\\text{Coverage Percentage} = \\left(\\frac{\\text{Tracked Sections}}{\\text{Total Sections}}\\right) \\times 100$$</p>
                <p>Inline formula: $\\Delta x = x_2 - x_1$ and metric: $y_t = \\alpha \\cdot x_{t-1} + \\epsilon$.</p>
            `;

            const res = await makeRequest(app, {
                method: 'POST',
                url: '/api/md/update',
                headers: authHeader,
                body: { filePath, htmlContent: mathFormulaHtml }
            });

            assert.equal(res.status, 200);
            assert.equal(res.data.success, true);

            const savedMd = await fs.readFile(fullPath, 'utf8');

            // Must preserve clean LaTeX commands without double-backslashes (\\text, \\frac)
            assert.ok(savedMd.includes('\\text{Coverage Percentage}'));
            assert.ok(savedMd.includes('\\frac{\\text{Tracked Sections}}{\\text{Total Sections}}'));
            assert.ok(savedMd.includes('\\times 100'));
            assert.ok(!savedMd.includes('\\\\text'));
            assert.ok(!savedMd.includes('\\\\frac'));

            // Must preserve underscores without backslash escape in subscripts (x_2, x_1, y_t)
            assert.ok(savedMd.includes('x_2 - x_1'));
            assert.ok(savedMd.includes('y_t = \\alpha'));
            assert.ok(!savedMd.includes('x\\_2'));
            assert.ok(!savedMd.includes('y\\_t'));
        });

        it('POST /api/md/update -> prevents directory traversal attack (403)', async () => {
            const res = await makeRequest(app, {
                method: 'POST',
                url: '/api/md/update',
                headers: authHeader,
                body: { filePath: '../../secret.md', htmlContent: '<p>Hacked</p>' }
            });
            assert.equal(res.status, 403);
            assert.equal(res.data.success, false);
        });
    });

    // =========================================================================
    // 6. METADATA & SECTION TRACKING
    // =========================================================================
    describe('6. Section Tracking (POST /api/md/meta)', () => {

        it('POST /api/md/meta -> updates section status, increment count, and writes lastTrackedAt', async () => {
            const filePath = 'docs/sections-test.md';
            const sectionId = 'sec-test-123';

            const res = await makeRequest(app, {
                method: 'POST',
                url: '/api/md/meta',
                headers: authHeader,
                body: {
                    filePath,
                    sectionId,
                    done: true,
                    count: 2,
                    eventType: 'track_section'
                }
            });

            assert.equal(res.status, 200);
            assert.equal(res.data.success, true);
            assert.ok(res.data.meta[sectionId]);
            assert.equal(res.data.meta[sectionId].done, true);
            assert.equal(res.data.meta[sectionId].count, 2);
            assert.ok(res.data.meta[sectionId].lastTrackedAt);
            assert.ok(res.data.meta._pageMeta.lastTrackedAt);
        });

        it('POST /api/md/meta -> persists section chat history and returns it in GET /api/md/*', async () => {
            const filePath = 'docs/sections-test.md';
            const sectionId = 'sec-test-chat';
            const chatMessages = [
                { role: 'user', content: 'What is this section about?', timestamp: new Date().toISOString() },
                { role: 'assistant', content: 'This section explains the core design concepts.', timestamp: new Date().toISOString() }
            ];

            const metaRes = await makeRequest(app, {
                method: 'POST',
                url: '/api/md/meta',
                headers: authHeader,
                body: {
                    filePath,
                    sectionId,
                    chat: chatMessages
                }
            });

            assert.equal(metaRes.status, 200);
            assert.equal(metaRes.data.success, true);
            assert.deepEqual(metaRes.data.meta[sectionId].chat, chatMessages);

            // Verify GET /api/md/* stitches chat messages
            const getRes = await makeRequest(app, {
                method: 'GET',
                url: `/api/md/${filePath}`,
                headers: authHeader
            });
            assert.equal(getRes.status, 200);
            assert.equal(getRes.data.success, true);
            assert.ok(Array.isArray(getRes.data.sections));
        });
    });

    // =========================================================================
    // 7. FILE MOVE & RENAME
    // =========================================================================
    describe('7. File Moving & Renaming (POST /api/move)', () => {

        it('POST /api/move -> moves markdown file and companion .meta.json to destination directory', async () => {
            const userMd = getUserMdDir(TEST_USER);
            const source = 'docs/to-move.md';
            const destination = 'projects';

            const fullSource = path.join(userMd, source);
            const fullSourceMeta = `${fullSource}.meta.json`;
            await fs.ensureDir(path.dirname(fullSource));
            await fs.writeFile(fullSource, '# File to Move\nContent here.');
            await fs.writeJson(fullSourceMeta, { _pageMeta: { title: 'File to Move' } });

            const res = await makeRequest(app, {
                method: 'POST',
                url: '/api/move',
                headers: authHeader,
                body: { source, destination }
            });

            assert.equal(res.status, 200);
            assert.equal(res.data.success, true);

            const expectedDestFile = path.join(userMd, 'projects', 'to-move.md');
            assert.ok(await fs.pathExists(expectedDestFile), 'Destination markdown should exist');
            assert.ok(await fs.pathExists(`${expectedDestFile}.meta.json`), 'Destination meta should exist');
            assert.ok(!(await fs.pathExists(fullSource)), 'Source markdown should no longer exist');
            assert.ok(!(await fs.pathExists(fullSourceMeta)), 'Source meta should no longer exist');
        });

        it('POST /api/move -> prevents directory traversal attack (403)', async () => {
            const res = await makeRequest(app, {
                method: 'POST',
                url: '/api/move',
                headers: authHeader,
                body: { source: 'docs/test.md', destination: '../../outside' }
            });
            assert.equal(res.status, 403);
            assert.equal(res.data.success, false);
        });

        it('POST /api/move -> rejects move if file already exists in destination (409)', async () => {
            const userMd = getUserMdDir(TEST_USER);
            const source = 'docs/conflict-file.md';
            const destination = 'projects';

            const fullSource = path.join(userMd, source);
            const fullDest = path.join(userMd, destination, 'conflict-file.md');

            await fs.ensureDir(path.dirname(fullSource));
            await fs.ensureDir(path.dirname(fullDest));
            await fs.writeFile(fullSource, '# Source File');
            await fs.writeFile(fullDest, '# Existing Destination File');

            const res = await makeRequest(app, {
                method: 'POST',
                url: '/api/move',
                headers: authHeader,
                body: { source, destination }
            });

            assert.equal(res.status, 409);
            assert.equal(res.data.success, false);
            assert.match(res.data.message, /already exists/i);
            assert.match(res.data.message, /cannot move/i);

            // Ensure source file was not deleted/overwritten
            assert.ok(await fs.pathExists(fullSource), 'Source file should still exist');
            assert.ok(await fs.pathExists(fullDest), 'Existing destination file should not be modified');
        });

        it('POST /api/move -> rejects move when source and destination are the same (400)', async () => {
            const userMd = getUserMdDir(TEST_USER);
            const source = 'docs/same-dest.md';
            const fullSource = path.join(userMd, source);
            await fs.ensureDir(path.dirname(fullSource));
            await fs.writeFile(fullSource, '# Same Dest');

            const res = await makeRequest(app, {
                method: 'POST',
                url: '/api/move',
                headers: authHeader,
                body: { source, destination: 'docs' }
            });

            assert.equal(res.status, 400);
            assert.equal(res.data.success, false);
            assert.match(res.data.message, /same/i);
        });

        it('POST /api/move -> rejects move if source file does not exist (404)', async () => {
            const res = await makeRequest(app, {
                method: 'POST',
                url: '/api/move',
                headers: authHeader,
                body: { source: 'docs/non-existent-source.md', destination: 'projects' }
            });

            assert.equal(res.status, 404);
            assert.equal(res.data.success, false);
            assert.match(res.data.message, /not exist/i);
        });
    });

    // =========================================================================
    // 8. FILE DELETION
    // =========================================================================
    describe('8. File Deletion (POST /api/delete)', () => {

        it('POST /api/delete -> deletes markdown file and companion .meta.json', async () => {
            const userMd = getUserMdDir(TEST_USER);
            const relativePath = 'docs/to-delete.md';
            const fullPath = path.join(userMd, relativePath);
            const metaPath = `${fullPath}.meta.json`;

            await fs.writeFile(fullPath, '# Temporary File');
            await fs.writeJson(metaPath, { _pageMeta: { title: 'Temporary' } });

            const res = await makeRequest(app, {
                method: 'POST',
                url: '/api/delete',
                headers: authHeader,
                body: { path: relativePath }
            });

            assert.equal(res.status, 200);
            assert.equal(res.data.success, true);
            assert.ok(!(await fs.pathExists(fullPath)), 'Markdown file should be deleted');
            assert.ok(!(await fs.pathExists(metaPath)), 'Metadata file should be deleted');
        });

        it('POST /api/delete -> refuses to delete directories (400)', async () => {
            const userMd = getUserMdDir(TEST_USER);
            const folderPath = 'docs/subfolder';
            await fs.ensureDir(path.join(userMd, folderPath));

            const res = await makeRequest(app, {
                method: 'POST',
                url: '/api/delete',
                headers: authHeader,
                body: { path: folderPath }
            });

            assert.equal(res.status, 400);
            assert.equal(res.data.success, false);
            assert.match(res.data.message, /cannot delete directories/i);
        });

        it('POST /api/delete -> prevents directory traversal (403)', async () => {
            const res = await makeRequest(app, {
                method: 'POST',
                url: '/api/delete',
                headers: authHeader,
                body: { path: '../../package.json' }
            });
            assert.equal(res.status, 403);
            assert.equal(res.data.success, false);
        });
    });

    // =========================================================================
    // 9. DRAWINGS & IMAGE MANAGEMENT
    // =========================================================================
    describe('9. Drawing & Image Management (/api/upload-drawing, /images/*, /api/delete-images)', () => {
        let uploadedImageUrl = null;
        let uploadedImageFilename = null;

        it('POST /api/upload-drawing -> saves base64 PNG image into user images directory', async () => {
            // Minimal 1x1 transparent PNG in base64
            const samplePngBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

            const res = await makeRequest(app, {
                method: 'POST',
                url: '/api/upload-drawing',
                headers: authHeader,
                body: { imageBase64: samplePngBase64 }
            });

            assert.equal(res.status, 200);
            assert.equal(res.data.success, true);
            assert.ok(res.data.url, 'Should return image URL');
            assert.match(res.data.url, new RegExp(`/images/${TEST_USER}/draw-.*\\.png`));

            uploadedImageUrl = res.data.url;
            uploadedImageFilename = path.basename(uploadedImageUrl);

            const userImages = getUserImagesDir(TEST_USER);
            assert.ok(await fs.pathExists(path.join(userImages, uploadedImageFilename)));
        });

        it('GET /images/:username/:fileName -> serves user-scoped image', async () => {
            const res = await makeRequest(app, {
                method: 'GET',
                url: `/images/${TEST_USER}/${uploadedImageFilename}`
            });

            assert.equal(res.status, 200);
            assert.ok(res.body);
            assert.ok(res.body.length > 0);
        });

        it('GET /images/:fileName -> serves flat image URL resolving authenticated user image directory', async () => {
            const res = await makeRequest(app, {
                method: 'GET',
                url: `/images/${uploadedImageFilename}`,
                headers: authHeader
            });

            assert.equal(res.status, 200);
            assert.ok(res.body);
            assert.ok(res.body.length > 0);
        });

        it('GET /images/:username/:fileName -> returns 404 for missing image', async () => {
            const res = await makeRequest(app, {
                method: 'GET',
                url: `/images/${TEST_USER}/missing-image-999.png`
            });
            assert.equal(res.status, 404);
        });

        it('POST /api/delete-images -> deletes images by URL array', async () => {
            const userImages = getUserImagesDir(TEST_USER);
            const imagePath = path.join(userImages, uploadedImageFilename);
            assert.ok(await fs.pathExists(imagePath));

            const res = await makeRequest(app, {
                method: 'POST',
                url: '/api/delete-images',
                headers: authHeader,
                body: { urls: [uploadedImageUrl] }
            });

            assert.equal(res.status, 200);
            assert.equal(res.data.success, true);
            assert.ok(!(await fs.pathExists(imagePath)), 'Image should be removed from disk');
        });
    });

    // =========================================================================
    // 10. AI GENERATION ENDPOINT
    // =========================================================================
    describe('10. AI Assistant Generation (/api/ai/generate)', () => {

        it('POST /api/ai/generate -> rejects unauthenticated request (401)', async () => {
            const res = await makeRequest(app, {
                method: 'POST',
                url: '/api/ai/generate',
                body: { prompt: 'Write an introduction' }
            });
            assert.equal(res.status, 401);
        });

        it('POST /api/ai/generate -> rejects request with missing prompt (400)', async () => {
            const res = await makeRequest(app, {
                method: 'POST',
                url: '/api/ai/generate',
                headers: authHeader,
                body: { prompt: '' }
            });
            assert.equal(res.status, 400);
            assert.equal(res.data.success, false);
            assert.match(res.data.message, /prompt is required/i);
        });

        it('POST /api/ai/generate -> gracefully returns mock preview when provider API key is not configured', async () => {
            delete process.env.ANTHROPIC_API_KEY;

            const res = await makeRequest(app, {
                method: 'POST',
                url: '/api/ai/generate',
                headers: authHeader,
                body: { model: 'claude-3-5-sonnet', prompt: 'Explain binary search trees' }
            });

            assert.equal(res.status, 200);
            assert.equal(res.data.success, true);
            assert.equal(res.data.mocked, true);
            assert.ok(res.data.content);
            assert.match(res.data.message, /Missing ANTHROPIC_API_KEY/i);
        });

        it('POST /api/ai/generate -> handles mode: chat with mock preview response and strict plain text', async () => {
            delete process.env.ANTHROPIC_API_KEY;

            const res = await makeRequest(app, {
                method: 'POST',
                url: '/api/ai/generate',
                headers: authHeader,
                body: { 
                    model: 'claude-3-5-sonnet', 
                    prompt: 'Summarize this section',
                    context: '<p>Section content here</p>',
                    mode: 'chat',
                    maxWords: 50
                }
            });

            assert.equal(res.status, 200);
            assert.equal(res.data.success, true);
            assert.equal(res.data.mocked, true);
            assert.ok(res.data.content);
            assert.match(res.data.content, /main focus/i);
            // Verify strict plain text: no HTML tags
            assert.ok(!/<[a-z][\s\S]*>/i.test(res.data.content), 'Chat response must be strictly plain text without HTML tags');
        });

        it('POST /api/ai/generate -> handles mode: update and returns rich HTML content', async () => {
            delete process.env.ANTHROPIC_API_KEY;

            const res = await makeRequest(app, {
                method: 'POST',
                url: '/api/ai/generate',
                headers: authHeader,
                body: { 
                    model: 'claude-3-5-sonnet', 
                    prompt: 'Rewrite as an introduction',
                    context: '<p>Old content</p>',
                    mode: 'update'
                }
            });

            assert.equal(res.status, 200);
            assert.equal(res.data.success, true);
            assert.equal(res.data.mocked, true);
            assert.ok(res.data.content);
            // Verify HTML content structure
            assert.ok(/<[a-z][\s\S]*>/i.test(res.data.content), 'Update mode response should contain HTML markup');
        });

        it('POST /api/ai/generate -> defaults to GPT OSS 120B (Groq) when model is omitted', async () => {
            delete process.env.GROQ_API_KEY;

            const res = await makeRequest(app, {
                method: 'POST',
                url: '/api/ai/generate',
                headers: authHeader,
                body: { 
                    prompt: 'Explain what this section covers',
                    mode: 'chat'
                }
            });

            assert.equal(res.status, 200);
            assert.equal(res.data.success, true);
            assert.equal(res.data.mocked, true);
            assert.match(res.data.message, /Missing GROQ_API_KEY/i);
        });
    });

});
