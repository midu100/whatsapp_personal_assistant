const { downloadMediaMessage } = require('baileys')
const memoryServices = require('../services/memoryServices')
const { runPipeline } = require('../services/pipelineServices')
const { transcribeAudio } = require('../services/geminiServices')
const learnServices = require('../services/learnServices')
const { handleCommand } = require('./commandHandler')
const debouncer = require('./debouncer')
const { sendReplies, markRead } = require('./humanize')
const { toNumber } = require('../services/helpers')
const logger = require('../utils/logger')

// ====== প্রতিটা message এখান দিয়ে যায় - কে পাবে, কে পাবে না সেটা এখানেই ঠিক হয়

const HANDOVER_MS = 2 * 60 * 60 * 1000

// ====== message থেকে text বের করো
const extractText = (message) => {
    const content = message?.message
    if (!content) return ''

    return (
        content.conversation ||
        content.extendedTextMessage?.text ||
        content.imageMessage?.caption ||
        content.videoMessage?.caption ||
        content.documentMessage?.caption ||
        content.buttonsResponseMessage?.selectedDisplayText ||
        content.listResponseMessage?.title ||
        content.templateButtonReplyMessage?.selectedDisplayText ||
        ''
    ).trim()
}

// ====== voice note কিনা
const isVoiceNote = (message) => Boolean(message?.message?.audioMessage)

// ====== Voice note নামিয়ে লেখায় রূপান্তর
const transcribeVoiceNote = async (sock, message) => {
    try {
        const audio = message.message.audioMessage

        // খুব লম্বা voice note (২ মিনিটের বেশি) নামানোর দরকার নেই
        if (Number(audio.seconds || 0) > 120) return ''

        const buffer = await downloadMediaMessage(
            message,
            'buffer',
            {},
            { reuploadRequest: sock.updateMediaMessage }
        )

        if (!buffer || !buffer.length) return ''

        const text = await transcribeAudio(buffer, audio.mimetype || 'audio/ogg')
        if (text) logger.info(`🎤 Voice note → "${text.slice(0, 60)}"`)

        return text
    } catch (error) {
        logger.error('transcribeVoiceNote failed:', error?.message)
        return ''
    }
}

const isGroup = (jid) => String(jid).endsWith('@g.us')
const isBroadcast = (jid) => String(jid).endsWith('@broadcast') || String(jid) === 'status@broadcast'

const ownerJid = () => {
    const number = String(process.env.OWNER_NUMBER || '').replace(/\D/g, '')
    return number ? `${number}@s.whatsapp.net` : null
}

// ====== Route
const routeMessage = async ({ sock, message, startedAt }) => {
    const jid = message?.key?.remoteJid
    if (!jid) return

    // ====== Group, broadcast, status - কখনো নয়
    if (isGroup(jid) || isBroadcast(jid)) return

    const fromMe = Boolean(message.key.fromMe)
    const text = extractText(message)

    // ====== Bot চালু হওয়ার আগের পুরনো message এ কখনো উত্তর দিবে না
    // (connect হলে Baileys জমে থাকা সব message একসাথে পাঠায় - না আটকালে
    //  পুরনো সব chat এ হুট করে reply চলে যাবে, যেটা ban এর সবচেয়ে বড় কারণ)
    const timestamp = Number(message.messageTimestamp) * 1000
    if (timestamp && timestamp < startedAt - 60 * 1000) return

    // ====== তোমার নিজের command (যেকোনো chat এ)
    if (fromMe && text.startsWith('/')) {
        const handled = await handleCommand({ sock, jid, text })
        if (handled) return
    }

    // ====== নিজের self chat - এখানে শুধু command চলবে, আর কিছু নয়
    if (jid === ownerJid()) return

    // ====== তুমি নিজে হাতে reply দিয়েছো → handover + শেখা
    if (fromMe) {
        if (!text) return
        await handleOwnerReply({ jid, text })
        return
    }

    // ====== এখান থেকে client এর message
    const contact = await memoryServices.getOrCreateContact(jid, message.pushName || '')

    contact.messageCount += 1
    contact.lastMessageAt = new Date()
    await contact.save()

    await markRead(sock, message.key)

    // ====== Global kill switch
    if (process.env.BOT_ENABLED === 'false') return

    // ====== Blacklist / off / paused
    if (!contact.isBotActive()) {
        logger.info(`Bot চুপ - ${contact.name || jid}`)
        return
    }

    // ====== শুধু নতুন contact এ reply দেওয়ার mode
    if (process.env.REPLY_TO_UNKNOWN_ONLY === 'true' && contact.isKnown) return

    // ====== Voice note হলে আগে লেখায় রূপান্তর
    let content = text

    if (!content && isVoiceNote(message)) {
        content = await transcribeVoiceNote(sock, message)

        if (!content) {
            await sendReplies(sock, jid, [
                contact.language === 'en'
                    ? "Sorry, I couldn't catch that voice note — could you type it out?"
                    : 'দুঃখিত, voice note টা ঠিকমতো বুঝতে পারলাম না। একটু লিখে দিলে ভালো হয়।',
            ])
            return
        }
    }

    if (!content) return

    logger.chat(`← ${contact.name || toNumber(jid)}: ${content.slice(0, 80)}`)

    // ====== একাধিক message merge করে তারপর একবারে উত্তর
    debouncer.push(jid, content, async (merged) => {
        await processMessage({ sock, contact, text: merged })
    })
}

// ====== Pipeline চালিয়ে উত্তর পাঠানো
const processMessage = async ({ sock, contact, text }) => {
    try {
        // debounce এর সময়ের মধ্যে তুমি নিজে reply দিয়ে থাকতে পারো
        const fresh = await memoryServices.getOrCreateContact(contact.jid)
        if (!fresh.isBotActive() || process.env.BOT_ENABLED === 'false') return

        const { replies, escalated } = await runPipeline({ contact: fresh, text })

        await sendReplies(sock, contact.jid, replies)

        logger.chat(`→ ${fresh.name || toNumber(contact.jid)}: ${replies.join(' | ').slice(0, 80)}${escalated ? ' [escalated]' : ''}`)
    } catch (error) {
        logger.error('processMessage failed:', error?.message)
    }
}

// ====== তুমি নিজে reply দিলে যা হয়
const handleOwnerReply = async ({ jid, text }) => {
    try {
        // জমে থাকা message এর উত্তর আর যাবে না - তুমি তো নিজেই দিলে
        debouncer.cancel(jid)

        const contact = await memoryServices.getOrCreateContact(jid)
        const conversation = await memoryServices.getOrCreateConversation(contact)

        // ====== Handover - তুমি কথা বলছো, bot চুপ থাকুক
        contact.pausedUntil = new Date(Date.now() + HANDOVER_MS)
        contact.isKnown = true
        await contact.save()

        logger.info(`Handover - ${contact.name || jid} (২ ঘন্টা bot চুপ)`)

        // ====== শেখা (fire and forget)
        learnServices.learnFromOwnerReply({ conversation, answer: text }).catch((err) => console.log(err))

        await memoryServices.appendMessage(conversation, 'owner', text)
    } catch (error) {
        logger.error('handleOwnerReply failed:', error?.message)
    }
}

module.exports = { routeMessage, extractText, isGroup, ownerJid }
