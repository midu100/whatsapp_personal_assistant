const mongoose = require('mongoose')

const escalationSchema = new mongoose.Schema(
    {
        ticket: { type: Number, index: true },
        contact: { type: mongoose.Types.ObjectId, ref: 'contact', required: true, index: true },
        jid: { type: String, required: true },
        telegramMessageId: { type: Number, default: null, index: true },
        clientName: { type: String, default: '' },
        question: { type: String, required: true },
        context: { type: String, default: '' },
        reason: {
            type: String,
            default: 'unknown',
            enum: [
                'unknown',
                'low_confidence',
                'personal',
                'pricing',
                'complaint',
                'wants_owner',
                'legal',
                'sensitive',
            ],
        },
        language: { type: String, default: 'bn' },
        status: { type: String, default: 'pending', enum: ['pending', 'answered', 'ignored'] },
        ownerAnswer: { type: String, default: '' },
        answeredAt: { type: Date, default: null },
        learned: { type: Boolean, default: false },
    },
    { timestamps: true }
)

module.exports = mongoose.model('escalation', escalationSchema)
