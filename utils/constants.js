/**
 * Database Constants and Enums
 * Centralized constants for all database enums and values used throughout the server
 */

// =========================================================
// User Constants
// =========================================================

/**
 * User roles
 */
const USER_ROLES = {
  ADMIN: "admin",
  IT_MANAGER: "it_manager",
  EMPLOYEE: "employee",
};

/**
 * User status values
 */
const USER_STATUS = {
  ACTIVE: "active",
  INACTIVE: "inactive",
  TERMINATED: "terminated",
};

// =========================================================
// Asset Constants
// =========================================================

/**
 * Asset status values
 */
const ASSET_STATUS = {
  AVAILABLE: "available",
  ASSIGNED: "assigned",
  IN_REPAIR: "in_repair",
  RETIRED: "retired",
  DISPOSED: "disposed",
};

/**
 * Asset condition ratings
 */
const ASSET_CONDITION = {
  EXCELLENT: "excellent",
  GOOD: "good",
  FAIR: "fair",
  POOR: "poor",
};

// =========================================================
// Asset Transaction Constants
// =========================================================

/**
 * Asset transaction actions
 */
const TRANSACTION_ACTIONS = {
  ASSIGN: "assign",
  RETURN: "return",
  REPAIR: "repair",
  RETIRE: "retire",
  TRANSFER: "transfer",
  CREATE: "create",
  UPDATE: "update",
  DISPOSE: "dispose",
  REQUEST_ASSIGN: "request_assign",
};

/**
 * Asset transaction status values
 */
const TRANSACTION_STATUS = {
  PENDING: "pending",
  ACCEPTED: "accepted",
  REJECTED: "rejected",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
};

/**
 * Transaction priority levels
 */
const TRANSACTION_PRIORITY = {
  LOW: "low",
  MEDIUM: "medium",
  HIGH: "high",
  URGENT: "urgent",
};

// =========================================================
// Maintenance Constants
// =========================================================

/**
 * Maintenance type values
 */
const MAINTENANCE_TYPE = {
  PREVENTIVE: "preventive",
  CORRECTIVE: "corrective",
  INSPECTION: "inspection",
  CALIBRATION: "calibration",
  CLEANING: "cleaning",
  OTHER: "other",
};

// =========================================================
// Document Type Constants
// =========================================================

/**
 * Document type values
 */
const DOCUMENT_TYPE = {
  INVOICE: "invoice",
  MANUAL: "manual",
  WARRANTY: "warranty",
  CERTIFICATE: "certificate",
  SERVICE_REPORT: "service_report",
  PHOTO: "photo",
  OTHER: "other",
};

// =========================================================
// Array Constants (for validation and iteration)
// =========================================================

/**
 * All user roles as array
 */
const USER_ROLES_ARRAY = Object.values(USER_ROLES);

/**
 * All user status values as array
 */
const USER_STATUS_ARRAY = Object.values(USER_STATUS);

/**
 * All asset status values as array
 */
const ASSET_STATUS_ARRAY = Object.values(ASSET_STATUS);

/**
 * All asset condition ratings as array
 */
const ASSET_CONDITION_ARRAY = Object.values(ASSET_CONDITION);

/**
 * All transaction actions as array
 */
const TRANSACTION_ACTIONS_ARRAY = Object.values(TRANSACTION_ACTIONS);

/**
 * All transaction status values as array
 */
const TRANSACTION_STATUS_ARRAY = Object.values(TRANSACTION_STATUS);

/**
 * All transaction priority levels as array
 */
const TRANSACTION_PRIORITY_ARRAY = Object.values(TRANSACTION_PRIORITY);

/**
 * All maintenance types as array
 */
const MAINTENANCE_TYPE_ARRAY = Object.values(MAINTENANCE_TYPE);

/**
 * All document types as array
 */
const DOCUMENT_TYPE_ARRAY = Object.values(DOCUMENT_TYPE);

// =========================================================
// Default Values
// =========================================================

/**
 * Default values for various fields
 */
const DEFAULTS = {
  USER_ROLE: USER_ROLES.EMPLOYEE,
  USER_STATUS: USER_STATUS.ACTIVE,
  ASSET_STATUS: ASSET_STATUS.AVAILABLE,
  ASSET_CONDITION: ASSET_CONDITION.GOOD,
  TRANSACTION_STATUS: TRANSACTION_STATUS.PENDING,
  TRANSACTION_PRIORITY: TRANSACTION_PRIORITY.MEDIUM,
};

// =========================================================
// Sequelize ENUM Definitions
// =========================================================

