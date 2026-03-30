// backend-main/routes/reviewRoutes.js
const express = require('express');
const router  = express.Router();
const { protect }      = require('../middleware/auth');
const { adminProtect } = require('../middleware/adminAuth');
const {
    getProjectReviews,
    upsertReview,
    deleteReview,
    adminDeleteReview,
    getAdminReviewStats
} = require('../controllers/reviewController');

// ── Admin routes (must come before :projectId to avoid collision) ─────────────
router.get('/admin/stats',        adminProtect, getAdminReviewStats);
router.delete('/admin/:reviewId', adminProtect, adminDeleteReview);

// ── User routes ───────────────────────────────────────────────────────────────
// GET  — anyone with a valid token can read reviews for a project
// POST — upsert own review (owner / collaborator only, enforced in controller)
// DELETE — delete own review
router.get   ('/:projectId', protect, getProjectReviews);
router.post  ('/:projectId', protect, upsertReview);
router.delete('/:projectId', protect, deleteReview);

module.exports = router;