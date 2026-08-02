const meetingSchema = require('../models/meetingSchema')
const { getAvailableSlots } = require('../services/schedulingServices')

// ====== Get Meetings
const getMeetings = async (req, res) => {
    try {
        const { page = 1, limit = 12, status, upcoming } = req.query
        const skip = (Number(page) - 1) * Number(limit)

        const query = {}
        if (status) query.status = status
        if (upcoming === 'true') query.slotStart = { $gte: new Date() }

        const total = await meetingSchema.countDocuments(query)
        const meetings = await meetingSchema
            .find(query)
            .populate('contact', 'name number jid')
            .sort({ slotStart: 1 })
            .skip(skip)
            .limit(Number(limit))

        return res.status(200).send({
            success: true,
            message: 'Meetings fetched.',
            data: meetings,
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

// ====== Free slots
const getSlots = async (req, res) => {
    try {
        const slots = await getAvailableSlots({ limit: Number(req.query.limit) || 8 })

        return res.status(200).send({
            success: true,
            message: 'Slots fetched.',
            data: slots.map((slot) => ({ slotStart: slot.start, slotEnd: slot.end, label: slot.label })),
        })
    } catch (error) {
        console.log(error)
        return res.status(500).send({ success: false, message: 'Internal server error' })
    }
}

// ====== Update status (confirm / cancel)
const updateMeeting = async (req, res) => {
    try {
        const { id } = req.params
        const { status, notes } = req.body

        const meeting = await meetingSchema.findById(id)
        if (!meeting) return res.status(404).send({ success: false, message: 'Meeting not found' })

        if (status !== undefined) meeting.status = status
        if (notes !== undefined) meeting.notes = notes

        await meeting.save()

        return res.status(200).send({ success: true, message: 'Meeting updated.', data: meeting })
    } catch (error) {
        console.log(error)
        return res.status(500).send({ success: false, message: 'Internal server error' })
    }
}

module.exports = { getMeetings, getSlots, updateMeeting }
