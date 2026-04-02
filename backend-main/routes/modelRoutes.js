// backend/routes/modelRoutes.js
const express = require('express');
const router = express.Router();
const { generateFloorPlan, generate3DModel, exportModel, getModelStats } = require('../controllers/modelController');
const { protect } = require('../middleware/auth');
const { planGuard } = require('../middleware/planGuard');

router.post('/:projectId/floorplan', protect, generateFloorPlan);
router.post('/:projectId/3d',        protect, planGuard('pro'), generate3DModel);
router.get('/:projectId/stats',      protect, getModelStats);
router.get('/:projectId/export/:format', protect, planGuard('pro'), exportModel);

module.exports = router;