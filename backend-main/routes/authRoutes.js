// backend/routes/authRoutes.js
const express = require('express');
const router = express.Router();
const { register, login, getMe, updateProfile, updatePassword, logout } = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { validate, userValidation } = require('../middleware/validation');

router.post('/register', userValidation, validate, register);
router.post('/login', login);
router.get('/me', protect, getMe);
router.put('/profile', protect, updateProfile);
router.put('/password', protect, updatePassword);
router.post('/logout', protect, logout);

module.exports = router;
