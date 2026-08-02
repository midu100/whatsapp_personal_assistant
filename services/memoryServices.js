const contactSchema = require('../models/contactSchema')
const conversationSchema = require('../models/conversationSchema')
const { generateText } = require('./geminiServices')
const logger = require('../utils/logger')

const WINDOW_SIZE = 20
const SUMMARIZE_AFTER = 30

// ====== Contact খুঁজে আনো, না থাকলে বানাও
const getOrCreateContact = async (jid, pushName = '') => {
    let contact = await contactSchema.findOne({ jid })

    if (!contact) {
        contact = await contactSchema.create({
            jid,
            number: String(jid).split('@')[0],
            name: pushName || '',
        })
        logger.info(`নতুন contact: ${pushName || jid}`)
    } else if (pushName && !contact.name) {
        contact.name = pushName
        await contact.save()
    }

    return contact
}

// ====== Conversation খুঁজে আনো, না থাকলে বানাও
const getOrCreateConversation = async (contact) => {
    let conversation = await conversationSchema.findOne({ contact: contact._id })

    if (!conversation) {
        conversation = await conversationSchema.create({ contact: contact._id, jid: contact.jid, messages: [] })
    }

    return conversation
}

// ====== Message যোগ করা
const appendMessage = async (conversation, role, text, messageId = '') => {
    conversation.messages.push({ role, text, messageId, at: new Date() })

    if (role === 'user') conversation.lastUserMessageAt = new Date()
    if (role === 'assistant') conversation.lastBotReplyAt = new Date()

    await conversation.save()
    return conversation
}

// ====== শেষ N টা message Gemini format এ
const buildContents = (conversation, windowSize = WINDOW_SIZE) => {
    const recent = (conversation.messages || []).slice(-windowSize)

    const mapped = recent
        .filter((message) => message.text)
        .map((message) => ({
            // owner এর manual reply ও model এর কথা হিসেবেই যাবে
            role: message.role === 'user' ? 'user' : 'model',
            parts: [{ text: message.text }],
        }))

    // history সবসময় user এর কথা দিয়ে শুরু হতে হবে
    const firstUser = mapped.findIndex((item) => item.role === 'user')
    return firstUser <= 0 ? mapped : mapped.slice(firstUser)
}

// ====== পুরনো message গুলো summary তে compress
const summarizeIfNeeded = async (conversation) => {
    try {
        const total = conversation.messages.length
        if (total <= SUMMARIZE_AFTER) return conversation

        const older = conversation.messages.slice(0, total - WINDOW_SIZE)
        if (!older.length) return conversation

        const transcript = older
            .map((message) => `${message.role === 'user' ? 'Client' : 'Me'}: ${message.text}`)
            .join('\n')

        const summary = await generateText({
            systemInstruction:
                'তুমি একটা conversation summarizer। সংক্ষেপে, তথ্যবহুলভাবে লিখবে। কোনো মন্তব্য নয়, শুধু summary।',
            prompt: `আগের summary:\n${conversation.summary || '(নেই)'}\n\nনতুন যে অংশটা summary তে ঢোকাতে হবে:\n${transcript}\n\nএই দুটো মিলিয়ে একটা updated summary লেখো (সর্বোচ্চ ১৫০ শব্দ)। client এর নাম, project type, budget, timeline, কী কী decision হয়েছে - এগুলো অবশ্যই রাখবে।`,
        })

        if (summary) {
            conversation.summary = summary
            conversation.messages = conversation.messages.slice(-WINDOW_SIZE)
            await conversation.save()
            logger.info(`Conversation summarized - ${conversation.jid}`)
        }

        return conversation
    } catch (error) {
        logger.error('summarizeIfNeeded failed:', error?.message)
        return conversation
    }
}

// ====== শেষ user message (learn এর জন্য লাগে)
const getLastUserMessage = (conversation) => {
    const messages = conversation.messages || []
    for (let i = messages.length - 1; i >= 0; i--) {
        if (messages[i].role === 'user') return messages[i]
    }
    return null
}

module.exports = {
    getOrCreateContact,
    getOrCreateConversation,
    appendMessage,
    buildContents,
    summarizeIfNeeded,
    getLastUserMessage,
    WINDOW_SIZE,
}
