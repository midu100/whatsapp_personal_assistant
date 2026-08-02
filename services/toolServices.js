const { Type } = require('@google/genai')
const leadSchema = require('../models/leadSchema')
const { searchKnowledge, formatForPrompt } = require('./knowledgeServices')
const { estimatePrice } = require('./pricingServices')
const { getAvailableSlots, bookMeeting } = require('./schedulingServices')
const logger = require('../utils/logger')

// ====== Gemini function declarations

const toolDeclarations = [
    {
        name: 'searchKnowledge',
        description:
            'Owner এর profile, skill, portfolio, policy, FAQ থেকে তথ্য খোঁজে। যখন প্রশ্নের উত্তর দিতে আরও তথ্য দরকার তখন ডাকো।',
        parameters: {
            type: Type.OBJECT,
            properties: {
                query: { type: Type.STRING, description: 'কী খুঁজছো, client এর ভাষাতেই লেখো' },
            },
            required: ['query'],
        },
    },
    {
        name: 'saveRequirement',
        description:
            'Client এর project requirement save করে। কথা বলতে বলতে যা যা জানা যায় (project type, feature, budget, timeline) সেটা এখানে দাও। বারবার ডাকা যায়, নতুন তথ্য merge হয়।',
        parameters: {
            type: Type.OBJECT,
            properties: {
                clientName: { type: Type.STRING, description: 'Client এর নাম, জানা থাকলে' },
                projectType: {
                    type: Type.STRING,
                    description:
                        'landing_page | business_website | ecommerce | admin_dashboard | custom_webapp | api_backend | realtime_app | redesign | bug_fix | maintenance',
                },
                requirements: { type: Type.STRING, description: 'Client যা চায় তার সংক্ষিপ্ত বর্ণনা' },
                features: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                    description: 'বিশেষ feature গুলো, যেমন payment_gateway, multi_language',
                },
                budget: { type: Type.STRING, description: 'Client যা বলেছে, হুবহু' },
                timeline: { type: Type.STRING, description: 'কবের মধ্যে দরকার' },
            },
            required: ['projectType'],
        },
    },
    {
        name: 'qualifyLead',
        description:
            'Client কতটা serious সেটা score করে (0-100)। যথেষ্ট তথ্য জানার পর একবার ডাকো। Score টা client কে কখনো বলবে না, এটা শুধু owner এর জন্য।',
        parameters: {
            type: Type.OBJECT,
            properties: {
                hasBudget: { type: Type.BOOLEAN, description: 'Client budget বলেছে কিনা' },
                budgetRealistic: { type: Type.BOOLEAN, description: 'Budget টা কাজের তুলনায় বাস্তবসম্মত কিনা' },
                hasTimeline: { type: Type.BOOLEAN, description: 'কবে দরকার সেটা বলেছে কিনা' },
                isDecisionMaker: { type: Type.BOOLEAN, description: 'নিজেই সিদ্ধান্ত নিতে পারে কিনা' },
                scopeClear: { type: Type.BOOLEAN, description: 'কী চায় সেটা পরিষ্কার কিনা' },
                reason: { type: Type.STRING, description: 'এক লাইনে কেন এই মূল্যায়ন' },
            },
            required: ['hasBudget', 'hasTimeline', 'scopeClear'],
        },
    },
    {
        name: 'estimatePrice',
        description:
            'Rate card থেকে দামের range বের করে। দামের কথা উঠলে অবশ্যই এটা ডাকতে হবে - নিজে থেকে কোনো সংখ্যা বলা নিষিদ্ধ।',
        parameters: {
            type: Type.OBJECT,
            properties: {
                projectType: {
                    type: Type.STRING,
                    description:
                        'landing_page | business_website | ecommerce | admin_dashboard | custom_webapp | api_backend | realtime_app | redesign | bug_fix | maintenance',
                },
                features: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                    description: 'Addon key গুলো, যেমন payment_gateway, realtime_chat',
                },
                complexity: { type: Type.STRING, description: 'simple | medium | complex' },
            },
            required: ['projectType'],
        },
    },
    {
        name: 'proposeMeetingSlots',
        description: 'Owner এর খালি meeting slot গুলো এনে দেয়। Client কথা বলতে বা call করতে চাইলে ডাকো।',
        parameters: {
            type: Type.OBJECT,
            properties: {
                limit: { type: Type.NUMBER, description: 'কয়টা slot দেখাবে, default 3' },
            },
        },
    },
    {
        name: 'bookMeeting',
        description:
            'Meeting book করে। proposeMeetingSlots থেকে পাওয়া slotStart (ISO string) হুবহু পাঠাতে হবে - নিজে থেকে সময় বানাবে না।',
        parameters: {
            type: Type.OBJECT,
            properties: {
                slotStart: { type: Type.STRING, description: 'proposeMeetingSlots থেকে পাওয়া ISO datetime' },
                notes: { type: Type.STRING, description: 'কী নিয়ে কথা হবে' },
            },
            required: ['slotStart'],
        },
    },
    {
        name: 'escalateToOwner',
        description:
            'প্রশ্নটা owner এর কাছে পাঠায়। যেটা জানো না, দরদাম, complaint, legal, বা client owner কে চাইলে - এটা ডাকো।',
        parameters: {
            type: Type.OBJECT,
            properties: {
                question: { type: Type.STRING, description: 'Owner কে ঠিক কী জিজ্ঞেস করতে হবে' },
                reason: {
                    type: Type.STRING,
                    description: 'unknown | low_confidence | pricing | complaint | wants_owner | legal | sensitive',
                },
            },
            required: ['question', 'reason'],
        },
    },
]

