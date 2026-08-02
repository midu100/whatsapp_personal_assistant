const jwt = require('jsonwebtoken')
const userSchema = require('../models/userSchema')

const authMiddleware = async (req, res, next) => {
    try {
        let token = req.cookies.token
        if (!token && req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
            token = req.headers.authorization.split(' ')[1]
        }
        if (!token) return res.status(401).send({ success: false, message: 'Unauthorized. Please login.' })

        const decoded = jwt.verify(token, process.env.JWT_SECRET)
        const user = await userSchema.findById(decoded.id).select('-password')
        if (!user) return res.status(401).send({ success: false, message: 'User not found.' })

        req.user = user
        next()
    } catch (error) {
        console.log(error)
        return res.status(401).send({ success: false, message: 'Invalid or expired token.' })
    }
}

module.exports = { authMiddleware }
