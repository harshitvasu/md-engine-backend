const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
process.env.NODE_ENV = 'test';
const path = require('path');
const fs = require('fs-extra');

const {
    parseSections,
    isHeadingOnlySection,
    calculateRecommendationScore,
    rankRecommendations,
    collectUserFileStats,
    generateAndPersistRecommendations,
    getRecommendations
} = require('../services/recommendationEngine');

const { logActivity, getRecentActivities } = require('../services/activityService');
const { executeRecalculationNow, enqueueRecalculation, userJobStates } = require('../services/backgroundQueue');

const TEST_USER_1 = 'test_user_recap_1';
const TEST_USER_2 = 'test_user_recap_2';

const USER1_DIR = path.join(__dirname, '..', 'user_data', TEST_USER_1);
const USER2_DIR = path.join(__dirname, '..', 'user_data', TEST_USER_2);

describe('Spaced-Repetition Recommendation Engine', () => {

    before(async () => {
        await fs.remove(USER1_DIR);
        await fs.remove(USER2_DIR);
    });

    after(async () => {
        await fs.remove(USER1_DIR);
        await fs.remove(USER2_DIR);
    });

    // 1. Correct section coverage calculation
    it('1. calculates correct section coverage percentage', () => {
        const rawMarkdown = `# Section 1\nContent 1\n\n---\n\n# Section 2\nContent 2\n\n---\n\n# Section 3\nContent 3\n\n---\n\n# Section 4\nContent 4`;
        const sections = parseSections(rawMarkdown);
        assert.equal(sections.length, 4, 'Should parse 4 sections separated by <hr>');

        const totalSections = sections.length;
        const trackedSections = 3;
        const coveragePercentage = (trackedSections / totalSections) * 100;
        assert.equal(coveragePercentage, 75, 'Coverage should be 75% for 3/4 sections');

        const scoreObj = calculateRecommendationScore({ coveragePercentage });
        assert.equal(scoreObj.score, 75, 'Score should equal coveragePercentage in Phase 1');
    });

    // 2. Descending coverage-based ranking
    it('2. ranks files by coverage percentage in descending order', () => {
        const now = new Date('2026-11-08T12:00:00Z').getTime();

        const fileStats = [
            {
                fileId: 'file-c.md',
                title: 'File C',
                totalSections: 10,
                trackedSections: 6,
                coveragePercentage: 60,
                lastViewedTime: now - 1000,
                latestSectionTrackedTime: now - 2000,
                isValid: true
            },
            {
                fileId: 'file-a.md',
                title: 'File A',
                totalSections: 10,
                trackedSections: 8,
                coveragePercentage: 80,
                lastViewedTime: now - 1000,
                latestSectionTrackedTime: now - 4000,
                isValid: true
            },
            {
                fileId: 'file-d.md',
                title: 'File D',
                totalSections: 10,
                trackedSections: 5,
                coveragePercentage: 50,
                lastViewedTime: now - 1000,
                latestSectionTrackedTime: now - 5000,
                isValid: true
            },
            {
                fileId: 'file-b.md',
                title: 'File B',
                totalSections: 10,
                trackedSections: 7,
                coveragePercentage: 70,
                lastViewedTime: now - 1000,
                latestSectionTrackedTime: now - 3000,
                isValid: true
            }
        ];

        const { recommendations } = rankRecommendations(fileStats, { currentTime: now });

        assert.equal(recommendations.length, 4);
        assert.equal(recommendations[0].fileId, 'file-a.md');
        assert.equal(recommendations[0].rank, 1);
        assert.equal(recommendations[1].fileId, 'file-b.md');
        assert.equal(recommendations[1].rank, 2);
        assert.equal(recommendations[2].fileId, 'file-c.md');
        assert.equal(recommendations[2].rank, 3);
        assert.equal(recommendations[3].fileId, 'file-d.md');
        assert.equal(recommendations[3].rank, 4);
    });

    // 3. Recency-based tie-breaking
    it('3. uses most recent section-tracking timestamp as tie-breaker', () => {
        const now = new Date('2026-11-08T12:00:00Z').getTime();

        const fileStats = [
            {
                fileId: 'file-older.md',
                title: 'Older File',
                totalSections: 10,
                trackedSections: 8,
                coveragePercentage: 80,
                lastViewedTime: now - 1000,
                latestSectionTrackedTime: now - 60000, // 1 minute ago
                isValid: true
            },
            {
                fileId: 'file-newer.md',
                title: 'Newer File',
                totalSections: 10,
                trackedSections: 8,
                coveragePercentage: 80,
                lastViewedTime: now - 1000,
                latestSectionTrackedTime: now - 10000, // 10 seconds ago
                isValid: true
            }
        ];

        const { recommendations } = rankRecommendations(fileStats, { currentTime: now });

        assert.equal(recommendations[0].fileId, 'file-newer.md', 'Newer tracking time should rank first');
        assert.equal(recommendations[1].fileId, 'file-older.md');
    });

    // 4. Exclusion of files not viewed within 14 days
    it('4. excludes files not viewed within the last 14 days', () => {
        const now = new Date('2026-11-08T12:00:00Z').getTime();
        const FIFTEEN_DAYS_AGO = now - (15 * 24 * 60 * 60 * 1000);
        const TEN_DAYS_AGO = now - (10 * 24 * 60 * 60 * 1000);

        const fileStats = [
            {
                fileId: 'old-viewed.md',
                title: 'Old Viewed',
                totalSections: 10,
                trackedSections: 9,
                coveragePercentage: 90,
                lastViewedTime: FIFTEEN_DAYS_AGO,
                latestSectionTrackedTime: FIFTEEN_DAYS_AGO,
                isValid: true
            },
            {
                fileId: 'recently-viewed.md',
                title: 'Recently Viewed',
                totalSections: 10,
                trackedSections: 5,
                coveragePercentage: 50,
                lastViewedTime: TEN_DAYS_AGO,
                latestSectionTrackedTime: TEN_DAYS_AGO,
                isValid: true
            }
        ];

        const { recommendations } = rankRecommendations(fileStats, { currentTime: now });

        assert.equal(recommendations.length, 1);
        assert.equal(recommendations[0].fileId, 'recently-viewed.md');
    });

    // 5. Exclusion of files with no tracked sections
    it('5. excludes files with zero tracked sections and invalid files', () => {
        const now = new Date('2026-11-08T12:00:00Z').getTime();

        const fileStats = [
            {
                fileId: 'zero-tracked.md',
                title: 'Zero Tracked',
                totalSections: 5,
                trackedSections: 0,
                coveragePercentage: 0,
                lastViewedTime: now - 1000,
                latestSectionTrackedTime: 0,
                isValid: true
            },
            {
                fileId: 'invalid.md',
                isValid: false,
                error: 'Cannot read file'
            },
            {
                fileId: 'valid.md',
                title: 'Valid File',
                totalSections: 5,
                trackedSections: 2,
                coveragePercentage: 40,
                lastViewedTime: now - 1000,
                latestSectionTrackedTime: now - 1000,
                isValid: true
            }
        ];

        const { recommendations } = rankRecommendations(fileStats, { currentTime: now });

        assert.equal(recommendations.length, 1);
        assert.equal(recommendations[0].fileId, 'valid.md');
    });

    // 6. Top-10 recommendation limit
    it('6. returns at most top 10 files even when more are eligible', () => {
        const now = new Date('2026-11-08T12:00:00Z').getTime();
        const fileStats = [];

        for (let i = 1; i <= 15; i++) {
            fileStats.push({
                fileId: `file-${i}.md`,
                title: `File ${i}`,
                totalSections: 10,
                trackedSections: i % 10 + 1,
                coveragePercentage: ((i % 10 + 1) / 10) * 100,
                lastViewedTime: now - 1000,
                latestSectionTrackedTime: now - (i * 1000),
                isValid: true
            });
        }

        const { recommendations } = rankRecommendations(fileStats, { currentTime: now });

        assert.equal(recommendations.length, 10, 'Must not return more than 10 recommendations');
        assert.equal(recommendations[0].rank, 1);
        assert.equal(recommendations[9].rank, 10);
    });

    // 7. User-level data isolation
    it('7. isolates recommendation data between different users', async () => {
        const user1Md = path.join(USER1_DIR, 'md');
        const user2Md = path.join(USER2_DIR, 'md');
        await fs.ensureDir(user1Md);
        await fs.ensureDir(user2Md);

        // User 1 files
        await fs.writeFile(path.join(user1Md, 'doc-user1.md'), '# Title\nSection 1\n\n---\n\nSection 2');
        const sectionsU1 = parseSections('# Title\nSection 1\n\n---\n\nSection 2');
        const metaU1 = {
            _pageMeta: { title: 'User 1 Document', lastViewedAt: new Date().toISOString() },
            [sectionsU1[0].id]: { done: true, count: 1, lastTrackedAt: new Date().toISOString() }
        };
        await fs.writeJson(path.join(user1Md, 'doc-user1.md.meta.json'), metaU1);

        // User 2 files
        await fs.writeFile(path.join(user2Md, 'doc-user2.md'), '# Title\nSection A\n\n---\n\nSection B');
        const sectionsU2 = parseSections('# Title\nSection A\n\n---\n\nSection B');
        const metaU2 = {
            _pageMeta: { title: 'User 2 Document', lastViewedAt: new Date().toISOString() },
            [sectionsU2[0].id]: { done: true, count: 1, lastTrackedAt: new Date().toISOString() }
        };
        await fs.writeJson(path.join(user2Md, 'doc-user2.md.meta.json'), metaU2);

        // Generate recommendations for both
        const u1Recs = await generateAndPersistRecommendations(TEST_USER_1);
        const u2Recs = await generateAndPersistRecommendations(TEST_USER_2);

        assert.equal(u1Recs.recommendations.length, 1);
        assert.equal(u1Recs.recommendations[0].fileId, 'doc-user1.md');
        assert.equal(u1Recs.recommendations[0].title, 'User 1 Document');

        assert.equal(u2Recs.recommendations.length, 1);
        assert.equal(u2Recs.recommendations[0].fileId, 'doc-user2.md');
        assert.equal(u2Recs.recommendations[0].title, 'User 2 Document');

        // Verify stored files are isolated
        const u1Stored = await getRecommendations(TEST_USER_1);
        const u2Stored = await getRecommendations(TEST_USER_2);

        assert.ok(u1Stored.recommendations.every(r => !r.fileId.includes('user2')));
        assert.ok(u2Stored.recommendations.every(r => !r.fileId.includes('user1')));
    });

    // 8. Background job execution and recommendation persistence
    it('8. executes background job asynchronously and persists recommendations to disk', async () => {
        const user1Md = path.join(USER1_DIR, 'md');
        await fs.writeFile(path.join(user1Md, 'bg-test.md'), '# Background Test\nSection 1\n\n---\n\nSection 2');
        const sections = parseSections('# Background Test\nSection 1\n\n---\n\nSection 2');
        const meta = {
            _pageMeta: { title: 'Background Test', lastViewedAt: new Date().toISOString() },
            [sections[0].id]: { done: true, count: 1, lastTrackedAt: new Date().toISOString() },
            [sections[1].id]: { done: true, count: 1, lastTrackedAt: new Date().toISOString() }
        };
        await fs.writeJson(path.join(user1Md, 'bg-test.md.meta.json'), meta);

        // Run non-blocking enqueueRecalculation
        enqueueRecalculation(TEST_USER_1);

        // Wait a short tick for setImmediate background processing
        await new Promise(resolve => setTimeout(resolve, 80));

        const storedPath = path.join(USER1_DIR, 'recommendations.json');
        assert.ok(await fs.pathExists(storedPath), 'Recommendations file must be persisted');

        const stored = await fs.readJson(storedPath);
        assert.equal(stored.userId, TEST_USER_1);
        assert.ok(Array.isArray(stored.recommendations));
        const bgRec = stored.recommendations.find(r => r.fileId === 'bg-test.md');
        assert.ok(bgRec, 'bg-test.md should be in persisted recommendations');
        assert.equal(bgRec.coveragePercentage, 100);
        assert.equal(bgRec.rank, 1);
    });

    // 9. Recommendation refresh after tracking activity
    it('9. refreshes recommendations and updates coverage when tracking activity occurs', async () => {
        const user1Md = path.join(USER1_DIR, 'md');
        const filePath = path.join(user1Md, 'refresh-test.md');
        const metaPath = `${filePath}.meta.json`;

        await fs.writeFile(filePath, '# Refresh Doc\nAlpha content\n\n---\n\nBeta content\n\n---\n\nGamma content\n\n---\n\nDelta content');
        const sections = parseSections('# Refresh Doc\nAlpha content\n\n---\n\nBeta content\n\n---\n\nGamma content\n\n---\n\nDelta content');

        // Initial: 1 out of 4 sections tracked = 25%
        const initialMeta = {
            _pageMeta: { title: 'Refresh Doc', lastViewedAt: new Date().toISOString() },
            [sections[0].id]: { done: true, count: 0, lastTrackedAt: new Date().toISOString() }
        };
        await fs.writeJson(metaPath, initialMeta);

        await executeRecalculationNow(TEST_USER_1);
        let recs = await getRecommendations(TEST_USER_1);
        let item = recs.recommendations.find(r => r.fileId === 'refresh-test.md');
        assert.equal(item.coveragePercentage, 25);

        // Tracking activity occurs: user completes 2 more sections (total 3/4 = 75%)
        const updatedTime = new Date(Date.now() + 5000).toISOString();
        initialMeta[sections[1].id] = { done: true, count: 1, lastTrackedAt: updatedTime };
        initialMeta[sections[2].id] = { done: true, count: 1, lastTrackedAt: updatedTime };
        initialMeta._pageMeta.lastTrackedAt = updatedTime;
        await fs.writeJson(metaPath, initialMeta);

        await logActivity(TEST_USER_1, {
            fileId: 'refresh-test.md',
            sectionId: sections[1].id,
            eventType: 'track_section',
            timestamp: updatedTime
        });

        // Recalculate
        await executeRecalculationNow(TEST_USER_1);

        recs = await getRecommendations(TEST_USER_1);
        item = recs.recommendations.find(r => r.fileId === 'refresh-test.md');
        assert.equal(item.coveragePercentage, 75, 'Coverage should refresh to 75%');
        assert.equal(item.lastTrackedAt, updatedTime, 'lastTrackedAt should reflect latest tracking event');

        // Also verify activity was recorded
        const activities = await getRecentActivities(TEST_USER_1);
        assert.ok(activities.length > 0);
        assert.equal(activities[0].fileId, 'refresh-test.md');
        assert.equal(activities[0].eventType, 'track_section');
    });

    // 10. File creation and update activity logging
    it('10. logs create_file and update_file activity and keeps create_file prominent', async () => {
        const createTime = new Date().toISOString();
        await logActivity(TEST_USER_1, {
            fileId: 'brand-new-doc.md',
            eventType: 'create_file',
            timestamp: createTime,
            metadata: { title: 'Brand New Doc' }
        });

        // Immediate view event 50ms later (e.g. automatic redirect to doc viewer)
        const immediateViewTime = new Date(Date.now() + 50).toISOString();
        await logActivity(TEST_USER_1, {
            fileId: 'brand-new-doc.md',
            eventType: 'view_file',
            timestamp: immediateViewTime
        });

        const activities = await getRecentActivities(TEST_USER_1);
        const latestDocEvent = activities.find(a => a.fileId === 'brand-new-doc.md');
        assert.ok(latestDocEvent, 'Event should exist for newly created file');
        assert.equal(latestDocEvent.eventType, 'create_file', 'create_file should remain prominent over immediate view');

        // Subsequent update event
        const updateTime = new Date(Date.now() + 1000).toISOString();
        await logActivity(TEST_USER_1, {
            fileId: 'brand-new-doc.md',
            eventType: 'update_file',
            timestamp: updateTime
        });

        const updatedActivities = await getRecentActivities(TEST_USER_1);
        assert.equal(updatedActivities[0].fileId, 'brand-new-doc.md');
        assert.equal(updatedActivities[0].eventType, 'update_file', 'update_file should be logged to recent activity');
    });

    // 11. Recency of checks boosting revision priority
    it('11. boosts priority of high-completion documents that have not been checked recently', () => {
        const now = new Date('2026-11-08T12:00:00Z').getTime();
        const FOUR_DAYS_AGO = now - (4 * 24 * 60 * 60 * 1000);
        const FIVE_MINUTES_AGO = now - (5 * 60 * 1000);

        const fileStats = [
            {
                fileId: 'checked-just-now.md',
                title: 'Checked Just Now',
                totalSections: 10,
                trackedSections: 8,
                coveragePercentage: 80,
                lastViewedTime: FIVE_MINUTES_AGO,
                latestSectionTrackedTime: FIVE_MINUTES_AGO,
                checkCounter: 1,
                isValid: true
            },
            {
                fileId: 'checked-four-days-ago.md',
                title: 'Checked Four Days Ago',
                totalSections: 10,
                trackedSections: 8,
                coveragePercentage: 80,
                lastViewedTime: FOUR_DAYS_AGO,
                latestSectionTrackedTime: FOUR_DAYS_AGO,
                checkCounter: 1,
                isValid: true
            }
        ];

        const { recommendations } = rankRecommendations(fileStats, { currentTime: now });

        assert.equal(recommendations.length, 2);
        assert.equal(recommendations[0].fileId, 'checked-four-days-ago.md', 'Document not checked in 4 days should rank first for revision');
        assert.equal(recommendations[1].fileId, 'checked-just-now.md');
        assert.ok(recommendations[0].recommendationScore > recommendations[1].recommendationScore);
    });

    // 12. Direct calculation verification
    it('12. calculates recommendation score combining completion % and elapsed days bonus', () => {
        // Just checked (0 days): score = coverage (75)
        const fresh = calculateRecommendationScore({ coveragePercentage: 75, daysSinceLastCheck: 0 });
        assert.equal(fresh.score, 75);

        // Checked 4 days ago: +10 recency bonus (85)
        const due = calculateRecommendationScore({ coveragePercentage: 75, daysSinceLastCheck: 4 });
        assert.equal(due.score, 85);
        assert.equal(due.details.coveragePercentage, 75);
        assert.equal(due.details.recencyBonus, 10);
    });

    // 13. isHeadingOnlySection detection
    it('13. correctly detects isHeadingOnlySection for single H1-H4 headings without body content', () => {
        // Single H1-H4 headings qualify
        assert.equal(isHeadingOnlySection('<h1>Document Title</h1>'), true);
        assert.equal(isHeadingOnlySection('<h2>Section Heading</h2>'), true);
        assert.equal(isHeadingOnlySection('<h3>Subheading</h3>'), true);
        assert.equal(isHeadingOnlySection('<h4>Minor Heading</h4>'), true);
        assert.equal(isHeadingOnlySection('<h3>Heading</h3><p>  </p>'), true, 'Tolerates empty whitespace paragraphs');

        // Other headings or content do not qualify
        assert.equal(isHeadingOnlySection('<h5>Heading 5</h5>'), false, 'H5 does not qualify');
        assert.equal(isHeadingOnlySection('<h6>Heading 6</h6>'), false, 'H6 does not qualify');
        assert.equal(isHeadingOnlySection('<h1>Title</h1><p>Body paragraph content</p>'), false, 'Headings with body text do not qualify');
        assert.equal(isHeadingOnlySection('<h1>Title</h1><img src="diagram.png">'), false, 'Headings with images do not qualify');
        assert.equal(isHeadingOnlySection('<h1>Title 1</h1><h2>Title 2</h2>'), false, 'Multiple headings do not qualify');
        assert.equal(isHeadingOnlySection('<p>Just regular text</p>'), false, 'Plain paragraphs do not qualify');
        assert.equal(isHeadingOnlySection(''), false, 'Empty string does not qualify');
        assert.equal(isHeadingOnlySection(null), false, 'Null does not qualify');
    });

    // 14. Ignore isHeadingOnlySection in collectUserFileStats totalSections and coverage %
    it('14. ignores isHeadingOnlySection when calculating totalSections and coverage percentage in collectUserFileStats', async () => {
        const user1Md = path.join(USER1_DIR, 'md');
        await fs.ensureDir(user1Md);

        const filePath = path.join(user1Md, 'heading-filter-doc.md');
        const metaPath = `${filePath}.meta.json`;

        // 3 sections:
        // Section 1: Heading-only title (# System Architecture Overview)
        // Section 2: Content section (## Database\nPostgreSQL cluster setup details)
        // Section 3: Content section (## Cache\nRedis cluster setup details)
        const docMarkdown = '# System Architecture Overview\n\n---\n\n## Database\nPostgreSQL cluster setup details\n\n---\n\n## Cache\nRedis cluster setup details';
        await fs.writeFile(filePath, docMarkdown);

        const parsed = parseSections(docMarkdown);
        assert.equal(parsed.length, 3, 'Should parse 3 total sections');
        assert.equal(isHeadingOnlySection(parsed[0].html), true, 'Section 1 should be heading-only');
        assert.equal(isHeadingOnlySection(parsed[1].html), false, 'Section 2 should not be heading-only');
        assert.equal(isHeadingOnlySection(parsed[2].html), false, 'Section 3 should not be heading-only');

        // User tracks both actionable content sections (2 out of 2 trackable sections = 100%)
        const nowIso = new Date().toISOString();
        const meta = {
            _pageMeta: { title: 'System Architecture', lastViewedAt: nowIso },
            [parsed[1].id]: { done: true, count: 1, lastTrackedAt: nowIso },
            [parsed[2].id]: { done: true, count: 1, lastTrackedAt: nowIso }
        };
        await fs.writeJson(metaPath, meta);

        const stats = await collectUserFileStats(TEST_USER_1);
        const fileStat = stats.find(s => s.fileId === 'heading-filter-doc.md');

        assert.ok(fileStat, 'File stat must exist');
        // totalSections must ignore heading-only section: 2 trackable sections instead of 3
        assert.equal(fileStat.totalSections, 2, 'Total trackable sections should be 2 (ignoring heading-only section)');
        assert.equal(fileStat.rawTotalSections, 3, 'Raw total sections should preserve total 3 sections');
        assert.equal(fileStat.trackedSections, 2, 'Tracked sections should be 2');
        assert.equal(fileStat.coveragePercentage, 100, 'Coverage should be 100% (2/2) instead of 66.7% (2/3)');
    });

    // 15. Exclude files that have only heading-only sections from recommendations
    it('15. excludes files that have only heading-only sections from eligible recommendations', async () => {
        const user1Md = path.join(USER1_DIR, 'md');
        await fs.ensureDir(user1Md);

        const filePath = path.join(user1Md, 'only-heading.md');
        const metaPath = `${filePath}.meta.json`;

        await fs.writeFile(filePath, '# Empty Page Title');
        const nowIso = new Date().toISOString();
        await fs.writeJson(metaPath, {
            _pageMeta: { title: 'Empty Page', lastViewedAt: nowIso }
        });

        const stats = await collectUserFileStats(TEST_USER_1);
        const stat = stats.find(s => s.fileId === 'only-heading.md');
        assert.ok(stat);
        assert.equal(stat.totalSections, 0, 'Total trackable sections should be 0');
        assert.equal(stat.coveragePercentage, 0);

        const { recommendations } = await getRecommendations(TEST_USER_1);
        const found = recommendations.find(r => r.fileId === 'only-heading.md');
        assert.equal(found, undefined, 'File with only heading sections must not be eligible for recommendation');
    });

});
