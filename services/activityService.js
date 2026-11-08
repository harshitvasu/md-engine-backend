const path = require('path');
const fs = require('fs-extra');

function getUserDir(username) {
    if (!username) throw new Error('Username required');
    const safeUser = username.replace(/[^a-zA-Z0-9_-]/g, '').toLowerCase();
    const userDir = path.join(__dirname, '..', 'user_data', safeUser);
    fs.ensureDirSync(userDir);
    return userDir;
}

function getActivityEventsFile(username) {
    return path.join(getUserDir(username), 'activity_events.json');
}

/**
 * Log an activity event.
 * @param {string} userId - The username
 * @param {object} event - { fileId, sectionId, eventType, timestamp, metadata }
 */
async function logActivity(userId, { fileId, sectionId = null, eventType, timestamp = null, metadata = {} }) {
    if (!userId || !fileId || !eventType) {
        throw new Error('userId, fileId, and eventType are required for activity logging');
    }

    const safeUser = userId.replace(/[^a-zA-Z0-9_-]/g, '').toLowerCase();
    const filePath = getActivityEventsFile(safeUser);
    const eventTime = timestamp || new Date().toISOString();

    const newEvent = {
        id: `evt-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        userId: safeUser,
        fileId: fileId.replace(/\\/g, '/'),
        sectionId: sectionId || null,
        eventType,
        timestamp: eventTime,
        metadata: metadata || {}
    };

    let events = [];
    if (await fs.pathExists(filePath)) {
        try {
            events = await fs.readJson(filePath);
            if (!Array.isArray(events)) events = [];
        } catch (e) {
            events = [];
        }
    }

    // Avoid cluttering recent activity with immediate view_file after create_file or duplicate view_file within 60s
    if (events.length > 0 && events[0].fileId === newEvent.fileId) {
        const timeDiff = Math.abs(new Date(eventTime).getTime() - new Date(events[0].timestamp).getTime());
        if (eventType === 'view_file') {
            if (events[0].eventType === 'create_file' && timeDiff < 60000) {
                // Keep the create_file event prominent; do not log an immediate view
                return events[0];
            }
            if (events[0].eventType === 'view_file' && timeDiff < 60000) {
                // Update timestamp of latest view instead of adding duplicate entry
                events[0].timestamp = eventTime;
                await fs.writeJson(filePath, events, { spaces: 2 });
                return events[0];
            }
        }
    }

    // Prepend to have newest first, cap at 1000 events
    events.unshift(newEvent);
    if (events.length > 1000) {
        events = events.slice(0, 1000);
    }

    await fs.writeJson(filePath, events, { spaces: 2 });
    return newEvent;
}

/**
 * Retrieve recent activity events for a user.
 * @param {string} userId
 * @param {number} limit
 */
async function getRecentActivities(userId, limit = 50) {
    if (!userId) return [];
    const safeUser = userId.replace(/[^a-zA-Z0-9_-]/g, '').toLowerCase();
    const filePath = getActivityEventsFile(safeUser);

    if (!(await fs.pathExists(filePath))) {
        return [];
    }

    try {
        const events = await fs.readJson(filePath);
        if (!Array.isArray(events)) return [];
        return events.slice(0, limit);
    } catch (e) {
        return [];
    }
}

module.exports = {
    logActivity,
    getRecentActivities,
    getUserDir,
    getActivityEventsFile
};
