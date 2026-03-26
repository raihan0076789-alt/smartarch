// backend-main/routes/ticketRoutes.js
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { adminProtect } = require('../middleware/adminAuth');
const {
    submitTicket,
    getUserTickets,
    getUserUnreadCount,
    getAllTickets,
    getTicket,
    replyToTicket,
    updateTicketStatus,
    getAdminUnreadCount
} = require('../controllers/ticketController');

// ─── Public / User routes ──────────────────────────────────────────────────────

// Submit a ticket — works for guests (no auth) AND logged-in users
// We use a soft-protect: attach user if token present, else continue
router.post('/', (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer')) {
        return protect(req, res, next);
    }
    next();
}, submitTicket);

// User dashboard: list own tickets (must be logged in)
router.get('/my', protect, getUserTickets);
router.get('/my/unread', protect, getUserUnreadCount);

// ─── Admin routes ──────────────────────────────────────────────────────────────

router.get('/admin/all', adminProtect, getAllTickets);
router.get('/admin/unread-count', adminProtect, getAdminUnreadCount);
router.get('/admin/:id', adminProtect, getTicket);
router.post('/admin/:id/reply', adminProtect, replyToTicket);
router.patch('/admin/:id/status', adminProtect, updateTicketStatus);

module.exports = router;