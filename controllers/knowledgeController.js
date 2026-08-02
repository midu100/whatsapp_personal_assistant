const knowledgeSchema = require('../models/knowledgeSchema')
const { addKnowledge, invalidateCache } = require('../services/knowledgeServices')

// ====== Get Knowledge
const getKnowledge = async (req, res) => {
    try {
        const { page = 1, limit = 20, source, search } = req.query
        const skip = (Number(page) - 1) * Number(limit)

        const query = {}
        if (source) query.source = source
        if (search) query.text = { $regex: search, $options: 'i' }

        const total = await knowledgeSchema.countDocuments(query)
        const knowledge = await knowledgeSchema
            .find(query)
            .select('-embedding')
            .sort({ usageCount: -1, createdAt: -1 })
            .skip(skip)
            .limit(Number(limit))

        return res.status(200).send({
            success: true,
            message: 'Knowledge fetched.',
            data: knowledge,
            pagination: {
                total,
                page: Number(page),
                limit: Number(limit),
                totalPages: Math.ceil(total / Number(limit)),
            },
        })
    } catch (error) {
        console.log(error)
        return res.status(500).send({ success: false, message: 'Internal server error' })
    }
}

// ====== Add Knowledge
const createKnowledge = async (req, res) => {
    try {
        const { text, topic } = req.body
        if (!text) return res.status(400).send({ success: false, message: 'Text is required' })

        const doc = await addKnowledge({ text, topic: topic || 'manual', source: 'manual' })

        return res.status(201).send({ success: true, message: 'Knowledge added.', data: doc })
    } catch (error) {
        console.log(error)
        return res.status(500).send({ success: false, message: 'Internal server error' })
    }
}

// ====== Delete Knowledge (ভুল কিছু শিখে ফেললে মুছে দেওয়া)
const deleteKnowledge = async (req, res) => {
    try {
        const { id } = req.params

        const doc = await knowledgeSchema.findByIdAndDelete(id)
        if (!doc) return res.status(404).send({ success: false, message: 'Knowledge not found' })

        invalidateCache()

        return res.status(200).send({ success: true, message: 'Knowledge deleted.', data: {} })
    } catch (error) {
        console.log(error)
        return res.status(500).send({ success: false, message: 'Internal server error' })
    }
}

module.exports = { getKnowledge, createKnowledge, deleteKnowledge }
