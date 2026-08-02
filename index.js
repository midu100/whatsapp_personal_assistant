require('dotenv').config()
const express = require('express')
const cors = require('cors')
const cookieParser = require('cookie-parser')

const dbConfig = require('./dbConfig')
const route = require('./routes')
const { startWhatsapp, isConnected } = require('./whatsapp')
const { startTelegram, stopTelegram } = require('./services/telegramServices')
const { loadCache } = require('./services/knowledgeServices')
const logger = require('./utils/logger')

const app = express()
const port = process.env.PORT || 8000

// ====== Middleware
app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(cookieParser())

// ====== Routes
app.use(route)
app.get('/', (req, res) =>
    res.status(200).send({
        success: true,
        message: 'WhatsApp AI Assistant চলছে 🚀',
        data: { whatsapp: isConnected() ? 'connected' : 'disconnected', bot: process.env.BOT_ENABLED !== 'false' },
    })
)

// ====== Boot
const boot = async () => {
    await dbConfig()

    // ====== Knowledge cache আগেই গরম করে নাও, প্রথম message যেন দ্রুত হয়
    await loadCache(true)

    // ====== Telegram
    await startTelegram()

    // ====== WhatsApp (QR terminal এ আসবে)
    await startWhatsapp()

    app.listen(port, () => logger.success(`server is running on port ${port}`))
}

boot().catch((error) => {
    logger.error('Boot failed:', error?.message || error)
    process.exit(1)
})

// ====== Graceful shutdown
const shutdown = (signal) => {
    logger.warn(`${signal} - বন্ধ করা হচ্ছে...`)
    stopTelegram(signal)
    process.exit(0)
}

process.once('SIGINT', () => shutdown('SIGINT'))
process.once('SIGTERM', () => shutdown('SIGTERM'))

process.on('unhandledRejection', (error) => logger.error('Unhandled rejection:', error?.message || error))
