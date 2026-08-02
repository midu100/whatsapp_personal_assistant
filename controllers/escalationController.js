const escalationSchema = require('../models/escalationSchema')
const { answerEscalation } = require('../services/escalationServices')

// ====== Get Escalations
const getEscalations = async (req, res) => {
    try {
        const { page = 1, limit = 12, status } = req.query
        const skip = (Number(page) - 1) * Number(limit)

        const query = {}
        if (status) query.status = status

        const total = await escalationSchema.countDocuments(query)
        const escalations = await escalationSchema
            .find(query)
            .populate('contact', 'name number jid')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(Number(limit))

        return res.status(200).send({
            success: true,
            message: 'Escalations fetched.',
            data: escalations,
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

// ====== Answer (dashboard থেকেও উত্তর দেওয়া যাবে)
const answer = async (req, res) => {
    try {
        const { ticket } = req.params
        const { answer: text } = req.body

        if (!text) return res.status(400).send({ success: false, message: 'Answer is required' })

        const result = await answerEscalation(Number(ticket), text)
        if (!result.ok) return res.status(400).send({ success: false, message: result.message })

        return res.status(200).send({ success: true, message: result.message, data: {} })
    } catch (error) {
        console.log(error)
        return res.status(500).send({ success: false, message: 'Internal server error' })
    }
}

module.exports = { getEscalations, answer }
