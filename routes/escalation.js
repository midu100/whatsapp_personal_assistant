const express = require('express')
const { getEscalations, answer } = require('../controllers/escalationController')

const route = express.Router()

// ====== Admin Routes
route.get('/all', getEscalations)
route.post('/:ticket/answer', answer)

module.exports = route
