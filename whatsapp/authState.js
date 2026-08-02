const { initAuthCreds, BufferJSON, proto } = require('baileys')
const waSessionSchema = require('../models/waSessionSchema')

// ====== Baileys session MongoDB তে রাখা
// File এ রাখলে redeploy বা container restart এ session হারায় → আবার QR → বারবার re-login
// WhatsApp কে সন্দেহজনক লাগে। তাই DB তেই রাখছি।

const useMongoAuthState = async () => {
    // ====== Write
    const writeData = async (key, data) => {
        await waSessionSchema.updateOne(
            { key },
            { $set: { value: JSON.stringify(data, BufferJSON.replacer) } },
            { upsert: true }
        )
    }

    // ====== Read
    const readData = async (key) => {
        try {
            const doc = await waSessionSchema.findOne({ key }).lean()
            if (!doc) return null
            return JSON.parse(doc.value, BufferJSON.reviver)
        } catch (error) {
            console.log(error)
            return null
        }
    }

    // ====== Remove
    const removeData = async (key) => {
        try {
            await waSessionSchema.deleteOne({ key })
        } catch (error) {
            console.log(error)
        }
    }

    const creds = (await readData('creds')) || initAuthCreds()

    return {
        state: {
            creds,
            keys: {
                get: async (type, ids) => {
                    const data = {}
                    await Promise.all(
                        ids.map(async (id) => {
                            let value = await readData(`${type}-${id}`)
                            if (type === 'app-state-sync-key' && value) {
                                value = proto.Message.AppStateSyncKeyData.fromObject(value)
                            }
                            data[id] = value
                        })
                    )
                    return data
                },
                set: async (data) => {
                    const tasks = []
                    for (const type in data) {
                        for (const id in data[type]) {
                            const value = data[type][id]
                            const key = `${type}-${id}`
                            tasks.push(value ? writeData(key, value) : removeData(key))
                        }
                    }
                    await Promise.all(tasks)
                },
            },
        },
        saveCreds: () => writeData('creds', creds),
        clearSession: async () => {
            await waSessionSchema.deleteMany({})
        },
    }
}

module.exports = useMongoAuthState
