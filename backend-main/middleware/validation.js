// backend/middleware/validation.js
const { validationResult, body, param } = require('express-validator');

exports.validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
    }
    next();
};

// Strong password: min 8 chars, uppercase, lowercase, number, special char
const strongPassword = body('password')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter')
    .matches(/[a-z]/).withMessage('Password must contain at least one lowercase letter')
    .matches(/[0-9]/).withMessage('Password must contain at least one number')
    .matches(/[^A-Za-z0-9]/).withMessage('Password must contain at least one special character (e.g. @, #, !)');

exports.userValidation = [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Please provide a valid email'),
    strongPassword
];

exports.projectValidation = [
    body('name').trim().notEmpty().withMessage('Project name is required'),
    body('totalWidth').isNumeric().withMessage('Total width must be a number'),
    body('totalDepth').isNumeric().withMessage('Total depth must be a number')
];

exports.idValidation = [
    param('id').isMongoId().withMessage('Invalid ID format')
];

// Validation for forgot password request
exports.forgotPasswordValidation = [
    body('email').isEmail().withMessage('Please provide a valid email')
];

// Validation for reset password
exports.resetPasswordValidation = [
    body('password')
        .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
        .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter')
        .matches(/[a-z]/).withMessage('Password must contain at least one lowercase letter')
        .matches(/[0-9]/).withMessage('Password must contain at least one number')
        .matches(/[^A-Za-z0-9]/).withMessage('Password must contain at least one special character')
];
