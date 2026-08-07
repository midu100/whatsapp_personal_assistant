const geminiServices = require('./geminiServices')
const claudeServices = require('./claudeServices')

// ====== কোন AI দিয়ে কথা বলবে সেটা এখানে ঠিক হয়
//
// AI_PROVIDER=gemini (default) | claude
//
// ⚠️ শুধু কথা বলার অংশটা swap হয়। Embedding (knowledge base search) আর voice
// note বোঝা সবসময় Gemini তেই থাকে - Claude এর embeddings API নেই আর audio ও
// বোঝে না। তাই client Claude key দিলেও Gemini key লাগবেই।

const provider = () => (process.env.AI_PROVIDER === 'claude' ? 'claude' : 'gemini')

const active = () => (provider() === 'claude' ? claudeServices : geminiServices)

const chat = (params) => active().chat(params)
const generateText = (params) => active().generateText(params)
const generateJson = (params) => active().generateJson(params)

// ====== এই দুটো কখনো swap হয় না
const { embedText, embedQuery, embedMany, cosineSimilarity } = require('./embeddingServices')
const { transcribeAudio } = geminiServices

module.exports = {
    provider,
    chat,
    generateText,
    generateJson,
    transcribeAudio,
    embedText,
    embedQuery,
    embedMany,
    cosineSimilarity,
}
