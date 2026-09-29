const express = require('express');
const path = require('path');
const fs = require('fs-extra');
const cors = require('cors');
const bodyParser = require('body-parser');
const MarkdownIt = require('markdown-it');
const cheerio = require('cheerio');
const TurndownService = require('turndown');
const { gfm } = require('turndown-plugin-gfm');
const turndownPluginGfm = require('turndown-plugin-gfm');

const app = express();
const port = 4444;

// EJS Configuration
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true }));

// This allows the frontend to load images via <img src="/images/..." />
app.use('/images', express.static(path.join(__dirname, 'images')));

// Markdown & Turndown Config
const md = new MarkdownIt({ html: true });
const turndownService = new TurndownService({ bulletListMarker: '-', headingStyle: 'atx' });
// 2. Tell Turndown to use the GFM tables plugin
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
    let $currentBox =$('<div class="read-content"></div>');

    $.root().contents().each((index, element) => {
        if (element.type === 'tag' && element.name === 'hr') {
            if ($currentBox.contents().length > 0) {
                const boxText = $currentBox.text().trim();
                const boxId = generateId(boxText);
                $currentBox.attr('id', boxId);
                sections.push({ id: boxId, html: $.html($currentBox) });
            }
            $currentBox =$('<div class="read-content"></div>');
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
        } else if (item.endsWith('.md')) {
            result.push({
                name: item,
                type: 'file',
                path: relativePath
            });
        }
    });
    
    return result;
}

// ---------------------------------------------------------
// ROUTES
// ---------------------------------------------------------

// 1. GET / -> Renders the EJS file tree of the md directory
app.get('/', (req, res) => {
    const mdPath = path.join(__dirname, 'md');
    let fileTree = [];
    
    if (fs.existsSync(mdPath)) {
        fileTree = getDirectoryTree(mdPath);
    }
    
    res.render('index', { tree: fileTree });
});


// Helper: Extract just the folder paths for the datalist dropdown
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

// GET: Send available project locations for the dropdown
app.get('/api/project-locations', (req, res) => {
    const mdPath = path.join(__dirname, 'md');
    res.json(getDirectories(mdPath));
});

