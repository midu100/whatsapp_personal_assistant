const { Telegraf } = require('telegraf')
const logger = require('../utils/logger')

// ====== Telegram bot - escalation notification আর owner এর reply এখান দিয়ে যায়

let bot = null
let started = false

const chatId = () => process.env.TELEGRAM_CHAT_ID

const isEnabled = () => Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID)

// ====== সাধারণ notification
const sendToOwner = async (text, extra = {}) => {
    if (!isEnabled() || !bot) return null

    try {
        return await bot.telegram.sendMessage(chatId(), text, { parse_mode: 'HTML', ...extra })
    } catch (error) {
        logger.error('Telegram send failed:', error?.message)
        return null
    }
}

// ====== Escalation notification (reply দিলেই উত্তর চলে যাবে)
const sendEscalation = async (escalation, contact) => {
    const text = [
        `🔔 <b>Escalation #${escalation.ticket}</b>`,
        '',
        `👤 <b>${contact.name || 'Unknown'}</b> (<code>${contact.number || contact.jid}</code>)`,
        `📌 কারণ: <code>${escalation.reason}</code>`,
        '',
        `❓ <b>প্রশ্ন</b>\n${escalation.question}`,
        '',
        escalation.context ? `💬 <b>Context</b>\n<i>${escalation.context}</i>` : '',
        '',
        `➡️ এই message এ <b>reply</b> দাও, অথবা লেখো:\n<code>/ans ${escalation.ticket} তোমার উত্তর</code>`,
    ]
        .filter(Boolean)
        .join('\n')

    return sendToOwner(text)
}

