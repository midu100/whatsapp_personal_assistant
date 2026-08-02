const escalationSchema = require('../models/escalationSchema')
const contactSchema = require('../models/contactSchema')
const telegramServices = require('./telegramServices')
const logger = require('../utils/logger')

// ====== যা bot জানে না, সেটা তোমার কাছে পাঠানো - আর তোমার উত্তর client এর কাছে ফেরত

// ====== পরের ticket নম্বর
const nextTicket = async () => {
    const last = await escalationSchema.findOne().sort({ ticket: -1 }).select('ticket').lean()
    return (last?.ticket || 0) + 1
}

// ====== শেষ কয়েকটা message কে context বানানো
const buildContext = (conversation, limit = 6) =>
    (conversation?.messages || [])
        .slice(-limit)
        .map((message) => `${message.role === 'user' ? 'Client' : 'Bot'}: ${message.text}`)
        .join('\n')

// ====== Escalation তৈরি + owner কে notify
const createEscalation = async ({ contact, conversation, question, reason = 'unknown', language = 'bn' }) => {
    try {
        const ticket = await nextTicket()

        const escalation = await escalationSchema.create({
            ticket,
            contact: contact._id,
            jid: contact.jid,
            clientName: contact.name || '',
            question,
            context: buildContext(conversation),
            reason,
            language,
        })

        // ====== Telegram
        const sent = await telegramServices.sendEscalation(escalation, contact)
        if (sent?.message_id) {
            escalation.telegramMessageId = sent.message_id
            await escalation.save()
        }

        // ====== তোমার নিজের WhatsApp (self chat) - backup notification
        await notifyOwnerWhatsapp(escalation, contact)

        logger.warn(`Escalation #${ticket} তৈরি - ${contact.name || contact.jid}`)
        return escalation
    } catch (error) {
        logger.error('createEscalation failed:', error?.message)
        return null
    }
}

// ====== নিজের নম্বরে (self chat) notification
const notifyOwnerWhatsapp = async (escalation, contact) => {
    try {
        const ownerNumber = process.env.OWNER_NUMBER
        if (!ownerNumber) return

        // circular import এড়াতে lazy require
        const { sendText, isConnected } = require('../whatsapp')
        if (!isConnected()) return

        const text = [
            `🔔 Escalation #${escalation.ticket}`,
            `${contact.name || 'Unknown'} (${contact.number || contact.jid})`,
            '',
            escalation.question,
            '',
            `Telegram এ /ans ${escalation.ticket} দিয়ে উত্তর দাও।`,
        ].join('\n')

        await sendText(`${ownerNumber}@s.whatsapp.net`, text, { raw: true })
    } catch (error) {
        logger.error('notifyOwnerWhatsapp failed:', error?.message)
    }
}

// ====== তোমার উত্তর → client এর WhatsApp → তারপর শেখা
const answerEscalation = async (ticket, answer) => {
    try {
        const escalation = await escalationSchema.findOne({ ticket })
        if (!escalation) return { ok: false, message: `Ticket #${ticket} পাওয়া যায়নি।` }
        if (escalation.status === 'answered') return { ok: false, message: `Ticket #${ticket} এর উত্তর আগেই দেওয়া হয়েছে।` }

        const contact = await contactSchema.findById(escalation.contact)
        if (!contact) return { ok: false, message: 'Contact পাওয়া যায়নি।' }

        // ====== Client কে পাঠাও
        const { sendText, isConnected } = require('../whatsapp')
        if (!isConnected()) return { ok: false, message: 'WhatsApp connected নয়, একটু পরে চেষ্টা করো।' }

        await sendText(contact.jid, answer)

        // ====== Conversation এ রাখো
        const memoryServices = require('./memoryServices')
        const conversation = await memoryServices.getOrCreateConversation(contact)
        await memoryServices.appendMessage(conversation, 'assistant', answer)

        escalation.status = 'answered'
        escalation.ownerAnswer = answer
        escalation.answeredAt = new Date()
        await escalation.save()

        // ====== এখান থেকেই শেখা (fire and forget)
        const learnServices = require('./learnServices')
        learnServices
            .learnFromAnswer({ question: escalation.question, answer, escalation })
            .catch((err) => console.log(err))

        logger.success(`Ticket #${ticket} এর উত্তর পাঠানো হয়েছে`)
        return { ok: true, message: `✅ #${ticket} এর উত্তর ${contact.name || contact.number} কে পাঠানো হয়েছে। KB তেও শেখানো হচ্ছে।` }
    } catch (error) {
        logger.error('answerEscalation failed:', error?.message)
        return { ok: false, message: 'উত্তর পাঠাতে সমস্যা হয়েছে।' }
    }
}

module.exports = { createEscalation, answerEscalation, notifyOwnerWhatsapp, buildContext }
