require('dotenv').config()
const mongoose = require('mongoose')

const dbConfig = require('../dbConfig')
const contactSchema = require('../models/contactSchema')
const { toJid } = require('../services/helpers')
const logger = require('../utils/logger')

// ⚠️ Bot চালু করার আগে এটা একবার চালাও ⚠️
//
// Bot তোমার personal নম্বরে চলবে, মানে বন্ধু আর পরিবারের chat এও ঢুকবে।
// নিচের list এ যাদের নম্বর দিবে, bot তাদের সাথে কখনো কথা বলবে না।
//
// ব্যবহার:  node seed/seedBlacklist.js
// পরে যেকোনো chat এ WhatsApp থেকেই  /bl  লিখলেও blacklist হয়ে যাবে।

const BLACKLIST = [
    '8801716150685',  // আম্মু
    '8801325075442',  // আব্বু
    // '8801XXXXXXXXX',  // ছোট ভাই
    // '8801XXXXXXXXX',  // বেস্ট ফ্রেন্ড
]

const run = async () => {
    await dbConfig()

    if (!BLACKLIST.length) {
        logger.warn('BLACKLIST array খালি - seed/seedBlacklist.js খুলে নম্বর গুলো বসাও।')
        logger.warn('না বসালে bot তোমার বন্ধু আর পরিবারের message এও reply দিবে।')
        await mongoose.connection.close()
        return
    }

    for (const number of BLACKLIST) {
        const jid = toJid(number)

        await contactSchema.findOneAndUpdate(
            { jid },
            {
                $set: { isBlacklisted: true, botEnabled: false, isKnown: true },
                $setOnInsert: { jid, number: String(number).replace(/\D/g, '') },
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        )

        logger.success(`Blacklisted - ${number}`)
    }

    const total = await contactSchema.countDocuments({ isBlacklisted: true })
    logger.success(`মোট ${total} টা নম্বর blacklist এ আছে ✅`)

    await mongoose.connection.close()
}

run().catch(async (error) => {
    logger.error(error?.message || error)
    await mongoose.connection.close()
    process.exit(1)
})
