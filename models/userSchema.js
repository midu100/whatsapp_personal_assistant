const mongoose = require('mongoose')
const bcrypt = require('bcrypt')

// ====== Admin dashboard এর user (Phase 5 এর dashboard এই login খাবে)

const userSchema = new mongoose.Schema(
    {
        fullName: { type: String },
        email: { type: String, required: true, unique: true },
        password: { type: String, required: true },
        role: { type: String, default: 'admin', enum: ['admin', 'user'] },
        isVerified: { type: Boolean, default: true },
    },
    { timestamps: true }
)

// ====== Hash password before save
userSchema.pre('save', async function () {
    const user = this
    if (!user.isModified('password')) return
    try {
        user.password = await bcrypt.hash(user.password, 10)
    } catch (err) {
        console.log(err)
    }
})

// ====== Compare password
userSchema.methods.comparePassword = async function (candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password)
}

module.exports = mongoose.model('user', userSchema)
