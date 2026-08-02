// ====== লম্বা reply কে কয়েকটা ছোট WhatsApp message এ ভাগ করা
// মানুষ এক প্যারাগ্রাফ পাঠায় না, ২-৩ টা ছোট message পাঠায়

const MAX_LEN = 380

// ====== Reply Chunker
const chunkReply = (text = '', maxMessages = 3) => {
    const clean = String(text || '').trim()
    if (!clean) return []

    // ছোট হলে ভাগ করার দরকার নেই
    if (clean.length <= MAX_LEN) return [clean]

    // আগে ডাবল newline (প্যারা) ধরে ভাগ করার চেষ্টা
    let parts = clean
        .split(/\n\s*\n/)
        .map((p) => p.trim())
        .filter(Boolean)

    // প্যারা না থাকলে বাক্য ধরে ভাগ করো (বাংলা দাঁড়ি । সহ)
    if (parts.length === 1) {
        const sentences = clean.match(/[^.!?।\n]+[.!?।]*\s*/g) || [clean]
        parts = []
        let buffer = ''
        for (const sentence of sentences) {
            if ((buffer + sentence).length > MAX_LEN && buffer) {
                parts.push(buffer.trim())
                buffer = sentence
            } else {
                buffer += sentence
            }
        }
        if (buffer.trim()) parts.push(buffer.trim())
    }

    // maxMessages এর বেশি হলে বাকিগুলো শেষটার সাথে জুড়ে দাও
    if (parts.length > maxMessages) {
        const head = parts.slice(0, maxMessages - 1)
        const tail = parts.slice(maxMessages - 1).join('\n')
        parts = [...head, tail]
    }

    return parts.filter(Boolean)
}

// ====== Markdown → WhatsApp formatting (**bold** → *bold*)
const toWhatsappFormat = (text = '') =>
    String(text || '')
        .replace(/\*\*(.+?)\*\*/g, '*$1*')
        .replace(/^#{1,6}\s+/gm, '')
        .replace(/\[(.+?)\]\((.+?)\)/g, '$1: $2')
        .trim()

module.exports = { chunkReply, toWhatsappFormat }
