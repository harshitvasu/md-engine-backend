const express = require('express');
const path = require('path');
const fs = require('fs-extra');
const cors = require('cors');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');

// Internal Services
const { logActivity, getRecentActivities } = require('./services/activityService');
const { getRecommendations } = require('./services/recommendationEngine');
const { enqueueRecalculation, ensureWorkerRunning } = require('./services/backgroundQueue');
const { readJsonSafelySync, writeJsonAtomic } = require('./services/jsonAtomic');

// Helper Modules
const { 
    JWT_SECRET, 
    USERS_FILE, 
    loadUsers, 
    saveUsers, 
    authenticate, 
    setAuthCookie, 
    clearAuthCookie, 
    issueToken,
    hashPassword,
    comparePassword 
} = require('./helpers/authHelper');

const {
    getUserMdDir,
    getUserImagesDir,
    getDirectoryTree,
    getDirectories,
    extractImageFileNames
} = require('./helpers/fileHelper');

const {
    unescapeMath,
    parseSections,
    htmlToMarkdown
} = require('./helpers/markdownHelper');

const {
    recordFileView,
    updateSectionMetadata,
    recordRevisionCheck
} = require('./helpers/metadataHelper');

const {
    generateAiContent,
    MOCK_LOREM_IPSUM
} = require('./helpers/aiHelper');

// Load environment variables from .env if available (Node 20.6+)
if (typeof process.loadEnvFile === 'function') {
    try {
        process.loadEnvFile();
    } catch (e) {
        // .env file not present or unreadable, fall back to environment variables
    }
}

const app = express();
const port = 4444;

// Ensure standalone recommendation background worker is running
ensureWorkerRunning();

// EJS Configuration
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware
// Allow credentials with dynamic origin reflection for cookies
app.use(cors({
    origin: (origin, callback) => {
        // Reflect origin so cookies work in localhost and deployed environments
        callback(null, true);
    },
    credentials: true
}));
app.use(cookieParser());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true }));

// Serve user-scoped images: /images/:username/:fileName
app.get('/images/:username/:fileName', (req, res) => {
    const { username, fileName } = req.params;
    const safeUser = username.replace(/[^a-zA-Z0-9_-]/g, '').toLowerCase();
    const safeFile = path.basename(fileName);

    const userImagesDir = getUserImagesDir(safeUser);
    const filePath = path.join(userImagesDir, safeFile);

    if (fs.existsSync(filePath)) {
        return res.sendFile(filePath);
    }

    // Fallback: Check global legacy images folder
    const fallbackPath = path.join(__dirname, 'images', safeFile);
    if (fs.existsSync(fallbackPath)) {
        return res.sendFile(fallbackPath);
    }

    res.status(404).send('Image not found');
});

// Serve flat images: /images/:fileName (checks user's images if authenticated, then global)
app.get('/images/:fileName', (req, res) => {
    const safeFile = path.basename(req.params.fileName);

    let token = req.cookies?.token;
    if (!token && req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
        token = req.headers.authorization.slice(7).trim();
    }
    if (token) {
        try {
            const decoded = jwt.verify(token, JWT_SECRET);
            if (decoded.username) {
                const userImagesDir = getUserImagesDir(decoded.username);
                const userFilePath = path.join(userImagesDir, safeFile);
                if (fs.existsSync(userFilePath)) {
                    return res.sendFile(userFilePath);
                }
            }
        } catch (e) {}
    }

    const globalPath = path.join(__dirname, 'images', safeFile);
    if (fs.existsSync(globalPath)) {
        return res.sendFile(globalPath);
    }

    res.status(404).send('Image not found');
});

// Fallback static handler
app.use('/images', express.static(path.join(__dirname, 'images')));

// ---------------------------------------------------------
// AUTH ROUTES
// ---------------------------------------------------------