// ====== Bot start (command গুলো এখানে)
const startTelegram = async () => {
    if (!isEnabled()) {
        logger.warn('Telegram disabled - TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID নেই')
        return null
    }

    if (started) return bot

    bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN)

    // ====== শুধু owner এর chat থেকেই command নিবে
    bot.use(async (ctx, next) => {
        if (String(ctx.chat?.id) !== String(chatId())) return
        return next()
    })

    bot.start((ctx) => ctx.reply('WhatsApp AI Assistant চালু আছে ✅\n\n/help দিয়ে command গুলো দেখো।'))

    bot.command('help', (ctx) =>
        ctx.reply(
            [
                '/pending - যেসব প্রশ্নের উত্তর দেওয়া হয়নি',
                '/ans <ticket> <উত্তর> - উত্তর পাঠাও (বা notification এ সরাসরি reply দাও)',
                '/leads - সর্বশেষ lead গুলো',
                '/meetings - আসন্ন meeting',
                '/stats - সংক্ষিপ্ত হিসাব',
                '/kb <text> - knowledge base এ নতুন তথ্য যোগ করো',
                '/say <number> <text> - কোনো নম্বরে সরাসরি message পাঠাও',
                '/botoff , /boton - পুরো bot বন্ধ / চালু',
            ].join('\n')
        )
    )

    // ====== Pending escalations
    bot.command('pending', async (ctx) => {
        const escalationSchema = require('../models/escalationSchema')
        const pending = await escalationSchema.find({ status: 'pending' }).sort({ createdAt: -1 }).limit(10).lean()

        if (!pending.length) return ctx.reply('কোনো pending প্রশ্ন নেই ✅')

        const text = pending
            .map((item) => `#${item.ticket} — ${item.clientName || item.jid}\n${item.question}`)
            .join('\n\n')

        return ctx.reply(text)
    })

    // ====== Answer
    bot.command('ans', async (ctx) => {
        const raw = ctx.message.text.replace(/^\/ans(@\S+)?\s*/, '').trim()
        const match = raw.match(/^(\d+)\s+([\s\S]+)$/)

        if (!match) return ctx.reply('ব্যবহার: /ans <ticket> <উত্তর>')

        const escalationServices = require('./escalationServices')
        const result = await escalationServices.answerEscalation(Number(match[1]), match[2].trim())

        return ctx.reply(result.message)
    })

    // ====== Notification এ সরাসরি reply দিলে
    bot.on('message', async (ctx, next) => {
        const replyTo = ctx.message?.reply_to_message?.message_id
        const text = ctx.message?.text

        if (!replyTo || !text || text.startsWith('/')) return next()

        const escalationSchema = require('../models/escalationSchema')
        const escalation = await escalationSchema.findOne({ telegramMessageId: replyTo, status: 'pending' })

        if (!escalation) return next()

        const escalationServices = require('./escalationServices')
        const result = await escalationServices.answerEscalation(escalation.ticket, text.trim())

        return ctx.reply(result.message)
    })

    // ====== Leads
    bot.command('leads', async (ctx) => {
        const leadSchema = require('../models/leadSchema')
        const leads = await leadSchema.find().sort({ createdAt: -1 }).limit(10).lean()

        if (!leads.length) return ctx.reply('এখনো কোনো lead নেই।')

        const text = leads
            .map(
                (lead) =>
                    `${lead.score >= 60 ? '🔥' : '•'} ${lead.clientName || lead.jid}\n${lead.projectType || '-'} | score ${lead.score} | ${lead.status}\n${lead.estimateNote || ''}`
            )
            .join('\n\n')

        return ctx.reply(text)
    })

    // ====== Meetings
    bot.command('meetings', async (ctx) => {
        const meetingSchema = require('../models/meetingSchema')
        const { formatSlot } = require('./schedulingServices')

        const meetings = await meetingSchema
            .find({ slotStart: { $gte: new Date() }, status: { $in: ['requested', 'confirmed'] } })
            .sort({ slotStart: 1 })
            .limit(10)
            .lean()

        if (!meetings.length) return ctx.reply('আসন্ন কোনো meeting নেই।')

        const text = meetings
            .map((meeting) => `📅 ${formatSlot(meeting.slotStart)}\n${meeting.clientName || meeting.jid}\n${meeting.notes || ''}`)
            .join('\n\n')

        return ctx.reply(text)
    })

    // ====== Stats
    bot.command('stats', async (ctx) => {
        const contactSchema = require('../models/contactSchema')
        const leadSchema = require('../models/leadSchema')
        const escalationSchema = require('../models/escalationSchema')
        const knowledgeSchema = require('../models/knowledgeSchema')

        const [contacts, leads, hotLeads, pending, knowledge, learned] = await Promise.all([
            contactSchema.countDocuments(),
            leadSchema.countDocuments(),
            leadSchema.countDocuments({ score: { $gte: 60 } }),
            escalationSchema.countDocuments({ status: 'pending' }),
            knowledgeSchema.countDocuments(),
            knowledgeSchema.countDocuments({ source: 'learned' }),
        ])

        return ctx.reply(
            [
                `👥 Contact: ${contacts}`,
                `📋 Lead: ${leads} (hot ${hotLeads})`,
                `🔔 Pending escalation: ${pending}`,
                `🧠 Knowledge: ${knowledge} (শেখা ${learned})`,
                `🤖 Bot: ${process.env.BOT_ENABLED === 'false' ? 'বন্ধ' : 'চালু'}`,
            ].join('\n')
        )
    })

    // ====== KB তে নতুন তথ্য
    bot.command('kb', async (ctx) => {
        const text = ctx.message.text.replace(/^\/kb(@\S+)?\s*/, '').trim()
        if (!text) return ctx.reply('ব্যবহার: /kb <যে তথ্যটা মনে রাখতে হবে>')

        const { addKnowledge } = require('./knowledgeServices')
        await addKnowledge({ text, source: 'manual', topic: 'manual' })

        return ctx.reply('Knowledge base এ যোগ হয়েছে ✅')
    })

    // ====== সরাসরি message পাঠানো
    bot.command('say', async (ctx) => {
        const raw = ctx.message.text.replace(/^\/say(@\S+)?\s*/, '').trim()
        const match = raw.match(/^(\d+)\s+([\s\S]+)$/)

        if (!match) return ctx.reply('ব্যবহার: /say 8801XXXXXXXXX <message>')

        const { sendText } = require('../whatsapp')
        await sendText(`${match[1]}@s.whatsapp.net`, match[2].trim())

        return ctx.reply('পাঠানো হয়েছে ✅')
    })

    // ====== Global kill switch
    bot.command('botoff', async (ctx) => {
        process.env.BOT_ENABLED = 'false'
        return ctx.reply('🔴 Bot বন্ধ। এখন থেকে কোনো auto reply যাবে না।')
    })

    bot.command('boton', async (ctx) => {
        process.env.BOT_ENABLED = 'true'
        return ctx.reply('🟢 Bot চালু।')
    })

    bot.catch((error) => logger.error('Telegram bot error:', error?.message))

    // launch() কখনো resolve করে না, তাই await করা যাবে না
    bot.launch().catch((error) => logger.error('Telegram launch failed:', error?.message))

    started = true
    logger.success('Telegram bot চালু')

    return bot
}

const stopTelegram = (signal = 'SIGTERM') => {
    if (bot && started) {
        try {
            bot.stop(signal)
        } catch (error) {
            console.log(error)
        }
    }
}

module.exports = { startTelegram, stopTelegram, sendToOwner, sendEscalation, isEnabled }
