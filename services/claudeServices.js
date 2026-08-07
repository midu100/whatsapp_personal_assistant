const Anthropic = require('@anthropic-ai/sdk').default || require('@anthropic-ai/sdk')
const logger = require('../utils/logger')

// ====== Claude (Anthropic) provider
//
// Gemini আর Claude এর message format আলাদা। পুরো codebase Gemini এর format এ
// লেখা, তাই এখানে ভিতরে ভিতরে অনুবাদ করে নেওয়া হয় - বাইরে থেকে দেখলে এটা
// geminiServices এর মতোই আচরণ করে। ফলে pipelineServices, memoryServices,
// learnServices এর একটা লাইনও বদলাতে হয় না।
//
// ⚠️ Embedding আর voice note Claude এ হয় না (Anthropic এর embeddings API নেই,
// audio ও বোঝে না)। ওই দুটো সবসময় Gemini তেই থাকে - aiServices.js দেখো।

let client = null

const getClient = () => {
    if (!process.env.CLAUDE_API_KEY) {
        throw new Error('CLAUDE_API_KEY missing. AI_PROVIDER=claude দিলে key টাও দিতে হবে।')
    }
    if (!client) client = new Anthropic({ apiKey: process.env.CLAUDE_API_KEY })
    return client
}

const model = () => process.env.CLAUDE_MODEL || 'claude-opus-5'
const maxTokens = () => Number(process.env.CLAUDE_MAX_TOKENS) || 2048

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

// ====== Throttle (geminiServices এর মতোই)
let chain = Promise.resolve()
let lastCallAt = 0

const throttle = (fn) => {
    const gap = Number(process.env.CLAUDE_MIN_GAP_MS) || 600

    const run = chain.then(async () => {
        const wait = lastCallAt + gap - Date.now()
        if (wait > 0) await sleep(wait)
        lastCallAt = Date.now()
        return fn()
    })

    chain = run.then(
        () => undefined,
        () => undefined
    )

    return run
}

const withRetry = async (fn, retries = 3) => {
    let lastError

    for (let i = 0; i <= retries; i++) {
        try {
            return await throttle(fn)
        } catch (error) {
            lastError = error

            const status = error?.status
            const retryable = status === 429 || status === 500 || status === 529 || !status
            if (!retryable || i === retries) break

            const wait = Number(error?.headers?.['retry-after']) * 1000 || 2000 * (i + 1)
            logger.warn(`Claude ${status || 'error'}, ${Math.round(wait / 1000)}s পরে আবার চেষ্টা (${i + 1}/${retries})`)
            await sleep(wait)
        }
    }

    throw lastError
}

// ====== Gemini schema → JSON Schema
// Gemini টাইপ বড় হাতের অক্ষরে লেখে (OBJECT, STRING), Claude ছোট হাতের চায়
const toJsonSchema = (schema) => {
    if (!schema || typeof schema !== 'object') return schema

    if (Array.isArray(schema)) return schema.map(toJsonSchema)

    const out = {}
    for (const [key, value] of Object.entries(schema)) {
        if (key === 'type' && typeof value === 'string') out.type = value.toLowerCase()
        else if (value && typeof value === 'object') out[key] = toJsonSchema(value)
        else out[key] = value
    }
    return out
}

const toClaudeTools = (tools = []) =>
    tools.map((tool) => ({
        name: tool.name,
        description: tool.description,
        input_schema: toJsonSchema(tool.parameters) || { type: 'object', properties: {} },
    }))

// ====== Gemini contents → Claude messages
// Gemini: { role: 'user'|'model', parts: [{text}|{functionCall}|{functionResponse}] }
// Claude: { role: 'user'|'assistant', content: [{type:'text'}|{type:'tool_use'}|{type:'tool_result'}] }
const toClaudeMessages = (contents = []) => {
    const messages = []

    // tool_result এ tool_use_id লাগে, কিন্তু Gemini এর functionResponse এ শুধু নাম থাকে।
    // তাই আগের model turn এর id গুলো নাম ধরে মনে রাখা হয়।
    let toolIds = {}
    let counter = 0

    for (const item of contents) {
        const parts = item.parts || []
        const isModel = item.role === 'model'
        const content = []

        for (const part of parts) {
            if (part.text) {
                content.push({ type: 'text', text: part.text })
                continue
            }

            if (part.functionCall) {
                const id = part.functionCall.id || `toolu_local_${++counter}`
                toolIds[part.functionCall.name] = id
                content.push({
                    type: 'tool_use',
                    id,
                    name: part.functionCall.name,
                    input: part.functionCall.args || {},
                })
                continue
            }

            if (part.functionResponse) {
                const id = toolIds[part.functionResponse.name]
                if (!id) continue // জোড়া না মিললে বাদ, নাহলে Claude 400 দিবে

                content.push({
                    type: 'tool_result',
                    tool_use_id: id,
                    content: JSON.stringify(part.functionResponse.response || {}),
                })
            }
        }

        if (!content.length) continue

        messages.push({ role: isModel ? 'assistant' : 'user', content })
    }

    return messages
}

