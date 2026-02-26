// backend/middleware/validation.js
const { validationResult, body, param } = require('express-validator');

exports.validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
    }
    next();
};

exports.userValidation = [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Please provide a valid email'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
];

exports.projectValidation = [
    body('name').trim().notEmpty().withMessage('Project name is required'),
    body('totalWidth').isNumeric().withMessage('Total width must be a number'),
    body('totalDepth').isNumeric().withMessage('Total depth must be a number')
];

exports.idValidation = [
    param('id').isMongoId().withMessage('Invalid ID format')
];
