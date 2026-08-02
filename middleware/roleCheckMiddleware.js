const roleCheck =
    (...roles) =>
    (req, res, next) => {
        if (!req.user) return res.status(401).send({ success: false, message: 'Unauthorized. Please login.' })
        if (!roles.includes(req.user.role))
            return res.status(403).send({ success: false, message: 'Access denied. You do not have permission.' })
        next()
    }

module.exports = roleCheck
