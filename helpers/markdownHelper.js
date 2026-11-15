const MarkdownIt = require('markdown-it');
const cheerio = require('cheerio');
const TurndownService = require('turndown');
const { gfm } = require('turndown-plugin-gfm');
const turndownPluginGfm = require('turndown-plugin-gfm');

// Markdown & Turndown Configuration
const md = new MarkdownIt({ html: true });

// NOTE: Use codeBlockStyle: 'fenced' instead of the default 'indented' (4 spaces).
// In CommonMark / markdown-it, 4-space indentation immediately following a list item
// (such as a nested 'ul - li - li ul') is treated as continuation of the preceding list item,
// collapsing the code block into a single-line paragraph (<p>) on save.
// Using fenced code blocks (```) ensures code blocks remain isolated and intact.
const turndownService = new TurndownService({ 
    bulletListMarker: '-', 
    headingStyle: 'atx',
    codeBlockStyle: 'fenced',
    fence: '```'
});

const tables = turndownPluginGfm.tables;
turndownService.use(tables);
turndownService.keep(['div']);
turndownService.use(gfm);

// Custom rule for fenced code blocks (<pre> and <pre><code>):
// 1. Prevents list indentation collisions by guaranteeing fenced code output.
// 2. Extracts syntax language classes (e.g. language-js, lang-python) from <code> or <pre>.
// 3. Handles any <br> tags pasted inside code blocks by converting them to clean newlines.
// 4. Dynamically expands fence length if the code itself contains triple backticks.
turndownService.addRule('fencedCodeBlock', {
    filter: function (node, options) {
        return options.codeBlockStyle === 'fenced' && node.nodeName === 'PRE';
    },
    replacement: function (content, node, options) {
        const codeElement = node.querySelector ? node.querySelector('code') : null;
        let targetNode = codeElement || node;
        let code = '';
        if (targetNode.ownerDocument && targetNode.querySelector && targetNode.querySelector('br')) {
            const clone = targetNode.cloneNode(true);
            const brs = clone.querySelectorAll ? clone.querySelectorAll('br') : [];
            for (let i = 0; i < brs.length; i++) {
                const br = brs[i];
                if (br.parentNode) {
                    br.parentNode.replaceChild(targetNode.ownerDocument.createTextNode('\n'), br);
                }
            }
            code = clone.textContent || '';
        } else {
            code = targetNode.textContent || '';
        }
        const codeClass = (codeElement && codeElement.getAttribute('class')) || '';
        const preClass = node.getAttribute('class') || '';
        const combinedClass = `${codeClass}${preClass}`.trim();
        const languageMatch = combinedClass.match(/(?:lang|language)-(\S+)/);
        const language = languageMatch ? languageMatch[1] : '';
        const fenceChar = (options.fence && options.fence.charAt(0)) || '`';
        let fenceSize = 3;
        const fenceInCodeRegex = new RegExp('^' + fenceChar + '{3,}', 'gm');
        let match;
        while ((match = fenceInCodeRegex.exec(code))) {
            if (match[0].length >= fenceSize) {
                fenceSize = match[0].length + 1;
            }
        }
        const fence = fenceChar.repeat(fenceSize);
        const cleanCode = code.replace(/\r\n/g, '\n').replace(/\n$/, '');
        return '\n\n' + fence + language + '\n' + cleanCode + '\n' + fence + '\n\n';
    }
});

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

/**
 * Protects LaTeX math blocks from markdown-it's escape and emphasis parsers
 * while preserving HTML-safe output (&amp;, &lt;, &gt;) for client-side KaTeX/MathJax.
 */
