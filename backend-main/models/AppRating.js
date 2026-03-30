// backend-main/models/AppRating.js
const mongoose = require('mongoose');

const appRatingSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null   // null = anonymous / guest
    },
    rating: {
        type: Number,
        required: [true, 'Rating is required'],
        min: [1, 'Rating must be at least 1'],
        max: [5, 'Rating cannot exceed 5']
    },
    comment: {
        type: String,
        trim: true,
        maxlength: [500, 'Comment cannot exceed 500 characters'],
        default: ''
    },
    // Which page the user was on when they logged out
    page: {
        type: String,
        default: ''
    }
}, { timestamps: true });

module.exports = mongoose.model('AppRating', appRatingSchema);