// ====== Lead upsert helper
const upsertLead = async (contact, patch = {}) => {
    const clean = Object.fromEntries(
        Object.entries(patch).filter(([, value]) => value !== undefined && value !== null && value !== '')
    )

    return leadSchema.findOneAndUpdate(
        { contact: contact._id },
        { $set: { ...clean, jid: contact.jid }, $setOnInsert: { contact: contact._id } },
        { returnDocument: 'after', upsert: true, setDefaultsOnInsert: true }
    )
}

// ====== Tool executor
// ctx = { contact, conversation, language, escalations: [] }
const executeTool = async (name, args = {}, ctx = {}) => {
    const { contact } = ctx

    try {
        switch (name) {
            // ====== Knowledge
            case 'searchKnowledge': {
                const results = await searchKnowledge(args.query || '', 5)
                return { found: results.length, knowledge: formatForPrompt(results) }
            }

            // ====== Requirement
            case 'saveRequirement': {
                const lead = await upsertLead(contact, {
                    clientName: args.clientName || contact.name,
                    projectType: args.projectType,
                    requirements: args.requirements,
                    features: args.features,
                    budget: args.budget,
                    timeline: args.timeline,
                    status: 'qualifying',
                })

                if (args.clientName && !contact.name) {
                    contact.name = args.clientName
                    await contact.save()
                }

                logger.info(`Requirement saved - ${contact.jid} - ${args.projectType}`)
                return { saved: true, leadId: String(lead._id) }
            }

            // ====== Qualification (score টা JS এ হিসাব হয়, LLM এর অনুমানে নয়)
            case 'qualifyLead': {
                let score = 0
                if (args.hasBudget) score += 25
                if (args.budgetRealistic) score += 20
                if (args.hasTimeline) score += 15
                if (args.isDecisionMaker) score += 20
                if (args.scopeClear) score += 20

                const lead = await upsertLead(contact, {
                    score,
                    scoreReason: args.reason || '',
                    decisionMaker: Boolean(args.isDecisionMaker),
                    status: score >= 60 ? 'qualifying' : 'new',
                })

                logger.info(`Lead qualified - ${contact.jid} - score ${score}`)
                return {
                    score,
                    leadId: String(lead._id),
                    note: 'এই score টা client কে বলবে না। শুধু কথোপকথন কোন দিকে নিবে সেটা ঠিক করতে ব্যবহার করো।',
                }
            }

            // ====== Price
            case 'estimatePrice': {
                const result = estimatePrice({
                    projectType: args.projectType,
                    features: args.features || [],
                    complexity: args.complexity || 'medium',
                })

                if (!result.ok) {
                    return { ok: false, instruction: result.message }
                }

                await upsertLead(contact, {
                    projectType: result.projectType,
                    estimateMin: result.min,
                    estimateMax: result.max,
                    estimateNote: result.range,
                    status: 'quoted',
                })

                return {
                    ok: true,
                    range: result.range,
                    duration: result.duration,
                    includes: result.includes,
                    addons: result.addons,
                    paymentTerms: result.paymentTerms,
                    instruction:
                        'উপরের range আর duration টা হুবহু বলো। এর বাইরে নিজে থেকে কোনো সংখ্যা যোগ করবে না। এটা আনুমানিক - সেটাও বলে দিও।',
                }
            }

            // ====== Meeting slots
            case 'proposeMeetingSlots': {
                const slots = await getAvailableSlots({ limit: Number(args.limit) || 3 })
                if (!slots.length) {
                    return { slots: [], instruction: 'কোনো slot খালি নেই - escalateToOwner ডাকো।' }
                }

                return {
                    slots: slots.map((slot) => ({ slotStart: slot.start.toISOString(), label: slot.label })),
                    instruction: 'label গুলো client কে দেখাও। সে বেছে নিলে ওই slotStart হুবহু দিয়ে bookMeeting ডাকো।',
                }
            }

            // ====== Book meeting
            case 'bookMeeting': {
                const result = await bookMeeting({
                    contact,
                    slotStart: args.slotStart,
                    notes: args.notes || '',
                })

                if (!result.ok) return { ok: false, instruction: result.message }

                ctx.bookedMeeting = result.meeting
                logger.success(`Meeting booked - ${contact.jid} - ${result.label}`)

                return {
                    ok: true,
                    label: result.label,
                    instruction: `Client কে confirm করো যে ${result.label} এ কথা হবে। Owner কে জানিয়ে দেওয়া হয়েছে সেটাও বলো।`,
                }
            }

            // ====== Escalation (আসল notification pipeline পাঠায়, এখানে শুধু mark করা হয়)
            case 'escalateToOwner': {
                ctx.escalations = ctx.escalations || []
                ctx.escalations.push({ question: args.question || '', reason: args.reason || 'unknown' })

                logger.warn(`Escalation - ${contact.jid} - ${args.reason}`)

                return {
                    ok: true,
                    instruction:
                        'Owner কে পাঠানো হয়েছে। এখন client কে স্বাভাবিকভাবে বলো যে confirm করে জানাচ্ছো। কোনো অনুমান করে উত্তর দিবে না।',
                }
            }

            default:
                return { error: `Unknown tool: ${name}` }
        }
    } catch (error) {
        logger.error(`Tool ${name} failed:`, error?.message)
        return { error: 'Tool execution failed', instruction: 'escalateToOwner ডাকো।' }
    }
}

module.exports = { toolDeclarations, executeTool, upsertLead }
