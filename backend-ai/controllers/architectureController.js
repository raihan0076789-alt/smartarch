/**
 * architectureController.js
 * API layer — Building Layout endpoints + preserved AI chat proxy.
 */

import { architectureService } from '../services/architectureService.js';
import logger from '../utils/logger.js';
import { v4 as uuidv4 } from 'uuid';

// ─────────────────────────────────────────────
//  POST /api/architecture/floorplan/generate
//  Body: { buildingType, floors, totalArea, rooms }
// ─────────────────────────────────────────────
export const generateFloorplan = async (req, res, next) => {
  const requestId = uuidv4();
  try {
    logger.info(`[${requestId}] generateFloorplan request`);

    const { buildingType, floors, totalArea, rooms } = req.body;

    // Validate minimum required fields
    if (floors !== undefined && (isNaN(floors) || floors < 1 || floors > 6)) {
      return res.status(400).json({
        error:     'Bad Request',
        message:   'floors must be between 1 and 6',
        requestId,
      });
    }

    if (totalArea !== undefined && (isNaN(totalArea) || totalArea < 20)) {
      return res.status(400).json({
        error:     'Bad Request',
        message:   'totalArea must be at least 20 m²',
        requestId,
      });
    }

    const params = {
      buildingType: buildingType || 'residential',
      floors:       parseInt(floors || 1, 10),
      totalArea:    parseFloat(totalArea || 100),
      rooms:        Array.isArray(rooms) ? rooms : [],
    };

    const floorplan = architectureService.generateFloorplan(params, requestId);

    logger.info(`[${requestId}] Floorplan generated — ${floorplan.floors.length} floor(s)`);

    return res.status(200).json({
      success:   true,
      requestId,
      floorplan,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error(`[${requestId}] Error in generateFloorplan:`, error);
    next(error);
  }
};

// ─────────────────────────────────────────────
//  POST /api/architecture/floorplan/upload-image
//  Multipart: file = image, body.scaleFactor (optional)
//  Requires multer middleware on the route.
// ─────────────────────────────────────────────
export const uploadFloorplanImage = async (req, res, next) => {
  const requestId = uuidv4();
  try {
    logger.info(`[${requestId}] uploadFloorplanImage request`);

    if (!req.file || !req.file.buffer) {
      return res.status(400).json({
        error:     'Bad Request',
        message:   'An image file is required (field name: file)',
        requestId,
      });
    }

    const scaleFactor = parseFloat(req.body.scaleFactor) || 20;

    const floorplan = await architectureService.parseFloorplanImage(
      req.file.buffer,
      scaleFactor,
      requestId,
    );

    logger.info(`[${requestId}] Image floorplan extracted — ${floorplan.floors[0]?.rooms?.length} room(s)`);

    return res.status(200).json({
      success:   true,
      requestId,
      floorplan,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error(`[${requestId}] Error in uploadFloorplanImage:`, error);
    next(error);
  }
};

// ─────────────────────────────────────────────
//  POST /api/architecture/chat
//  Body: { message }  — AI assistant proxy (unchanged behaviour)
// ─────────────────────────────────────────────
export const chatWithArchitect = async (req, res, next) => {
  const requestId = uuidv4();
  try {
    const { message } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message is required', requestId });
    }

    const systemPrompt = `You are an expert house architect and interior designer assistant.
Help users design rooms, plan floor layouts, choose materials, estimate costs, and solve architectural problems.
Be concise, practical and friendly. When suggesting room sizes, use metric (metres).
If the user gives context about their current project (dimensions, rooms, style), use that to give relevant advice.`;

    const reply = await architectureService.callLlamaAPI(systemPrompt, message, requestId);

    return res.status(200).json({
      success:   true,
      requestId,
      data:      { reply },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
};
