const logger = require('../utils/logger')

// ====== Client প্রায়ই এক কথা ৪ টা message এ ভেঙে পাঠায়:
//   "vai"  "ekta website lagbe"  "ecommerce"  "koto porbe?"
// প্রতিটার আলাদা উত্তর দিলে পুরো অস্বাভাবিক লাগে। তাই কয়েক সেকেন্ড অপেক্ষা করে
// সবগুলো জোড়া লাগিয়ে একবারে উত্তর দেওয়া হয়।

const pending = new Map()

const waitMs = () => Number(process.env.DEBOUNCE_MS) || 8000

// ====== message জমা করো, timer শেষে callback
const push = (jid, text, onFlush) => {
    const existing = pending.get(jid)

    if (existing) {
        clearTimeout(existing.timer)
        existing.parts.push(text)
        existing.timer = setTimeout(() => flush(jid, onFlush), waitMs())
        return
    }

    const entry = {
        parts: [text],
        timer: setTimeout(() => flush(jid, onFlush), waitMs()),
    }

    pending.set(jid, entry)
}

// ====== জমানো message গুলো ছাড়ো
const flush = async (jid, onFlush) => {
    const entry = pending.get(jid)
    if (!entry) return

    pending.delete(jid)
    clearTimeout(entry.timer)

    const merged = entry.parts.filter(Boolean).join('\n').trim()
    if (!merged) return

    if (entry.parts.length > 1) logger.info(`${entry.parts.length} টা message merge হলো - ${jid}`)

    try {
        await onFlush(merged)
    } catch (error) {
        logger.error('debounce flush failed:', error?.message)
    }
}

// ====== তুমি নিজে reply দিলে জমানো message বাতিল
const cancel = (jid) => {
    const entry = pending.get(jid)
    if (!entry) return
    clearTimeout(entry.timer)
    pending.delete(jid)
}

const isPending = (jid) => pending.has(jid)

module.exports = { push, cancel, isPending }
