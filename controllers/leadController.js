const leadSchema = require('../models/leadSchema')

// ====== Get Leads
const getLeads = async (req, res) => {
    try {
        const { page = 1, limit = 12, status, minScore, sort } = req.query
        const skip = (Number(page) - 1) * Number(limit)

        const query = {}
        if (status) query.status = status
        if (minScore) query.score = { $gte: Number(minScore) }

        const sortMap = { score_desc: { score: -1 }, newest: { createdAt: -1 }, oldest: { createdAt: 1 } }

        const total = await leadSchema.countDocuments(query)
        const leads = await leadSchema
            .find(query)
            .populate('contact', 'name number jid language')
            .sort(sortMap[sort] || { createdAt: -1 })
            .skip(skip)
            .limit(Number(limit))

        return res.status(200).send({
            success: true,
            message: 'Leads fetched.',
            data: leads,
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

// ====== Update Lead status
const updateLead = async (req, res) => {
    try {
        const { id } = req.params
        const { status, requirements, budget, timeline } = req.body

        const lead = await leadSchema.findById(id)
        if (!lead) return res.status(404).send({ success: false, message: 'Lead not found' })

        if (status !== undefined) lead.status = status
        if (requirements !== undefined) lead.requirements = requirements
        if (budget !== undefined) lead.budget = budget
        if (timeline !== undefined) lead.timeline = timeline

        await lead.save()

        return res.status(200).send({ success: true, message: 'Lead updated.', data: lead })
    } catch (error) {
        console.log(error)
        return res.status(500).send({ success: false, message: 'Internal server error' })
    }
}

// ====== Dashboard stats
const getStats = async (req, res) => {
    try {
        const contactSchema = require('../models/contactSchema')
        const escalationSchema = require('../models/escalationSchema')
        const knowledgeSchema = require('../models/knowledgeSchema')
        const meetingSchema = require('../models/meetingSchema')

        const [contacts, leads, hotLeads, pending, knowledge, learned, meetings] = await Promise.all([
            contactSchema.countDocuments(),
            leadSchema.countDocuments(),
            leadSchema.countDocuments({ score: { $gte: 60 } }),
            escalationSchema.countDocuments({ status: 'pending' }),
            knowledgeSchema.countDocuments(),
            knowledgeSchema.countDocuments({ source: 'learned' }),
            meetingSchema.countDocuments({ slotStart: { $gte: new Date() } }),
        ])

        return res.status(200).send({
            success: true,
            message: 'Stats fetched.',
            data: { contacts, leads, hotLeads, pending, knowledge, learned, upcomingMeetings: meetings },
        })
    } catch (error) {
        console.log(error)
        return res.status(500).send({ success: false, message: 'Internal server error' })
    }
}

module.exports = { getLeads, updateLead, getStats }
