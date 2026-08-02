const mongoose = require('mongoose')

const leadSchema = new mongoose.Schema(
    {
        contact: { type: mongoose.Types.ObjectId, ref: 'contact', required: true, index: true },
        jid: { type: String, required: true },
        clientName: { type: String, default: '' },
        projectType: { type: String, default: '' },
        requirements: { type: String, default: '' },
        features: [{ type: String }],
        budget: { type: String, default: '' },
        timeline: { type: String, default: '' },
        decisionMaker: { type: Boolean, default: false },
        score: { type: Number, default: 0, min: 0, max: 100 },
        scoreReason: { type: String, default: '' },
        estimateMin: { type: Number, default: 0 },
        estimateMax: { type: Number, default: 0 },
        estimateNote: { type: String, default: '' },
        status: {
            type: String,
            default: 'new',
            enum: ['new', 'qualifying', 'quoted', 'negotiating', 'won', 'lost'],
        },
    },
    { timestamps: true }
)

module.exports = mongoose.model('lead', leadSchema)