function renderMarkdownWithMath(rawMarkdown) {
    if (!rawMarkdown || typeof rawMarkdown !== 'string') return '';

    const mathPlaceholders = [];
    const makeMathToken = (idx) => `@@@LATEX_MATH_${idx}_${Date.now()}@@@`;

    const escapeHtml = (str) =>
        str.replace(/&/g, '&amp;')
           .replace(/</g, '&lt;')
           .replace(/>/g, '&gt;');

    // 1. Protect fenced and inline code first so '$' inside code is ignored
    const codePlaceholders = [];
    const makeCodeToken = (idx) => `@@@MD_CODE_PRE_${idx}_${Date.now()}@@@`;

    let processed = rawMarkdown.replace(/(```[\s\S]*?```|~~~[\s\S]*?~~~|`[^`\n]+?`)/g, (match) => {
        const token = makeCodeToken(codePlaceholders.length);
        codePlaceholders.push({ token, content: match });
        return token;
    });

    // 2. Protect block math: $$...$$
    processed = processed.replace(/\$\$([\s\S]+?)\$\$/g, (match) => {
        const token = makeMathToken(mathPlaceholders.length);
        mathPlaceholders.push({ token, content: escapeHtml(match) });
        return token;
    });

    // 3. Protect inline math: $...$
    processed = processed.replace(/\$(?!\s)([^\$\n]+?)(?<!\s)\$/g, (match) => {
        const token = makeMathToken(mathPlaceholders.length);
        mathPlaceholders.push({ token, content: escapeHtml(match) });
        return token;
    });

    // 4. Restore code blocks before md.render so markdown-it formats them normally
    for (let i = codePlaceholders.length - 1; i >= 0; i--) {
        const { token, content } = codePlaceholders[i];
        processed = processed.replace(token, () => content);
    }

    // 5. Render Markdown to HTML
    let html = md.render(processed);

    // 6. Restore raw LaTeX inside the generated HTML
    for (let i = mathPlaceholders.length - 1; i >= 0; i--) {
        const { token, content } = mathPlaceholders[i];
        html = html.replace(token, () => content);
    }

    return html;
}

/**
 * Restores unescaped LaTeX math formulas after Turndown processing.
 * Turndown automatically escapes backslashes (\ -> \\), underscores (_ -> \_),
 * brackets ([ -> \[, ] ->\]), asterisks, etc.
 * This helper restores clean mathematical expressions for both block ($$...$$)
 * and inline ($...$) formulas.
 */
function unescapeMath(markdown) {
    if (!markdown || typeof markdown !== 'string') return markdown;
    const placeholders = [];
    const makeToken = (idx) => `@@@MD_CODE_${idx}_${Date.now()}@@@`;

    // Protect fenced code blocks: ```...``` or ~~~...~~~
    let protectedMd = markdown.replace(/(```[\s\S]*?```|~~~[\s\S]*?~~~)/g, (match) => {
        const token = makeToken(placeholders.length);
        placeholders.push({ token, content: match });
        return token;
    });

    // Protect inline code blocks: `...`
    protectedMd = protectedMd.replace(/(`[^`\n]+?`)/g, (match) => {
        const token = makeToken(placeholders.length);
        placeholders.push({ token, content: match });
        return token;
    });

    const restoreTex = (math) => {
        return math
            .replace(/\\\\\\\\/g, '\\\\')
            .replace(/\\\\([a-zA-Z{}[\]()_#+\-.!*^&%$\s])/g, '\\$1')
            .replace(/\\_/g, '_')
            .replace(/\\\*/g, '*')
            .replace(/\\\[/g, '[')
            .replace(/\\\]/g, ']')
            .replace(/\\\(/g, '(')
            .replace(/\\\)/g, ')')
            .replace(/\\~/g, '~')
            .replace(/\\`/g, '`')
            .replace(/\\</g, '<')
            .replace(/\\>/g, '>')
            .replace(/&amp;/g, '&');
    };

    // 1. Block math: $$...$$
    let result = protectedMd.replace(/\$\$([\s\S]+?)\$\$/g, (match, math) => `$$${restoreTex(math)}$$`);

    // 2. Inline math: $...$ (no whitespace at boundaries, single line)
    result = result.replace(/\$(?!\s)([^\$\n]+?)(?<!\s)\$/g, (match, math) => `$${restoreTex(math)}$`);

    // Restore protected code blocks in reverse order
    for (let i = placeholders.length - 1; i >= 0; i--) {
        const { token, content } = placeholders[i];
        result = result.replace(token, () => content);
    }

    return result;
}

function generateId(text) {
    const alphabeticChars = (text || '').match(/[A-Za-z]/g) || [];
    const firstFour = alphabeticChars.slice(0, 4).join('');
    const lastFour = alphabeticChars.slice(-4).join('');
    return (firstFour + lastFour + (text || '').length).toLowerCase();
}

/**
 * Parses raw Markdown into an array of sections split by <hr> tags.
 */
function parseSections(rawMarkdown) {
    const fullHtml = renderMarkdownWithMath(rawMarkdown || '');
    const $ = cheerio.load(fullHtml);
    const sections = [];
    let currentSectionHtml = '';

    // Split by <hr> tags
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

/**
 * Converts rich HTML content to clean Markdown, restoring LaTeX math formulas.
 */
function htmlToMarkdown(htmlContent) {
    let markdown = turndownService.turndown(htmlContent || '');
    return unescapeMath(markdown);
}

module.exports = {
    md,
    turndownService,
    renderMarkdownWithMath,
    unescapeMath,
    generateId,
    parseSections,
    htmlToMarkdown
};