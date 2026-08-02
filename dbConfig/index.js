const mongoose = require('mongoose')

const dbConfig = () => {
    return mongoose
        .connect(process.env.DB_STRING)
        .then(() => console.log('DB Connected!'))
        .catch((err) => console.log('DB connection error:', err.message))
}

module.exports = dbConfig
