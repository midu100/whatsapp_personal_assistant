const { Type } = require('@google/genai')
const { generateJson } = require('./aiServices')
const { addKnowledge } = require('./knowledgeServices')
const logger = require('../utils/logger')

// ====== তুমি reply দিলে সেটা future এর জন্য শিখে রাখা
// দুই জায়গা থেকে ডাকা হয়:
//   1. Telegram এ /ans দিয়ে উত্তর দিলে (escalationServices)
//   2. তুমি নিজে WhatsApp app এ হাতে reply দিলে (messageRouter)

const LEARN_SCHEMA = {
    type: Type.OBJECT,
    properties: {
        worthLearning: { type: Type.BOOLEAN },
        topic: { type: Type.STRING },
        knowledge: { type: Type.STRING },
        reason: { type: Type.STRING },
    },
    required: ['worthLearning', 'knowledge', 'topic'],
}

const SYSTEM = `তুমি একটা knowledge base curator। একটা client এর প্রশ্ন আর owner এর দেওয়া আসল উত্তর দেখে ঠিক করবে -
এটা কি ভবিষ্যতে আবার কাজে লাগবে এমন সাধারণ তথ্য, নাকি শুধু ওই এক client এর জন্য প্রযোজ্য?

worthLearning = false করবে যখন:
- উত্তরটা শুধু ওই নির্দিষ্ট client/project এর জন্য ("তোমার ওই ফাইলটা কালকে পাঠাবো")
- ব্যক্তিগত বা sensitive তথ্য (bank, ঠিকানা, পাসওয়ার্ড)
- শুধু ছোট সৌজন্য কথা ("ok", "ধন্যবাদ", "আচ্ছা")
- সময়ের সাথে বদলে যাবে এমন তথ্য ("আগামী সপ্তাহে ব্যস্ত")

worthLearning = true হলে knowledge ফিল্ডে একটা স্বয়ংসম্পূর্ণ, সাধারণ বাক্য লিখবে যেটা owner সম্পর্কে
একটা স্থায়ী সত্য বলে। নির্দিষ্ট client এর নাম বাদ দিবে। এমনভাবে লিখবে যাতে ভবিষ্যতে অন্য কেউ একই ধরনের
প্রশ্ন করলে এই তথ্যটা দিয়েই উত্তর দেওয়া যায়।

উদাহরণ:
প্রশ্ন: "আপনি কি Figma design থেকে কাজ করতে পারবেন?"
উত্তর: "হ্যাঁ পারি, Figma থেকে pixel perfect করে দেই"
→ knowledge: "Figma design থেকে pixel-perfect frontend বানানো যায় - এটা নিয়মিত করা হয়।"`

// ====== প্রশ্ন + উত্তর → KB entry
const learnFromAnswer = async ({ question, answer, escalation = null }) => {
    try {
        if (!question || !answer) return null
        if (String(answer).trim().length < 15) return null

        const result = await generateJson({
            systemInstruction: SYSTEM,
            responseSchema: LEARN_SCHEMA,
            prompt: `Client এর প্রশ্ন:\n${question}\n\nOwner এর আসল উত্তর:\n${answer}`,
        })

        if (!result || !result.worthLearning) {
            logger.info(`শেখার মতো কিছু নেই - ${result?.reason || 'generic'}`)
            return null
        }

        const doc = await addKnowledge({
            text: result.knowledge,
            topic: result.topic || 'learned',
            source: 'learned',
        })

        if (escalation) {
            escalation.learned = true
            await escalation.save()
        }

        logger.success(`নতুন knowledge শেখা হলো: ${result.knowledge.slice(0, 80)}...`)
        return doc
    } catch (error) {
        logger.error('learnFromAnswer failed:', error?.message)
        return null
    }
}

// ====== তুমি নিজে WhatsApp app এ reply দিলে
// conversation এর শেষ user message টাকেই প্রশ্ন ধরে নেওয়া হয়
const learnFromOwnerReply = async ({ conversation, answer }) => {
    try {
        const messages = conversation?.messages || []

        let question = null
        for (let i = messages.length - 1; i >= 0; i--) {
            if (messages[i].role === 'user') {
                question = messages[i]
                break
            }
        }

        if (!question) return null

        // অনেক পুরনো প্রশ্নের সাথে জোড়া লাগালে ভুল শিখবে - ৩০ মিনিটের বেশি হলে বাদ
        const gap = Date.now() - new Date(question.at).getTime()
        if (gap > 30 * 60 * 1000) return null

        return learnFromAnswer({ question: question.text, answer })
    } catch (error) {
        logger.error('learnFromOwnerReply failed:', error?.message)
        return null
    }
}

module.exports = { learnFromAnswer, learnFromOwnerReply }
