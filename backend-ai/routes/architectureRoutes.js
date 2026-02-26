import express from 'express';
import { validateArchitectureRequest } from '../middleware/validators.js';
import {
  generateArchitecture,
  analyzeArchitecture,
  optimizeArchitecture,
  compareArchitectures,
  generateDocumentation,
  getArchitectureSuggestions
} from '../controllers/architectureController.js';
import { architectureService } from '../services/architectureService.js';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

router.post('/generate', validateArchitectureRequest, generateArchitecture);
router.post('/analyze', validateArchitectureRequest, analyzeArchitecture);
router.post('/optimize', validateArchitectureRequest, optimizeArchitecture);
router.post('/compare', validateArchitectureRequest, compareArchitectures);
router.post('/documentation', validateArchitectureRequest, generateDocumentation);
router.post('/suggestions', validateArchitectureRequest, getArchitectureSuggestions);

// Direct chat endpoint for the frontend Ollama chat panel
router.post('/chat', async (req, res, next) => {
  const requestId = uuidv4();
  try {
    const { message } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message is required', requestId });
    }
    const systemPrompt = `You are an expert house architect and interior designer assistant.
Help users design rooms, plan floor layouts, choose materials, estimate costs, and solve architectural problems.
Be concise, practical and friendly. When suggesting room sizes, use metric (meters).
If the user gives context about their current project (dimensions, rooms, style), use that to give relevant advice.`;
    const response = await architectureService.callLlamaAPI(systemPrompt, message, requestId);
    res.status(200).json({ success: true, requestId, data: { reply: response }, timestamp: new Date().toISOString() });
  } catch (error) {
    next(error);
  }
});

export default router;
