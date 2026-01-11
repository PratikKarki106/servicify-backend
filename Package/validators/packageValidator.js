import Joi from 'joi';
import errorMessages from '../../utils/errorMessages.js';

const packageValidator = {
  // Validation for creating a package
  createPackage: Joi.object({
    name: Joi.string()
      .min(3)
      .max(100)
      .required()
      .messages({
        'string.empty': errorMessages.MISSING_FIELDS,
        'string.min': 'Package name must be at least 3 characters',
        'string.max': 'Package name cannot exceed 100 characters',
        'any.required': 'Package name is required'
      }),
    
    price: Joi.number()
      .positive()
      .required()
      .messages({
        'number.base': 'Price must be a number',
        'number.positive': errorMessages.INVALID_PRICE,
        'any.required': 'Price is required'
      }),
    
    serviceCount: Joi.number()
      .integer()
      .positive()
      .required()
      .messages({
        'number.base': 'Service count must be a number',
        'number.positive': errorMessages.INVALID_SERVICE_COUNT,
        'any.required': 'Service count is required'
      }),
    
    purchaseDeadline: Joi.date()
      .greater('now')
      .required()
      .messages({
        'date.base': 'Invalid date format',
        'date.greater': errorMessages.INVALID_EXPIRY_DATE,
        'any.required': 'Purchase deadline is required'
      }),
    
    description: Joi.string()
      .max(500)
      .allow('')
      .optional(),
    
    benefits: Joi.array()
      .items(Joi.string().trim())
      .optional(),
    
    serviceType: Joi.string()
      .valid('general', 'premium', 'detailing', 'repair', 'all')
      .default('general'),
    
    maxPurchases: Joi.number()
      .integer()
      .positive()
      .default(1000),
    
    isActive: Joi.boolean()
      .default(true)
  }),
  
  // Validation for updating a package
  updatePackage: Joi.object({
    name: Joi.string()
      .min(3)
      .max(100)
      .optional(),
    
    price: Joi.number()
      .positive()
      .optional(),
    
    serviceCount: Joi.number()
      .integer()
      .positive()
      .optional(),
    
    purchaseDeadline: Joi.date()
      .greater('now')
      .optional(),
    
    description: Joi.string()
      .max(500)
      .allow('')
      .optional(),
    
    benefits: Joi.array()
      .items(Joi.string().trim())
      .optional(),
    
    serviceType: Joi.string()
      .valid('general', 'premium', 'detailing', 'repair', 'all')
      .optional(),
    
    maxPurchases: Joi.number()
      .integer()
      .positive()
      .optional(),
    
    isActive: Joi.boolean()
      .optional()
  }),
  
  // Validation for package purchase
  purchasePackage: Joi.object({
    packageId: Joi.string()
      .pattern(/^[0-9a-fA-F]{24}$/)
      .required()
      .messages({
        'string.pattern.base': 'Invalid package ID format',
        'any.required': 'Package ID is required'
      })
  })
};

export default packageValidator;