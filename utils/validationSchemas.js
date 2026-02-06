const Joi = require("joi");
const {
  USER_ROLES_ARRAY,
  USER_STATUS_ARRAY,
  TRANSACTION_ACTIONS_ARRAY,
  TRANSACTION_STATUS_ARRAY,
  TRANSACTION_PRIORITY_ARRAY,
  MAINTENANCE_TYPE_ARRAY,
  DOCUMENT_TYPE_ARRAY,
  VALIDATION_MESSAGES,
  DEFAULTS,
} = require("./constants");

/**
 * Validation schemas for authentication
 */
const authValidationSchemas = {
  /**
   * User registration validation schema
   */
  registerUser: Joi.object({
    full_name: Joi.string().min(2).max(100).trim().required().messages({
      "string.empty": "Full name is required",
      "string.min": "Full name must be at least 2 characters long",
      "string.max": "Full name cannot exceed 100 characters",
      "any.required": "Full name is required",
    }),

    email: Joi.string()
      .email()
      .max(255)
      .lowercase()
      .trim()
      .required()
      .messages({
        "string.empty": "Email is required",
        "string.email": "Please provide a valid email address",
        "string.max": "Email cannot exceed 255 characters",
        "any.required": "Email is required",
      }),

    role: Joi.string()
      .valid(...USER_ROLES_ARRAY)
      .default(DEFAULTS.USER_ROLE)
      .messages({
        "any.only": VALIDATION_MESSAGES.USER_ROLE,
      }),

    password: Joi.string().required().messages({
      "string.empty": "Password is required",
      "any.required": "Password is required",
    }),

    employee_id: Joi.string().max(50).trim().optional().allow("").messages({
      "string.max": "Employee ID cannot exceed 50 characters",
    }),

    position: Joi.string().max(100).trim().optional().allow("").messages({
      "string.max": "Position cannot exceed 100 characters",
    }),

    hire_date: Joi.date().max("now").optional().messages({
      "date.base": "Please provide a valid hire date",
      "date.max": "Hire date cannot be in the future",
    }),
  }),

  /**
   * User login validation schema
   */
  loginUser: Joi.object({
    email: Joi.string()
      .email()
      .max(255)
      .lowercase()
      .trim()
      .required()
      .messages({
        "string.empty": "Email is required",
        "string.email": "Please provide a valid email address",
        "string.max": "Email cannot exceed 255 characters",
        "any.required": "Email is required",
      }),

    password: Joi.string().required().messages({
      "string.empty": "Password is required",
      "any.required": "Password is required",
    }),
  }),

  /**
   * Update profile validation schema
   */
  updateProfile: Joi.object({
    full_name: Joi.string().min(2).max(100).trim().optional().messages({
      "string.min": "Full name must be at least 2 characters long",
      "string.max": "Full name cannot exceed 100 characters",
    }),

    phone: Joi.string()
      .pattern(/^[\+]?[1-9][\d]{0,15}$/)
      .optional()
      .allow("")
      .messages({
        "string.pattern.base": "Please provide a valid phone number",
      }),

    position: Joi.string().max(100).trim().optional().allow("").messages({
      "string.max": "Position cannot exceed 100 characters",
    }),

    employee_id: Joi.string().max(50).trim().optional().allow("").messages({
      "string.max": "Employee ID cannot exceed 50 characters",
    }),

    hire_date: Joi.string().isoDate().optional().allow("").messages({
      "string.isoDate": "Please provide a valid hire date",
    }),

    role: Joi.string()
      .valid(...USER_ROLES_ARRAY)
      .optional()
      .messages({
        "any.only": VALIDATION_MESSAGES.USER_ROLE,
      }),

    department_id: Joi.number()
      .integer()
      .positive()
      .optional()
      .allow(null)
      .messages({
        "number.base": "Department ID must be a number",
        "number.integer": "Department ID must be an integer",
        "number.positive": "Department ID must be positive",
      }),

    status: Joi.string()
      .valid(...USER_STATUS_ARRAY.filter((status) => status !== "terminated"))
      .optional()
      .messages({
        "any.only": VALIDATION_MESSAGES.USER_STATUS,
      }),
  }),

  /**
   * Change password validation schema
   */
  changePassword: Joi.object({
    current_password: Joi.string().required().messages({
      "string.empty": "Current password is required",
      "any.required": "Current password is required",
    }),

    new_password: Joi.string().required().messages({
      "string.empty": "New password is required",
      "any.required": "New password is required",
    }),
  }),
};