// POST: Create a new page
app.post('/api/create-page', async (req, res) => {
    try {
        const { fileName, projectLocation } = req.body;

        if (!fileName || !projectLocation) {
            return res.status(400).json({ success: false, message: 'File name or project location is missing.' });
        }

        if (!/^[a-zA-Z0-9\-]+$/.test(fileName)) {
            return res.status(400).json({ success: false, message: 'Invalid file name. Use only letters, numbers, and "-".' });
        }

        // Creates path like /md/2026/my-project based on user input
        const fullDirPath = path.join(__dirname, 'md', projectLocation);
        
        // Native alternative to fs.ensureDir
        await fs.promises.mkdir(fullDirPath, { recursive: true });

        const filePath = path.join(fullDirPath, `${fileName}.md`);

        // Check if file exists
        try {
            await fs.promises.access(filePath);
            return res.status(400).json({ success: false, message: 'File already exists.' });
        } catch {
            // File does not exist, proceed to create
        }

        // Create the file with a default Markdown heading
        const defaultContent = `# ${fileName.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}\n\nStart typing here...`;
        await fs.promises.writeFile(filePath, defaultContent);

        // Calculate the relative path for React Router
        const relativeFilePath = path.join(projectLocation, `${fileName}.md`).replace(/\\/g, '/');
        
        // Respond with JSON instead of an Express redirect
        res.json({ success: true, filePath: relativeFilePath });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});



// 2. GET /md/* -> EJS preview fallback (Native RegExp bypasses path-to-regexp crash)
// GET /md/* -> React JSON API Endpoint

// 2. Fetch specific Markdown file with metadata
app.get(/^\/api\/md\/(.*)$/, async (req, res) => {
    try {
        const filepath = req.params[0] || '';
        const absolutePath = path.join(__dirname, 'md', filepath);
        
        if (!fs.existsSync(absolutePath)) {
            return res.status(404).json({ success: false, message: 'File not found' });
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
        let pageTitle = path.basename(absolutePath); 

        if (fs.existsSync(metaPath)) {
            metaData = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
            if (metaData._pageMeta?.title) pageTitle = metaData._pageMeta.title;
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


// 3. GET /api/md/* -> React JSON API Endpoint (Native RegExp bypasses path-to-regexp crash)
app.get(/^\/api\/md\/(.*)$/, async (req, res) => {
    const filepath = req.params[0] || '';
    const absolutePath = path.join(__dirname, 'md', filepath);
    
    try {
        const stat = await fs.stat(absolutePath);
        if (stat.isDirectory()) {
            return res.status(400).json({ success: false, message: 'Requested path is a directory.' });
        }

        const data = await fs.readFile(absolutePath, 'utf8');
        const rawHtmlContent = md.render(data);
        const bundledSections = bundleContentForReact(rawHtmlContent);
        
        res.json({
            success: true,
            title: path.basename(absolutePath),
            sections: bundledSections
        });
    } catch (err) {
        res.status(404).json({ success: false, message: 'File not found', error: err.message });
    }
});

// 4. POST /api/md/update -> Saves HTML edits as Markdown
app.post('/api/md/update', async (req, res) => {
    const { htmlContent, filePath } = req.body;

    if (!htmlContent || !filePath) {
        return res.status(400).json({ success: false, message: 'htmlContent and filePath are required' });
    }

    const absolutePath = path.resolve(path.join(__dirname, 'md', filePath));

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
app.post('/api/delete', async (req, res) => {
    try {
        const { path: relativePath } = req.body;

        if (!relativePath) {
            return res.status(400).json({ success: false, message: 'File path is required.' });
        }

        const mdDir = path.join(__dirname, 'md');
        const absolutePath = path.join(mdDir, relativePath);

        // Security check: Prevent directory traversal (e.g., passing "../../system-file")
        if (!absolutePath.startsWith(mdDir)) {
            return res.status(403).json({ success: false, message: 'Invalid file path.' });
        }

        // Check if the file exists
        try {
            const stat = await fs.promises.stat(absolutePath);
            if (stat.isDirectory()) {
                return res.status(400).json({ success: false, message: 'Cannot delete directories via this endpoint.' });
            }
        } catch (err) {
            return res.status(404).json({ success: false, message: 'File not found.' });
        }

        // 1. Delete the Markdown file
        await fs.promises.unlink(absolutePath);

        // 2. Delete the associated metadata file if it exists
        const metaPath = `${absolutePath}.meta.json`;
        try {
            await fs.promises.access(metaPath);
            await fs.promises.unlink(metaPath);
        } catch (err) {
            // Ignore if the meta file doesn't exist, that's fine
        }

        res.json({ success: true, message: 'File deleted successfully.' });
    } catch (error) {
        console.error('Delete error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// POST: Move a markdown file (and its metadata)
app.post('/api/move', async (req, res) => {
    try {
        const { source, destination } = req.body;

        if (!source || destination === undefined) {
            return res.status(400).json({ success: false, message: 'Source and destination are required.' });
        }

        const mdDir = path.join(__dirname, 'md');
        
        // Resolve absolute source path and extract the file name
        const absoluteSource = path.join(mdDir, source);
        const fileName = path.basename(absoluteSource);

        // Resolve absolute destination directory and target file path
        // (Handle root directory '/' explicitly to prevent trailing slash issues)
        const destRelative = destination === '/' ? '' : destination;
        const absoluteDestDir = path.join(mdDir, destRelative);
        const absoluteDestFile = path.join(absoluteDestDir, fileName);

        // Security check: Ensure both paths stay inside the /md directory
        if (!absoluteSource.startsWith(mdDir) || !absoluteDestDir.startsWith(mdDir)) {
            return res.status(403).json({ success: false, message: 'Invalid paths.' });
        }

        // Ensure the destination directory exists
        await fs.promises.mkdir(absoluteDestDir, { recursive: true });

        // 1. Move the Markdown file
        await fs.promises.rename(absoluteSource, absoluteDestFile);

        // 2. Try to move the associated metadata file if it exists
        const metaSourcePath = `${absoluteSource}.meta.json`;
        const metaDestPath = `${absoluteDestFile}.meta.json`;
        try {
            await fs.promises.access(metaSourcePath);
            await fs.promises.rename(metaSourcePath, metaDestPath);
        } catch (err) {
            // Ignore if the meta file doesn't exist
        }

        res.json({ success: true, message: 'File moved successfully.' });
    } catch (error) {
        console.error('Move error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Helper: Recursively scan directory and fetch metadata for titles
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
        } else if (item.endsWith('.md')) { // Explicitly ignores .meta.json files
            // 1. Create fallback title
            let fileTitle = item.replace('.md', '')
                .split('-')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ');
            
            // 2. Check for custom title in metadata
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
                name: item, // Keep raw name just in case
                title: fileTitle, // Send the calculated title
                type: 'file', 
                path: relativePath 
            });
        }
    });
    
    return result;
}
// Endpoint to provide the file tree JSON to React
app.get('/api/file-tree', (req, res) => {
    const mdPath = path.join(__dirname, 'md');
    const fileTree = getDirectoryTree(mdPath);
    res.json({ success: true, tree: fileTree });
});

// 4. Update Metadata (Checkboxes, Counters, Title)
app.post('/api/md/meta', async (req, res) => {
    try {
        const { filePath, sectionId, done, count, pageTitle } = req.body;
        const absolutePath = path.join(__dirname, 'md', filePath);
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


app.post('/api/upload-drawing', express.json({ limit: '10mb' }), async (req, res) => {
    try {
        const { imageBase64 } = req.body;
        if (!imageBase64) return res.status(400).json({ success: false, message: 'No image data' });

        // Strip the data:image/png;base64, prefix
        const base64Data = imageBase64.replace(/^data:image\/png;base64,/, "");
        
        // Ensure the images directory exists
        const imagesDir = path.join(__dirname, 'images');
        await fs.promises.mkdir(imagesDir, { recursive: true });

        // Save as a PNG file
        const fileName = `draw-${Date.now()}.png`;
        const filePath = path.join(imagesDir, fileName);
        await fs.promises.writeFile(filePath, base64Data, 'base64');

        // Return the public URL
        res.json({ success: true, url: `/images/${fileName}` });
    } catch (error) {
        console.error('Image upload error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Start Server
app.listen(port, () => {
    console.log(`Backend API running on http://localhost:${port}`);
});