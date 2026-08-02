require('dotenv').config()
const fs = require('fs')
const path = require('path')
const mongoose = require('mongoose')

const dbConfig = require('../dbConfig')
const knowledgeSchema = require('../models/knowledgeSchema')
const { embedMany } = require('../services/embeddingServices')
const { hashText, invalidateCache } = require('../services/knowledgeServices')
const { availabilityText } = require('../services/schedulingServices')
const logger = require('../utils/logger')

// ====== seed/*.md → chunk → embed → MongoDB
// বারবার চালানো যায়, একই লেখা দুইবার ঢুকবে না (hash দিয়ে ঠেকানো)
//
// sample_chats.md ইচ্ছে করেই বাদ - ওটা তথ্য নয়, tone।
// ওটা সরাসরি system prompt এ যায় (promptServices.js দেখো)।

const SKIP_FILES = ['sample_chats.md']

// ====== md ফাইল → chunk
const chunkMarkdown = (content, fileName) => {
    const clean = content.replace(/<!--[\s\S]*?-->/g, '').trim()

    const titleMatch = clean.match(/^#\s+(.+)$/m)
    const title = titleMatch ? titleMatch[1].trim() : fileName.replace('.md', '')

    const sections = clean.split(/^##\s+/m).slice(1)

    if (!sections.length) {
        return clean ? [{ topic: title, text: clean }] : []
    }

    return sections
        .map((section) => {
            const lines = section.trim().split('\n')
            const heading = lines[0].trim()
            const body = lines.slice(1).join('\n').trim()

            if (!body) return null

            return {
                topic: `${title} / ${heading}`,
                text: `${heading}\n${body}`,
            }
        })
        .filter(Boolean)
}

// ====== Seed
const seed = async () => {
    await dbConfig()

    const seedDir = __dirname
    const files = fs.readdirSync(seedDir).filter((file) => file.endsWith('.md') && !SKIP_FILES.includes(file))

    const chunks = []

    for (const file of files) {
        const content = fs.readFileSync(path.join(seedDir, file), 'utf8')
        const parsed = chunkMarkdown(content, file)
        parsed.forEach((chunk) => chunks.push({ ...chunk, sourceFile: file }))
        logger.info(`${file} → ${parsed.length} chunk`)
    }

    // ⚠️ Rate card ইচ্ছে করেই KB তে ঢোকানো হয় না।
    // Assistant দাম বলে না - দাম owner নিজে বলেন। KB তে দাম থাকলে bot
    // সেখান থেকে পড়ে বলে দিত, তাই দামের কোনো সংখ্যা KB তে রাখা হয় না।

    chunks.push({
        topic: 'Availability / Meeting',
        text: availabilityText(),
        sourceFile: 'schedulingServices.js',
    })

    logger.info(`মোট ${chunks.length} chunk`)

    chunks.forEach((chunk) => {
        chunk.hash = hashText(chunk.text)
    })

    const allHashes = chunks.map((chunk) => chunk.hash)

    // ====== পুরনো/বদলে যাওয়া লেখা মুছে ফেলো
    // md ফাইল edit করলে পুরনো version টা DB তে থেকে যেত আর bot সেটাই পড়ত।
    // শুধু seed এর গুলো মোছা হয় - তোমার শেখানো (learned) আর /kb দিয়ে যোগ করা
    // (manual) knowledge কখনো মুছবে না।
    const stale = await knowledgeSchema.deleteMany({ source: 'seed', hash: { $nin: allHashes } })
    if (stale.deletedCount) logger.warn(`${stale.deletedCount} টা পুরনো chunk মুছে ফেলা হলো`)

    // ====== যেগুলো নতুন
    const fresh = []
    for (const chunk of chunks) {
        const existing = await knowledgeSchema.findOne({ hash: chunk.hash }).lean()
        if (!existing) fresh.push(chunk)
    }

    if (!fresh.length) {
        logger.success('সব chunk আগেই আছে, নতুন কিছু যোগ করার নেই ✅')
        invalidateCache()
        await mongoose.connection.close()
        return
    }

    logger.info(`${fresh.length} টা নতুন chunk embed করা হচ্ছে... (একটু সময় লাগবে)`)

    const embeddings = await embedMany(fresh.map((chunk) => chunk.text))

    const docs = fresh
        .map((chunk, index) => ({
            text: chunk.text,
            embedding: embeddings[index] || [],
            topic: chunk.topic,
            source: 'seed',
            sourceFile: chunk.sourceFile,
            hash: chunk.hash,
            status: 'approved',
        }))
        .filter((doc) => doc.embedding.length)

    const failed = fresh.length - docs.length
    if (failed) logger.warn(`${failed} টা chunk এর embedding হয়নি - আবার চালালে চেষ্টা করবে`)

    if (docs.length) await knowledgeSchema.insertMany(docs)

    invalidateCache()

    const total = await knowledgeSchema.countDocuments()
    logger.success(`${docs.length} টা নতুন যোগ হলো। Knowledge base এ এখন মোট ${total} টা entry ✅`)

    await mongoose.connection.close()
}

seed().catch(async (error) => {
    logger.error(error?.message || error)
    await mongoose.connection.close()
    process.exit(1)
})