// POST /api/auth/register
app.post('/api/auth/register', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(400).json({ success: false, message: 'Username and password are required.' });
        }

        const trimmedUser = username.trim().toLowerCase();
        if (!/^[a-zA-Z0-9_-]{3,30}$/.test(trimmedUser)) {
            return res.status(400).json({ 
                success: false, 
                message: 'Username must be 3-30 characters and use only letters, numbers, hyphens, or underscores.' 
            });
        }

        if (password.length < 4) {
            return res.status(400).json({ 
                success: false, 
                message: 'Password must be at least 4 characters.' 
            });
        }

        const users = loadUsers();
        if (users[trimmedUser]) {
            return res.status(409).json({ success: false, message: 'Username is already taken.' });
        }

        const passwordHash = await hashPassword(password);
        users[trimmedUser] = {
            username: trimmedUser,
            passwordHash,
            createdAt: new Date().toISOString()
        };
        saveUsers(users);

        // Ensure user md and images directories exist
        const userMd = getUserMdDir(trimmedUser);
        getUserImagesDir(trimmedUser);

        // Seed initial welcome doc if directory is empty
        const welcomeDoc = path.join(userMd, 'welcome.md');
        if (!fs.existsSync(welcomeDoc)) {
            await fs.promises.writeFile(
                welcomeDoc, 
                `# Welcome to ${trimmedUser}'s Workspace\n\nThis is your private Markdown space.\n\n---\n\n## Getting Started\n\n- Click **Edit** above to add notes or sketches.\n- Create new subfolders and documents from the explorer.\n`
            );
        }

        const token = issueToken(trimmedUser);
        setAuthCookie(res, token);

        res.json({
            success: true,
            user: { username: trimmedUser },
            token
        });
    } catch (err) {
        console.error('Registration error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
});

// POST /api/auth/login
app.post('/api/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(400).json({ success: false, message: 'Username and password are required.' });
        }

        const trimmedUser = username.trim().toLowerCase();
        const users = loadUsers();
        const user = users[trimmedUser];

        if (!user || !(await comparePassword(password, user.passwordHash))) {
            return res.status(401).json({ success: false, message: 'Invalid username or password.' });
        }

        getUserMdDir(trimmedUser);

        const token = issueToken(trimmedUser);
        setAuthCookie(res, token);

        res.json({
            success: true,
            user: { username: trimmedUser },
            token
        });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
});

// POST /api/auth/logout
app.post('/api/auth/logout', (req, res) => {
    clearAuthCookie(res);
    res.json({ success: true, message: 'Logged out successfully' });
});

// GET /api/auth/me
app.get('/api/auth/me', authenticate, (req, res) => {
    res.json({ success: true, user: { username: req.user.username } });
});

// POST /api/auth/change-password
app.post('/api/auth/change-password', authenticate, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ success: false, message: 'Current password and new password are required.' });
        }

        if (newPassword.length < 4) {
            return res.status(400).json({ success: false, message: 'New password must be at least 4 characters long.' });
        }

        const username = req.user.username;
        const users = loadUsers();
        const user = users[username];

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }

        const isMatch = await comparePassword(currentPassword, user.passwordHash);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Current password is incorrect.' });
        }

        user.passwordHash = await hashPassword(newPassword);
        user.updatedAt = new Date().toISOString();
        users[username] = user;
        saveUsers(users);

        res.json({ success: true, message: 'Password updated successfully.' });
    } catch (err) {
        console.error('Change password error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
});

// ---------------------------------------------------------
// APPLICATION ROUTES (SCOPED TO AUTHENTICATED USER)
// ---------------------------------------------------------

// GET / -> Renders EJS file tree
app.get('/', (req, res) => {
    let token = req.cookies?.token;
    let username = null;
    if (token) {
        try {
            const decoded = jwt.verify(token, JWT_SECRET);
            username = decoded.username;
        } catch (e) {}
    }
    const mdPath = username ? getUserMdDir(username) : path.join(__dirname, 'md');
    let fileTree = [];
    if (fs.existsSync(mdPath)) {
        fileTree = getDirectoryTree(mdPath);
    }
    res.render('index', { tree: fileTree, username });
});

