// backend-main/controllers/reviewController.js
const Review  = require('../models/Review');
const Project = require('../models/Project');

// ─── GET /api/reviews/:projectId ─────────────────────────────────────────────
// Returns all reviews for a project, newest first.
exports.getProjectReviews = async (req, res) => {
    try {
        const { projectId } = req.params;

        const project = await Project.findById(projectId).select('_id');
        if (!project) {
            return res.status(404).json({ success: false, message: 'Project not found' });
        }

        const reviews = await Review.find({ project: projectId })
            .populate('reviewer', 'name avatar')
            .sort({ createdAt: -1 });

        // Summary stats
        const total = reviews.length;
        const avg   = total
            ? parseFloat((reviews.reduce((s, r) => s + r.rating, 0) / total).toFixed(1))
            : null;

        const distribution = [0, 0, 0, 0, 0]; // index 0 = 1 star … index 4 = 5 stars
        reviews.forEach(r => { distribution[r.rating - 1]++; });

        // Mark which review (if any) belongs to the requesting user
        const myReview = req.user
            ? reviews.find(r => r.reviewer._id.toString() === req.user._id.toString())
            : null;

        res.json({
            success: true,
            data: {
                reviews,
                summary: { total, average: avg, distribution },
                myReview: myReview || null
            }
        });
    } catch (err) {
        console.error('getProjectReviews error:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// ─── POST /api/reviews/:projectId ────────────────────────────────────────────
// Create or update the current user's review for a project (upsert).
exports.upsertReview = async (req, res) => {
    try {
        const { projectId } = req.params;
        const { rating, comment = '' } = req.body;

        if (!rating || rating < 1 || rating > 5) {
            return res.status(400).json({ success: false, message: 'Rating must be between 1 and 5' });
        }

        const project = await Project.findById(projectId).select('_id owner collaborators');
        if (!project) {
            return res.status(404).json({ success: false, message: 'Project not found' });
        }

        // Only owner or collaborators can review
        const isOwner = project.owner.toString() === req.user._id.toString();
        const isCollab = project.collaborators.some(
            c => c.user && c.user.toString() === req.user._id.toString()
        );
        if (!isOwner && !isCollab) {
            return res.status(403).json({ success: false, message: 'You must be a project member to leave a review' });
        }

        const review = await Review.findOneAndUpdate(
            { project: projectId, reviewer: req.user._id },
            { rating: parseInt(rating), comment: comment.trim() },
            { new: true, upsert: true, setDefaultsOnInsert: true, runValidators: true }
        ).populate('reviewer', 'name avatar');

        res.json({ success: true, data: review });
    } catch (err) {
        console.error('upsertReview error:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// ─── DELETE /api/reviews/:projectId ──────────────────────────────────────────
// Delete the current user's own review for a project.
exports.deleteReview = async (req, res) => {
    try {
        const { projectId } = req.params;

        const deleted = await Review.findOneAndDelete({
            project: projectId,
            reviewer: req.user._id
        });

        if (!deleted) {
            return res.status(404).json({ success: false, message: 'Review not found' });
        }

        res.json({ success: true, message: 'Review deleted' });
    } catch (err) {
        console.error('deleteReview error:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// ─── DELETE /api/reviews/admin/:reviewId ─────────────────────────────────────
// Admin: delete any review by its ID.
exports.adminDeleteReview = async (req, res) => {
    try {
        const deleted = await Review.findByIdAndDelete(req.params.reviewId);
        if (!deleted) {
            return res.status(404).json({ success: false, message: 'Review not found' });
        }
        res.json({ success: true, message: 'Review deleted by admin' });
    } catch (err) {
        console.error('adminDeleteReview error:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// ─── GET /api/reviews/admin/stats ────────────────────────────────────────────
// Admin: aggregated review stats for the dashboard.
exports.getAdminReviewStats = async (req, res) => {
    try {
        const totalReviews = await Review.countDocuments();

        // Overall average
        const avgAgg = await Review.aggregate([
            { $group: { _id: null, avg: { $avg: '$rating' }, total: { $sum: 1 } } }
        ]);
        const overallAverage = avgAgg.length ? parseFloat(avgAgg[0].avg.toFixed(1)) : null;

        // Rating distribution (1–5)
        const distAgg = await Review.aggregate([
            { $group: { _id: '$rating', count: { $sum: 1 } } },
            { $sort: { _id: 1 } }
        ]);
        const distribution = [0, 0, 0, 0, 0];
        distAgg.forEach(d => { distribution[d._id - 1] = d.count; });

        // Top rated projects (avg rating desc, min 1 review)
        const topProjects = await Review.aggregate([
            {
                $group: {
                    _id: '$project',
                    avgRating:   { $avg: '$rating' },
                    reviewCount: { $sum: 1 }
                }
            },
            { $sort: { avgRating: -1 } },
            { $limit: 5 },
            {
                $lookup: {
                    from:         'projects',
                    localField:   '_id',
                    foreignField: '_id',
                    as:           'project'
                }
            },
            { $unwind: '$project' },
            {
                $lookup: {
                    from:         'users',
                    localField:   'project.owner',
                    foreignField: '_id',
                    as:           'owner'
                }
            },
            { $unwind: { path: '$owner', preserveNullAndEmptyArrays: true } },
            {
                $project: {
                    _id:         1,
                    avgRating:   { $round: ['$avgRating', 1] },
                    reviewCount: 1,
                    projectName: '$project.name',
                    ownerName:   '$owner.name',
                    ownerEmail:  '$owner.email'
                }
            }
        ]);

        // Recent reviews feed
        const recentReviews = await Review.find()
            .sort({ createdAt: -1 })
            .limit(10)
            .populate('reviewer', 'name email avatar')
            .populate({ path: 'project', select: 'name', strictPopulate: false })
            .lean();

        res.json({
            success: true,
            data: {
                totalReviews,
                overallAverage,
                distribution,
                topProjects,
                recentReviews
            }
        });
    } catch (err) {
        console.error('getAdminReviewStats error:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};