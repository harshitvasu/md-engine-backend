const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs-extra');

const {
    JWT_SECRET,
    getUsersFile,
    USERS_FILE,
    loadUsers,
    saveUsers,
    authenticate,
    issueToken,
    hashPassword,
    comparePassword
} = require('../helpers/authHelper');

const {
    getUserMdDir,
    getUserImagesDir,
    getDirectoryTree,
    getDirectories,
    extractImageFileNames
} = require('../helpers/fileHelper');

const {
    unescapeMath,
    generateId,
    parseSections,
    htmlToMarkdown
} = require('../helpers/markdownHelper');

const {
    recordFileView,
    updateSectionMetadata,
    recordRevisionCheck
} = require('../helpers/metadataHelper');

const {
    resolveAiModel,
    buildSystemInstruction,
    formatAiResponse,
    generateAiContent,
    MOCK_LOREM_IPSUM,
    MOCK_CHAT_ANSWER
} = require('../helpers/aiHelper');

describe('Helper Modules Unit Test Suite', () => {

    describe('authHelper', () => {
        it('hashes and compares passwords correctly', async () => {
            const password = 'SecretPassword123!';
            const hash = await hashPassword(password);
            assert.notEqual(hash, password);
            assert.equal(await comparePassword(password, hash), true);
            assert.equal(await comparePassword('WrongPassword', hash), false);
        });

        it('issues signed JWT tokens with username', () => {
            const token = issueToken('testuser');
            assert.ok(typeof token === 'string' && token.length > 20);
        });

        it('rejects unauthenticated requests in middleware', () => {
            const req = { cookies: {}, headers: {} };
            let statusCode = 200;
            let jsonPayload = null;
            const res = {
                status(code) { statusCode = code; return this; },
                json(data) { jsonPayload = data; return this; }
            };
            let nextCalled = false;
            authenticate(req, res, () => { nextCalled = true; });

            assert.equal(statusCode, 401);
            assert.equal(nextCalled, false);
            assert.equal(jsonPayload.success, false);
        });
    });

    describe('fileHelper', () => {
        it('creates and returns valid sanitized user directories', () => {
            const testUser = 'Helper_Test_User!#$';
            const mdDir = getUserMdDir(testUser);
            const imgDir = getUserImagesDir(testUser);

            assert.ok(fs.existsSync(mdDir));
            assert.ok(fs.existsSync(imgDir));
            assert.match(mdDir, /helper_test_user/);
            assert.match(imgDir, /helper_test_user/);

            fs.removeSync(path.join(mdDir, '..'));
        });

        it('extracts unique image basenames from fileNames and URLs', () => {
            const fileNames = ['test1.png', 'folder/test2.png', ''];
            const urls = ['/images/user/test2.png?v=1', 'https://example.com/images/test3.png#hash', '   '];
            const extracted = extractImageFileNames(fileNames, urls);

            assert.deepEqual(extracted.sort(), ['test1.png', 'test2.png', 'test3.png'].sort());
        });
    });

    describe('markdownHelper', () => {
        it('generates consistent deterministic section IDs', () => {
            const id1 = generateId('Introduction To Computer Science');
            const id2 = generateId('Introduction To Computer Science');
            assert.equal(id1, id2);
            assert.ok(id1.length >= 8);
        });

        it('parses markdown into sections delimited by horizontal rules', () => {
            const mdContent = `# Section 1\n\nContent 1\n\n---\n\n## Section 2\n\nContent 2`;
            const sections = parseSections(mdContent);
            assert.equal(sections.length, 2);
            assert.ok(sections[0].html.includes('Section 1'));
            assert.ok(sections[1].html.includes('Section 2'));
        });

        it('converts HTML to Markdown while preserving LaTeX math', () => {
            const html = `<h2>Theorem</h2><p>Here is $E = mc^2$ and block:</p><p>$$\\sum_{i=1}^{n} x_i$$</p>`;
            const md = htmlToMarkdown(html);
            assert.ok(md.includes('$E = mc^2$'));
            assert.ok(md.includes('$$\\sum_{i=1}^{n} x_i$$'));
            assert.ok(!md.includes('\\sum\\_{i=1}')); // underscore not escaped
        });
    });

    describe('metadataHelper', () => {
        const testMetaPath = path.join(__dirname, '..', 'user_data', 'test_helper_meta.json');

        it('records and updates section metadata and revision checks', async () => {
            const now = new Date().toISOString();
            const { meta } = await updateSectionMetadata(testMetaPath, {
                sectionId: 'sec1',
                done: true,
                count: 1,
                pageTitle: 'Test Page'
            }, now);

            assert.equal(meta._pageMeta.title, 'Test Page');
            assert.equal(meta.sec1.done, true);
            assert.equal(meta.sec1.count, 1);

            const checkResult = await recordRevisionCheck(testMetaPath, 'sec1', now);
            assert.equal(checkResult.checkCounter, 1);
            assert.equal(checkResult.meta.sec1.count, 2);

            await fs.remove(testMetaPath);
        });
    });

    describe('aiHelper', () => {
        it('correctly resolves model configurations and identifies missing keys', () => {
            delete process.env.GROQ_API_KEY;
            const groqRes = resolveAiModel('openai/gpt-oss-120b');
            assert.equal(groqRes.provider, 'Groq');
            assert.ok(groqRes.error);

            delete process.env.ANTHROPIC_API_KEY;
            const anthropicRes = resolveAiModel('claude-3-5-sonnet');
            assert.equal(anthropicRes.provider, 'Anthropic Claude');
            assert.ok(anthropicRes.error);
        });

        it('generates mock preview fallback when API key is missing', async () => {
            delete process.env.GROQ_API_KEY;
            const res = await generateAiContent({
                model: 'default',
                prompt: 'Test prompt',
                mode: 'chat',
                maxWords: 40
            });
            assert.equal(res.success, true);
            assert.equal(res.mocked, true);
            assert.ok(res.content);
        });
    });
});
