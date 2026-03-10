// backend-main/routes/adminRoutes.js
const express = require('express');
const router = express.Router();
const { adminProtect } = require('../middleware/adminAuth');
const {
    adminLogin,
    getDashboardStats,
    getAllUsers,
    getUserById,
    updateUserStatus,
    deleteUser,
    getAllProjects,
    getProjectById,
    updateProjectVisibility,
    deleteProject
} = require('../controllers/adminController');

// Public admin route
router.post('/login', adminLogin);

// Protected admin routes
router.get('/dashboard', adminProtect, getDashboardStats);

router.get('/users', adminProtect, getAllUsers);
router.get('/users/:id', adminProtect, getUserById);
router.patch('/users/:id/status', adminProtect, updateUserStatus);
router.delete('/users/:id', adminProtect, deleteUser);

router.get('/projects', adminProtect, getAllProjects);
router.get('/projects/:id', adminProtect, getProjectById);
router.patch('/projects/:id/visibility', adminProtect, updateProjectVisibility);
router.delete('/projects/:id', adminProtect, deleteProject);

module.exports = router;
