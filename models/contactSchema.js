const mongoose = require('mongoose')

const contactSchema = new mongoose.Schema(
    {
        jid: { type: String, required: true, unique: true, index: true },
        number: { type: String },
        name: { type: String, default: '' },
        language: { type: String, default: 'bn', enum: ['bn', 'en', 'banglish'] },
        isBlacklisted: { type: Boolean, default: false },
        botEnabled: { type: Boolean, default: true },
        pausedUntil: { type: Date, default: null },
        isKnown: { type: Boolean, default: false },
        hasIntroduced: { type: Boolean, default: false },
        messageCount: { type: Number, default: 0 },
        lastMessageAt: { type: Date, default: null },
        tags: [{ type: String }],
        notes: { type: String, default: '' },
    },
    { timestamps: true }
)

// ====== এই contact এ bot কথা বলতে পারবে কিনা
contactSchema.methods.isBotActive = function () {
    if (this.isBlacklisted) return false
    if (!this.botEnabled) return false
    if (this.pausedUntil && this.pausedUntil > new Date()) return false
    return true
}

module.exports = mongoose.model('contact', contactSchema)
