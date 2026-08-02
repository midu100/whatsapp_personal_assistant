const { getClient } = require('./geminiServices')
const logger = require('../utils/logger')

const embeddingModel = () => process.env.GEMINI_EMBEDDING_MODEL || 'gemini-embedding-001'
const dimension = () => Number(process.env.EMBEDDING_DIMENSION) || 768

// ====== 3072 এর কম dimension চাইলে vector নিজে normalize করতে হয়
const normalize = (vector = []) => {
    const magnitude = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0))
    if (!magnitude) return vector
    return vector.map((value) => value / magnitude)
}

// ====== একটা text এর embedding
const embedText = async (text, taskType = 'RETRIEVAL_DOCUMENT') => {
    try {
        const ai = getClient()
        const response = await ai.models.embedContent({
            model: embeddingModel(),
            contents: [String(text || '').slice(0, 8000)],
            config: { outputDimensionality: dimension(), taskType },
        })

        const values = response?.embeddings?.[0]?.values || []
        return normalize(values)
    } catch (error) {
        logger.error('embedText failed:', error?.message)
        return []
    }
}

// ====== query এর embedding (taskType আলাদা হলে retrieval quality ভালো হয়)
const embedQuery = async (text) => embedText(text, 'RETRIEVAL_QUERY')

// ====== একসাথে অনেকগুলো (seed করার সময় লাগে) - free tier rate limit এর জন্য ছোট batch
const embedMany = async (texts = [], batchSize = 20) => {
    const out = []

    for (let i = 0; i < texts.length; i += batchSize) {
        const batch = texts.slice(i, i + batchSize)
        try {
            const ai = getClient()
            const response = await ai.models.embedContent({
                model: embeddingModel(),
                contents: batch.map((text) => String(text || '').slice(0, 8000)),
                config: { outputDimensionality: dimension(), taskType: 'RETRIEVAL_DOCUMENT' },
            })

            const embeddings = response?.embeddings || []
            batch.forEach((_, index) => out.push(normalize(embeddings[index]?.values || [])))
        } catch (error) {
            logger.error('embedMany batch failed:', error?.message)
            batch.forEach(() => out.push([]))
        }

        // free tier কে একটু শ্বাস নিতে দাও
        if (i + batchSize < texts.length) await new Promise((resolve) => setTimeout(resolve, 1200))
    }

    return out
}

// ====== Cosine similarity (দুটোই normalized হলে এটা শুধু dot product)
const cosineSimilarity = (a = [], b = []) => {
    if (!a.length || !b.length || a.length !== b.length) return 0
    let dot = 0
    for (let i = 0; i < a.length; i++) dot += a[i] * b[i]
    return dot
}

module.exports = { embedText, embedQuery, embedMany, cosineSimilarity, dimension }
