require('dotenv').config()
const mongoose = require('mongoose')

// ====== .env ভরার পর সব ঠিক আছে কিনা এক command এ দেখো
//   npm run check
// প্রতিটা জিনিস আলাদা করে test করে, কোথায় সমস্যা সেটা পরিষ্কার বলে দেয়।

const ok = (message) => console.log(`\x1b[32m  ✅ ${message}\x1b[0m`)
const bad = (message, fix) => {
    console.log(`\x1b[31m  ❌ ${message}\x1b[0m`)
    if (fix) console.log(`\x1b[33m     → ${fix}\x1b[0m`)
}
const warn = (message) => console.log(`\x1b[33m  ⚠️  ${message}\x1b[0m`)
const head = (message) => console.log(`\n\x1b[1m${message}\x1b[0m`)

let failed = 0
const fail = (message, fix) => {
    failed += 1
    bad(message, fix)
}

// ====== 1. env
const checkEnv = () => {
    head('১। .env')

    const required = {
        GEMINI_API_KEY: 'https://aistudio.google.com/apikey থেকে key নাও',
        DB_STRING: 'https://cloud.mongodb.com এ free M0 cluster বানিয়ে connection string নাও',
        OWNER_NUMBER: 'তোমার WhatsApp নম্বর, যেমন 8801712345678',
    }

    for (const [key, fix] of Object.entries(required)) {
        const value = process.env[key]
        if (!value || value.includes('XXXX')) fail(`${key} ভরা হয়নি`, fix)
        else ok(`${key} আছে`)
    }

    if (!process.env.TELEGRAM_BOT_TOKEN || !process.env.TELEGRAM_CHAT_ID) {
        warn('TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID নেই — escalation notification পাবে না (বাকি সব চলবে)')
    } else {
        ok('Telegram এর দুটো key ই আছে')
    }
}

// ====== 2. MongoDB
const checkMongo = async () => {
    head('২। MongoDB')

    if (!process.env.DB_STRING) return fail('DB_STRING নেই, connect করা গেল না')

    try {
        await mongoose.connect(process.env.DB_STRING, { serverSelectionTimeoutMS: 12000 })
        ok(`Connected — database: ${mongoose.connection.name}`)

        const knowledgeSchema = require('../models/knowledgeSchema')
        const contactSchema = require('../models/contactSchema')

        const [knowledge, learned, contacts, blacklisted] = await Promise.all([
            knowledgeSchema.countDocuments(),
            knowledgeSchema.countDocuments({ source: 'learned' }),
            contactSchema.countDocuments(),
            contactSchema.countDocuments({ isBlacklisted: true }),
        ])

        if (knowledge === 0) fail('Knowledge base খালি', 'npm run seed চালাও')
        else ok(`Knowledge base এ ${knowledge} টা entry (শেখা ${learned})`)

        ok(`Contact ${contacts} টা, blacklist এ ${blacklisted} টা`)

        if (blacklisted === 0) {
            warn('Blacklist খালি — bot বন্ধু আর পরিবারের chat এও reply দিবে')
            warn('seed/seedBlacklist.js এ নম্বর বসিয়ে npm run seed:blacklist চালাও')
        }
    } catch (error) {
        fail(`Connect হলো না — ${error.message}`, 'Atlas এ Network Access → 0.0.0.0/0 allow করেছো তো? password এ বিশেষ অক্ষর থাকলে URL-encode করতে হয়')
    }
}

// ====== 3. Gemini
const checkGemini = async () => {
    head('৩। Gemini')

    if (!process.env.GEMINI_API_KEY) return fail('GEMINI_API_KEY নেই')

    try {
        const { generateText } = require('../services/geminiServices')
        const reply = await generateText({ prompt: 'Reply with exactly: PONG' })

        if (reply) ok(`${process.env.GEMINI_MODEL || 'gemini-2.5-flash'} সাড়া দিচ্ছে — "${reply.slice(0, 30)}"`)
        else fail('Gemini খালি উত্তর দিল')
    } catch (error) {
        fail(`Gemini চলল না — ${error.message}`, 'API key টা ঠিক আছে কিনা দেখো')
    }

    try {
        const { embedText } = require('../services/embeddingServices')
        const vector = await embedText('test')

        if (vector.length) ok(`Embedding কাজ করছে — ${vector.length} dimension`)
        else fail('Embedding খালি এল', 'GEMINI_EMBEDDING_MODEL ঠিক আছে কিনা দেখো')
    } catch (error) {
        fail(`Embedding চলল না — ${error.message}`)
    }
}

// ====== 4. Telegram
const checkTelegram = async () => {
    head('৪। Telegram')

    if (!process.env.TELEGRAM_BOT_TOKEN || !process.env.TELEGRAM_CHAT_ID) {
        return warn('বাদ দেওয়া হলো (key নেই)')
    }

    try {
        const { Telegraf } = require('telegraf')
        const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN)

        const me = await bot.telegram.getMe()
        ok(`Bot পাওয়া গেল — @${me.username}`)

        await bot.telegram.sendMessage(
            process.env.TELEGRAM_CHAT_ID,
            '✅ Setup check ঠিক আছে। এই message টা দেখতে পেলে Telegram notification কাজ করছে।'
        )
        ok('তোমার Telegram এ একটা test message পাঠানো হলো — দেখে নাও')
    } catch (error) {
        fail(`Telegram চলল না — ${error.message}`, 'TELEGRAM_CHAT_ID ঠিক আছে? bot কে একবার /start দিয়েছো তো?')
    }
}

// ====== 5. seed ফাইল বদলানো হয়েছে কিনা
const checkSeedFiles = () => {
    head('৫। Seed content')

    const fs = require('fs')
    const path = require('path')

    ok('Assistant দাম বলে না — দাম owner নিজে বলেন, তাই rateCard এর সংখ্যা bot ব্যবহার করে না')

    const chats = fs.readFileSync(path.join(__dirname, 'sample_chats.md'), 'utf8')
    const sampleCount = (chats.match(/^##\s/gm) || []).length
    if (chats.includes('নিচেরগুলো আমার লেখা TEMPLATE')) {
        warn(`sample_chats.md এ ${sampleCount} টা নমুনা আছে, কিন্তু template comment টা এখনো আছে`)
        warn('তোমার আসল client chat বসালে bot অনেক বেশি "তোমার মতো" শোনাবে')
    } else {
        ok(`sample_chats.md এ ${sampleCount} টা নমুনা`)
    }
}

// ====== Run
const run = async () => {
    console.log('\n\x1b[1m🔍 WhatsApp AI Assistant — setup check\x1b[0m')

    checkEnv()
    await checkMongo()
    await checkGemini()
    await checkTelegram()
    checkSeedFiles()

    console.log('')
    if (failed) {
        console.log(`\x1b[31m\x1b[1m${failed} টা সমস্যা আছে — উপরের → চিহ্ন দেখে ঠিক করো\x1b[0m\n`)
    } else {
        console.log('\x1b[32m\x1b[1mসব ঠিক আছে ✅  এখন চালাও:  npm run test:chat\x1b[0m\n')
    }

    await mongoose.connection.close()
    process.exit(failed ? 1 : 0)
}

run().catch(async (error) => {
    console.log(error)
    await mongoose.connection.close()
    process.exit(1)
})
