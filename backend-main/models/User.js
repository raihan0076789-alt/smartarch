// backend/models/User.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please provide a name'],
        trim: true,
        maxlength: [50, 'Name cannot be more than 50 characters']
    },
    email: {
        type: String,
        required: [true, 'Please provide an email'],
        unique: true,
        lowercase: true,
        match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email']
    },
    password: {
        type: String,
        required: [true, 'Please provide a password'],
        minlength: [8, 'Password must be at least 8 characters'],
        select: false
    },
    role: {
        type: String,
        enum: ['user', 'architect', 'admin'],
        default: 'user'
    },
    company: { type: String, trim: true },
    phone: { type: String, trim: true },
    avatar: { type: String, default: '' },
    preferences: {
        theme: { type: String, enum: ['light', 'dark'], default: 'light' },
        defaultUnit: { type: String, enum: ['meters', 'feet'], default: 'meters' },
        autoSave: { type: Boolean, default: true }
    },
    suspended: { type: Boolean, default: false },
    resetPasswordToken: String,
    resetPasswordExpire: Date,
    createdAt: { type: Date, default: Date.now }
}, { timestamps: true });

userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) { next(); return; }
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

userSchema.methods.matchPassword = async function(enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

// Generate and hash a password reset token
userSchema.methods.getResetPasswordToken = function() {
    // Generate random 32-byte hex token (sent in email, not stored)
    const resetToken = crypto.randomBytes(32).toString('hex');
    // Store hashed version in DB
    this.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    // Expire in 30 minutes
    this.resetPasswordExpire = Date.now() + 30 * 60 * 1000;
    return resetToken;
};

module.exports = mongoose.model('User', userSchema);
