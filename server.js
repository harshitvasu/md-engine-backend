const express = require('express');
const path = require('path');
const fs = require('fs-extra');
const cors = require('cors');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const MarkdownIt = require('markdown-it');
const cheerio = require('cheerio');
const TurndownService = require('turndown');
const { gfm } = require('turndown-plugin-gfm');
const turndownPluginGfm = require('turndown-plugin-gfm');

const app = express();
const port = 4444;
const JWT_SECRET = process.env.JWT_SECRET || 'md-engine-secure-jwt-secret-key-2026';
const USERS_FILE = path.join(__dirname, 'data', 'users.json');

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

// Markdown & Turndown Config
const md = new MarkdownIt({ html: true });
const turndownService = new TurndownService({ bulletListMarker: '-', headingStyle: 'atx' });
const tables = turndownPluginGfm.tables;
turndownService.use(tables);
turndownService.keep(['div']);
turndownService.use(gfm);

turndownService.addRule('customHeading', {
    filter: ['h1', 'h2'],
    replacement: (content, node) => {
        const level = node.tagName === 'H1' ? 1 : 2;
        return '#'.repeat(level) + ' ' + content + '\n\n';
    }
});

turndownService.addRule('customHr', {
    filter: 'hr',
    replacement: () => '\n---\n'
});

// ---------------------------------------------------------
// AUTHENTICATION & DIRECTORY HELPERS
// ---------------------------------------------------------

function loadUsers() {
    try {
        if (!fs.existsSync(USERS_FILE)) {
            fs.ensureDirSync(path.dirname(USERS_FILE));
            fs.writeJsonSync(USERS_FILE, {});
        }
        return fs.readJsonSync(USERS_FILE);
    } catch (e) {
        console.error('Error loading users:', e);
        return {};
    }
}

function saveUsers(users) {
    fs.ensureDirSync(path.dirname(USERS_FILE));
    fs.writeJsonSync(USERS_FILE, users, { spaces: 2 });
}

function getUserMdDir(username) {
    if (!username) throw new Error('Username required');
    const safeUser = username.replace(/[^a-zA-Z0-9_-]/g, '').toLowerCase();
    const userDir = path.join(__dirname, 'user_data', safeUser, 'md');
    fs.ensureDirSync(userDir);
    return userDir;
}

function getUserImagesDir(username) {
    if (!username) throw new Error('Username required');
    const safeUser = username.replace(/[^a-zA-Z0-9_-]/g, '').toLowerCase();
    const userImagesDir = path.join(__dirname, 'user_data', safeUser, 'images');
    fs.ensureDirSync(userImagesDir);
    return userImagesDir;
}

