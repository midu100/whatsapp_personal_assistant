const contactSchema = require('../models/contactSchema')
const leadSchema = require('../models/leadSchema')
const escalationSchema = require('../models/escalationSchema')
const knowledgeSchema = require('../models/knowledgeSchema')
const { addKnowledge, getCacheInfo } = require('../services/knowledgeServices')
const { remaining } = require('../utils/rateLimit')
const logger = require('../utils/logger')

// ====== তুমি WhatsApp এ যেকোনো chat এ এই command গুলো লিখতে পারো
// (fromMe message, তাই শুধু তুমিই লিখতে পারবে)

const HELP = `🤖 *Bot commands*

/off — এই chat এ bot বন্ধ
/on — এই chat এ bot চালু
/pause 2h — এই chat এ ২ ঘন্টা চুপ (m/h/d চলবে)
/bl — এই contact কে blacklist করো
/unbl — blacklist থেকে বের করো
/status — এই chat এর অবস্থা
/note <text> — এই contact এর নোট
/kb <text> — knowledge base এ যোগ করো

/botoff — সব chat এ bot বন্ধ
/boton — সব chat এ bot চালু
/stats — সংক্ষিপ্ত হিসাব
/pending — pending প্রশ্ন`

// ====== "2h" / "30m" / "1d" → milliseconds
const parseDuration = (input) => {
    const match = String(input || '').match(/^(\d+)\s*([mhd])$/i)
    if (!match) return null

    const value = Number(match[1])
    const unit = match[2].toLowerCase()
    const factor = { m: 60 * 1000, h: 60 * 60 * 1000, d: 24 * 60 * 60 * 1000 }

    return value * factor[unit]
}

// ====== Command handle
// return true মানে এটা command ছিল, message pipeline এ যাবে না
const handleCommand = async ({ sock, jid, text }) => {
    const [rawCommand, ...rest] = text.trim().split(/\s+/)
    const command = rawCommand.toLowerCase()
    const argument = rest.join(' ').trim()

    const reply = async (message) => {
        try {
            await sock.sendMessage(jid, { text: message })
        } catch (error) {
            console.log(error)
        }
    }

    const contact = await contactSchema.findOne({ jid })

    switch (command) {
        // ====== Help
        case '/help':
            await reply(HELP)
            return true

        // ====== এই chat এ bot বন্ধ / চালু
        case '/off': {
            if (!contact) {
                await reply('এই contact এখনো DB তে নেই।')
                return true
            }
            contact.botEnabled = false
            await contact.save()
            await reply('🔴 এই chat এ bot বন্ধ।')
            return true
        }

        case '/on': {
            const target = contact || (await contactSchema.create({ jid, number: String(jid).split('@')[0] }))
            target.botEnabled = true
            target.isBlacklisted = false
            target.pausedUntil = null
            await target.save()
            await reply('🟢 এই chat এ bot চালু।')
            return true
        }

        // ====== Pause
        case '/pause': {
            if (!contact) return true
            const ms = parseDuration(argument) || 2 * 60 * 60 * 1000
            contact.pausedUntil = new Date(Date.now() + ms)
            await contact.save()
            await reply(`⏸️ ${argument || '2h'} এর জন্য চুপ থাকবে।`)
            return true
        }

        // ====== Blacklist
        case '/bl': {
            const target = contact || (await contactSchema.create({ jid, number: String(jid).split('@')[0] }))
            target.isBlacklisted = true
            await target.save()
            await reply('🚫 Blacklist করা হলো। এই chat এ bot আর কখনো কথা বলবে না।')
            return true
        }

        case '/unbl': {
            if (!contact) return true
            contact.isBlacklisted = false
            await contact.save()
            await reply('✅ Blacklist থেকে বের করা হলো।')
            return true
        }

        // ====== Status
        case '/status': {
            if (!contact) {
                await reply('এই contact এখনো DB তে নেই।')
                return true
            }

            const paused = contact.pausedUntil && contact.pausedUntil > new Date()
            const lead = await leadSchema.findOne({ contact: contact._id }).lean()

            await reply(
                [
                    `👤 ${contact.name || contact.number}`,
                    `Bot: ${contact.isBotActive() ? '🟢 চালু' : '🔴 বন্ধ'}`,
                    contact.isBlacklisted ? 'Blacklisted 🚫' : '',
                    paused ? `Paused: ${contact.pausedUntil.toLocaleString()}` : '',
                    `ভাষা: ${contact.language}`,
                    `Message: ${contact.messageCount}`,
                    `এই ঘন্টায় বাকি: ${remaining(jid)}`,
                    lead ? `\n📋 Lead: ${lead.projectType || '-'} | score ${lead.score} | ${lead.status}` : '',
                    lead?.estimateNote ? `💰 ${lead.estimateNote}` : '',
                ]
                    .filter(Boolean)
                    .join('\n')
            )
            return true
        }

        // ====== Note
        case '/note': {
            if (!contact || !argument) return true
            contact.notes = argument
            await contact.save()
            await reply('📝 নোট রাখা হলো।')
            return true
        }

        // ====== Knowledge base
        case '/kb': {
            if (!argument) {
                await reply('ব্যবহার: /kb <যে তথ্যটা মনে রাখতে হবে>')
                return true
            }
            await addKnowledge({ text: argument, source: 'manual', topic: 'manual' })
            await reply('🧠 Knowledge base এ যোগ হয়েছে।')
            return true
        }

        // ====== Global switch
        case '/botoff':
            process.env.BOT_ENABLED = 'false'
            await reply('🔴 সব chat এ bot বন্ধ।')
            logger.warn('Bot globally disabled')
            return true

        case '/boton':
            process.env.BOT_ENABLED = 'true'
            await reply('🟢 সব chat এ bot চালু।')
            logger.success('Bot globally enabled')
            return true

        // ====== Stats
        case '/stats': {
            const [contacts, leads, hot, pending, knowledge, learned] = await Promise.all([
                contactSchema.countDocuments(),
                leadSchema.countDocuments(),
                leadSchema.countDocuments({ score: { $gte: 60 } }),
                escalationSchema.countDocuments({ status: 'pending' }),
                knowledgeSchema.countDocuments(),
                knowledgeSchema.countDocuments({ source: 'learned' }),
            ])

            await reply(
                [
                    `👥 Contact: ${contacts}`,
                    `📋 Lead: ${leads} (hot ${hot})`,
                    `🔔 Pending: ${pending}`,
                    `🧠 Knowledge: ${knowledge} (শেখা ${learned})`,
                    `⚡ Cache: ${getCacheInfo().size}`,
                    `🤖 Bot: ${process.env.BOT_ENABLED === 'false' ? '🔴 বন্ধ' : '🟢 চালু'}`,
                ].join('\n')
            )
            return true
        }

        // ====== Pending escalations
        case '/pending': {
            const pending = await escalationSchema.find({ status: 'pending' }).sort({ createdAt: -1 }).limit(10).lean()

            if (!pending.length) {
                await reply('কোনো pending প্রশ্ন নেই ✅')
                return true
            }

            await reply(
                pending.map((item) => `#${item.ticket} — ${item.clientName || item.jid}\n${item.question}`).join('\n\n')
            )
            return true
        }

        default:
            return false
    }
}

module.exports = { handleCommand, HELP }
