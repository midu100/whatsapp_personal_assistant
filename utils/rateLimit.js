// ====== Per contact hourly rate limit (in-memory)
// একই নম্বরে ঘন্টায় অনেক message গেলে WhatsApp flag করে, তাই cap

const buckets = new Map()

const WINDOW_MS = 60 * 60 * 1000

// ====== Check + consume
const canSend = (jid, limit = Number(process.env.HOURLY_MESSAGE_LIMIT) || 20) => {
    const now = Date.now()
    const bucket = buckets.get(jid)

    if (!bucket || now - bucket.startedAt > WINDOW_MS) {
        buckets.set(jid, { startedAt: now, count: 1 })
        return true
    }

    if (bucket.count >= limit) return false

    bucket.count += 1
    return true
}

// ====== কতগুলো বাকি আছে
const remaining = (jid, limit = Number(process.env.HOURLY_MESSAGE_LIMIT) || 20) => {
    const bucket = buckets.get(jid)
    if (!bucket || Date.now() - bucket.startedAt > WINDOW_MS) return limit
    return Math.max(0, limit - bucket.count)
}

const resetLimit = (jid) => buckets.delete(jid)

module.exports = { canSend, remaining, resetLimit }
