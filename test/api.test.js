const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs-extra');
const { EventEmitter } = require('events');

const JWT_SECRET = process.env.JWT_SECRET || 'md-engine-secure-jwt-secret-key-2026';
const TEST_USER = 'api_test_user';
const USER_DIR = path.join(__dirname, '..', 'user_data', TEST_USER);

// In-memory request helper for Express (no network socket needed)
function makeRequest(app, { method = 'GET', url = '/', headers = {}, body = null }) {
    return new Promise((resolve, reject) => {
        const req = new EventEmitter();
        req.method = method;
        req.url = url;
        req.headers = Object.fromEntries(
            Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v])
        );
        req.cookies = {};
        req.body = body || {};

        const res = new EventEmitter();
        let resBody = '';
        res.statusCode = 200;
        res.headers = {};

        res.setHeader = (k, v) => { res.headers[k.toLowerCase()] = v; };
        res.getHeader = (k) => res.headers[k.toLowerCase()];
        res.status = (code) => { res.statusCode = code; return res; };
        res.json = (data) => {
            res.setHeader('content-type', 'application/json');
            resBody = JSON.stringify(data);
            res.emit('finish');
            resolve({
                status: res.statusCode,
                headers: res.headers,
                json: async () => data,
                text: async () => resBody
            });
        };
        res.send = (data) => {
            resBody = typeof data === 'object' ? JSON.stringify(data) : String(data);
            res.emit('finish');
            resolve({
                status: res.statusCode,
                headers: res.headers,
                json: async () => JSON.parse(resBody),
                text: async () => resBody
            });
        };
        res.end = (chunk) => {
            if (chunk) resBody += chunk;
            res.emit('finish');
            resolve({
                status: res.statusCode,
                headers: res.headers,
                json: async () => {
                    try { return JSON.parse(resBody); } catch (e) { return resBody; }
                },
                text: async () => resBody
            });
        };

        app(req, res);

        if (body) {
            req.emit('data', Buffer.from(typeof body === 'string' ? body : JSON.stringify(body)));
        }
        req.emit('end');
    });
}

