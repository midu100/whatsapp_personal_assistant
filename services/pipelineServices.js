const { chat } = require('./geminiServices')
const { searchKnowledge, formatForPrompt } = require('./knowledgeServices')
const { buildSystemInstruction, holdingMessage } = require('./promptServices')
const { toolDeclarations, executeTool } = require('./toolServices')
const { createEscalation } = require('./escalationServices')
const memoryServices = require('./memoryServices')
const { detectLanguage } = require('../utils/languageDetect')
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
    const systemInstruction = buildSystemInstruction({
        contact,
        knowledge,
        summary: conversation.summary,
        language,
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

    const clean = toWhatsappFormat(finalText)

    // ====== 9. Persist
    await memoryServices.appendMessage(conversation, 'assistant', clean)
    await memoryServices.summarizeIfNeeded(conversation)

    const replies = chunkReply(clean, Number(process.env.MAX_MESSAGES_PER_TURN) || 3)

    return { replies, escalated, language, meeting: ctx.bookedMeeting || null }
}

module.exports = { runPipeline }
