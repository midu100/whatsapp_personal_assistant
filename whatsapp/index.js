const makeWASocket = require('baileys').default
const { DisconnectReason, fetchLatestBaileysVersion, makeCacheableSignalKeyStore, Browsers } = require('baileys')
const { Boom } = require('@hapi/boom')
const qrcode = require('qrcode-terminal')
const pino = require('pino')

const useMongoAuthState = require('./authState')
const { routeMessage } = require('./messageRouter')
const { sendHumanized } = require('./humanize')
const logger = require('../utils/logger')

// ====== Baileys socket

let sock = null
let connected = false
let startedAt = Date.now()
let reconnectAttempts = 0
let pairingRequested = false

const baileysLogger = pino({ level: 'silent' })

// ====== Telegram এ খবর দাও (bot server এ চললে এভাবেই জানবে কী হচ্ছে)
const notify = async (text) => {
    try {
        const { sendToOwner } = require('../services/telegramServices')
        await sendToOwner(text)
    } catch (error) {
        console.log(error)
    }
}

// ====== Start
const startWhatsapp = async () => {
    const { state, saveCreds, clearSession } = await useMongoAuthState()
    const { version } = await fetchLatestBaileysVersion()

    logger.info(`Baileys WA version ${version.join('.')}`)

    sock = makeWASocket({
        version,
        logger: baileysLogger,
        browser: Browsers.ubuntu('Chrome'),
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, baileysLogger),
        },
        markOnlineOnConnect: false,
        generateHighQualityLinkPreview: false,
        syncFullHistory: false,
    })

    // ====== Pairing code
    // Server এ (Railway, VPS) terminal এর QR পড়া যায় না - log এ ASCII ভেঙে যায়।
    // তখন .env এ WA_PAIRING_NUMBER দিলে ৮ অক্ষরের একটা code পাওয়া যাবে,
    // সেটা WhatsApp → Linked Devices → "Link with phone number" এ টাইপ করলেই হবে।
    //
    // ⚠️ creds.registered দেখে এটা ঠিক করা যায় না - QR দিয়ে login করলে ওই flag
    // false ই থাকে যদিও session পুরোপুরি valid। তাই Baileys যখন সত্যিই qr চায়
    // (মানে link করা নেই) তখনই কেবল pairing code নেওয়া হয়।
    const requestPairing = async () => {
        if (pairingRequested) return
        pairingRequested = true

        try {
            const number = String(process.env.WA_PAIRING_NUMBER).replace(/\D/g, '')
            const code = await sock.requestPairingCode(number)
            const pretty = code.match(/.{1,4}/g).join('-')

            console.log(`\n🔑 Pairing code: ${pretty}\n`)
            console.log('   WhatsApp → Linked Devices → Link a Device → "Link with phone number instead"')
            console.log('   → এই code টা টাইপ করো (৩ মিনিটের মধ্যে)\n')

            await notify(
                `🔑 <b>WhatsApp pairing code</b>\n\n<code>${pretty}</code>\n\nWhatsApp → Linked Devices → Link with phone number instead → এই code টা দাও (৩ মিনিটের মধ্যে)`
            )
        } catch (error) {
            pairingRequested = false
            logger.error('Pairing code পাওয়া গেল না:', error?.message)
        }
    }

    // ====== Connection
    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update

        // qr এলো মানে session নেই, link করতে হবে
        if (qr) {
            if (process.env.WA_PAIRING_NUMBER) {
                await requestPairing()
            } else {
                console.log('\n📱 WhatsApp → Linked Devices → Link a Device → এই QR টা scan করো\n')
                qrcode.generate(qr, { small: true })
            }
        }

        if (connection === 'open') {
            const wasDown = !connected
            connected = true
            reconnectAttempts = 0
            startedAt = Date.now()

            logger.success(`WhatsApp connected - ${sock.user?.id || ''}`)
            if (wasDown) await notify(`🟢 <b>WhatsApp connected</b>\n${sock.user?.name || ''} (${sock.user?.id || ''})`)
        }

        if (connection === 'close') {
            connected = false

            const statusCode = new Boom(lastDisconnect?.error)?.output?.statusCode
            const loggedOut = statusCode === DisconnectReason.loggedOut

            logger.warn(`Connection closed (${statusCode || 'unknown'})`)

            // ====== Logged out - session আর কাজ করবে না, নতুন করে link করতে হবে
            if (loggedOut) {
                logger.error('Logged out - session মুছে ফেলা হলো, আবার link করতে হবে')
                await clearSession()
                await notify(
                    '🔴 <b>WhatsApp logged out</b>\n\nSession মুছে ফেলা হয়েছে। নতুন করে link করতে service টা restart করো — pairing code আসবে এখানেই।'
                )
                return
            }

            reconnectAttempts += 1

            // ====== বারবার ব্যর্থ হলে জানিয়ে দাও
            if (reconnectAttempts === 5) {
                await notify(`⚠️ <b>WhatsApp বারবার disconnect হচ্ছে</b>\nCode: ${statusCode || 'unknown'}\nচেষ্টা চলছে...`)
            }

            const wait = Math.min(5000 * reconnectAttempts, 60000)
            logger.info(`${wait / 1000}s পরে আবার connect করার চেষ্টা...`)
            setTimeout(() => startWhatsapp().catch((error) => logger.error(error?.message)), wait)
        }
    })

    // ====== Creds save
    sock.ev.on('creds.update', saveCreds)

    // ====== Messages
    sock.ev.on('messages.upsert', async ({ messages, type }) => {
        if (type !== 'notify') return

        for (const message of messages) {
            try {
                await routeMessage({ sock, message, startedAt })
            } catch (error) {
                logger.error('routeMessage failed:', error?.message)
            }
        }
    })

    return sock
}

// ====== বাইরে থেকে message পাঠানোর জন্য
// raw = true হলে typing delay ছাড়াই যাবে (owner notification এর জন্য)
const sendText = async (jid, text, { raw = false } = {}) => {
    if (!sock || !connected) throw new Error('WhatsApp connected নয়')

    if (raw) return sock.sendMessage(jid, { text })
    return sendHumanized(sock, jid, text)
}

const isConnected = () => connected
const getSocket = () => sock
const getStartedAt = () => startedAt

module.exports = { startWhatsapp, sendText, isConnected, getSocket, getStartedAt }
