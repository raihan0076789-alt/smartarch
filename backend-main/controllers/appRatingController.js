// backend-main/controllers/appRatingController.js
const AppRating = require('../models/AppRating');

// ─── POST /api/app-ratings ────────────────────────────────────────────────────
// Submit an app rating. Auth is optional — works for both logged-in users and guests.
exports.submitAppRating = async (req, res) => {
    try {
        const { rating, comment = '', page = '' } = req.body;

        if (!rating || rating < 1 || rating > 5) {
            return res.status(400).json({ success: false, message: 'Rating must be between 1 and 5' });
        }

        const doc = await AppRating.create({
            user:    req.user ? req.user._id : null,
            rating:  parseInt(rating),
            comment: comment.trim(),
            page
        });

        res.status(201).json({ success: true, data: doc });
    } catch (err) {
        console.error('submitAppRating error:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// ─── GET /api/admin/app-ratings ───────────────────────────────────────────────
// Admin: aggregated app rating stats.
exports.getAppRatingStats = async (req, res) => {
    try {
        const total = await AppRating.countDocuments();

        const avgAgg = await AppRating.aggregate([
            { $group: { _id: null, avg: { $avg: '$rating' } } }
        ]);
        const overallAverage = avgAgg.length
            ? parseFloat(avgAgg[0].avg.toFixed(1))
            : null;

        // Distribution 1–5
        const distAgg = await AppRating.aggregate([
            { $group: { _id: '$rating', count: { $sum: 1 } } },
            { $sort: { _id: 1 } }
        ]);
        const distribution = [0, 0, 0, 0, 0];
        distAgg.forEach(d => { distribution[d._id - 1] = d.count; });

        // Ratings over last 30 days
        const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const trend = await AppRating.aggregate([
            { $match: { createdAt: { $gte: monthAgo } } },
            {
                $group: {
                    _id:   { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                    count: { $sum: 1 },
                    avg:   { $avg: '$rating' }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        // Recent ratings feed
        const recent = await AppRating.find()
            .sort({ createdAt: -1 })
            .limit(15)
            .populate('user', 'name email')
            .lean();

        res.json({
            success: true,
            data: { total, overallAverage, distribution, trend, recent }
        });
    } catch (err) {
        console.error('getAppRatingStats error:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// ─── DELETE /api/admin/app-ratings/:id ────────────────────────────────────────
exports.deleteAppRating = async (req, res) => {
    try {
        const deleted = await AppRating.findByIdAndDelete(req.params.id);
        if (!deleted) return res.status(404).json({ success: false, message: 'Rating not found' });
        res.json({ success: true, message: 'Rating deleted' });
    } catch (err) {
        console.error('deleteAppRating error:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};