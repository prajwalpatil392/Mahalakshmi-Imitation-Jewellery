const { body, param, query, validationResult } = require('express-validator');
const { handleValidationError } = require('./errorHandler');

/**
 * Validation Result Handler
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const error = handleValidationError(errors.array());
    return next(error);
  }
  next();
};

/**
 * Product Validation Rules
 */
const validateProduct = [
  body('name')
    .trim()
    .notEmpty().withMessage('Product name is required')
    .isLength({ min: 3, max: 255 }).withMessage('Name must be 3-255 characters'),
  
  body('material')
    .optional()
    .trim()
    .isLength({ max: 255 }).withMessage('Material must be max 255 characters'),
  
  body('icon')
    .optional()
    .trim()
    .isLength({ max: 10 }).withMessage('Icon must be max 10 characters'),
  
  body('rentPerDay')
    .optional()
    .isFloat({ min: 0 }).withMessage('Rent per day must be a positive number'),
  
  body('buy')
    .optional()
    .isFloat({ min: 0 }).withMessage('Buy price must be a positive number'),
  
  body('type')
    .notEmpty().withMessage('Product type is required')
    .isIn(['rent', 'buy', 'both']).withMessage('Type must be rent, buy, or both'),
  
  body('category')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage('Category must be max 100 characters'),
  
  body('baseStock')
    .optional()
    .isInt({ min: 0 }).withMessage('Base stock must be a non-negative integer'),
  
  validate
];

/**
 * Order Validation Rules
 */
const validateOrder = [
  body('customer.name')
    .trim()
    .notEmpty().withMessage('Customer name is required')
    .isLength({ min: 2, max: 255 }).withMessage('Name must be 2-255 characters'),
  
  body('customer.phone')
    .trim()
    .notEmpty().withMessage('Phone number is required')
    .matches(/^[0-9]{10,15}$/).withMessage('Phone must be 10-15 digits'),
  
  body('customer.email')
    .optional({ checkFalsy: true })
    .trim()
    .isEmail().withMessage('Invalid email address')
    .normalizeEmail(),
  
  body('customer.address')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('Address must be max 500 characters'),
  
  body('items')
    .isArray({ min: 1 }).withMessage('Order must contain at least one item'),
  
  body('items.*.id')
    .isInt({ min: 1 }).withMessage('Invalid product ID'),
  
  body('items.*.quantity')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('Quantity must be between 1 and 100'),
  
  body('items.*.mode')
    .isIn(['buy', 'rent']).withMessage('Mode must be buy or rent'),
  
  body('total')
    .isFloat({ min: 0 }).withMessage('Total must be a positive number'),
  
  body('paymentMethod')
    .optional()
    .isIn(['cod', 'cash_at_shop', 'online', 'upi']).withMessage('Invalid payment method'),
  
  validate
];

/**
 * Customer Validation Rules
 */
const validateCustomer = [
  body('name')
    .trim()
    .notEmpty().withMessage('Name is required')
    .isLength({ min: 2, max: 255 }).withMessage('Name must be 2-255 characters'),
  
  body('phone')
    .trim()
    .notEmpty().withMessage('Phone is required')
    .matches(/^[0-9]{10,15}$/).withMessage('Phone must be 10-15 digits'),
  
  body('email')
    .optional({ checkFalsy: true })
    .trim()
    .isEmail().withMessage('Invalid email address')
    .normalizeEmail(),
  
  validate
];

/**
 * Enquiry Validation Rules
 */
const validateEnquiry = [
  body('name')
    .trim()
    .notEmpty().withMessage('Name is required')
    .isLength({ min: 2, max: 255 }).withMessage('Name must be 2-255 characters'),
  
  body('phone')
    .trim()
    .notEmpty().withMessage('Phone is required')
    .matches(/^[0-9]{10,15}$/).withMessage('Phone must be 10-15 digits'),
  
  body('email')
    .optional({ checkFalsy: true })
    .trim()
    .isEmail().withMessage('Invalid email address')
    .normalizeEmail(),
  
  body('message')
    .trim()
    .notEmpty().withMessage('Message is required')
    .isLength({ min: 10, max: 1000 }).withMessage('Message must be 10-1000 characters'),
  
  validate
];

/**
 * ID Parameter Validation
 */
const validateId = [
  param('id')
    .isInt({ min: 1 }).withMessage('Invalid ID'),
  validate
];

/**
 * Pagination Validation
 */
const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  
  validate
];

/**
 * Status Update Validation
 */
const validateStatusUpdate = [
  body('status')
    .notEmpty().withMessage('Status is required')
    .isIn(['New', 'Confirmed', 'Cancelled', 'Delivered', 'Completed', 'Returned'])
    .withMessage('Invalid status'),
  
  validate
];

/**
 * Stock Adjustment Validation
 */
const validateStockAdjustment = [
  body('quantity')
    .isInt().withMessage('Quantity must be an integer'),
  
  body('reason')
    .trim()
    .notEmpty().withMessage('Reason is required')
    .isLength({ min: 5, max: 255 }).withMessage('Reason must be 5-255 characters'),
  
  validate
];

module.exports = {
  validate,
  validateProduct,
  validateOrder,
  validateCustomer,
  validateEnquiry,
  validateId,
  validatePagination,
  validateStatusUpdate,
  validateStockAdjustment
};
