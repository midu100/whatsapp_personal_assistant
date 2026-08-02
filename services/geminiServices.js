const { GoogleGenAI } = require('@google/genai')
const logger = require('../utils/logger')

// ====== LLM abstraction
// এখন শুধু gemini implemented. পরে paid এ গেলে এখানে openai/claude adapter যোগ করলেই
// বাকি কোনো ফাইল ছুঁতে হবে না - AI_PROVIDER env var বদলালেই চলবে।

let client = null

const getClient = () => {
    if (!process.env.GEMINI_API_KEY) {
        throw new Error('GEMINI_API_KEY missing. .env এ key বসাও।')
    }
    if (!client) client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
    return client
}

const model = () => process.env.GEMINI_MODEL || 'gemini-2.5-flash'

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

// ====== Global throttle
// Free tier এ প্রতি মিনিটে গোনা হয়। একসাথে হুড়মুড় করে request গেলে 429 খায়,
// তাই প্রতিটা call এর মাঝে ন্যূনতম একটা ফাঁক রাখা হয়।
let chain = Promise.resolve()
let lastCallAt = 0

const throttle = (fn) => {
    const gap = Number(process.env.GEMINI_MIN_GAP_MS) || 1200

    const run = chain.then(async () => {
        const wait = lastCallAt + gap - Date.now()
        if (wait > 0) await sleep(wait)
        lastCallAt = Date.now()
        return fn()
    })

    // একটা call fail করলে যেন পরের গুলো আটকে না যায়
    chain = run.then(
        () => undefined,
        () => undefined
    )

    return run
}

// ====== 429 এর ভিতরে Google নিজেই বলে দেয় কত সেকেন্ড পরে আবার চেষ্টা করতে হবে
const retryDelayOf = (error) => {
    const match = String(error?.message || '').match(/"retryDelay":\s*"(\d+(?:\.\d+)?)s"/)
    return match ? Math.ceil(Number(match[1]) * 1000) : null
}

const shortError = (error) => {
    const match = String(error?.message || '').match(/"message":\s*"([^"]{0,140})/)
    return match ? match[1] : String(error?.message || '').slice(0, 140)
}

// ====== Retry - free tier এ 429/503 আসেই, Google এর বলা সময় মেনে অপেক্ষা করি
const withRetry = async (fn, retries = 3) => {
    let lastError

    for (let i = 0; i <= retries; i++) {
        try {
            return await throttle(fn)
        } catch (error) {
            lastError = error

            const status = error?.status || error?.code
            const is429 = status === 429 || /RESOURCE_EXHAUSTED|429/.test(String(error?.message))
            const retryable = is429 || status === 500 || status === 503 || !status

            if (!retryable || i === retries) break

            const wait = retryDelayOf(error) || 2000 * (i + 1)
            logger.warn(`Gemini ${is429 ? 'rate limit' : 'error'}, ${Math.round(wait / 1000)}s পরে আবার চেষ্টা (${i + 1}/${retries}) - ${shortError(error)}`)
            await sleep(wait)
        }
    }

    throw lastError
}

// ====== Raw chat - tool calling সহ, pipeline এই ফাংশনটাই ব্যবহার করে
const chat = async ({ systemInstruction, contents, tools, temperature = 0.7, maxOutputTokens = 1024 }) => {
    const ai = getClient()

    const config = { temperature, maxOutputTokens }
    if (systemInstruction) config.systemInstruction = systemInstruction
    if (tools && tools.length) config.tools = [{ functionDeclarations: tools }]

    return withRetry(() =>
        ai.models.generateContent({
            model: model(),
            contents,
            config,
        })
    )
}

// ====== সাধারণ text generation (summary, learn, rewrite এর জন্য)
const generateText = async ({ systemInstruction, prompt, temperature = 0.4 }) => {
    const ai = getClient()

    const config = { temperature }
    if (systemInstruction) config.systemInstruction = systemInstruction

    const response = await withRetry(() =>
        ai.models.generateContent({
            model: model(),
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            config,
        })
    )

    return response?.text?.trim() || ''
}

// ====== JSON output (qualify, learn, extract এর জন্য)
const generateJson = async ({ systemInstruction, prompt, responseSchema, temperature = 0.2 }) => {
    const ai = getClient()

    const config = { temperature, responseMimeType: 'application/json' }
    if (systemInstruction) config.systemInstruction = systemInstruction
    if (responseSchema) config.responseSchema = responseSchema

    const response = await withRetry(() =>
        ai.models.generateContent({
            model: model(),
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            config,
        })
    )

    const raw = response?.text?.trim() || ''
    try {
        return JSON.parse(raw)
    } catch (error) {
        // মাঝে মাঝে ```json ... ``` মুড়ে দেয়
        const match = raw.match(/\{[\s\S]*\}/)
        if (match) {
            try {
                return JSON.parse(match[0])
            } catch (err) {
                console.log(err)
            }
        }
        logger.error('JSON parse failed:', raw.slice(0, 200))
        return null
    }
}

// ====== Voice note → লেখা
// বাংলাদেশে client রা প্রচুর voice note পাঠায়। Gemini সরাসরি audio বোঝে,
// আলাদা কোনো speech-to-text service লাগে না।
const transcribeAudio = async (buffer, mimeType = 'audio/ogg') => {
    try {
        const ai = getClient()

        const response = await withRetry(() =>
            ai.models.generateContent({
                model: model(),
                contents: [
                    {
                        role: 'user',
                        parts: [
                            { inlineData: { mimeType, data: buffer.toString('base64') } },
                            {
                                text: 'এই audio টায় যা বলা হয়েছে হুবহু লিখে দাও। বাংলায় বললে বাংলা script এ, ইংরেজিতে বললে ইংরেজিতে। কোনো ব্যাখ্যা, ভূমিকা বা উদ্ধৃতি চিহ্ন দিবে না - শুধু কথাগুলো।',
                            },
                        ],
                    },
                ],
                config: { temperature: 0 },
            })
        )

        return response?.text?.trim() || ''
    } catch (error) {
        logger.error('transcribeAudio failed:', error?.message)
        return ''
    }
}

module.exports = { chat, generateText, generateJson, transcribeAudio, getClient }
