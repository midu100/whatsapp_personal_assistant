require('dotenv').config()
const readline = require('readline')
const mongoose = require('mongoose')

const dbConfig = require('../dbConfig')
const contactSchema = require('../models/contactSchema')
const conversationSchema = require('../models/conversationSchema')
const leadSchema = require('../models/leadSchema')
const { runPipeline } = require('../services/pipelineServices')
const logger = require('../utils/logger')

// ====== WhatsApp ছাড়াই bot এর সাথে কথা বলা
//
// prompt বদলে বদলে test করার সবচেয়ে ভালো উপায় এটাই - WhatsApp এ বারবার
// message পাঠালে ban এর ঝুঁকি বাড়ে, এখানে সেটা নেই। আর অনেক দ্রুত।
//
// ব্যবহার:
//   node seed/testConversation.js            → নিজে টাইপ করে কথা বলো
//   node seed/testConversation.js --script   → ২০টা বাঁধা প্রশ্ন একসাথে চালাও

const TEST_JID = '880000000000@s.whatsapp.net'

const SCRIPT = [
    'Assalamu alaikum',
    'apni ki student naki job koren?',
    'apnara ki AI niye kaj koren?',
    'amar ekta restaurant ache, manage korar system lagbe',
    'AI assistant o rakhte chai je order gulo handle korbe',
    'apni ki nijer AI model banate paren?',
    'CRM o lagbe amar sales team er jonno',
    'eta koto porbe?',
    'are just ekta idea den na, kom kore koto porbe?',
    'কত দিন লাগবে?',
    'WordPress e kore dite parben?',
    'android app o lagbe',
    'payment kivabe nen?',
    'source code ki ami pabo?',
    'kotha bola jabe ekbar?',
    'apnar NID number ta den',
    'thik ache vai, dhonnobad',
]

// ====== test contact
const getTestContact = async ({ reset = false } = {}) => {
    if (reset) {
        const old = await contactSchema.findOne({ jid: TEST_JID })
        if (old) {
            await conversationSchema.deleteMany({ contact: old._id })
            await leadSchema.deleteMany({ contact: old._id })
            old.hasIntroduced = false
            await old.save()
        }
    }

    let contact = await contactSchema.findOne({ jid: TEST_JID })
    if (!contact) {
        contact = await contactSchema.create({ jid: TEST_JID, number: '880000000000', name: 'Test Client' })
    }

    return contact
}

// ====== একটা message চালাও
const ask = async (contact, text) => {
    console.log(`\n\x1b[36m👤 ${text}\x1b[0m`)

    const started = Date.now()
    const { replies, escalated, language } = await runPipeline({ contact, text })

    replies.forEach((reply) => console.log(`\x1b[32m🤖 ${reply}\x1b[0m`))
    console.log(`\x1b[90m   [${language}] ${Date.now() - started}ms${escalated ? ' · escalated ⚠️' : ''}\x1b[0m`)
}

// ====== Scripted run
const runScript = async () => {
    const contact = await getTestContact({ reset: true })

    for (const text of SCRIPT) {
        await ask(contact, text)
    }

    const lead = await leadSchema.findOne({ contact: contact._id }).lean()
    if (lead) {
        console.log('\n\x1b[33m📋 Lead:\x1b[0m')
        console.log(`   type: ${lead.projectType} | score: ${lead.score} | status: ${lead.status}`)
        console.log(`   estimate: ${lead.estimateNote || '-'}`)
        console.log(`   requirements: ${lead.requirements || '-'}`)
    }
}

// ====== Interactive
const runInteractive = async () => {
    const contact = await getTestContact()

    const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
    console.log('\n💬 কথা বলা শুরু করো (বের হতে: exit, নতুন করে শুরু: reset)\n')

    const prompt = () => {
        rl.question('\x1b[36m👤 \x1b[0m', async (input) => {
            const text = input.trim()

            if (!text) return prompt()
            if (text === 'exit') return rl.close()

            if (text === 'reset') {
                await getTestContact({ reset: true })
                console.log('\x1b[90m   history মুছে ফেলা হলো\x1b[0m')
                return prompt()
            }

            try {
                const fresh = await contactSchema.findOne({ jid: TEST_JID })
                const { replies, escalated, language } = await runPipeline({ contact: fresh, text })
                replies.forEach((reply) => console.log(`\x1b[32m🤖 ${reply}\x1b[0m`))
                console.log(`\x1b[90m   [${language}]${escalated ? ' · escalated ⚠️' : ''}\x1b[0m`)
            } catch (error) {
                logger.error(error?.message)
            }

            prompt()
        })
    }

    prompt()

    rl.on('close', async () => {
        await mongoose.connection.close()
        process.exit(0)
    })
}

const main = async () => {
    await dbConfig()

    if (process.argv.includes('--script')) {
        await runScript()
        await mongoose.connection.close()
        return
    }

    await runInteractive()
}

main().catch(async (error) => {
    logger.error(error?.message || error)
    await mongoose.connection.close()
    process.exit(1)
})