/**
 * Sequelize ENUM definitions for use in models and migrations
 */
const SEQUELIZE_ENUMS = {
  USER_ROLE: USER_ROLES_ARRAY,
  USER_STATUS: USER_STATUS_ARRAY,
  ASSET_STATUS: ASSET_STATUS_ARRAY,
  ASSET_CONDITION: ASSET_CONDITION_ARRAY,
  TRANSACTION_ACTION: TRANSACTION_ACTIONS_ARRAY,
  TRANSACTION_STATUS: TRANSACTION_STATUS_ARRAY,
  TRANSACTION_PRIORITY: TRANSACTION_PRIORITY_ARRAY,
  MAINTENANCE_TYPE: MAINTENANCE_TYPE_ARRAY,
  DOCUMENT_TYPE: DOCUMENT_TYPE_ARRAY,
};

// =========================================================
// Validation Messages
// =========================================================

/**
 * Validation error messages for enums
 */
const VALIDATION_MESSAGES = {
  USER_ROLE: `Role must be one of: ${USER_ROLES_ARRAY.join(", ")}`,
  USER_STATUS: `Status must be one of: ${USER_STATUS_ARRAY.join(", ")}`,
  ASSET_STATUS: `Asset status must be one of: ${ASSET_STATUS_ARRAY.join(", ")}`,
  ASSET_CONDITION: `Condition rating must be one of: ${ASSET_CONDITION_ARRAY.join(
    ", "
  )}`,
  TRANSACTION_ACTION: `Action must be one of: ${TRANSACTION_ACTIONS_ARRAY.join(
    ", "
  )}`,
  TRANSACTION_STATUS: `Transaction status must be one of: ${TRANSACTION_STATUS_ARRAY.join(
    ", "
  )}`,
  TRANSACTION_PRIORITY: `Priority must be one of: ${TRANSACTION_PRIORITY_ARRAY.join(
    ", "
  )}`,
  MAINTENANCE_TYPE: `Maintenance type must be one of: ${MAINTENANCE_TYPE_ARRAY.join(
    ", "
  )}`,
  DOCUMENT_TYPE: `Document type must be one of: ${DOCUMENT_TYPE_ARRAY.join(
    ", "
  )}`,
};

// =========================================================
// Business Logic Constants
// =========================================================

/**
 * Role-based permissions and business logic constants
 */
const PERMISSIONS = {
  // Roles that can change transaction status
  CAN_CHANGE_TRANSACTION_STATUS: [USER_ROLES.ADMIN, USER_ROLES.IT_MANAGER],

  // Roles that can update transactions
  CAN_UPDATE_TRANSACTION: [USER_ROLES.ADMIN, USER_ROLES.IT_MANAGER],

  // Roles that can delete transactions
  CAN_DELETE_TRANSACTION: [USER_ROLES.ADMIN, USER_ROLES.IT_MANAGER],

  // Statuses that allow deletion by requester
  DELETABLE_BY_REQUESTER_STATUS: [TRANSACTION_STATUS.PENDING],
};

/**
 * Status transitions that trigger specific actions
 */
const STATUS_TRANSITIONS = {
  // Transaction status changes that require timestamp updates
  REQUIRES_RESPONSE_TIMESTAMP: [
    TRANSACTION_STATUS.ACCEPTED,
    TRANSACTION_STATUS.REJECTED,
  ],
  REQUIRES_COMPLETION_TIMESTAMP: [TRANSACTION_STATUS.COMPLETED],
};

module.exports = {
  // Individual constants
  USER_ROLES,
  USER_STATUS,
  ASSET_STATUS,
  ASSET_CONDITION,
  TRANSACTION_ACTIONS,
  TRANSACTION_STATUS,
  TRANSACTION_PRIORITY,
  MAINTENANCE_TYPE,
  DOCUMENT_TYPE,

  // Array constants
  USER_ROLES_ARRAY,
  USER_STATUS_ARRAY,
  ASSET_STATUS_ARRAY,
  ASSET_CONDITION_ARRAY,
  TRANSACTION_ACTIONS_ARRAY,
  TRANSACTION_STATUS_ARRAY,
  TRANSACTION_PRIORITY_ARRAY,
  MAINTENANCE_TYPE_ARRAY,
  DOCUMENT_TYPE_ARRAY,

  // Default values
  DEFAULTS,

  // Sequelize enums
  SEQUELIZE_ENUMS,

  // Validation messages
  VALIDATION_MESSAGES,

  // Business logic constants
  PERMISSIONS,
  STATUS_TRANSITIONS,
};
