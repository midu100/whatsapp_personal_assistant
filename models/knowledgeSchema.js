const mongoose = require('mongoose')

const knowledgeSchema = new mongoose.Schema(
    {
        text: { type: String, required: true },
        embedding: { type: [Number], default: [] },
        source: { type: String, default: 'seed', enum: ['seed', 'learned', 'manual'] },
        topic: { type: String, default: 'general' },
        sourceFile: { type: String, default: '' },
        hash: { type: String, index: true },
        status: { type: String, default: 'approved', enum: ['approved', 'pending', 'rejected'] },
        usageCount: { type: Number, default: 0 },
    },
    { timestamps: true }
)

module.exports = mongoose.model('knowledge', knowledgeSchema)
