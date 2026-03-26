// backend/controllers/authController.js
const crypto = require('crypto');
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const sendEmail = require('../utils/sendEmail');

const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRE || '30d'
    });
};

exports.register = async (req, res) => {
    try {
        const { name, email, password, company, phone } = req.body;

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ success: false, message: 'User already exists with this email' });
        }

        const user = await User.create({ name, email, password, company, phone });
        const token = generateToken(user._id);

        res.status(201).json({
            success: true,
            token,
            user: { id: user._id, name: user.name, email: user.email, role: user.role, company: user.company, phone: user.phone, avatar: user.avatar, preferences: user.preferences }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ success: false, message: 'Please provide email and password' });
        }

        const user = await User.findOne({ email }).select('+password');
        if (!user) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        const isMatch = await user.matchPassword(password);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        const token = generateToken(user._id);

        res.json({
            success: true,
            token,
            user: { id: user._id, name: user.name, email: user.email, role: user.role, company: user.company, phone: user.phone, avatar: user.avatar, preferences: user.preferences }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.getMe = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        res.json({ success: true, user });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.updateProfile = async (req, res) => {
    try {
        const { name, email, phone, company, preferences } = req.body;
        const user = await User.findByIdAndUpdate(
            req.user.id,
            { name, email, phone, company, preferences },
            { new: true, runValidators: true }
        );
        res.json({ success: true, user });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.updatePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const user = await User.findById(req.user.id).select('+password');

        const isMatch = await user.matchPassword(currentPassword);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Current password is incorrect' });
        }

        user.password = newPassword;
        await user.save();

        const token = generateToken(user._id);
        res.json({ success: true, token, message: 'Password updated successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.logout = async (req, res) => {
    res.json({ success: true, message: 'Logged out successfully' });
};

// ─── FORGOT PASSWORD ──────────────────────────────────────────────────────────
// POST /api/auth/forgot-password
// Body: { email }
exports.forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;

        const user = await User.findOne({ email });
        if (!user) {
            // Return generic message to prevent email enumeration attacks
            return res.status(200).json({
                success: true,
                message: 'If that email is registered, a reset link has been sent.'
            });
        }

        // Generate token and save hashed version to DB
        const resetToken = user.getResetPasswordToken();
        await user.save({ validateBeforeSave: false });

        // Build the reset URL pointing to your frontend reset page
        const resetUrl = `${process.env.FRONTEND_URL}/reset-password.html?token=${resetToken}`;

        const html = `
        <!DOCTYPE html>
        <html>
        <body style="font-family:'Outfit',sans-serif;background:#060a12;color:#f1f5f9;padding:40px;">
            <div style="max-width:520px;margin:0 auto;background:#0d1424;border:1px solid rgba(255,255,255,0.08);border-radius:16px;overflow:hidden;">
                <div style="height:4px;background:linear-gradient(90deg,#00d4c8,#3b82f6,#8b5cf6);"></div>
                <div style="padding:40px;">
                    <h2 style="font-size:1.5rem;font-weight:800;color:#f1f5f9;margin-bottom:8px;">Reset Your Password</h2>
                    <p style="color:#94a3b8;margin-bottom:24px;">You requested a password reset for your SmartArch account. Click the button below to set a new password.</p>
                    <a href="${resetUrl}" style="display:inline-block;background:#00d4c8;color:#060a12;font-weight:700;padding:14px 32px;border-radius:10px;text-decoration:none;font-size:1rem;">
                        Reset Password
                    </a>
                    <p style="color:#64748b;font-size:0.82rem;margin-top:28px;">This link expires in <strong style="color:#f59e0b;">30 minutes</strong>. If you did not request this, please ignore this email.</p>
                    <hr style="border:none;border-top:1px solid rgba(255,255,255,0.07);margin:24px 0;">
                    <p style="color:#64748b;font-size:0.78rem;">© 2025 SmartArch · AI-Powered Architecture Platform</p>
                </div>
            </div>
        </body>
        </html>`;

        try {
            await sendEmail({ to: user.email, subject: 'SmartArch — Password Reset Request', html });
            res.status(200).json({ success: true, message: "We've sent a reset link if that email matches an account with us."  });
        } catch (emailError) {
            console.error('Email send error:', emailError);
            // Rollback token if email fails
            user.resetPasswordToken = undefined;
            user.resetPasswordExpire = undefined;
            await user.save({ validateBeforeSave: false });
            res.status(500).json({ success: false, message: 'Email could not be sent. Please try again later.' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// ─── RESET PASSWORD ───────────────────────────────────────────────────────────
// PUT /api/auth/reset-password/:token
// Body: { password }
exports.resetPassword = async (req, res) => {
    try {
        // Hash the raw token from URL to compare with DB
        const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');

        const user = await User.findOne({
            resetPasswordToken: hashedToken,
            resetPasswordExpire: { $gt: Date.now() }  // not expired
        });

        if (!user) {
            return res.status(400).json({
                success: false,
                message: 'Password reset token is invalid or has expired. Please request a new one.'
            });
        }

        // Set new password (pre-save hook will hash it)
        user.password = req.body.password;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpire = undefined;
        await user.save();

        const token = generateToken(user._id);
        res.json({
            success: true,
            token,
            message: 'Password reset successfully. You are now logged in.'
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
