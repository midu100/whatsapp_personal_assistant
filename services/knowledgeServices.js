const crypto = require('crypto')
const knowledgeSchema = require('../models/knowledgeSchema')
const { embedText, embedQuery, cosineSimilarity } = require('./embeddingServices')
const logger = require('../utils/logger')

// ====== In-memory cache
// KB ছোট (কয়েকশো doc) - তাই Atlas Vector Search এর দরকার নেই, Node এ cosine ই যথেষ্ট fast।
// KB ২০০০+ হলে শুধু searchKnowledge() এর ভিতরটা Atlas $vectorSearch দিয়ে বদলাতে হবে,
// বাকি কোনো ফাইল ছুঁতে হবে না।

let cache = []
let cacheLoadedAt = null

const hashText = (text) => crypto.createHash('md5').update(String(text).trim()).digest('hex')

// ====== Cache load
const loadCache = async (force = false) => {
    if (cache.length && !force) return cache

    const docs = await knowledgeSchema
        .find({ status: 'approved' })
        .select('text embedding topic source')
        .lean()

    cache = docs.filter((doc) => doc.embedding && doc.embedding.length)
    cacheLoadedAt = new Date()
    logger.info(`Knowledge cache loaded - ${cache.length} entries`)
    return cache
}

const invalidateCache = () => {
    cache = []
    cacheLoadedAt = null
}

// ====== Search - query এর সাথে সবচেয়ে মিল যাওয়া top K
const searchKnowledge = async (query, topK = 5, minScore = 0.35) => {
    try {
        const docs = await loadCache()
        if (!docs.length) return []

        const queryVector = await embedQuery(query)
        if (!queryVector.length) return []

        const scored = docs
            .map((doc) => ({ ...doc, score: cosineSimilarity(queryVector, doc.embedding) }))
            .filter((doc) => doc.score >= minScore)
            .sort((a, b) => b.score - a.score)
            .slice(0, topK)

        // usage count বাড়াও (fire and forget)
        if (scored.length) {
            knowledgeSchema
                .updateMany({ _id: { $in: scored.map((doc) => doc._id) } }, { $inc: { usageCount: 1 } })
                .catch((err) => console.log(err))
        }

        return scored.map((doc) => ({ text: doc.text, topic: doc.topic, source: doc.source, score: doc.score }))
    } catch (error) {
        logger.error('searchKnowledge failed:', error?.message)
        return []
    }
}

// ====== নতুন knowledge যোগ করা (seed + learn দুই জায়গা থেকেই ডাকা হয়)
const addKnowledge = async ({ text, topic = 'general', source = 'manual', sourceFile = '', status = 'approved' }) => {
    const clean = String(text || '').trim()
    if (!clean) return null

    const hash = hashText(clean)

    const existing = await knowledgeSchema.findOne({ hash })
    if (existing) return existing

    const embedding = await embedText(clean)

    const doc = await knowledgeSchema.create({
        text: clean,
        embedding,
        topic,
        source,
        sourceFile,
        hash,
        status,
    })

    invalidateCache()
    return doc
}

// ====== Prompt এ ঢোকানোর জন্য format
const formatForPrompt = (results = []) => {
    if (!results.length) return 'কোনো relevant knowledge পাওয়া যায়নি।'
    return results.map((item, index) => `[${index + 1}] (${item.topic}) ${item.text}`).join('\n\n')
}

module.exports = {
    loadCache,
    invalidateCache,
    searchKnowledge,
    addKnowledge,
    formatForPrompt,
    hashText,
    getCacheInfo: () => ({ size: cache.length, loadedAt: cacheLoadedAt }),
}
