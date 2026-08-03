const { chat } = require('./geminiServices')
const { searchKnowledge, formatForPrompt } = require('./knowledgeServices')
const { buildSystemInstruction, holdingMessage } = require('./promptServices')
const { toolDeclarations, executeTool } = require('./toolServices')
const { createEscalation } = require('./escalationServices')
const memoryServices = require('./memoryServices')
const { detectLanguage, languageLabel, isScriptCorrect } = require('../utils/languageDetect')
const { chunkReply, toWhatsappFormat } = require('../utils/chunker')
const logger = require('../utils/logger')

const MAX_TOOL_ROUNDS = 4

// ====== response থেকে শুধু text অংশটা
// response.text getter টা function call থাকলে console এ warning ছাপে, তাই নিজেরাই বের করি
const textOf = (response) =>
    (response?.candidates?.[0]?.content?.parts || [])
        .filter((part) => part.text)
        .map((part) => part.text)
        .join('')
        .trim()

// ====== "owner কে জিজ্ঞেস করে জানাচ্ছি" বলেছে কিনা
// Bot মাঝে মাঝে client কে কথা দিয়ে দেয় কিন্তু escalateToOwner tool টা ডাকতে ভুলে যায়।
// তখন client অপেক্ষা করতে থাকে আর owner কিছুই জানে না - সবচেয়ে খারাপ অবস্থা।
// তাই উত্তরে প্রতিশ্রুতি থাকলে অথচ escalation না হলে নিজে থেকেই তৈরি করে দেওয়া হয়।
const OWNER_REF = /mridul|onar|onake|uni\b|ওনার|ওনাকে|উনি|তাকে|তার কাছ|with him|ask him|his call/i
const CONSULT = /jene|jiggesh|jigges|shiddhanto|siddhanto|decision|জেনে|জিজ্ঞেস|সিদ্ধান্ত|জানিয়ে দিচ্ছি|জানাচ্ছি|janacchi|janiye dicchi|check with|confirm with|get back to you/i

const promisedToAsk = (text = '') => OWNER_REF.test(text) && CONSULT.test(text)

// ====== ভাষা মিলিয়ে দেখা
// Prompt এ নিয়ম লেখা থাকলেও LLM মাঝে মাঝে আগের কথার ভাষায় টেনে নিয়ে যায়
// (বাংলায় প্রশ্ন করলে Banglish এ উত্তর দিয়ে দেয়)। তাই শুধু অনুরোধ না করে
// উত্তরটা যাচাই করা হয় - ভুল script হলে একবার আবার লিখতে বলা হয়।
const enforceScript = async ({ text, language, systemInstruction, contents }) => {
    if (!text || isScriptCorrect(text, language)) return text

    logger.warn(`ভুল script এ উত্তর (${language} হওয়ার কথা) - আবার লেখানো হচ্ছে`)

    const rule =
        language === 'bn'
            ? 'পুরো উত্তরটা বাংলা অক্ষরে (বাংলা script এ) লিখতে হবে। শুধু technical term ইংরেজিতে থাকতে পারে।'
            : language === 'banglish'
              ? 'পুরো উত্তরটা English অক্ষরে লিখতে হবে (Banglish) - একটাও বাংলা অক্ষর ব্যবহার করা যাবে না।'
              : 'The entire reply must be in English. Do not use any Bangla characters.'

    contents.push({
        role: 'user',
        parts: [
            {
                text: `[SYSTEM CORRECTION] তোমার শেষ উত্তরটা ভুল script এ লেখা হয়েছে। Client লিখেছে ${languageLabel(language)} এ।\n${rule}\n\nএকই কথা, একই অর্থ - শুধু ঠিক script এ আবার লেখো। অন্য কিছু যোগ করবে না, কোনো ব্যাখ্যা দিবে না।`,
            },
        ],
    })

    try {
        const retry = await chat({ systemInstruction, contents, temperature: 0.3 })
        const fixed = textOf(retry)

        // দ্বিতীয়বারেও ঠিক না হলে যা ছিল তাই থাক
        if (fixed && isScriptCorrect(fixed, language)) return fixed
        return fixed || text
    } catch (error) {
        logger.error('enforceScript failed:', error?.message)
        return text
    }
}

