const contactSchema = require('../models/contactSchema')
const conversationSchema = require('../models/conversationSchema')

// ====== Get Contacts
const getContacts = async (req, res) => {
    try {
        const { page = 1, limit = 12, search, blacklisted } = req.query
        const skip = (Number(page) - 1) * Number(limit)

        const query = {}
        if (search) query.$or = [{ name: { $regex: search, $options: 'i' } }, { number: { $regex: search } }]
        if (blacklisted === 'true') query.isBlacklisted = true

        const total = await contactSchema.countDocuments(query)
        const contacts = await contactSchema
            .find(query)
            .sort({ lastMessageAt: -1, createdAt: -1 })
            .skip(skip)
            .limit(Number(limit))

        return res.status(200).send({
            success: true,
            message: 'Contacts fetched.',
            data: contacts,
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

// ====== Get Conversation
const getConversation = async (req, res) => {
    try {
        const { id } = req.params

        const contact = await contactSchema.findById(id)
        if (!contact) return res.status(404).send({ success: false, message: 'Contact not found' })

        const conversation = await conversationSchema.findOne({ contact: contact._id }).lean()

        return res.status(200).send({
            success: true,
            message: 'Conversation fetched.',
            data: { contact, conversation },
        })
    } catch (error) {
        console.log(error)
        return res.status(500).send({ success: false, message: 'Internal server error' })
    }
}

// ====== Update Contact (blacklist, bot on/off, note)
const updateContact = async (req, res) => {
    try {
        const { id } = req.params
        const { isBlacklisted, botEnabled, notes, tags, name } = req.body

        const contact = await contactSchema.findById(id)
        if (!contact) return res.status(404).send({ success: false, message: 'Contact not found' })

        if (isBlacklisted !== undefined) contact.isBlacklisted = isBlacklisted
        if (botEnabled !== undefined) contact.botEnabled = botEnabled
        if (notes !== undefined) contact.notes = notes
        if (tags !== undefined) contact.tags = tags
        if (name !== undefined) contact.name = name

        await contact.save()

        return res.status(200).send({ success: true, message: 'Contact updated.', data: contact })
    } catch (error) {
        console.log(error)
        return res.status(500).send({ success: false, message: 'Internal server error' })
    }
}

module.exports = { getContacts, getConversation, updateContact }