describe('Recommendation & Activity API Endpoints', () => {
    let app;
    let token;

    before(async () => {
        await fs.remove(USER_DIR);
        const userMd = path.join(USER_DIR, 'md');
        await fs.ensureDir(userMd);

        // Create sample markdown file and metadata
        const fileContent = '# Sample Revision Topic\nSection One\n\n---\n\nSection Two';
        await fs.writeFile(path.join(userMd, 'sample-topic.md'), fileContent);

        const { parseSections } = require('../services/recommendationEngine');
        const sections = parseSections(fileContent);

        const now = new Date().toISOString();
        const meta = {
            _pageMeta: {
                title: 'Sample Revision Topic',
                lastViewedAt: now,
                lastTrackedAt: now
            },
            [sections[0].id]: {
                done: true,
                count: 1,
                lastTrackedAt: now
            }
        };
        await fs.writeJson(path.join(userMd, 'sample-topic.md.meta.json'), meta);

        // Generate JWT token
        token = jwt.sign({ username: TEST_USER }, JWT_SECRET, { expiresIn: '1h' });

        const express = require('express');
        const cookieParser = require('cookie-parser');
        const bodyParser = require('body-parser');
        const cors = require('cors');

        const { logActivity, getRecentActivities } = require('../services/activityService');
        const { getRecommendations, getUserMdDir } = require('../services/recommendationEngine');
        const { enqueueRecalculation } = require('../services/backgroundQueue');

        app = express();
        app.use(cors());
        app.use(cookieParser());
        app.use(bodyParser.json());

        function authenticate(req, res, next) {
            let t = req.cookies?.token;
            if (!t && req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
                t = req.headers.authorization.slice(7).trim();
            }
            if (!t) return res.status(401).json({ success: false, message: 'Auth required' });
            try {
                req.user = jwt.verify(t, JWT_SECRET);
                next();
            } catch (e) {
                res.status(401).json({ success: false, message: 'Invalid token' });
            }
        }

        // GET /api/recommendations/revision
        app.get('/api/recommendations/revision', authenticate, async (req, res) => {
            const data = await getRecommendations(req.user.username);
            res.json({
                recommendations: data.recommendations || [],
                generatedAt: data.generatedAt || new Date().toISOString()
            });
        });

        // GET /api/activity/recent
        app.get('/api/activity/recent', authenticate, async (req, res) => {
            const limit = parseInt(req.query.limit, 10) || 50;
            const activities = await getRecentActivities(req.user.username, limit);
            res.json({ success: true, activities });
        });

        // POST /api/recommendations/check
        app.post('/api/recommendations/check', authenticate, async (req, res) => {
            const { fileId } = req.body;
            const userMdPath = getUserMdDir(req.user.username);
            const absPath = path.resolve(path.join(userMdPath, fileId));
            const metaPath = `${absPath}.meta.json`;

            let meta = {};
            if (await fs.pathExists(metaPath)) {
                meta = await fs.readJson(metaPath);
            }
            const nowIso = new Date().toISOString();
            meta._pageMeta = meta._pageMeta || {};
            meta._pageMeta.checkCounter = (meta._pageMeta.checkCounter || 0) + 1;
            meta._pageMeta.lastTrackedAt = nowIso;

            await fs.writeJson(metaPath, meta, { spaces: 2 });

            await logActivity(req.user.username, {
                fileId,
                eventType: 'revision_check',
                timestamp: nowIso,
                metadata: { checkCounter: meta._pageMeta.checkCounter }
            });

            enqueueRecalculation(req.user.username);

            res.json({
                success: true,
                checkCounter: meta._pageMeta.checkCounter,
                lastTrackedAt: nowIso
            });
        });

        // POST /api/create-page
        app.post('/api/create-page', authenticate, async (req, res) => {
            const { fileName, projectLocation = '' } = req.body;
            const userMd = getUserMdDir(req.user.username);
            const normalizedLocation = (projectLocation.trim() === '/' || projectLocation.trim() === '') ? '' : projectLocation.trim().replace(/^\/+/, '');
            const fullDirPath = path.resolve(path.join(userMd, normalizedLocation));
            await fs.promises.mkdir(fullDirPath, { recursive: true });
            const filePath = path.join(fullDirPath, `${fileName}.md`);
            await fs.promises.writeFile(filePath, `# ${fileName}\n\nStart typing here...`);
            const relativeFilePath = path.relative(userMd, filePath).replace(/\\/g, '/');
            const nowIso = new Date().toISOString();
            const metaPath = `${filePath}.meta.json`;
            await fs.promises.writeFile(metaPath, JSON.stringify({ _pageMeta: { title: fileName, createdAt: nowIso, lastViewedAt: nowIso, checkCounter: 0 } }));
            await logActivity(req.user.username, {
                fileId: relativeFilePath,
                eventType: 'create_file',
                timestamp: nowIso,
                metadata: { title: fileName }
            });
            enqueueRecalculation(req.user.username);
            res.json({ success: true, filePath: relativeFilePath });
        });
    });

    after(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
        try {
            await fs.remove(USER_DIR);
        } catch (e) {}
    });

    it('rejects unauthenticated requests to /api/recommendations/revision', async () => {
        const res = await makeRequest(app, {
            method: 'GET',
            url: '/api/recommendations/revision'
        });
        assert.equal(res.status, 401);
    });

    it('returns top recommendations for authenticated user', async () => {
        const res = await makeRequest(app, {
            method: 'GET',
            url: '/api/recommendations/revision',
            headers: { Authorization: `Bearer ${token}` }
        });
        assert.equal(res.status, 200);
        const data = await res.json();
        assert.ok(Array.isArray(data.recommendations));
        assert.ok(data.generatedAt);
        assert.equal(data.recommendations.length, 1);
        assert.equal(data.recommendations[0].fileId, 'sample-topic.md');
        assert.equal(data.recommendations[0].title, 'Sample Revision Topic');
        assert.equal(data.recommendations[0].coveragePercentage, 50);
        assert.equal(data.recommendations[0].rank, 1);
    });

    it('allows checking a file to increment spaced repetition counter', async () => {
        const checkRes = await makeRequest(app, {
            method: 'POST',
            url: '/api/recommendations/check',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: { fileId: 'sample-topic.md' }
        });
        assert.equal(checkRes.status, 200);
        const checkData = await checkRes.json();
        assert.equal(checkData.success, true);
        assert.equal(checkData.checkCounter, 1);

        // Verify recent activity reflects this check
        const actRes = await makeRequest(app, {
            method: 'GET',
            url: '/api/activity/recent',
            headers: { Authorization: `Bearer ${token}` }
        });
        const actData = await actRes.json();
        assert.equal(actData.success, true);
        assert.ok(actData.activities.length > 0);
        assert.equal(actData.activities[0].eventType, 'revision_check');
        assert.equal(actData.activities[0].fileId, 'sample-topic.md');
    });

    it('records create_file in recent activity when a page is created', async () => {
        const createRes = await makeRequest(app, {
            method: 'POST',
            url: '/api/create-page',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: { fileName: 'new-doc-activity-test', projectLocation: '/' }
        });
        assert.equal(createRes.status, 200);
        const createData = await createRes.json();
        assert.equal(createData.success, true);
        assert.equal(createData.filePath, 'new-doc-activity-test.md');

        const actRes = await makeRequest(app, {
            method: 'GET',
            url: '/api/activity/recent',
            headers: { Authorization: `Bearer ${token}` }
        });
        const actData = await actRes.json();
        assert.equal(actData.success, true);
        const createdEvt = actData.activities.find(a => a.fileId === 'new-doc-activity-test.md');
        assert.ok(createdEvt, 'Created file event should be recorded in recent activities');
        assert.equal(createdEvt.eventType, 'create_file');
    });

});
