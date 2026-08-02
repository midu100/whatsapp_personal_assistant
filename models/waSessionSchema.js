const mongoose = require('mongoose')

// ====== Baileys auth creds/keys MongoDB তে রাখা হয়
// এতে redeploy বা restart এ বারবার QR scan করতে হয় না (বারবার re-login WhatsApp flag করে)

const waSessionSchema = new mongoose.Schema(
    {
        key: { type: String, required: true, unique: true, index: true },
        value: { type: String, required: true },
    },
    { timestamps: true }
)

module.exports = mongoose.model('wasession', waSessionSchema)
