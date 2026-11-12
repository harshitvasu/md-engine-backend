const path = require('path');
const fs = require('fs-extra');
const { readJsonSafelySync } = require('../services/jsonAtomic');

function getUserMdDir(username) {
    if (!username) throw new Error('Username required');
    const safeUser = username.replace(/[^a-zA-Z0-9_-]/g, '').toLowerCase();
    const userDir = path.join(__dirname, '..', 'user_data', safeUser, 'md');
    fs.ensureDirSync(userDir);
    return userDir;
}

function getUserImagesDir(username) {
    if (!username) throw new Error('Username required');
    const safeUser = username.replace(/[^a-zA-Z0-9_-]/g, '').toLowerCase();
    const userImagesDir = path.join(__dirname, '..', 'user_data', safeUser, 'images');
    fs.ensureDirSync(userImagesDir);
    return userImagesDir;
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
            // Resilient synchronous read that never throws on 0-byte or concurrently updated meta files
            const metaData = readJsonSafelySync(metaPath, {});
            if (metaData._pageMeta && metaData._pageMeta.title) {
                fileTitle = metaData._pageMeta.title;
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

function extractImageFileNames(fileNames, urls) {
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

    return Array.from(targetFiles);
}

module.exports = {
    getUserMdDir,
    getUserImagesDir,
    getDirectoryTree,
    getDirectories,
    extractImageFileNames
};
