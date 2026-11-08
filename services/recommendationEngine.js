const path = require('path');
const fs = require('fs-extra');
const MarkdownIt = require('markdown-it');
const cheerio = require('cheerio');
const { getActivityEventsFile } = require('./activityService');
const { readJsonSafelyAsync } = require('./jsonAtomic');

const md = new MarkdownIt({ html: true });

function generateId(text) {
    const alphabeticChars = text.match(/[A-Za-z]/g) || [];
    const firstFour = alphabeticChars.slice(0, 4).join('');
    const lastFour = alphabeticChars.slice(-4).join('');
    return (firstFour + lastFour + text.length).toLowerCase();
}

function parseSections(rawMarkdown) {
    const fullHtml = md.render(rawMarkdown || '');
    const $ = cheerio.load(fullHtml);
    const sections = [];
    let currentSectionHtml = '';

    $('body').contents().each((i, el) => {
        const isHr = el.tagName === 'hr' || el.name === 'hr' || (el.type === 'tag' && el.name === 'hr');
        if (isHr) {
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

    return sections;
}

function getUserMdDir(username) {
    if (!username) throw new Error('Username required');
    const safeUser = username.replace(/[^a-zA-Z0-9_-]/g, '').toLowerCase();
    const userDir = path.join(__dirname, '..', 'user_data', safeUser, 'md');
    fs.ensureDirSync(userDir);
    return userDir;
}

function getRecommendationsFile(username) {
    const safeUser = username.replace(/[^a-zA-Z0-9_-]/g, '').toLowerCase();
    return path.join(__dirname, '..', 'user_data', safeUser, 'recommendations.json');
}

/**
 * Recursively find all .md files in directory.
 */
async function findMarkdownFiles(dir, basePath = '') {
    const results = [];
    if (!(await fs.pathExists(dir))) return results;

    const items = await fs.readdir(dir);
    for (const item of items) {
        if (item.startsWith('.')) continue;
        const fullPath = path.join(dir, item);
        const relPath = basePath ? `${basePath}/${item}` : item;
        try {
            const stat = await fs.stat(fullPath);
            if (stat.isDirectory()) {
                const nested = await findMarkdownFiles(fullPath, relPath);
                results.push(...nested);
            } else if (item.endsWith('.md')) {
                results.push({
                    absolutePath: fullPath,
                    relativePath: relPath.replace(/\\/g, '/')
                });
            }
        } catch (e) {
            // Skip files/directories that were moved or deleted during scan
            continue;
        }
    }
    return results;
}

/**
 * Recommendation scoring function based on:
 * 1. Document Completion Rate (trackedSections / totalSections * 100)
 * 2. Recency of Meta Checks (how long since sections or meta were last checked)
 * 
 * Documents with high completion that haven't been checked recently receive
 * an urgency boost to prompt spaced revision.
 */
function calculateRecommendationScore(factors = {}) {
    const {
        coveragePercentage = 0,
        daysSinceLastCheck = 0,
        checkCounter = 0
    } = factors;

    // Base score is completion percentage (0 - 100)
    const coverage = Math.max(0, Math.min(100, coveragePercentage));

    // Recency bonus: files checked longer ago (up to 14 days) get an urgency boost
    // e.g. 1 day ago = +2.5, 4 days ago = +10, 10+ days ago = +25
    const recencyBonus = Math.min(25, Math.max(0, daysSinceLastCheck * 2.5));

    const score = Math.round((coverage + recencyBonus) * 100) / 100;

    return {
        score,
        details: {
            coveragePercentage: coverage,
            daysSinceLastCheck: Math.round(daysSinceLastCheck * 10) / 10,
            recencyBonus: Math.round(recencyBonus * 10) / 10,
            checkCounter
        }
    };
}

/**
 * Collect all Markdown file stats for a user.
 */
async function collectUserFileStats(username, options = {}) {
    const userMdDir = getUserMdDir(username);
    const mdFiles = await findMarkdownFiles(userMdDir);
    const nowTime = options.currentTime ? new Date(options.currentTime).getTime() : Date.now();

    // Read activity events to complement timestamps if needed
    let activityEvents = [];
    const eventsFile = getActivityEventsFile(username);
    if (await fs.pathExists(eventsFile)) {
        try {
            activityEvents = await fs.readJson(eventsFile);
            if (!Array.isArray(activityEvents)) activityEvents = [];
        } catch (e) {
            activityEvents = [];
        }
    }

    const fileStats = [];

    for (const file of mdFiles) {
        try {
            const content = await fs.readFile(file.absolutePath, 'utf8');
            const sections = parseSections(content);
            const totalSections = sections.length;

            const metaPath = `${file.absolutePath}.meta.json`;
            const meta = await readJsonSafelyAsync(metaPath, {});

            // Derive title
            let title = file.relativePath.replace(/\.md$/, '').split('/').pop()
                .split('-')
                .map(w => w.charAt(0).toUpperCase() + w.slice(1))
                .join(' ');
            if (meta._pageMeta && meta._pageMeta.title) {
                title = meta._pageMeta.title;
            }

            // Calculate tracked sections & latest timestamps
            let trackedSections = 0;
            let latestSectionTrackedTime = 0;

            for (const sec of sections) {
                const secMeta = meta[sec.id] || {};
                const isDone = secMeta.done === true;
                if (isDone) {
                    trackedSections++;
                    if (secMeta.lastTrackedAt) {
                        const t = new Date(secMeta.lastTrackedAt).getTime();
                        if (t > latestSectionTrackedTime) latestSectionTrackedTime = t;
                    }
                }
            }

            // Also check page-level lastTrackedAt
            if (meta._pageMeta && meta._pageMeta.lastTrackedAt) {
                const t = new Date(meta._pageMeta.lastTrackedAt).getTime();
                if (t > latestSectionTrackedTime) latestSectionTrackedTime = t;
            }

            // Fallback to activity events for tracking timestamp
            if (!latestSectionTrackedTime) {
                const trackingEvt = activityEvents.find(e => 
                    e.fileId === file.relativePath && 
                    (e.eventType === 'track_section' || e.eventType === 'increment_counter' || e.eventType === 'revision_check')
                );
                if (trackingEvt && trackingEvt.timestamp) {
                    latestSectionTrackedTime = new Date(trackingEvt.timestamp).getTime();
                }
            }

            // Derive lastViewedAt
            let lastViewedTime = null;
            if (meta._pageMeta && meta._pageMeta.lastViewedAt) {
                lastViewedTime = new Date(meta._pageMeta.lastViewedAt).getTime();
            }

            if (!lastViewedTime) {
                const viewEvt = activityEvents.find(e => 
                    e.fileId === file.relativePath && (e.eventType === 'view_file' || e.eventType === 'create_file')
                );
                if (viewEvt && viewEvt.timestamp) {
                    lastViewedTime = new Date(viewEvt.timestamp).getTime();
                }
            }

            // If file was tracked but lastViewedTime was never set, tracking implies it was viewed
            if (!lastViewedTime && latestSectionTrackedTime) {
                lastViewedTime = latestSectionTrackedTime;
            }

            const coveragePercentage = totalSections > 0 ? (trackedSections / totalSections) * 100 : 0;
            const checkCounter = (meta._pageMeta && meta._pageMeta.checkCounter) ? meta._pageMeta.checkCounter : 0;

            const refCheckTime = latestSectionTrackedTime || lastViewedTime || nowTime;
            const daysSinceLastCheck = Math.max(0, (nowTime - refCheckTime) / (24 * 60 * 60 * 1000));

            const scoreResult = calculateRecommendationScore({
                coveragePercentage,
                daysSinceLastCheck,
                checkCounter
            });

            fileStats.push({
                fileId: file.relativePath,
                userId: username,
                title,
                totalSections,
                trackedSections,
                coveragePercentage: Math.round(coveragePercentage * 100) / 100,
                daysSinceLastCheck: Math.round(daysSinceLastCheck * 10) / 10,
                checkCounter,
                lastViewedAt: lastViewedTime ? new Date(lastViewedTime).toISOString() : null,
                lastTrackedAt: latestSectionTrackedTime ? new Date(latestSectionTrackedTime).toISOString() : null,
                lastViewedTime,
                latestSectionTrackedTime,
                recommendationScore: scoreResult.score,
                scoreBreakdown: scoreResult.details,
                isValid: true
            });
        } catch (err) {
            // Inaccessible/invalid file
            fileStats.push({
                fileId: file.relativePath,
                userId: username,
                isValid: false,
                error: err.message
            });
        }
    }

    return fileStats;
}

/**
 * Filter and rank recommendations for a user.
 * Rules:
 * - Only consider files viewed within the last 14 days.
 * - Exclude files with zero tracked sections.
 * - Exclude invalid or inaccessible files.
 * - Scores files by completion rate + recency of checks.
 * - Sort descending by recommendationScore, tie-break by most recent lastTrackedAt.
 * - Return top 10 files.
 */
function rankRecommendations(fileStats, options = {}) {
    const nowTime = options.currentTime ? new Date(options.currentTime).getTime() : Date.now();
    const FOURTEEN_DAYS_MS = 14 * 24 * 60 * 60 * 1000;

    // Filter eligible files
    const eligibleFiles = fileStats.filter(file => {
        if (!file.isValid) return false;
        if (!file.totalSections || file.totalSections <= 0) return false;
        if (!file.trackedSections || file.trackedSections <= 0) return false;
        if (!file.lastViewedTime) return false;

        const ageMs = nowTime - file.lastViewedTime;
        if (ageMs < 0) return true; // Clock skew
        return ageMs <= FOURTEEN_DAYS_MS;
    });

    // Score eligible files
    const scoredFiles = eligibleFiles.map(file => {
        const daysSinceLastCheck = file.latestSectionTrackedTime 
            ? Math.max(0, (nowTime - file.latestSectionTrackedTime) / (24 * 60 * 60 * 1000))
            : (file.daysSinceLastCheck || 0);

        const scoreResult = calculateRecommendationScore({
            coveragePercentage: file.coveragePercentage,
            daysSinceLastCheck,
            checkCounter: file.checkCounter || 0
        });

        return {
            ...file,
            recommendationScore: scoreResult.score,
            scoreBreakdown: scoreResult.details
        };
    });

    // Sort descending by recommendationScore, tie-break by most recent lastTrackedAt
    scoredFiles.sort((a, b) => {
        if (Math.abs(b.recommendationScore - a.recommendationScore) > 0.001) {
            return b.recommendationScore - a.recommendationScore;
        }
        if (b.coveragePercentage !== a.coveragePercentage) {
            return b.coveragePercentage - a.coveragePercentage;
        }
        const timeA = a.latestSectionTrackedTime || 0;
        const timeB = b.latestSectionTrackedTime || 0;
        return timeB - timeA;
    });

    // Top 10 recommendations
    const top10 = scoredFiles.slice(0, 10);
    const generatedAt = options.generatedAt || new Date().toISOString();

    const ranked = top10.map((file, index) => ({
        fileId: file.fileId,
        title: file.title,
        coveragePercentage: file.coveragePercentage,
        checkCounter: file.checkCounter || 0,
        lastTrackedAt: file.lastTrackedAt,
        lastViewedAt: file.lastViewedAt,
        recommendationScore: file.recommendationScore,
        scoreBreakdown: file.scoreBreakdown,
        generatedAt,
        rank: index + 1
    }));

    return {
        recommendations: ranked,
        generatedAt
    };
}

/**
 * Generate and persist recommendations for a user.
 */
async function generateAndPersistRecommendations(username, options = {}) {
    const safeUser = username.replace(/[^a-zA-Z0-9_-]/g, '').toLowerCase();
    const fileStats = await collectUserFileStats(safeUser, options);
    const result = rankRecommendations(fileStats, options);

    const storagePayload = {
        userId: safeUser,
        generatedAt: result.generatedAt,
        recommendations: result.recommendations
    };

    const filePath = getRecommendationsFile(safeUser);
    await fs.writeJson(filePath, storagePayload, { spaces: 2 });
    return result;
}

/**
 * Load persisted recommendations or generate if missing.
 */
async function getRecommendations(username, options = {}) {
    const safeUser = username.replace(/[^a-zA-Z0-9_-]/g, '').toLowerCase();
    const filePath = getRecommendationsFile(safeUser);

    if (await fs.pathExists(filePath)) {
        try {
            const data = await fs.readJson(filePath);
            if (data && Array.isArray(data.recommendations)) {
                return {
                    recommendations: data.recommendations,
                    generatedAt: data.generatedAt || new Date().toISOString()
                };
            }
        } catch (e) {
            // Corrupt file, fall through to regenerate
        }
    }

    // Fallback: Generate now
    return await generateAndPersistRecommendations(safeUser, options);
}

module.exports = {
    generateId,
    parseSections,
    findMarkdownFiles,
    collectUserFileStats,
    calculateRecommendationScore,
    rankRecommendations,
    generateAndPersistRecommendations,
    getRecommendations,
    getRecommendationsFile,
    getUserMdDir
};
