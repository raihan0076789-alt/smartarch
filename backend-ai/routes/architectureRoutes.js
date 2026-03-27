/**
 * architectureRoutes.js
 * Routes for layout generation, image parsing, AI chat, and all export formats.
 */

import express from 'express';
import multer  from 'multer';
import {
  generateFloorplan,
  uploadFloorplanImage,
  chatWithArchitect,
  suggestDesign,
  exportCAD,
  exportOBJ,
  exportSTL,
  exportGLTF,
} from '../controllers/architectureController.js';
import { getDesignFeedback } from '../controllers/feedbackController.js';

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok = ['image/png','image/jpeg','image/jpg','image/webp'].includes(file.mimetype);
    ok ? cb(null,true) : cb(new Error('Only PNG/JPEG/WEBP images accepted'), false);
  },
});

// ── Floorplan ──────────────────────────────────────────────────────
router.post('/floorplan/generate',                   generateFloorplan);
router.post('/floorplan/upload-image', upload.single('file'), uploadFloorplanImage);

// ── AI Chat ────────────────────────────────────────────────────────
router.post('/chat', chatWithArchitect);

// ── AI Design Feedback ─────────────────────────────────────────────
router.post('/feedback', getDesignFeedback);

/**
 * POST /api/architecture/suggest
 * Body: { type: 'interior'|'exterior'|'layout'|'materials', projectData }
 * Returns proactive AI design suggestions grounded in the current project.
 */
router.post('/suggest', suggestDesign);

// ── Export ─────────────────────────────────────────────────────────
/**
 * POST /api/architecture/export/cad   → .dxf  (2D floor plan, AutoCAD)
 * POST /api/architecture/export/obj   → JSON { obj, mtl, filename }
 * POST /api/architecture/export/stl   → .stl  (binary, 3D printing)
 * POST /api/architecture/export/gltf  → .glb  (binary glTF 2.0)
 *
 * All export routes accept: Content-Type: application/json
 * Body: full SmartArch projectData object
 */
router.post('/export/cad',  exportCAD);
router.post('/export/obj',  exportOBJ);
router.post('/export/stl',  exportSTL);
router.post('/export/gltf', exportGLTF);

export default router;