const mongoose = require('mongoose')

const meetingSchema = new mongoose.Schema(
    {
        contact: { type: mongoose.Types.ObjectId, ref: 'contact', required: true, index: true },
        jid: { type: String, required: true },
        clientName: { type: String, default: '' },
        slotStart: { type: Date, required: true },
        slotEnd: { type: Date, required: true },
        channel: { type: String, default: 'whatsapp_call', enum: ['whatsapp_call', 'google_meet', 'zoom', 'phone'] },
        status: { type: String, default: 'requested', enum: ['requested', 'confirmed', 'cancelled', 'done'] },
        notes: { type: String, default: '' },
    },
    { timestamps: true }
)

module.exports = mongoose.model('meeting', meetingSchema)
