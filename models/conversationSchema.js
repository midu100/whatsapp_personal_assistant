const mongoose = require('mongoose')

const messageItemSchema = new mongoose.Schema(
    {
        role: { type: String, enum: ['user', 'assistant', 'owner'], required: true },
        text: { type: String, default: '' },
        messageId: { type: String },
        at: { type: Date, default: Date.now },
    },
    { _id: false }
)

const conversationSchema = new mongoose.Schema(
    {
        contact: { type: mongoose.Types.ObjectId, ref: 'contact', required: true, index: true },
        jid: { type: String, required: true, index: true },
        messages: [messageItemSchema],
        summary: { type: String, default: '' },
        state: {
            type: String,
            default: 'new',
            enum: ['new', 'qualifying', 'quoted', 'scheduled', 'won', 'lost'],
        },
        lastBotReplyAt: { type: Date, default: null },
        lastUserMessageAt: { type: Date, default: null },
    },
    { timestamps: true }
)

module.exports = mongoose.model('conversation', conversationSchema)
