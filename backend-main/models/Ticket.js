// backend-main/models/Ticket.js
const mongoose = require('mongoose');

const replySchema = new mongoose.Schema({
    sender: { type: String, enum: ['user', 'admin'], required: true },
    senderName: { type: String, required: true },
    senderEmail: { type: String, required: true },
    message: { type: String, required: true, maxlength: 5000 },
    createdAt: { type: Date, default: Date.now }
});

const ticketSchema = new mongoose.Schema({
    // Who submitted
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }, // null = guest
    name: { type: String, required: true, trim: true, maxlength: 100 },
    email: { type: String, required: true, lowercase: true, trim: true },
    company: { type: String, trim: true, default: '' },

    // Ticket content
    subject: { type: String, required: true, trim: true, maxlength: 200 },
    category: { type: String, required: true },
    message: { type: String, required: true, maxlength: 5000 },

    // Thread (admin replies + follow-ups)
    replies: [replySchema],

    // Status tracking
    status: {
        type: String,
        enum: ['new', 'seen', 'replied', 'closed'],
        default: 'new'
    },

    // Admin notification flag (cleared after admin reads)
    adminRead: { type: Boolean, default: false },

    // User notification flag (set when admin replies, cleared when user reads)
    userRead: { type: Boolean, default: true },

}, { timestamps: true });

// Index for fast queries
ticketSchema.index({ email: 1, createdAt: -1 });
ticketSchema.index({ status: 1, adminRead: 1 });

module.exports = mongoose.model('Ticket', ticketSchema);