/**
 * Validate data against a schema
 * @param {Object} data - Data to validate
 * @param {Object} schema - Joi schema to validate against
 * @returns {Object} - Validation result
 */
const validateData = (data, schema) => {
  const { error, value } = schema.validate(data, {
    abortEarly: false, // Return all validation errors
    stripUnknown: true, // Remove unknown fields
    convert: true, // Convert types when possible
  });

  if (error) {
    const errors = error.details.map((detail) => detail.message);
    return {
      isValid: false,
      errors,
      data: null,
    };
  }

  return {
    isValid: true,
    errors: [],
    data: value,
  };
};

/**
 * Validation schemas for asset transactions
 */
const assetTransactionValidationSchemas = {
  /**
   * Create asset transaction validation schema
   */
  createTransaction: Joi.object({
    asset_id: Joi.number().integer().positive().required().messages({
      "number.base": "Asset ID must be a number",
      "number.integer": "Asset ID must be an integer",
      "number.positive": "Asset ID must be a positive number",
      "any.required": "Asset ID is required",
    }),

    requested_to: Joi.number().integer().positive().optional().messages({
      "number.base": "Recipient user ID must be a number",
      "number.integer": "Recipient user ID must be an integer",
      "number.positive": "Recipient user ID must be a positive number",
    }),

    action: Joi.string()
      .valid(...TRANSACTION_ACTIONS_ARRAY)
      .required()
      .messages({
        "string.empty": "Action is required",
        "any.only": VALIDATION_MESSAGES.TRANSACTION_ACTION,
        "any.required": "Action is required",
      }),

    from_location: Joi.string().max(100).trim().optional().allow("").messages({
      "string.max": "From location cannot exceed 100 characters",
    }),

    to_location: Joi.string().max(100).trim().optional().allow("").messages({
      "string.max": "To location cannot exceed 100 characters",
    }),

    notes: Joi.string().max(1000).trim().optional().allow("").messages({
      "string.max": "Notes cannot exceed 1000 characters",
    }),

    priority: Joi.string()
      .valid(...TRANSACTION_PRIORITY_ARRAY)
      .default(DEFAULTS.TRANSACTION_PRIORITY)
      .messages({
        "any.only": VALIDATION_MESSAGES.TRANSACTION_PRIORITY,
      }),

    expected_completion_date: Joi.date().min("now").optional().messages({
      "date.base": "Please provide a valid expected completion date",
      "date.min": "Expected completion date cannot be in the past",
    }),
  }),

  /**
   * Update asset transaction validation schema
   */
  updateTransaction: Joi.object({
    requested_to: Joi.number().integer().positive().optional().messages({
      "number.base": "Recipient user ID must be a number",
      "number.integer": "Recipient user ID must be an integer",
      "number.positive": "Recipient user ID must be a positive number",
    }),

    from_location: Joi.string().max(100).trim().optional().allow("").messages({
      "string.max": "From location cannot exceed 100 characters",
    }),

    to_location: Joi.string().max(100).trim().optional().allow("").messages({
      "string.max": "To location cannot exceed 100 characters",
    }),

    notes: Joi.string().max(1000).trim().optional().allow("").messages({
      "string.max": "Notes cannot exceed 1000 characters",
    }),

    admin_notes: Joi.string().max(1000).trim().optional().allow("").messages({
      "string.max": "Admin notes cannot exceed 1000 characters",
    }),

    priority: Joi.string()
      .valid(...TRANSACTION_PRIORITY_ARRAY)
      .optional()
      .messages({
        "any.only": VALIDATION_MESSAGES.TRANSACTION_PRIORITY,
      }),

    expected_completion_date: Joi.date().min("now").optional().messages({
      "date.base": "Please provide a valid expected completion date",
      "date.min": "Expected completion date cannot be in the past",
    }),
  }),

  /**
   * Change transaction status validation schema
   */
  changeStatus: Joi.object({
    status: Joi.string()
      .valid(...TRANSACTION_STATUS_ARRAY)
      .required()
      .messages({
        "string.empty": "Status is required",
        "any.only": VALIDATION_MESSAGES.TRANSACTION_STATUS,
        "any.required": "Status is required",
      }),

    admin_notes: Joi.string().max(1000).trim().optional().allow("").messages({
      "string.max": "Admin notes cannot exceed 1000 characters",
    }),
  }),

  /**
   * Accept transaction validation schema
   */
  acceptTransaction: Joi.object({
    admin_notes: Joi.string().max(1000).trim().optional().allow("").messages({
      "string.max": "Admin notes cannot exceed 1000 characters",
    }),
  }),

  /**
   * Reject transaction validation schema
   */
  rejectTransaction: Joi.object({
    admin_notes: Joi.string().max(1000).trim().optional().allow("").messages({
      "string.max": "Admin notes cannot exceed 1000 characters",
    }),

    reason: Joi.string().max(500).trim().optional().allow("").messages({
      "string.max": "Rejection reason cannot exceed 500 characters",
    }),
  }),

  /**
   * Complete transaction validation schema
   */
  completeTransaction: Joi.object({
    admin_notes: Joi.string().max(1000).trim().optional().allow("").messages({
      "string.max": "Admin notes cannot exceed 1000 characters",
    }),
  }),
};

