// backend/routes/authRoutes.js
const express = require('express');
const router = express.Router();
const {
    register, login, getMe,
    updateProfile, updatePassword, logout,
    forgotPassword, resetPassword
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const {
    validate, userValidation,
    forgotPasswordValidation, resetPasswordValidation
} = require('../middleware/validation');

router.post('/register', userValidation, validate, register);
router.post('/login', login);
router.get('/me', protect, getMe);
router.put('/profile', protect, updateProfile);
router.put('/password', protect, updatePassword);
router.post('/logout', protect, logout);

// ── Forgot / Reset Password ──────────────────────────────────────────────────
router.post('/forgot-password', forgotPasswordValidation, validate, forgotPassword);
router.put('/reset-password/:token', resetPasswordValidation, validate, resetPassword);

module.exports = router;
