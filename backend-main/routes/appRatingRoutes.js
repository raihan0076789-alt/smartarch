// backend-main/routes/appRatingRoutes.js
const express = require('express');
const router  = express.Router();
const { protect }      = require('../middleware/auth');
const { adminProtect } = require('../middleware/adminAuth');
const {
    submitAppRating,
    getAppRatingStats,
    deleteAppRating
} = require('../controllers/appRatingController');

// ── Admin routes ──────────────────────────────────────────────────────────────
router.get   ('/admin/stats',  adminProtect, getAppRatingStats);
router.delete('/admin/:id',    adminProtect, deleteAppRating);

// ── User route — soft auth: attach user if token present, else continue ───────
router.post('/', (req, res, next) => {
    const auth = req.headers.authorization;
    if (auth && auth.startsWith('Bearer ')) return protect(req, res, next);
    next();
}, submitAppRating);

module.exports = router;