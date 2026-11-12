const cheerio = require('cheerio');
const { generateText } = require('ai');
const { createGoogleGenerativeAI } = require('@ai-sdk/google');
const { createOpenAI } = require('@ai-sdk/openai');
const { createAnthropic } = require('@ai-sdk/anthropic');
const { createGroq } = require('@ai-sdk/groq');

const MOCK_LOREM_IPSUM = `<h2>Generated Section</h2><p>Lorem ipsum dolor sit amet, <strong>consectetur adipiscing elit</strong>. Integer nec odio. Praesent libero. Sed cursus ante dapibus diam. Sed nisi. Nulla quis sem at nibh elementum imperdiet.</p><p>Duis sagittis ipsum. Praesent mauris. Fusce nec tellus sed augue semper porta. Mauris massa. Vestibulum lacinia arcu eget nulla.</p><ul><li>Class aptent taciti sociosqu ad litora torquent per conubia nostra.</li><li>Inceptos himenaeos curabitur sodales ligula in libero.</li></ul>`;
const MOCK_CHAT_ANSWER = `Based on this section, the main focus is structured organization and key concepts. The content covers essential guidelines and examples to help understand the material effectively. Feel free to ask more specific questions about any part of this section.`;

// Helper: Resolve requested model to provider instance & configuration
// Default model: GPT OSS 120B (Groq)
function resolveAiModel(requestedModelId) {
    let rawId = (requestedModelId || 'openai/gpt-oss-120b').trim();
    let id = rawId.toLowerCase();

    // Normalize variations of default GPT OSS 120B
    if (id === 'gpt oss 120b' || id === 'gpt-oss-120b' || id === 'openai/gpt-oss-120b' || id === 'default') {
        rawId = 'openai/gpt-oss-120b';
        id = rawId.toLowerCase();
    }

    // 1. Groq models (Default: openai/gpt-oss-120b, openai/gpt-oss-20b, qwen/qwen3.8-27b)
    if (id.startsWith('qwen') || id.includes('gpt-oss') || id.includes('gpt oss') || id.startsWith('groq/')) {
        const apiKey = process.env.GROQ_API_KEY;
        if (!apiKey) {
            return {
                error: 'Missing GROQ_API_KEY in backend .env',
                provider: 'Groq'
            };
        }
        const groq = createGroq({ apiKey });
        return {
            provider: 'Groq',
            modelName: rawId,
            model: groq(rawId)
        };
    }

    // 2. Anthropic Claude models
    if (id.startsWith('claude')) {
        const apiKey = process.env.ANTHROPIC_API_KEY;
        if (!apiKey) {
            return {
                error: 'Missing ANTHROPIC_API_KEY in backend .env',
                provider: 'Anthropic Claude'
            };
        }
        const anthropic = createAnthropic({ apiKey });
        return {
            provider: 'Anthropic Claude',
            modelName: rawId,
            model: anthropic(rawId)
        };
    }

    // 3. OpenAI models
    if (id.startsWith('gpt') || id.startsWith('o1') || id.startsWith('o3')) {
        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) {
            return {
                error: 'Missing OPENAI_API_KEY in backend .env',
                provider: 'OpenAI'
            };
        }
        const openai = createOpenAI({ apiKey });
        return {
            provider: 'OpenAI',
            modelName: rawId,
            model: openai(rawId)
        };
    }

    // 4. Google Gemini models
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GOOGLE_API_KEY;
    if (!apiKey) {
        return {
            error: 'Missing GEMINI_API_KEY in backend .env',
            provider: 'Google Gemini'
        };
    }

    const google = createGoogleGenerativeAI({ apiKey });
    let resolvedGoogleId = rawId;

    if (id === 'gemini-3.8-flash' || id === 'gemini 3.8 flash' || id === 'gemini') {
        resolvedGoogleId = process.env.GEMINI_MODEL || 'gemini-3.8-flash';
    }

    return {
        provider: 'Google Gemini',
        modelName: resolvedGoogleId,
        model: google(resolvedGoogleId)
    };
}

