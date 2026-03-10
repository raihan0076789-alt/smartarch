// backend-main/controllers/adminController.js
const User = require('../models/User');
const Project = require('../models/Project');
const jwt = require('jsonwebtoken');

const generateAdminToken = (id) => {
    return jwt.sign({ id, isAdmin: true }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRE || '7d'
    });
};

// ─── Admin Login ──────────────────────────────────────────────────────────────
exports.adminLogin = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ success: false, message: 'Please provide email and password' });
        }

        const user = await User.findOne({ email }).select('+password');
        if (!user) {
            return res.status(401).json({ success: false, message: 'Invalid admin credentials' });
        }

        if (user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Access denied. Admin privileges required.' });
        }

        const isMatch = await user.matchPassword(password);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Invalid admin credentials' });
        }

        const token = generateAdminToken(user._id);

        res.json({
            success: true,
            token,
            admin: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        console.error('Admin login error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// ─── Dashboard Overview ───────────────────────────────────────────────────────
exports.getDashboardStats = async (req, res) => {
    try {
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
        const monthAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);

        const [
            totalUsers,
            totalProjects,
            projectsToday,
            usersToday,
            usersThisWeek,
            projectsThisWeek,
            recentProjects,
            recentUsers,
            projectsByStatus,
            projectsByType
        ] = await Promise.all([
            User.countDocuments({ role: { $ne: 'admin' } }),
            Project.countDocuments(),
            Project.countDocuments({ createdAt: { $gte: todayStart } }),
            User.countDocuments({ createdAt: { $gte: todayStart } }),
            User.countDocuments({ createdAt: { $gte: weekAgo } }),
            Project.countDocuments({ createdAt: { $gte: weekAgo } }),
            Project.find().sort({ createdAt: -1 }).limit(5).populate('owner', 'name email'),
            User.find({ role: { $ne: 'admin' } }).sort({ createdAt: -1 }).limit(5),
            Project.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
            Project.aggregate([{ $group: { _id: '$type', count: { $sum: 1 } } }])
        ]);

        // User registrations over last 30 days
        const userGrowth = await User.aggregate([
            { $match: { createdAt: { $gte: monthAgo }, role: { $ne: 'admin' } } },
            {
                $group: {
                    _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                    count: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        // Project creation over last 30 days
        const projectGrowth = await Project.aggregate([
            { $match: { createdAt: { $gte: monthAgo } } },
            {
                $group: {
                    _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                    count: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        // Most active users
        const topUsers = await Project.aggregate([
            { $group: { _id: '$owner', projectCount: { $sum: 1 } } },
            { $sort: { projectCount: -1 } },
            { $limit: 5 },
            {
                $lookup: {
                    from: 'users',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'user'
                }
            },
            { $unwind: '$user' },
            { $project: { name: '$user.name', email: '$user.email', projectCount: 1 } }
        ]);

        res.json({
            success: true,
            data: {
                stats: {
                    totalUsers,
                    totalProjects,
                    projectsToday,
                    usersToday,
                    usersThisWeek,
                    projectsThisWeek
                },
                recentProjects,
                recentUsers,
                projectsByStatus,
                projectsByType,
                userGrowth,
                projectGrowth,
                topUsers
            }
        });
    } catch (error) {
        console.error('Dashboard stats error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// ─── User Management ──────────────────────────────────────────────────────────
exports.getAllUsers = async (req, res) => {
    try {
        const { page = 1, limit = 20, search = '', sort = '-createdAt' } = req.query;

        const query = { role: { $ne: 'admin' } };
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } }
            ];
        }

        const total = await User.countDocuments(query);
        const users = await User.find(query)
            .sort(sort)
            .skip((page - 1) * limit)
            .limit(parseInt(limit))
            .select('-password');

        const usersWithProjects = await Promise.all(
            users.map(async (user) => {
                const projectCount = await Project.countDocuments({ owner: user._id });
                return { ...user.toObject(), projectCount };
            })
        );

        res.json({
            success: true,
            data: usersWithProjects,
            pagination: {
                total,
                page: parseInt(page),
                pages: Math.ceil(total / limit),
                limit: parseInt(limit)
            }
        });
    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.getUserById = async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select('-password');
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const projects = await Project.find({ owner: user._id })
            .sort({ createdAt: -1 })
            .select('name status type createdAt metadata');

        res.json({ success: true, data: { ...user.toObject(), projects } });
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.updateUserStatus = async (req, res) => {
    try {
        const { suspended } = req.body;
        const user = await User.findByIdAndUpdate(
            req.params.id,
            { suspended },
            { new: true }
        ).select('-password');

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        res.json({
            success: true,
            message: `User ${suspended ? 'suspended' : 'activated'} successfully`,
            data: user
        });
    } catch (error) {
        console.error('Update user status error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.deleteUser = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        if (user.role === 'admin') {
            return res.status(403).json({ success: false, message: 'Cannot delete admin user' });
        }

        await Project.deleteMany({ owner: user._id });
        await User.findByIdAndDelete(req.params.id);

        res.json({ success: true, message: 'User and their projects deleted successfully' });
    } catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// ─── Project Management ───────────────────────────────────────────────────────
exports.getAllProjects = async (req, res) => {
    try {
        const { page = 1, limit = 20, search = '', status = '', type = '', sort = '-createdAt', userId = '' } = req.query;

        const query = {};
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ];
        }
        if (status) query.status = status;
        if (type) query.type = type;
        if (userId) query.owner = userId;

        const total = await Project.countDocuments(query);
        const projects = await Project.find(query)
            .sort(sort)
            .skip((page - 1) * limit)
            .limit(parseInt(limit))
            .populate('owner', 'name email');

        res.json({
            success: true,
            data: projects,
            pagination: {
                total,
                page: parseInt(page),
                pages: Math.ceil(total / limit),
                limit: parseInt(limit)
            }
        });
    } catch (error) {
        console.error('Get projects error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.getProjectById = async (req, res) => {
    try {
        const project = await Project.findById(req.params.id)
            .populate('owner', 'name email company')
            .populate('lastModifiedBy', 'name email');

        if (!project) {
            return res.status(404).json({ success: false, message: 'Project not found' });
        }

        res.json({ success: true, data: project });
    } catch (error) {
        console.error('Get project error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.updateProjectVisibility = async (req, res) => {
    try {
        const { isPublic } = req.body;
        const project = await Project.findByIdAndUpdate(
            req.params.id,
            { isPublic },
            { new: true }
        ).populate('owner', 'name email');

        if (!project) {
            return res.status(404).json({ success: false, message: 'Project not found' });
        }

        res.json({ success: true, message: 'Project visibility updated', data: project });
    } catch (error) {
        console.error('Update project visibility error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.deleteProject = async (req, res) => {
    try {
        const project = await Project.findByIdAndDelete(req.params.id);
        if (!project) {
            return res.status(404).json({ success: false, message: 'Project not found' });
        }

        res.json({ success: true, message: 'Project deleted successfully' });
    } catch (error) {
        console.error('Delete project error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
