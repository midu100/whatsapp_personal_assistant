const { sleep, randomBetween } = require('../services/helpers')
const { canSend } = require('../utils/rateLimit')
const logger = require('../utils/logger')

// ====== মানুষের মতো করে reply পাঠানো
// সাথে সাথে ৫০০ অক্ষরের এক প্যারা পাঠালে যে কেউ বুঝে ফেলে এটা bot।
// তাই: read receipt → typing → একটু thinking delay → ছোট ছোট message

// ====== টাইপ করতে কত সময় লাগত সেটার হিসাব
const typingDuration = (text = '') => {
    const base = 1200
    const perChar = 28
    const total = base + String(text).length * perChar
    return Math.min(Math.max(total, 1500), 6000)
}

// ====== একটা message মানুষের মতো করে পাঠাও
const sendHumanized = async (sock, jid, text, { skipPresence = false } = {}) => {
    if (!text) return

    if (!skipPresence) {
        try {
            await sock.presenceSubscribe(jid)
            await sock.sendPresenceUpdate('composing', jid)
        } catch (error) {
            console.log(error)
        }
    }

    await sleep(typingDuration(text))

    try {
        await sock.sendPresenceUpdate('paused', jid)
    } catch (error) {
        console.log(error)
    }

    await sock.sendMessage(jid, { text })
}

// ====== কয়েকটা message একের পর এক
const sendReplies = async (sock, jid, replies = []) => {
    for (let i = 0; i < replies.length; i++) {
        if (!canSend(jid)) {
            logger.warn(`Rate limit hit - ${jid}, বাকি message গুলো পাঠানো হলো না`)
            break
        }

        await sendHumanized(sock, jid, replies[i])

        // message গুলোর মাঝে ছোট বিরতি
        if (i < replies.length - 1) await sleep(randomBetween(700, 1600))
    }
}

// ====== message পড়া হয়েছে দেখাও
const markRead = async (sock, key) => {
    try {
        await sock.readMessages([key])
    } catch (error) {
        console.log(error)
    }
}

module.exports = { sendHumanized, sendReplies, markRead, typingDuration }
