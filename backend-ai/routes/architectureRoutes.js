/**
 * architectureRoutes.js
 * Routes for building layout generation, image parsing, and AI chat.
 */

import express                          from 'express';
import multer                           from 'multer';          // npm i multer
import {
  generateFloorplan,
  uploadFloorplanImage,
  chatWithArchitect,
}                                       from '../controllers/architectureController.js';

const router = express.Router();

// ── Multer — memory storage (buffer passed to canvas) ──────────────
const upload = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: 10 * 1024 * 1024 },   // 10 MB cap
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only PNG / JPEG / WEBP images are accepted'), false);
    }
  },
});

// ── Floorplan routes ────────────────────────────────────────────────

/**
 * POST /api/architecture/floorplan/generate
 * Generate a building layout programmatically via the BSP engine.
 *
 * Body (JSON):
 *   buildingType  string   'residential' | 'office' | 'commercial'  (default: residential)
 *   floors        number   1–6                                       (default: 1)
 *   totalArea     number   Total floor area m²                       (default: 100)
 *   rooms         Array    [{ type: string, count: number }]         (optional)
 *
 * Response:
 *   { success, requestId, floorplan: { floors: [...] }, timestamp }
 */
router.post('/floorplan/generate', generateFloorplan);

/**
 * POST /api/architecture/floorplan/upload-image
 * Parse an uploaded floorplan image and return a floorplan JSON.
 *
 * Multipart form:
 *   file          File     PNG / JPEG / WEBP image
 *   scaleFactor   number   Pixels per metre (default: 20)
 *
 * Response:
 *   { success, requestId, floorplan: { floors: [...] }, timestamp }
 */
router.post('/floorplan/upload-image', upload.single('file'), uploadFloorplanImage);

// ── AI Chat route (Ollama proxy — behaviour unchanged) ──────────────

/**
 * POST /api/architecture/chat
 * Body: { message: string }
 * Response: { success, requestId, data: { reply }, timestamp }
 */
router.post('/chat', chatWithArchitect);

export default router;