// ====== Claude response → Gemini আকারের response
// pipelineServices যেভাবে পড়ে (candidates[0].content, functionCalls) ঠিক সেভাবেই
const toGeminiShape = (message) => {
    const parts = []
    const functionCalls = []

    for (const block of message?.content || []) {
        if (block.type === 'text') {
            parts.push({ text: block.text })
        } else if (block.type === 'tool_use') {
            const call = { name: block.name, args: block.input || {}, id: block.id }
            parts.push({ functionCall: call })
            functionCalls.push(call)
        }
    }

    const text = parts
        .filter((part) => part.text)
        .map((part) => part.text)
        .join('')
        .trim()

    return {
        candidates: [{ content: { role: 'model', parts } }],
        functionCalls,
        text,
    }
}

// ====== Chat (tool calling সহ)
const chat = async ({ systemInstruction, contents, tools, temperature = 0.7, maxOutputTokens }) => {
    const anthropic = getClient()

    const params = {
        model: model(),
        max_tokens: maxOutputTokens || maxTokens(),
        messages: toClaudeMessages(contents),
    }

    if (systemInstruction) params.system = systemInstruction
    if (tools && tools.length) params.tools = toClaudeTools(tools)

    // Opus 5 / Sonnet 5 এ temperature নেওয়া হয় না, পাঠালে 400 দেয়
    if (!/opus-5|sonnet-5|opus-4-[78]|fable-5|mythos-5/.test(model())) {
        params.temperature = temperature
    }

    const message = await withRetry(() => anthropic.messages.create(params))
    return toGeminiShape(message)
}

// ====== সাধারণ text
const generateText = async ({ systemInstruction, prompt }) => {
    const anthropic = getClient()

    const params = {
        model: model(),
        max_tokens: maxTokens(),
        messages: [{ role: 'user', content: prompt }],
    }
    if (systemInstruction) params.system = systemInstruction

    const message = await withRetry(() => anthropic.messages.create(params))
    return toGeminiShape(message).text
}

// ====== JSON output
// Claude এ Gemini এর responseSchema নেই, তাই prompt এ shape বলে দিয়ে parse করা হয়
const describeSchema = (schema) => {
    if (!schema?.properties) return ''
    const fields = Object.entries(schema.properties).map(([key, value]) => {
        const type = String(value.type || 'string').toLowerCase()
        return `  "${key}": <${type}>`
    })
    return `{\n${fields.join(',\n')}\n}`
}

const generateJson = async ({ systemInstruction, prompt, responseSchema }) => {
    const anthropic = getClient()

    const shape = describeSchema(responseSchema)
    const instruction = shape
        ? `\n\nউত্তর দাও শুধুমাত্র এই আকারের JSON হিসেবে, আর কোনো লেখা নয়:\n${shape}`
        : '\n\nউত্তর দাও শুধুমাত্র valid JSON হিসেবে, আর কোনো লেখা নয়।'

    const params = {
        model: model(),
        max_tokens: maxTokens(),
        messages: [{ role: 'user', content: prompt + instruction }],
    }
    if (systemInstruction) params.system = systemInstruction

    const message = await withRetry(() => anthropic.messages.create(params))
    const raw = toGeminiShape(message).text

    try {
        return JSON.parse(raw)
    } catch (error) {
        const match = raw.match(/\{[\s\S]*\}/)
        if (match) {
            try {
                return JSON.parse(match[0])
            } catch (err) {
                console.log(err)
            }
        }
        logger.error('Claude JSON parse failed:', raw.slice(0, 200))
        return null
    }
}

module.exports = { chat, generateText, generateJson, getClient, toClaudeMessages, toClaudeTools }