// ====== মূল orchestration
// WhatsApp আর testConversation.js দুটোই এই একই ফাংশন ডাকে
const runPipeline = async ({ contact, text }) => {
    const conversation = await memoryServices.getOrCreateConversation(contact)

    // ====== 1. User message রাখো
    await memoryServices.appendMessage(conversation, 'user', text)

    // ====== 2. ভাষা detect + মনে রাখো
    const language = detectLanguage(text)
    if (contact.language !== language) {
        contact.language = language
        await contact.save()
    }

    // ====== 3. Knowledge retrieve
    const results = await searchKnowledge(text, 5)
    const knowledge = formatForPrompt(results)

    // ====== 4. Prompt build
    // প্রথমবার কথা হলে bot নিজের পরিচয় দিয়ে শুরু করবে
    const isFirstContact = !contact.hasIntroduced

    const systemInstruction = buildSystemInstruction({
        contact,
        knowledge,
        summary: conversation.summary,
        language,
        isFirstContact,
    })

    // ====== 5. History
    const contents = memoryServices.buildContents(conversation)

    // ====== 6. Tool calling loop
    const ctx = { contact, conversation, language, escalations: [] }
    let finalText = ''

    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
        const response = await chat({
            systemInstruction,
            contents,
            tools: toolDeclarations,
            temperature: 0.7,
        })

        const candidate = response?.candidates?.[0]
        const calls = response?.functionCalls || []

        if (candidate?.content) contents.push(candidate.content)

        // ====== Tool call না থাকলে এটাই final উত্তর
        if (!calls.length) {
            finalText = textOf(response)
            break
        }

        logger.info(`Tool round ${round + 1}: ${calls.map((call) => call.name).join(', ')}`)

        const parts = []
        for (const call of calls) {
            const result = await executeTool(call.name, call.args || {}, ctx)
            parts.push({ functionResponse: { name: call.name, response: result || {} } })
        }

        contents.push({ role: 'user', parts })

        // শেষ round এও tool ডাকলে যা text আছে সেটাই নাও
        if (round === MAX_TOOL_ROUNDS - 1) finalText = textOf(response)
    }

    // ====== 7. Escalation থাকলে owner কে পাঠাও
    let escalated = false
    for (const item of ctx.escalations) {
        await createEscalation({
            contact,
            conversation,
            question: item.question || text,
            reason: item.reason,
            language,
        })
        escalated = true
    }

    // ====== 8. উত্তর ফাঁকা হলে fallback
    if (!finalText) {
        // কিছুই বলার নেই অথচ escalate ও হয়নি - তখন নিজে থেকেই escalate করো
        if (!escalated) {
            await createEscalation({
                contact,
                conversation,
                question: text,
                reason: 'low_confidence',
                language,
            })
            escalated = true
        }

        finalText = holdingMessage(language)
    }

    // ====== কথা দিয়েছে অথচ পাঠায়নি? তাহলে নিজেই পাঠিয়ে দাও
    if (!escalated && promisedToAsk(finalText)) {
        logger.warn('Bot জিজ্ঞেস করার কথা দিয়েছে কিন্তু escalate করেনি - নিজে থেকে পাঠানো হচ্ছে')

        await createEscalation({
            contact,
            conversation,
            question: text,
            reason: 'unknown',
            language,
        })

        escalated = true
    }

    // ====== ভাষা ঠিক আছে কিনা যাচাই করে দরকার হলে আবার লেখাও
    finalText = await enforceScript({ text: finalText, language, systemInstruction, contents })

    const clean = toWhatsappFormat(finalText)

    // ====== 9. Persist
    await memoryServices.appendMessage(conversation, 'assistant', clean)
    await memoryServices.summarizeIfNeeded(conversation)

    if (isFirstContact) {
        contact.hasIntroduced = true
        await contact.save()
    }

    const replies = chunkReply(clean, Number(process.env.MAX_MESSAGES_PER_TURN) || 3)

    return { replies, escalated, language, meeting: ctx.bookedMeeting || null }
}

module.exports = { runPipeline }
