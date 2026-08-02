const express = require('express')
const { getLeads, updateLead, getStats } = require('../controllers/leadController')

const route = express.Router()

// ====== Admin Routes
route.get('/all', getLeads)
route.get('/stats', getStats)
route.put('/:id', updateLead)

module.exports = route
