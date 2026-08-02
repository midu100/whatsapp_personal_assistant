const express = require('express')
const authRoute = require('./auth')
const contactRoute = require('./contact')
const leadRoute = require('./lead')
const knowledgeRoute = require('./knowledge')
const escalationRoute = require('./escalation')
const meetingRoute = require('./meeting')
const { authMiddleware } = require('../middleware/authMiddleware')
const roleCheck = require('../middleware/roleCheckMiddleware')

const route = express.Router()

// ====== Public
route.use('/auth', authRoute)

// ====== Admin only (dashboard এর জন্য)
route.use('/contact', authMiddleware, roleCheck('admin'), contactRoute)
route.use('/lead', authMiddleware, roleCheck('admin'), leadRoute)
route.use('/knowledge', authMiddleware, roleCheck('admin'), knowledgeRoute)
route.use('/escalation', authMiddleware, roleCheck('admin'), escalationRoute)
route.use('/meeting', authMiddleware, roleCheck('admin'), meetingRoute)

module.exports = route
