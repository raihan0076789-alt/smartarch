// backend/routes/modelRoutes.js
const express = require('express');
const router = express.Router();
const { generateFloorPlan, generate3DModel, exportModel, getModelStats } = require('../controllers/modelController');
const { protect } = require('../middleware/auth');

router.post('/:projectId/floorplan', protect, generateFloorPlan);
router.post('/:projectId/3d', protect, generate3DModel);
router.get('/:projectId/stats', protect, getModelStats);
router.get('/:projectId/export/:format', protect, exportModel);

module.exports = router;
