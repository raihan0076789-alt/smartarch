// backend-main/middleware/adminAuth.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const adminProtect = async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            if (!decoded.isAdmin) {
                return res.status(403).json({ success: false, message: 'Not authorized as admin' });
            }

            const user = await User.findById(decoded.id).select('-password');

            if (!user) {
                return res.status(401).json({ success: false, message: 'Admin user not found' });
            }

            if (user.role !== 'admin') {
                return res.status(403).json({ success: false, message: 'Admin privileges required' });
            }

            req.user = user;
            next();
        } catch (error) {
            console.error('Admin auth error:', error);
            return res.status(401).json({ success: false, message: 'Not authorized, token failed' });
        }
    }

    if (!token) {
        return res.status(401).json({ success: false, message: 'Not authorized, no token' });
    }
};

module.exports = { adminProtect };
