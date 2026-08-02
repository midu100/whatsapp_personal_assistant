const rateCard = require('../seed/rateCard')

// ====== Price সবসময় এখান থেকেই আসবে, LLM এর মাথা থেকে নয়
// এটাই সবচেয়ে বড় guardrail - না হলে bot বানিয়ে দাম বলে দিবে

const COMPLEXITY_MULTIPLIER = { simple: 0.85, medium: 1, complex: 1.35 }

const formatMoney = (amount) => `${rateCard.currencySymbol}${Number(amount).toLocaleString('en-IN')}`

// ====== Project type resolve (LLM যা পাঠায় সেটা সবসময় exact key হয় না)
const resolveProjectType = (input = '') => {
    const key = String(input).toLowerCase().trim().replace(/[\s-]+/g, '_')
    if (rateCard.projects[key]) return key

    const aliases = {
        landing: 'landing_page',
        portfolio: 'landing_page',
        website: 'business_website',
        company_website: 'business_website',
        shop: 'ecommerce',
        online_shop: 'ecommerce',
        e_commerce: 'ecommerce',
        ecommerce_website: 'ecommerce',
        dashboard: 'admin_dashboard',
        admin_panel: 'admin_dashboard',
        webapp: 'custom_webapp',
        web_app: 'custom_webapp',
        saas: 'custom_webapp',
        api: 'api_backend',
        backend: 'api_backend',
        chat: 'realtime_app',
        chat_app: 'realtime_app',
        realtime: 'realtime_app',
        revamp: 'redesign',
        fix: 'bug_fix',
        support: 'maintenance',
    }

    return aliases[key] || null
}

// ====== Estimate
const estimatePrice = ({ projectType, features = [], complexity = 'medium' }) => {
    const typeKey = resolveProjectType(projectType)

    if (!typeKey) {
        return {
            ok: false,
            message:
                'এই ধরনের project rate card এ নেই। owner এর কাছে পাঠাতে হবে - নিজে থেকে কোনো দাম বলবে না।',
        }
    }

    const project = rateCard.projects[typeKey]
    const multiplier = COMPLEXITY_MULTIPLIER[complexity] || 1

    let min = project.min * multiplier
    let max = project.max * multiplier

    // ====== Addon যোগ করো
    const matchedAddons = []
    for (const feature of features) {
        const key = String(feature).toLowerCase().trim().replace(/[\s-]+/g, '_')
        const addon = rateCard.addons[key]
        if (addon) {
            min += addon.price
            max += addon.price
            matchedAddons.push(addon.label)
        }
    }

    min = Math.max(Math.round(min / 1000) * 1000, rateCard.minimumProject)
    max = Math.max(Math.round(max / 1000) * 1000, min)

    return {
        ok: true,
        projectType: typeKey,
        label: project.label,
        min,
        max,
        range: `${formatMoney(min)} - ${formatMoney(max)}`,
        duration: project.duration,
        includes: project.includes,
        addons: matchedAddons,
        paymentTerms: rateCard.paymentTerms,
        note: 'এটা একটা আনুমানিক range। final quote requirement পুরোপুরি বোঝার পর দেওয়া হয়।',
    }
}

// ====== Prompt এ ঢোকানোর জন্য পুরো rate card এর text
const rateCardText = () => {
    const lines = []

    lines.push(`Hourly rate: ${formatMoney(rateCard.hourlyRate)}`)
    lines.push(`Minimum project size: ${formatMoney(rateCard.minimumProject)}`)
    lines.push(`Payment terms: ${rateCard.paymentTerms}`)
    lines.push(`Revision: ${rateCard.revisionPolicy}`)
    lines.push('')
    lines.push('Project ranges:')

    for (const [key, project] of Object.entries(rateCard.projects)) {
        lines.push(
            `- ${project.label} [${key}]: ${formatMoney(project.min)} - ${formatMoney(project.max)}, সময় ${project.duration}`
        )
    }

    lines.push('')
    lines.push('Add-ons:')
    for (const [key, addon] of Object.entries(rateCard.addons)) {
        lines.push(`- ${addon.label} [${key}]: +${formatMoney(addon.price)}`)
    }

    lines.push('')
    lines.push(`যেসব কাজ করা হয় না: ${rateCard.notOffered.join(', ')}`)

    return lines.join('\n')
}

module.exports = { estimatePrice, rateCardText, resolveProjectType, formatMoney, rateCard }
