// ====== Helper (controller গুলোতে বেশিরভাগ সময় inline object ই লেখা হয়)

const successResponse = (res, { statusCode = 200, message = 'Success', data = {}, pagination }) => {
    const payload = { success: true, message, data }
    if (pagination) payload.pagination = pagination
    return res.status(statusCode).send(payload)
}

const errorResponse = (res, { statusCode = 500, message = 'Internal server error' }) => {
    return res.status(statusCode).send({ success: false, message })
}

module.exports = { successResponse, errorResponse }