/**
 * Validation schemas for maintenance management
 */
const maintenanceValidationSchemas = {
  /**
   * Create maintenance schedule validation schema
   */
  createMaintenanceSchedule: Joi.object({
    asset_id: Joi.number().integer().positive().required().messages({
      "number.base": "Asset ID must be a number",
      "number.integer": "Asset ID must be an integer",
      "number.positive": "Asset ID must be a positive number",
      "any.required": "Asset ID is required",
    }),

    maintenance_type: Joi.string()
      .valid(...MAINTENANCE_TYPE_ARRAY.filter((type) => type !== "corrective"))
      .required()
      .messages({
        "string.empty": "Maintenance type is required",
        "any.only": VALIDATION_MESSAGES.MAINTENANCE_TYPE,
        "any.required": "Maintenance type is required",
      }),

    title: Joi.string().max(200).trim().required().messages({
      "string.empty": "Title is required",
      "string.max": "Title cannot exceed 200 characters",
      "any.required": "Title is required",
    }),

    description: Joi.string().max(5000).trim().optional().allow("").messages({
      "string.max": "Description cannot exceed 5000 characters",
    }),

    frequency_days: Joi.number()
      .integer()
      .positive()
      .min(1)
      .required()
      .messages({
        "number.base": "Frequency days must be a number",
        "number.integer": "Frequency days must be an integer",
        "number.positive": "Frequency days must be a positive number",
        "number.min": "Frequency days must be at least 1",
        "any.required": "Frequency days is required",
      }),

    last_maintenance_date: Joi.date()
      .max("now")
      .optional()
      .allow(null)
      .messages({
        "date.base": "Please provide a valid last maintenance date",
        "date.max": "Last maintenance date cannot be in the future",
      }),

    next_maintenance_date: Joi.date().min("now").required().messages({
      "date.base": "Please provide a valid next maintenance date",
      "date.min": "Next maintenance date must be in the future",
      "any.required": "Next maintenance date is required",
    }),

    assigned_to: Joi.number()
      .integer()
      .positive()
      .optional()
      .allow(null)
      .messages({
        "number.base": "Assigned user ID must be a number",
        "number.integer": "Assigned user ID must be an integer",
        "number.positive": "Assigned user ID must be a positive number",
      }),

    estimated_cost: Joi.number()
      .precision(2)
      .min(0)
      .optional()
      .allow(null)
      .messages({
        "number.base": "Estimated cost must be a number",
        "number.min": "Estimated cost cannot be negative",
        "number.precision": "Estimated cost can have at most 2 decimal places",
      }),

    is_active: Joi.boolean().optional().default(true).messages({
      "boolean.base": "Is active must be a boolean value",
    }),
  }),

  /**
   * Update maintenance schedule validation schema
   */
  updateMaintenanceSchedule: Joi.object({
    asset_id: Joi.number().integer().positive().optional().messages({
      "number.base": "Asset ID must be a number",
      "number.integer": "Asset ID must be an integer",
      "number.positive": "Asset ID must be a positive number",
    }),

    maintenance_type: Joi.string()
      .valid(...MAINTENANCE_TYPE_ARRAY.filter((type) => type !== "corrective"))
      .optional()
      .messages({
        "any.only": VALIDATION_MESSAGES.MAINTENANCE_TYPE,
      }),

    title: Joi.string().max(200).trim().optional().messages({
      "string.max": "Title cannot exceed 200 characters",
    }),

    description: Joi.string().max(5000).trim().optional().allow("").messages({
      "string.max": "Description cannot exceed 5000 characters",
    }),

    frequency_days: Joi.number()
      .integer()
      .positive()
      .min(1)
      .optional()
      .messages({
        "number.base": "Frequency days must be a number",
        "number.integer": "Frequency days must be an integer",
        "number.positive": "Frequency days must be a positive number",
        "number.min": "Frequency days must be at least 1",
      }),

    last_maintenance_date: Joi.date()
      .max("now")
      .optional()
      .allow(null)
      .messages({
        "date.base": "Please provide a valid last maintenance date",
        "date.max": "Last maintenance date cannot be in the future",
      }),

    next_maintenance_date: Joi.date().optional().messages({
      "date.base": "Please provide a valid next maintenance date",
    }),

    assigned_to: Joi.number()
      .integer()
      .positive()
      .optional()
      .allow(null)
      .messages({
        "number.base": "Assigned user ID must be a number",
        "number.integer": "Assigned user ID must be an integer",
        "number.positive": "Assigned user ID must be a positive number",
      }),

    estimated_cost: Joi.number()
      .precision(2)
      .min(0)
      .optional()
      .allow(null)
      .messages({
        "number.base": "Estimated cost must be a number",
        "number.min": "Estimated cost cannot be negative",
        "number.precision": "Estimated cost can have at most 2 decimal places",
      }),

    is_active: Joi.boolean().optional().messages({
      "boolean.base": "Is active must be a boolean value",
    }),
  }),

  /**
   * Create maintenance log validation schema
   */
  createMaintenanceLog: Joi.object({
    asset_id: Joi.number().integer().positive().required().messages({
      "number.base": "Asset ID must be a number",
      "number.integer": "Asset ID must be an integer",
      "number.positive": "Asset ID must be a positive number",
      "any.required": "Asset ID is required",
    }),

    schedule_id: Joi.number()
      .integer()
      .positive()
      .optional()
      .allow(null)
      .messages({
        "number.base": "Schedule ID must be a number",
        "number.integer": "Schedule ID must be an integer",
        "number.positive": "Schedule ID must be a positive number",
      }),

    maintenance_type: Joi.string()
      .valid(...MAINTENANCE_TYPE_ARRAY)
      .required()
      .messages({
        "string.empty": "Maintenance type is required",
        "any.only": VALIDATION_MESSAGES.MAINTENANCE_TYPE,
        "any.required": "Maintenance type is required",
      }),

    title: Joi.string().max(200).trim().required().messages({
      "string.empty": "Title is required",
      "string.max": "Title cannot exceed 200 characters",
      "any.required": "Title is required",
    }),

    description: Joi.string().max(5000).trim().optional().allow("").messages({
      "string.max": "Description cannot exceed 5000 characters",
    }),

    performed_by: Joi.number().integer().positive().required().messages({
      "number.base": "Performed by user ID must be a number",
      "number.integer": "Performed by user ID must be an integer",
      "number.positive": "Performed by user ID must be a positive number",
      "any.required": "Performed by user ID is required",
    }),

    performed_date: Joi.date().max("now").required().messages({
      "date.base": "Please provide a valid performed date",
      "date.max": "Performed date cannot be in the future",
      "any.required": "Performed date is required",
    }),

    cost: Joi.number().precision(2).min(0).optional().allow(null).messages({
      "number.base": "Cost must be a number",
      "number.min": "Cost cannot be negative",
      "number.precision": "Cost can have at most 2 decimal places",
    }),

    vendor: Joi.string().max(150).trim().optional().allow("").messages({
      "string.max": "Vendor cannot exceed 150 characters",
    }),

    notes: Joi.string().max(5000).trim().optional().allow("").messages({
      "string.max": "Notes cannot exceed 5000 characters",
    }),

    downtime_hours: Joi.number()
      .precision(2)
      .min(0)
      .optional()
      .allow(null)
      .messages({
        "number.base": "Downtime hours must be a number",
        "number.min": "Downtime hours cannot be negative",
        "number.precision": "Downtime hours can have at most 2 decimal places",
      }),
  }),

  /**
   * Update maintenance log validation schema
   */
  updateMaintenanceLog: Joi.object({
    asset_id: Joi.number().integer().positive().optional().messages({
      "number.base": "Asset ID must be a number",
      "number.integer": "Asset ID must be an integer",
      "number.positive": "Asset ID must be a positive number",
    }),

    schedule_id: Joi.number()
      .integer()
      .positive()
      .optional()
      .allow(null)
      .messages({
        "number.base": "Schedule ID must be a number",
        "number.integer": "Schedule ID must be an integer",
        "number.positive": "Schedule ID must be a positive number",
      }),

    maintenance_type: Joi.string()
      .valid(...MAINTENANCE_TYPE_ARRAY)
      .optional()
      .messages({
        "any.only": VALIDATION_MESSAGES.MAINTENANCE_TYPE,
      }),

    title: Joi.string().max(200).trim().optional().messages({
      "string.max": "Title cannot exceed 200 characters",
    }),

    description: Joi.string().max(5000).trim().optional().allow("").messages({
      "string.max": "Description cannot exceed 5000 characters",
    }),

    performed_by: Joi.number().integer().positive().optional().messages({
      "number.base": "Performed by user ID must be a number",
      "number.integer": "Performed by user ID must be an integer",
      "number.positive": "Performed by user ID must be a positive number",
    }),

    performed_date: Joi.date().max("now").optional().messages({
      "date.base": "Please provide a valid performed date",
      "date.max": "Performed date cannot be in the future",
    }),

    cost: Joi.number().precision(2).min(0).optional().allow(null).messages({
      "number.base": "Cost must be a number",
      "number.min": "Cost cannot be negative",
      "number.precision": "Cost can have at most 2 decimal places",
    }),

    vendor: Joi.string().max(150).trim().optional().allow("").messages({
      "string.max": "Vendor cannot exceed 150 characters",
    }),

    notes: Joi.string().max(5000).trim().optional().allow("").messages({
      "string.max": "Notes cannot exceed 5000 characters",
    }),

    downtime_hours: Joi.number()
      .precision(2)
      .min(0)
      .optional()
      .allow(null)
      .messages({
        "number.base": "Downtime hours must be a number",
        "number.min": "Downtime hours cannot be negative",
        "number.precision": "Downtime hours can have at most 2 decimal places",
      }),
  }),
};

