const express = require('express')
const { getMeetings, getSlots, updateMeeting } = require('../controllers/meetingController')

const route = express.Router()

// ====== Admin Routes
route.get('/all', getMeetings)
route.get('/slots', getSlots)
route.put('/:id', updateMeeting)

module.exports = route
