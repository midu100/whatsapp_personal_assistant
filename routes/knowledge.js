const express = require('express')
const { getKnowledge, createKnowledge, deleteKnowledge } = require('../controllers/knowledgeController')

const route = express.Router()

// ====== Admin Routes
route.get('/all', getKnowledge)
route.post('/add', createKnowledge)
route.delete('/:id', deleteKnowledge)

module.exports = route
