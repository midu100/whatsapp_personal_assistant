const jwt = require('jsonwebtoken')

// ====== Generate JWT Token
const generateToken = (id) =>
    jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE || '7d' })

// ====== Sleep
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

// ====== দুই সংখ্যার মাঝে random
const randomBetween = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min

// ====== Number → WhatsApp jid
const toJid = (number) => {
    const clean = String(number).replace(/\D/g, '')
    return `${clean}@s.whatsapp.net`
}

// ====== jid → শুধু নম্বর
const toNumber = (jid) => String(jid || '').split('@')[0].split(':')[0]

module.exports = { generateToken, sleep, randomBetween, toJid, toNumber }