function authenticate(req, res, next) {
    // 1. Check httpOnly cookie
    let token = req.cookies?.token;
    
    // 2. Fallback to Authorization header
    if (!token && req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
        token = req.headers.authorization.slice(7).trim();
    }

    if (!token) {
        return res.status(401).json({ success: false, message: 'Authentication required. Please log in.' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(401).json({ success: false, message: 'Invalid or expired session. Please log in.' });
    }
}

// Helpers
function generateId(text) {
    const alphabeticChars = text.match(/[A-Za-z]/g) || [];
    const firstFour = alphabeticChars.slice(0, 4).join('');
    const lastFour = alphabeticChars.slice(-4).join('');
    return (firstFour + lastFour + text.length).toLowerCase();
}

function bundleContentForReact(htmlString) {
    const $ = cheerio.load(htmlString, null, false);
    const sections = [];
    let $currentBox = $('<div class="read-content"></div>');

    $.root().contents().each((index, element) => {
        if (element.type === 'tag' && element.name === 'hr') {
            if ($currentBox.contents().length > 0) {
                const boxText = $currentBox.text().trim();
                const boxId = generateId(boxText);
                $currentBox.attr('id', boxId);
                sections.push({ id: boxId, html: $.html($currentBox) });
            }
            $currentBox = $('<div class="read-content"></div>');
        } else {
            $currentBox.append(element);
        }
    });

    if ($currentBox.contents().length > 0) {
        const boxText = $currentBox.text().trim();
        const boxId = generateId(boxText);
        $currentBox.attr('id', boxId);
        sections.push({ id: boxId, html: $.html($currentBox) });
    }
    
    return sections;
}

function getDirectoryTree(dir, basePath = '') {
    const result = [];
    if (!fs.existsSync(dir)) return result;
    const items = fs.readdirSync(dir);
    
    items.forEach(item => {
        const fullPath = path.join(dir, item);
        const relativePath = basePath ? `${basePath}/${item}` : item;
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
            result.push({
                name: item,
                type: 'directory',
                path: relativePath,
                children: getDirectoryTree(fullPath, relativePath)
            });
        } else if (item.endsWith('.md')) { // Explicitly ignore .meta.json files
            let fileTitle = item.replace('.md', '')
                .split('-')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ');
            
            const metaPath = `${fullPath}.meta.json`;
            if (fs.existsSync(metaPath)) {
                try {
                    const metaData = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
                    if (metaData._pageMeta && metaData._pageMeta.title) {
                        fileTitle = metaData._pageMeta.title;
                    }
                } catch (e) {
                    console.error(`Error reading meta for ${item}:`, e);
                }
            }

            result.push({ 
                name: item,
                title: fileTitle,
                type: 'file', 
                path: relativePath 
            });
        }
    });
    
    return result;
}

function getDirectories(dir, basePath = '') {
    let dirs = [];
    if (!fs.existsSync(dir)) return dirs;
    const items = fs.readdirSync(dir);
    
    items.forEach(item => {
        const fullPath = path.join(dir, item);
        const relativePath = basePath ? `${basePath}/${item}` : item;
        if (fs.statSync(fullPath).isDirectory()) {
            dirs.push(relativePath);
            dirs = dirs.concat(getDirectories(fullPath, relativePath));
        }
    });
    return dirs;
}

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

        const passwordHash = await bcrypt.hash(password, 10);
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

        const token = jwt.sign({ username: trimmedUser }, JWT_SECRET, { expiresIn: '7d' });
        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000
        });

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

        if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
            return res.status(401).json({ success: false, message: 'Invalid username or password.' });
        }

        getUserMdDir(trimmedUser);

        const token = jwt.sign({ username: trimmedUser }, JWT_SECRET, { expiresIn: '7d' });
        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000
        });

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
    res.clearCookie('token', {
        httpOnly: true,
        sameSite: 'lax'
    });
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

        const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Current password is incorrect.' });
        }

        user.passwordHash = await bcrypt.hash(newPassword, 10);
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
        const fullHtml = md.render(rawMarkdown);
        const $ = cheerio.load(fullHtml);
        
        const sections = [];
        let currentSectionHtml = '';
        
        // Split by <hr> tags
        $('body').contents().each((i, el) => {
            if (el.tagName === 'hr') {
                if (currentSectionHtml.trim()) {
                    const textContent = cheerio.load(currentSectionHtml).text();
                    sections.push({ id: generateId(textContent), html: currentSectionHtml });
                    currentSectionHtml = '';
                }
            } else {
                currentSectionHtml += $.html(el);
            }
        });
        
        if (currentSectionHtml.trim()) {
            const textContent = cheerio.load(currentSectionHtml).text();
            sections.push({ id: generateId(textContent), html: currentSectionHtml });
        }

        // Fetch Metadata
        const metaPath = `${absolutePath}.meta.json`;
        let metaData = {};
        let pageTitle = path.basename(absolutePath).replace(/\.md$/, ''); 

        if (fs.existsSync(metaPath)) {
            try {
                metaData = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
                if (metaData._pageMeta?.title) pageTitle = metaData._pageMeta.title;
            } catch (e) {
                console.error(`Error reading meta for ${absolutePath}:`, e);
            }
        }

        // Stitch metadata into sections
        const sectionsWithMeta = sections.map(sec => ({
            ...sec,
            done: metaData[sec.id]?.done || false,
            count: metaData[sec.id]?.count || 0
        }));

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
        let markdownText = turndownService.turndown(htmlContent);
        await fs.ensureDir(path.dirname(absolutePath));
        await fs.writeFile(absolutePath, markdownText, 'utf8');
        
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

// POST /api/md/meta -> Update Metadata (Checkboxes, Counters, Title)
app.post('/api/md/meta', authenticate, async (req, res) => {
    try {
        const { filePath, sectionId, done, count, pageTitle } = req.body;
        const userMd = getUserMdDir(req.user.username);
        const absolutePath = path.resolve(path.join(userMd, filePath));

        if (!absolutePath.startsWith(userMd)) {
            return res.status(403).json({ success: false, message: 'Forbidden' });
        }

        const metaPath = `${absolutePath}.meta.json`;

        let meta = {};
        if (fs.existsSync(metaPath)) {
            meta = JSON.parse(await fs.promises.readFile(metaPath, 'utf8'));
        }

        if (pageTitle !== undefined) {
            if (!meta._pageMeta) meta._pageMeta = {};
            meta._pageMeta.title = pageTitle;
        }

        if (sectionId) {
            if (!meta[sectionId]) meta[sectionId] = { done: false, count: 0 };
            if (done !== undefined) meta[sectionId].done = done;
            if (count !== undefined) meta[sectionId].count = count;
        }

        await fs.promises.writeFile(metaPath, JSON.stringify(meta, null, 2));
        res.json({ success: true, meta });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// POST /api/upload-drawing -> Upload drawing image (user-scoped)
app.post('/api/upload-drawing', authenticate, express.json({ limit: '10mb' }), async (req, res) => {
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
app.post('/api/delete-images', authenticate, express.json(), async (req, res) => {
    try {
        const { fileNames, urls } = req.body;
        const targetFiles = new Set();

        if (Array.isArray(fileNames)) {
            fileNames.forEach(f => {
                if (typeof f === 'string' && f.trim()) {
                    targetFiles.add(path.basename(f.trim()));
                }
            });
        }

        if (Array.isArray(urls)) {
            urls.forEach(u => {
                if (typeof u === 'string' && u.trim()) {
                    const clean = u.trim().split('?')[0].split('#')[0];
                    const parts = clean.split('/');
                    const fileName = parts[parts.length - 1];
                    if (fileName) targetFiles.add(path.basename(fileName));
                }
            });
        }

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

// Start Server
app.listen(port, () => {
    console.log(`Backend API running on http://localhost:${port}`);
});