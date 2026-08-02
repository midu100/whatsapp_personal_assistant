// ====== ছোট্ট console logger, timestamp সহ

const stamp = () => new Date().toISOString().replace('T', ' ').slice(0, 19)

const logger = {
    info: (...args) => console.log(`[${stamp()}] ℹ️ `, ...args),
    success: (...args) => console.log(`[${stamp()}] ✅`, ...args),
    warn: (...args) => console.log(`[${stamp()}] ⚠️ `, ...args),
    error: (...args) => console.log(`[${stamp()}] ❌`, ...args),
    chat: (...args) => console.log(`[${stamp()}] 💬`, ...args),
}

module.exports = logger
