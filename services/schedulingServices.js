const meetingSchema = require('../models/meetingSchema')

// ⚠️ তোমার availability - বদলে নিও
// day: 0=রবি, 1=সোম, 2=মঙ্গল, 3=বুধ, 4=বৃহস্পতি, 5=শুক্র, 6=শনি
const AVAILABILITY = [
    { day: 6, from: 20, to: 23 }, // শনি
    { day: 0, from: 20, to: 23 }, // রবি
    { day: 1, from: 20, to: 23 }, // সোম
    { day: 2, from: 20, to: 23 }, // মঙ্গল
    { day: 3, from: 20, to: 23 }, // বুধ
    { day: 4, from: 20, to: 23 }, // বৃহস্পতি
    // শুক্রবার ছুটি
]

const SLOT_MINUTES = 30
const timeZone = () => process.env.TIMEZONE || 'Asia/Dhaka'

// ====== নির্দিষ্ট timezone এ ওই মুহূর্তের UTC offset (মিনিটে)
const getOffsetMinutes = (date) => {
    const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: timeZone(),
        hour12: false,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
    })

    const parts = formatter.formatToParts(date).reduce((acc, part) => {
        if (part.type !== 'literal') acc[part.type] = Number(part.value)
        return acc
    }, {})

    const asUTC = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour % 24, parts.minute, parts.second)
    return Math.round((asUTC - date.getTime()) / 60000)
}

// ====== timezone এর local Y/M/D/weekday
const getLocalParts = (date) => {
    const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: timeZone(),
        weekday: 'short',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    })

    const parts = formatter.formatToParts(date).reduce((acc, part) => {
        if (part.type !== 'literal') acc[part.type] = part.value
        return acc
    }, {})

    const weekdayMap = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }

    return {
        year: Number(parts.year),
        month: Number(parts.month),
        day: Number(parts.day),
        weekday: weekdayMap[parts.weekday],
    }
}

// ====== local Y/M/D/H/m → আসল UTC Date
const localToDate = (year, month, day, hour, minute = 0) => {
    const guess = new Date(Date.UTC(year, month - 1, day, hour, minute))
    const offset = getOffsetMinutes(guess)
    return new Date(guess.getTime() - offset * 60000)
}

// ====== মানুষ-পড়া format
const formatSlot = (date) =>
    new Intl.DateTimeFormat('en-GB', {
        timeZone: timeZone(),
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
    }).format(date)

// ====== আগামী কয়েকদিনের খালি slot
const getAvailableSlots = async ({ days = 5, limit = 4 } = {}) => {
    const now = new Date()
    const horizon = new Date(now.getTime() + days * 24 * 60 * 60 * 1000)

    const booked = await meetingSchema
        .find({ slotStart: { $gte: now, $lte: horizon }, status: { $in: ['requested', 'confirmed'] } })
        .select('slotStart')
        .lean()

    const bookedSet = new Set(booked.map((meeting) => new Date(meeting.slotStart).getTime()))
    const slots = []

    for (let offset = 0; offset < days && slots.length < limit; offset++) {
        const cursor = new Date(now.getTime() + offset * 24 * 60 * 60 * 1000)
        const { year, month, day, weekday } = getLocalParts(cursor)

        const rules = AVAILABILITY.filter((rule) => rule.day === weekday)

        for (const rule of rules) {
            for (let hour = rule.from; hour < rule.to && slots.length < limit; hour++) {
                for (let minute = 0; minute < 60; minute += SLOT_MINUTES) {
                    const start = localToDate(year, month, day, hour, minute)

                    // অন্তত ২ ঘন্টা পরের slot দাও
                    if (start.getTime() < now.getTime() + 2 * 60 * 60 * 1000) continue
                    if (bookedSet.has(start.getTime())) continue

                    const end = new Date(start.getTime() + SLOT_MINUTES * 60000)
                    slots.push({ start, end, label: formatSlot(start) })

                    if (slots.length >= limit) break
                }
            }
        }
    }

    return slots
}

// ====== Meeting book
const bookMeeting = async ({ contact, slotStart, notes = '', channel = 'whatsapp_call' }) => {
    const start = new Date(slotStart)
    if (isNaN(start.getTime())) return { ok: false, message: 'Invalid slot time' }

    const end = new Date(start.getTime() + SLOT_MINUTES * 60000)

    const clash = await meetingSchema.findOne({
        slotStart: start,
        status: { $in: ['requested', 'confirmed'] },
    })

    if (clash) return { ok: false, message: 'এই slot টা এর মধ্যেই booked, অন্য একটা slot অফার করো।' }

    const meeting = await meetingSchema.create({
        contact: contact._id,
        jid: contact.jid,
        clientName: contact.name || '',
        slotStart: start,
        slotEnd: end,
        channel,
        notes,
        status: 'requested',
    })

    return { ok: true, meeting, label: formatSlot(start) }
}

// ====== Prompt এ ঢোকানোর জন্য availability text
const availabilityText = () => {
    const dayNames = ['রবি', 'সোম', 'মঙ্গল', 'বুধ', 'বৃহস্পতি', 'শুক্র', 'শনি']
    const lines = AVAILABILITY.map((rule) => `${dayNames[rule.day]}বার ${rule.from}:00 - ${rule.to}:00`)
    return `Meeting availability (${timeZone()}): ${lines.join(', ')}। Meeting এর দৈর্ঘ্য ${SLOT_MINUTES} মিনিট।`
}

module.exports = { getAvailableSlots, bookMeeting, formatSlot, availabilityText, AVAILABILITY, SLOT_MINUTES }
