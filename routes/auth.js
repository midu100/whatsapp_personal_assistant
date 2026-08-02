const express = require('express')
const { signUp, signIn, getProfile, signOut } = require('../controllers/authController')
const { authMiddleware } = require('../middleware/authMiddleware')

const route = express.Router()

// ====== Public Routes
route.post('/signup', signUp)
route.post('/signin', signIn)

// ====== Protected Routes
route.get('/profile', authMiddleware, getProfile)
route.post('/signout', authMiddleware, signOut)

module.exports = route
