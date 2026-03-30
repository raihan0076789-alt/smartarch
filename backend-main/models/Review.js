// backend-main/models/Review.js
const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
    project: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project',
        required: true
    },
    reviewer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
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
        maxlength: [1000, 'Comment cannot exceed 1000 characters'],
        default: ''
    }
}, { timestamps: true });

// One review per user per project
reviewSchema.index({ project: 1, reviewer: 1 }, { unique: true });

module.exports = mongoose.model('Review', reviewSchema);