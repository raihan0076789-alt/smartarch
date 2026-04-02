// routes/subscriptionRoutes.js
const express  = require('express');
const router   = express.Router();
const { protect } = require('../middleware/auth');
const { subscribe, verify, webhook, status } = require('../controllers/subscriptionController');

router.post('/subscribe', protect, subscribe);   // create Razorpay order
router.post('/verify',    protect, verify);      // verify payment + activate plan
router.post('/webhook',           webhook);      // Razorpay server-to-server (no auth)
router.get('/status',     protect, status);      // current plan info

module.exports = router;