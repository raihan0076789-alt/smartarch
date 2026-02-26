import { body, validationResult } from 'express-validator';
import { ApiError } from '../utils/errors.js';

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(err => ({
      field: err.path,
      message: err.msg,
      value: err.value
    }));
    
    throw new ApiError('Validation failed', 400, errorMessages);
  }
  next();
};

export const validateArchitectureRequest = [
  body('requirements')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 10, max: 10000 })
    .withMessage('Requirements must be between 10 and 10000 characters'),
  
  body('architecture')
    .optional()
    .custom((value) => {
      if (typeof value === 'string') {
        try {
          JSON.parse(value);
          return true;
        } catch {
          return typeof value === 'object';
        }
      }
      return typeof value === 'object';
    })
    .withMessage('Architecture must be a valid JSON object or string'),
  
  body('preferences')
    .optional()
    .isObject()
    .withMessage('Preferences must be an object'),
  
  body('constraints')
    .optional()
    .isObject()
    .withMessage('Constraints must be an object'),
  
  body('analysisType')
    .optional()
    .isString()
    .isIn(['comprehensive', 'security', 'performance', 'scalability', 'cost'])
    .withMessage('Invalid analysis type'),
  
  body('optimizationGoals')
    .optional()
    .isArray()
    .withMessage('Optimization goals must be an array'),
  
  body('architectures')
    .optional()
    .isArray({ min: 2 })
    .withMessage('At least two architectures required for comparison'),
  
  body('comparisonCriteria')
    .optional()
    .isArray()
    .withMessage('Comparison criteria must be an array'),
  
  body('documentationType')
    .optional()
    .isString()
    .isIn(['comprehensive', 'technical', 'executive', 'operational'])
    .withMessage('Invalid documentation type'),
  
  body('currentArchitecture')
    .optional()
    .custom((value) => {
      if (typeof value === 'string') {
        try {
          JSON.parse(value);
          return true;
        } catch {
          return typeof value === 'object';
        }
      }
      return typeof value === 'object';
    })
    .withMessage('Current architecture must be a valid JSON object or string'),
  
  body('problemAreas')
    .optional()
    .isArray()
    .withMessage('Problem areas must be an array'),
  
  handleValidationErrors
];
