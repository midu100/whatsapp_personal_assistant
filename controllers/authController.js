const userSchema = require('../models/userSchema')
const { generateToken } = require('../services/helpers')

// ====== Sign Up (প্রথম user টাই admin, তারপর বন্ধ)
const signUp = async (req, res) => {
    try {
        const { fullName, email, password } = req.body
        if (!email) return res.status(400).send({ success: false, message: 'Email is required' })
        if (!password) return res.status(400).send({ success: false, message: 'Password is required' })

        const total = await userSchema.countDocuments()
        if (total > 0)
            return res.status(403).send({ success: false, message: 'Admin already exists. Signup is closed.' })

        const isExist = await userSchema.findOne({ email })
        if (isExist) return res.status(400).send({ success: false, message: 'User already exists' })

        const user = await userSchema.create({ fullName, email, password, role: 'admin' })

        return res.status(201).send({
            success: true,
            message: 'Admin created successfully.',
            data: { _id: user._id, fullName: user.fullName, email: user.email, role: user.role },
        })
    } catch (error) {
        console.log(error)
        return res.status(500).send({ success: false, message: 'Internal server error' })
    }
}

// ====== Sign In
const signIn = async (req, res) => {
    try {
        const { email, password } = req.body
        if (!email || !password)
            return res.status(400).send({ success: false, message: 'Email and password are required' })

        const user = await userSchema.findOne({ email })
        if (!user || !(await user.comparePassword(password)))
            return res.status(401).send({ success: false, message: 'Invalid credentials' })

        const token = generateToken(user._id)
        const isSecure = process.env.NODE_ENV === 'production'

        res.cookie('token', token, {
            httpOnly: true,
            secure: isSecure,
            sameSite: isSecure ? 'none' : 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000,
        })

        return res.status(200).send({
            success: true,
            message: 'Login successful',
            data: { _id: user._id, fullName: user.fullName, email: user.email, role: user.role, token },
        })
    } catch (error) {
        console.log(error)
        return res.status(500).send({ success: false, message: 'Internal server error' })
    }
}

// ====== Profile
const getProfile = async (req, res) => {
    try {
        return res.status(200).send({ success: true, message: 'Profile fetched.', data: req.user })
    } catch (error) {
        console.log(error)
        return res.status(500).send({ success: false, message: 'Internal server error' })
    }
}

// ====== Logout
const signOut = async (req, res) => {
    try {
        res.clearCookie('token')
        return res.status(200).send({ success: true, message: 'Logged out', data: {} })
    } catch (error) {
        console.log(error)
        return res.status(500).send({ success: false, message: 'Internal server error' })
    }
}

module.exports = { signUp, signIn, getProfile, signOut }
