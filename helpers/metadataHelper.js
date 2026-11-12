const fs = require('fs-extra');
const { readJsonSafelyAsync, writeJsonAtomic } = require('../services/jsonAtomic');

/**
 * Updates lastViewedAt for a markdown file, throttled to once every 15s.
 */
async function recordFileView(metaPath, metaData, pageTitle, nowIso = new Date().toISOString()) {
    if (!metaData._pageMeta) metaData._pageMeta = {};

    const lastViewedMs = metaData._pageMeta.lastViewedAt ? new Date(metaData._pageMeta.lastViewedAt).getTime() : 0;
    const shouldWriteMeta = !metaData._pageMeta.lastViewedAt || (Date.now() - lastViewedMs > 15000) || !metaData._pageMeta.title;

    metaData._pageMeta.lastViewedAt = nowIso;
    if (!metaData._pageMeta.title) metaData._pageMeta.title = pageTitle;

    if (shouldWriteMeta) {
        try {
            const existing = await readJsonSafelyAsync(metaPath, null);
            if (existing === null && fs.existsSync(metaPath)) {
                // Skip to protect existing data on disk
            } else {
                const toPersist = existing || metaData;
                if (!toPersist._pageMeta) toPersist._pageMeta = {};
                toPersist._pageMeta.lastViewedAt = nowIso;
                if (!toPersist._pageMeta.title) {
                    toPersist._pageMeta.title = (metaData._pageMeta && metaData._pageMeta.title) || pageTitle;
                }
                if (existing?._pageMeta?.lastTrackedAt && !toPersist._pageMeta.lastTrackedAt) {
                    toPersist._pageMeta.lastTrackedAt = existing._pageMeta.lastTrackedAt;
                }
                if (existing?._pageMeta?.checkCounter !== undefined && toPersist._pageMeta.checkCounter === undefined) {
                    toPersist._pageMeta.checkCounter = existing._pageMeta.checkCounter;
                }
                await writeJsonAtomic(metaPath, toPersist);
            }
        } catch (err) {
            console.error(`Failed to update lastViewedAt for ${metaPath}:`, err);
        }
    }
}

/**
 * Updates metadata for a section and saves atomically.
 */
async function updateSectionMetadata(metaPath, { sectionId, done, count, chat, chatHistory, messages, pageTitle }, nowIso = new Date().toISOString()) {
    let meta = await readJsonSafelyAsync(metaPath, {});

    if (pageTitle !== undefined) {
        if (!meta._pageMeta) meta._pageMeta = {};
        meta._pageMeta.title = pageTitle;
    }

    let eventType = null;

    if (sectionId) {
        if (!meta[sectionId]) meta[sectionId] = { done: false, count: 0 };
        if (done !== undefined) {
            meta[sectionId].done = done;
            eventType = done ? 'track_section' : 'untrack_section';
        }
        if (count !== undefined) {
            meta[sectionId].count = count;
            if (!eventType) eventType = 'increment_counter';
        }
        const incomingChat = chat !== undefined ? chat : (chatHistory !== undefined ? chatHistory : messages);
        if (incomingChat !== undefined) {
            meta[sectionId].chat = incomingChat;
        }
        meta[sectionId].lastTrackedAt = nowIso;

        if (!meta._pageMeta) meta._pageMeta = {};
        meta._pageMeta.lastTrackedAt = nowIso;
    }

    await writeJsonAtomic(metaPath, meta);

    return { meta, eventType };
}

/**
 * Records a revision check, incrementing check counter and section counts.
 */
async function recordRevisionCheck(metaPath, sectionId, nowIso = new Date().toISOString()) {
    let meta = await readJsonSafelyAsync(metaPath, {});

    if (!meta._pageMeta) meta._pageMeta = {};
    meta._pageMeta.checkCounter = (meta._pageMeta.checkCounter || 0) + 1;
    meta._pageMeta.lastTrackedAt = nowIso;

    let targetSectionId = sectionId || null;
    if (targetSectionId && meta[targetSectionId]) {
        meta[targetSectionId].count = (meta[targetSectionId].count || 0) + 1;
        meta[targetSectionId].lastTrackedAt = nowIso;
    } else {
        // If sectionId not specified, update count and lastTrackedAt on all tracked sections
        for (const key of Object.keys(meta)) {
            if (key !== '_pageMeta' && meta[key] && meta[key].done) {
                meta[key].count = (meta[key].count || 0) + 1;
                meta[key].lastTrackedAt = nowIso;
                if (!targetSectionId) targetSectionId = key;
            }
        }
    }

    await writeJsonAtomic(metaPath, meta);

    return {
        meta,
        targetSectionId,
        checkCounter: meta._pageMeta.checkCounter
    };
}

module.exports = {
    recordFileView,
    updateSectionMetadata,
    recordRevisionCheck
};