function buildSystemInstruction({ mode, context, prompt, maxWords = 100 }) {
    if (mode === 'chat') {
        return `You are an AI assistant answering questions about a specific section of a document.
Context from the document section:
"""
${context ? context : '(Empty section)'}
"""

User question:
"""
${prompt.trim()}
"""

Strict output rules:
1. Provide a direct, helpful, and concise answer based on the section context.
2. Return PLAIN TEXT ONLY. Never output any HTML tags (e.g. no <p>, <br>, <div>, <span>, <b>, <i>, <h1>-<h6>).
3. Do NOT output markdown code fences (no \`\`\` or \`\`\`html).
4. Strictly limit your answer to at most ${maxWords} words (aim for between 50 and ${maxWords} words). Do not exceed ${maxWords} words.`;
    }

    // mode === 'update' (default): Rich text editor HTML replacement
    return `You are an expert content editor assistant inside a rich text editor.
The user wants you to edit, rewrite, expand, or generate content for a section of their document.

Current section content (HTML):
${context ? context : '(Empty section)'}

User instructions:
${prompt.trim()}

Strict output guidelines:
1. Return ONLY the content formatted in clean, valid HTML suitable for rendering directly in a rich text editor (e.g. <p>, <h2>, <h3>, <ul>, <ol>, <li>, <strong>, <em>, <blockquote>, <table>, <tr>, <th>, <td>, <code>, <pre>).
2. Do NOT wrap the output in markdown code blocks (\`\`\`html or \`\`\`). Output raw HTML directly.
3. Preserve existing facts, style, and context unless the prompt requests changing or replacing them.
4. Keep the HTML semantic without inline CSS styles, script tags, or wrapper divs.`;
}

function formatAiResponse({ rawText, mode, maxWords = 100, resolved }) {
    if (mode === 'chat') {
        let text = rawText || '';
        // 1. Strip markdown code fences if present
        if (text.startsWith('```')) {
            text = text.replace(/^```[a-z]*\s*\n?/, '').replace(/\n?```\s*$/, '').trim();
        }

        // 2. Strict guarantee: strip any HTML tags if AI generated them
        let plainText = cheerio.load(text).text().trim();
        if (!plainText) {
            plainText = text.replace(/<[^>]+>/g, '').trim();
        }

        // 3. Word limit enforcement: cap at maxWords
        const words = plainText.split(/\s+/).filter(Boolean);
        let finalText = plainText;
        if (words.length > maxWords) {
            finalText = words.slice(0, maxWords).join(' ') + '...';
        }

        return {
            success: true,
            text: finalText,
            content: finalText,
            wordCount: finalText.split(/\s+/).filter(Boolean).length,
            mocked: false,
            model: resolved.modelName,
            provider: resolved.provider
        };
    }

    // mode === 'update': Format as valid HTML
    let outputHtml = (rawText || '').trim();
    // Strip markdown code fences if model enclosed it in ```html ... ```
    if (outputHtml.startsWith('```')) {
        outputHtml = outputHtml.replace(/^```(?:html)?\s*\n?/, '').replace(/\n?```\s*$/, '').trim();
    }

    // If the result didn't contain HTML tags, wrap in <p>
    if (!/<[a-z][\s\S]*>/i.test(outputHtml)) {
        outputHtml = `<p>${outputHtml.replace(/\n\n+/g, '</p><p>').replace(/\n/g, '<br/>')}</p>`;
    }

    return {
        success: true,
        content: outputHtml,
        mocked: false,
        model: resolved.modelName,
        provider: resolved.provider
    };
}

async function generateAiContent({ model, prompt, context, mode = 'update', maxWords = 100 }) {
    const resolved = resolveAiModel(model);

    // If provider API key is not configured, return mock content preview
    if (resolved.error) {
        console.log(`[AI] ${resolved.error}. Returning mock preview for ${model || 'default'} (mode: ${mode}).`);
        await new Promise(resolve => setTimeout(resolve, mode === 'chat' ? 600 : 800));
        const mockText = mode === 'chat' ? MOCK_CHAT_ANSWER : MOCK_LOREM_IPSUM;
        return {
            success: true,
            content: mockText,
            text: mockText,
            mocked: true,
            message: `${resolved.error}. Returned preview content.`
        };
    }

    console.log(`[AI] Generating text with ${resolved.provider} (${resolved.modelName}, mode: ${mode})...`);

    const systemInstruction = buildSystemInstruction({ mode, context, prompt, maxWords });

    const result = await generateText({
        model: resolved.model,
        prompt: systemInstruction
    });

    return formatAiResponse({
        rawText: (result.text || '').trim(),
        mode,
        maxWords,
        resolved
    });
}

module.exports = {
    MOCK_LOREM_IPSUM,
    MOCK_CHAT_ANSWER,
    resolveAiModel,
    buildSystemInstruction,
    formatAiResponse,
    generateAiContent
};
