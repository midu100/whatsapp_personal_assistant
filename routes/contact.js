const express = require('express')
const { getContacts, getConversation, updateContact } = require('../controllers/contactController')

const route = express.Router()

// ====== Admin Routes (mount এই authMiddleware + roleCheck লাগানো আছে)
route.get('/all', getContacts)
route.get('/:id', getConversation)
route.put('/:id', updateContact)

module.exports = route
