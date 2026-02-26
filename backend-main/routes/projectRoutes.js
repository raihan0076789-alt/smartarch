// backend/routes/projectRoutes.js
const express = require('express');
const router = express.Router();
const { createProject, getProjects, getProject, updateProject, deleteProject, addCollaborator, getProjectVersions, restoreVersion } = require('../controllers/projectController');
const { protect } = require('../middleware/auth');
const { validate, projectValidation, idValidation } = require('../middleware/validation');

router.route('/')
    .get(protect, getProjects)
    .post(protect, projectValidation, validate, createProject);

router.route('/:id')
    .get(protect, idValidation, validate, getProject)
    .put(protect, idValidation, validate, updateProject)
    .delete(protect, idValidation, validate, deleteProject);

router.post('/:id/collaborators', protect, idValidation, validate, addCollaborator);
router.get('/:id/versions', protect, idValidation, validate, getProjectVersions);
router.post('/:id/versions/:versionId/restore', protect, idValidation, validate, restoreVersion);

module.exports = router;