/**
 * Validation schemas for asset documents
 */
const assetDocumentValidationSchemas = {
  /**
   * Create asset document validation schema
   */
  createAssetDocument: Joi.object({
    asset_id: Joi.number().integer().positive().required().messages({
      "number.base": "Asset ID must be a number",
      "number.integer": "Asset ID must be an integer",
      "number.positive": "Asset ID must be a positive number",
      "any.required": "Asset ID is required",
    }),
    uploaded_by: Joi.number().integer().positive().required().messages({
      "number.base": "Uploaded by must be a number",
      "number.integer": "Uploaded by must be an integer",
      "number.positive": "Uploaded by must be a positive number",
      "any.required": "Uploaded by is required",
    }),

    document_type: Joi.string()
      .valid(...DOCUMENT_TYPE_ARRAY)
      .required()
      .messages({
        "string.empty": "Document type is required",
        "any.only": VALIDATION_MESSAGES.DOCUMENT_TYPE,
        "any.required": "Document type is required",
      }),

    title: Joi.string().max(200).trim().required().messages({
      "string.empty": "Title is required",
      "string.max": "Title cannot exceed 200 characters",
      "any.required": "Title is required",
    }),

    description: Joi.string().max(5000).trim().optional().allow("").messages({
      "string.max": "Description cannot exceed 5000 characters",
    }),

    file_name: Joi.string().max(255).trim().required().messages({
      "string.empty": "File name is required",
      "string.max": "File name cannot exceed 255 characters",
      "any.required": "File name is required",
    }),

    file_path: Joi.string().max(500).trim().required().messages({
      "string.empty": "File path is required",
      "string.max": "File path cannot exceed 500 characters",
      "any.required": "File path is required",
    }),

    file_size: Joi.number().integer().min(0).optional().allow(null).messages({
      "number.base": "File size must be a number",
      "number.integer": "File size must be an integer",
      "number.min": "File size cannot be negative",
    }),

    file_type: Joi.string().max(100).trim().optional().allow("").messages({
      "string.max": "File type cannot exceed 100 characters",
    }),
  }),

  /**
   * Update asset document validation schema
   */
  updateAssetDocument: Joi.object({
    asset_id: Joi.number().integer().positive().optional().messages({
      "number.base": "Asset ID must be a number",
      "number.integer": "Asset ID must be an integer",
      "number.positive": "Asset ID must be a positive number",
    }),

    document_type: Joi.string()
      .valid(...DOCUMENT_TYPE_ARRAY)
      .optional()
      .messages({
        "any.only": VALIDATION_MESSAGES.DOCUMENT_TYPE,
      }),

    title: Joi.string().max(200).trim().optional().messages({
      "string.max": "Title cannot exceed 200 characters",
    }),

    description: Joi.string().max(5000).trim().optional().allow("").messages({
      "string.max": "Description cannot exceed 5000 characters",
    }),

    file_name: Joi.string().max(255).trim().optional().messages({
      "string.max": "File name cannot exceed 255 characters",
    }),

    file_path: Joi.string().max(500).trim().optional().messages({
      "string.max": "File path cannot exceed 500 characters",
    }),

    file_size: Joi.number().integer().min(0).optional().allow(null).messages({
      "number.base": "File size must be a number",
      "number.integer": "File size must be an integer",
      "number.min": "File size cannot be negative",
    }),

    file_type: Joi.string().max(100).trim().optional().allow("").messages({
      "string.max": "File type cannot exceed 100 characters",
    }),
  }),
};


module.exports = {
  authValidationSchemas,
  assetTransactionValidationSchemas,
  maintenanceValidationSchemas,
  assetDocumentValidationSchemas,
  validateData,
};
