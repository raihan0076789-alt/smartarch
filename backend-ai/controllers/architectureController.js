import { architectureService } from '../services/architectureService.js';
import logger from '../utils/logger.js';
import { v4 as uuidv4 } from 'uuid';

export const generateArchitecture = async (req, res, next) => {
  const requestId = uuidv4();
  try {
    logger.info(`[${requestId}] Architecture generation request received`, {
      requirements: req.body.requirements?.substring(0, 100)
    });

    const { requirements, preferences, constraints } = req.body;

    if (!requirements || requirements.trim().length === 0) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Requirements field is required and cannot be empty',
        requestId
      });
    }

    const result = await architectureService.generateArchitecture(
      requirements,
      preferences,
      constraints,
      requestId
    );

    logger.info(`[${requestId}] Architecture generated successfully`);

    res.status(200).json({
      success: true,
      requestId,
      data: result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error(`[${requestId}] Error generating architecture:`, error);
    next(error);
  }
};

export const analyzeArchitecture = async (req, res, next) => {
  const requestId = uuidv4();
  try {
    logger.info(`[${requestId}] Architecture analysis request received`);

    const { architecture, analysisType } = req.body;

    if (!architecture) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Architecture field is required',
        requestId
      });
    }

    const result = await architectureService.analyzeArchitecture(
      architecture,
      analysisType || 'comprehensive',
      requestId
    );

    logger.info(`[${requestId}] Architecture analyzed successfully`);

    res.status(200).json({
      success: true,
      requestId,
      data: result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error(`[${requestId}] Error analyzing architecture:`, error);
    next(error);
  }
};

export const optimizeArchitecture = async (req, res, next) => {
  const requestId = uuidv4();
  try {
    logger.info(`[${requestId}] Architecture optimization request received`);

    const { architecture, optimizationGoals } = req.body;

    if (!architecture) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Architecture field is required',
        requestId
      });
    }

    const result = await architectureService.optimizeArchitecture(
      architecture,
      optimizationGoals || ['performance', 'scalability', 'cost'],
      requestId
    );

    logger.info(`[${requestId}] Architecture optimized successfully`);

    res.status(200).json({
      success: true,
      requestId,
      data: result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error(`[${requestId}] Error optimizing architecture:`, error);
    next(error);
  }
};

export const compareArchitectures = async (req, res, next) => {
  const requestId = uuidv4();
  try {
    logger.info(`[${requestId}] Architecture comparison request received`);

    const { architectures, comparisonCriteria } = req.body;

    if (!architectures || !Array.isArray(architectures) || architectures.length < 2) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'At least two architectures are required for comparison',
        requestId
      });
    }

    const result = await architectureService.compareArchitectures(
      architectures,
      comparisonCriteria || ['performance', 'scalability', 'cost', 'complexity'],
      requestId
    );

    logger.info(`[${requestId}] Architectures compared successfully`);

    res.status(200).json({
      success: true,
      requestId,
      data: result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error(`[${requestId}] Error comparing architectures:`, error);
    next(error);
  }
};

export const generateDocumentation = async (req, res, next) => {
  const requestId = uuidv4();
  try {
    logger.info(`[${requestId}] Documentation generation request received`);

    const { architecture, documentationType } = req.body;

    if (!architecture) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Architecture field is required',
        requestId
      });
    }

    const result = await architectureService.generateDocumentation(
      architecture,
      documentationType || 'comprehensive',
      requestId
    );

    logger.info(`[${requestId}] Documentation generated successfully`);

    res.status(200).json({
      success: true,
      requestId,
      data: result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error(`[${requestId}] Error generating documentation:`, error);
    next(error);
  }
};

export const getArchitectureSuggestions = async (req, res, next) => {
  const requestId = uuidv4();
  try {
    logger.info(`[${requestId}] Architecture suggestions request received`);

    const { currentArchitecture, problemAreas } = req.body;

    if (!currentArchitecture) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Current architecture field is required',
        requestId
      });
    }

    const result = await architectureService.getArchitectureSuggestions(
      currentArchitecture,
      problemAreas || [],
      requestId
    );

    logger.info(`[${requestId}] Architecture suggestions generated successfully`);

    res.status(200).json({
      success: true,
      requestId,
      data: result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error(`[${requestId}] Error getting architecture suggestions:`, error);
    next(error);
  }
};