// GET: Send available project locations for the dropdown
app.get('/api/project-locations', authenticate, (req, res) => {
    const userMdPath = getUserMdDir(req.user.username);
    res.json(getDirectories(userMdPath));
});

// POST: Create a new page
app.post('/api/create-page', authenticate, async (req, res) => {
    try {
        const { fileName, projectLocation } = req.body;

        if (!fileName || projectLocation === undefined || projectLocation === null) {
            return res.status(400).json({ success: false, message: 'File name or project location is missing.' });
        }

        if (!/^[a-zA-Z0-9\-]+$/.test(fileName)) {
            return res.status(400).json({ success: false, message: 'Invalid file name. Use only letters, numbers, and "-".' });
        }

        const userMd = getUserMdDir(req.user.username);
        const normalizedLocation = (projectLocation.trim() === '/' || projectLocation.trim() === '') 
            ? '' 
            : projectLocation.trim().replace(/^\/+/, '');
        const fullDirPath = path.resolve(path.join(userMd, normalizedLocation));

        // Security check: Must stay inside user directory
        if (!fullDirPath.startsWith(userMd)) {
            return res.status(403).json({ success: false, message: 'Invalid directory location.' });
        }

        await fs.promises.mkdir(fullDirPath, { recursive: true });
        const filePath = path.join(fullDirPath, `${fileName}.md`);

        // Check if file exists
        try {
            await fs.promises.access(filePath);
            return res.status(400).json({ success: false, message: 'File already exists.' });
        } catch {
            // File does not exist, proceed
        }

        const defaultContent = `# ${fileName.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}\n\nStart typing here...`;
        await fs.promises.writeFile(filePath, defaultContent);

        const relativeFilePath = path.relative(userMd, filePath).replace(/\\/g, '/');
        const nowIso = new Date().toISOString();
        const pageTitle = fileName.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

        // Initialize companion metadata (.meta.json) with page metadata
        const metaPath = `${filePath}.meta.json`;
        const initialMeta = {
            _pageMeta: {
                title: pageTitle,
                createdAt: nowIso,
                lastViewedAt: nowIso,
                checkCounter: 0
            }
        };
        try {
            await writeJsonAtomic(metaPath, initialMeta);
        } catch (err) {
            console.error('Failed to create initial meta file:', err);
        }

        // Log file creation event to recent activity stream
        logActivity(req.user.username, {
            fileId: relativeFilePath,
            eventType: 'create_file',
            timestamp: nowIso,
            metadata: { title: pageTitle, fileName, location: normalizedLocation }
        }).catch(err => console.error('Failed to log create activity:', err));

        // Enqueue background recalculation for spaced-repetition recommendations
        enqueueRecalculation(req.user.username);

        res.json({ success: true, filePath: relativeFilePath });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// GET /api/md/* -> Fetch specific Markdown file with metadata
app.get(/^\/api\/md\/(.*)$/, authenticate, async (req, res) => {
    try {
        const filepath = req.params[0] || '';
        const userMd = getUserMdDir(req.user.username);
        const absolutePath = path.resolve(path.join(userMd, filepath));

        if (!absolutePath.startsWith(userMd)) {
            return res.status(403).json({ success: false, message: 'Forbidden' });
        }

        if (!fs.existsSync(absolutePath)) {
            return res.status(404).json({ success: false, message: 'File not found' });
        }

        const stat = await fs.promises.stat(absolutePath);
        if (stat.isDirectory()) {
            return res.status(400).json({ success: false, message: 'Requested path is a directory.' });
        }

        const rawMarkdown = fs.readFileSync(absolutePath, 'utf8');
        const sections = parseSections(rawMarkdown);

        // Fetch Metadata safely using atomic resilient helper (handles corrupted/mid-write files)
        const metaPath = `${absolutePath}.meta.json`;
        const metaData = readJsonSafelySync(metaPath, {});
        let pageTitle = path.basename(absolutePath).replace(/\.md$/, ''); 
        if (metaData._pageMeta?.title) {
            pageTitle = metaData._pageMeta.title;
        }

        // Stitch metadata into sections
        const sectionsWithMeta = sections.map(sec => ({
            ...sec,
            done: metaData[sec.id]?.done || false,
            count: metaData[sec.id]?.count || 0,
            chat: metaData[sec.id]?.chat || metaData[sec.id]?.chatHistory || metaData[sec.id]?.messages || []
        }));

        const nowIso = new Date().toISOString();
        await recordFileView(metaPath, metaData, pageTitle, nowIso);

        // Log view activity and trigger background recommendation recalculation
        logActivity(req.user.username, {
            fileId: filepath,
            eventType: 'view_file',
            timestamp: nowIso,
            metadata: { title: pageTitle }
        }).catch(err => console.error('Failed to log view activity:', err));

        enqueueRecalculation(req.user.username);

        res.json({ success: true, title: pageTitle, sections: sectionsWithMeta });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// POST /api/md/update -> Saves HTML edits as Markdown
app.post('/api/md/update', authenticate, async (req, res) => {
    const { htmlContent, filePath } = req.body;

    if (!htmlContent || !filePath) {
        return res.status(400).json({ success: false, message: 'htmlContent and filePath are required' });
    }

    const userMd = getUserMdDir(req.user.username);
    const absolutePath = path.resolve(path.join(userMd, filePath));

    if (!absolutePath.startsWith(userMd)) {
        return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    try {
        const markdownText = htmlToMarkdown(htmlContent);
        await fs.ensureDir(path.dirname(absolutePath));
        await fs.writeFile(absolutePath, markdownText, 'utf8');
        
        // Log content update event to recent activity stream
        const nowIso = new Date().toISOString();
        logActivity(req.user.username, {
            fileId: filePath.replace(/\\/g, '/'),
            eventType: 'update_file',
            timestamp: nowIso,
            metadata: {}
        }).catch(err => console.error('Failed to log update activity:', err));

        res.status(200).json({ success: true, message: 'File updated and saved as Markdown.' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to update file', error: error.message });
    }
});

// POST: Delete a markdown file (and its metadata)
app.post('/api/delete', authenticate, async (req, res) => {
    try {
        const { path: relativePath } = req.body;

        if (!relativePath) {
            return res.status(400).json({ success: false, message: 'File path is required.' });
        }

        const userMd = getUserMdDir(req.user.username);
        const absolutePath = path.resolve(path.join(userMd, relativePath));

        if (!absolutePath.startsWith(userMd)) {
            return res.status(403).json({ success: false, message: 'Invalid file path.' });
        }

        try {
            const stat = await fs.promises.stat(absolutePath);
            if (stat.isDirectory()) {
                return res.status(400).json({ success: false, message: 'Cannot delete directories via this endpoint.' });
            }
        } catch (err) {
            return res.status(404).json({ success: false, message: 'File not found.' });
        }

        // 1. Delete Markdown file
        await fs.promises.unlink(absolutePath);

        // 2. Delete metadata file if exists
        const metaPath = `${absolutePath}.meta.json`;
        try {
            await fs.promises.access(metaPath);
            await fs.promises.unlink(metaPath);
        } catch (err) {
            // Ignore if metadata doesn't exist
        }

        res.json({ success: true, message: 'File deleted successfully.' });
    } catch (error) {
        console.error('Delete error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// POST: Move a markdown file (and its metadata)
app.post('/api/move', authenticate, async (req, res) => {
    try {
        const { source, destination } = req.body;

        if (!source || destination === undefined) {
            return res.status(400).json({ success: false, message: 'Source and destination are required.' });
        }

        const userMd = getUserMdDir(req.user.username);
        const absoluteSource = path.resolve(path.join(userMd, source));
        const fileName = path.basename(absoluteSource);

        const destRelative = destination === '/' ? '' : destination;
        const absoluteDestDir = path.resolve(path.join(userMd, destRelative));
        const absoluteDestFile = path.join(absoluteDestDir, fileName);

        if (!absoluteSource.startsWith(userMd) || !absoluteDestDir.startsWith(userMd)) {
            return res.status(403).json({ success: false, message: 'Invalid paths.' });
        }

        if (!fs.existsSync(absoluteSource)) {
            return res.status(404).json({ success: false, message: 'Source file does not exist.' });
        }

        if (absoluteSource === absoluteDestFile) {
            return res.status(400).json({ success: false, message: 'Source and destination are the same.' });
        }

        if (fs.existsSync(absoluteDestFile)) {
            return res.status(409).json({
                success: false,
                message: `A file named "${fileName}" already exists in the destination folder. Cannot move.`
            });
        }

        await fs.promises.mkdir(absoluteDestDir, { recursive: true });
        await fs.promises.rename(absoluteSource, absoluteDestFile);

        const metaSourcePath = `${absoluteSource}.meta.json`;
        const metaDestPath = `${absoluteDestFile}.meta.json`;
        try {
            await fs.promises.access(metaSourcePath);
            await fs.promises.rename(metaSourcePath, metaDestPath);
        } catch (err) {
            // Ignore if metadata doesn't exist
        }

        res.json({ success: true, message: 'File moved successfully.' });
    } catch (error) {
        console.error('Move error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// GET /api/file-tree -> Provide file tree JSON for the user
app.get('/api/file-tree', authenticate, (req, res) => {
    const userMd = getUserMdDir(req.user.username);
    const fileTree = getDirectoryTree(userMd);
    res.json({ success: true, tree: fileTree });
});

// POST /api/md/meta -> Update Metadata (Checkboxes, Counters, Title, Section Chat)
app.post('/api/md/meta', authenticate, async (req, res) => {
    try {
        const { filePath } = req.body;
        const userMd = getUserMdDir(req.user.username);
        const absolutePath = path.resolve(path.join(userMd, filePath));

        if (!absolutePath.startsWith(userMd)) {
            return res.status(403).json({ success: false, message: 'Forbidden' });
        }

        const metaPath = `${absolutePath}.meta.json`;
        const nowIso = new Date().toISOString();
        const { meta, eventType } = await updateSectionMetadata(metaPath, req.body, nowIso);

        if (eventType) {
            logActivity(req.user.username, {
                fileId: filePath,
                sectionId: req.body.sectionId,
                eventType,
                timestamp: nowIso,
                metadata: { done: req.body.done, count: req.body.count }
            }).catch(err => console.error('Failed to log section activity:', err));

            enqueueRecalculation(req.user.username);
        }

        res.json({ success: true, meta });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// ---------------------------------------------------------
// SPACED-REPETITION RECOMMENDATIONS & ACTIVITY ROUTES
// ---------------------------------------------------------

// GET /api/recommendations/revision -> Get top 10 revision recommendations for authenticated user
app.get('/api/recommendations/revision', authenticate, async (req, res) => {
    try {
        const result = await getRecommendations(req.user.username);
        res.json({
            recommendations: result.recommendations || [],
            generatedAt: result.generatedAt || new Date().toISOString()
        });
    } catch (error) {
        console.error('Error fetching recommendations:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// GET /api/activity/recent -> Get recent activity stream for authenticated user
app.get('/api/activity/recent', authenticate, async (req, res) => {
    try {
        const limit = parseInt(req.query.limit, 10) || 50;
        const activities = await getRecentActivities(req.user.username, limit);
        res.json({
            success: true,
            activities
        });
    } catch (error) {
        console.error('Error fetching recent activities:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// POST /api/recommendations/check -> Record a revision check / increment check counter for spaced repetition
app.post('/api/recommendations/check', authenticate, async (req, res) => {
    try {
        const { fileId, sectionId } = req.body;
        if (!fileId) {
            return res.status(400).json({ success: false, message: 'fileId is required' });
        }

        const userMd = getUserMdDir(req.user.username);
        const absolutePath = path.resolve(path.join(userMd, fileId));

        if (!absolutePath.startsWith(userMd)) {
            return res.status(403).json({ success: false, message: 'Forbidden' });
        }

        if (!fs.existsSync(absolutePath)) {
            return res.status(404).json({ success: false, message: 'File not found' });
        }

        const metaPath = `${absolutePath}.meta.json`;
        const nowIso = new Date().toISOString();
        const { meta, targetSectionId, checkCounter } = await recordRevisionCheck(metaPath, sectionId, nowIso);

        // Log revision check event
        await logActivity(req.user.username, {
            fileId,
            sectionId: targetSectionId,
            eventType: 'revision_check',
            timestamp: nowIso,
            metadata: {
                checkCounter,
                title: meta._pageMeta?.title
            }
        });

        // Trigger asynchronous recalculation
        enqueueRecalculation(req.user.username);

        res.json({
            success: true,
            message: 'Revision check recorded successfully',
            checkCounter,
            lastTrackedAt: nowIso
        });
    } catch (error) {
        console.error('Error recording revision check:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// POST /api/upload-drawing -> Upload drawing image (user-scoped)
app.post('/api/upload-drawing', authenticate, async (req, res) => {
    try {
        const { imageBase64 } = req.body;
        if (!imageBase64) return res.status(400).json({ success: false, message: 'No image data' });

        const base64Data = imageBase64.replace(/^data:image\/png;base64,/, "");
        const userImagesDir = getUserImagesDir(req.user.username);

        const fileName = `draw-${Date.now()}.png`;
        const filePath = path.join(userImagesDir, fileName);
        await fs.promises.writeFile(filePath, base64Data, 'base64');

        res.json({ success: true, url: `/images/${req.user.username}/${fileName}`, fileName });
    } catch (error) {
        console.error('Image upload error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// POST /api/delete-images -> Delete unneeded user-scoped images (e.g. unsaved drawings/pastes)
app.post('/api/delete-images', authenticate, async (req, res) => {
    try {
        const { fileNames, urls } = req.body;
        const targetFiles = extractImageFileNames(fileNames, urls);
        const userImagesDir = getUserImagesDir(req.user.username);
        const deleted = [];

        for (const fileName of targetFiles) {
            const safeName = path.basename(fileName);
            const fullPath = path.resolve(path.join(userImagesDir, safeName));
            if (!fullPath.startsWith(userImagesDir)) continue;

            try {
                await fs.promises.unlink(fullPath);
                deleted.push(safeName);
            } catch (err) {
                // Ignore if file does not exist
            }
        }

        res.json({ success: true, deleted });
    } catch (error) {
        console.error('Delete images error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// POST /api/ai/generate -> Extensible AI generation endpoint (Gemini, Claude, OpenAI, Groq)
app.post('/api/ai/generate', authenticate, async (req, res) => {
    try {
        const { model, prompt, context, mode = 'update', maxWords = 100 } = req.body;

        if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
            return res.status(400).json({ success: false, message: 'Prompt is required' });
        }

        const responsePayload = await generateAiContent({ model, prompt, context, mode, maxWords });
        return res.json(responsePayload);
    } catch (error) {
        console.error('[AI] Generation failed:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'AI generation failed',
            mockContent: MOCK_LOREM_IPSUM
        });
    }
});

// Start Server when executed directly
if (require.main === module) {
    app.listen(port, () => {
        console.log(`Backend API running on http://localhost:${port}`);
    });
}

module.exports = {
    app,
    JWT_SECRET,
    USERS_FILE,
    getUserMdDir,
    getUserImagesDir,
    unescapeMath
};
