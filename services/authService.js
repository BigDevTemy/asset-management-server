const { User, Department } = require('../models');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { authValidationSchemas, validateData } = require('../utils/validationSchemas');
const { USER_ROLES, USER_STATUS, DEFAULTS } = require('../utils/constants');

// JWT configuration
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-development';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

/**
 * Authentication Service
 * Contains all business logic for user authentication and authorization
 */
class AuthService {
  /**
   * Register a new user
   * @param {Object} userData - User registration data
   * @returns {Promise<Object>} - Registration result
   */
  static async registerUser(userData) {
    // Validate input data
    const validation = validateData(userData, authValidationSchemas.registerUser);
    if (!validation.isValid) {
      console.log('Validation failed:', validation.errors);
      console.log('Input data:', userData);
      const error = new Error('Validation failed');
      error.validationErrors = validation.errors;
      throw error;
    }

    const { full_name, email, phone, department_id, role, password, employee_id, position, hire_date } = validation.data;

    // Check if user already exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    // Check if employee_id already exists (if provided)
    if (employee_id) {
      const existingEmployee = await User.findOne({ where: { employee_id } });
      if (existingEmployee) {
        throw new Error('Employee ID already exists');
      }
    }

    // Hash password
    const saltRounds = 12;
    const password_hash = await bcrypt.hash(password, saltRounds);

    // Create user
    const user = await User.create({
      full_name,
      email,
      phone,
      department_id,
      role: role || DEFAULTS.USER_ROLE,
      password_hash,
      employee_id,
      position,
      hire_date,
      status: DEFAULTS.USER_STATUS
    });

    // Return user data without password
    return this.formatUserResponse(user);
  }

  /**
   * Authenticate user login
   * @param {string} email - User email
   * @param {string} password - User password
   * @returns {Promise<Object>} - Login result with token and user data
   */
  static async loginUser(email, password) {
    // Validate input data
    const validation = validateData({ email, password }, authValidationSchemas.loginUser);
    if (!validation.isValid) {
      const error = new Error('Validation failed');
      error.validationErrors = validation.errors;
      throw error;
    }

    const { email: validatedEmail, password: validatedPassword } = validation.data;
    // Find user by email with department info
    const user = await User.findOne({
      where: { email: validatedEmail },
      include: [{
        model: Department,
        as: 'department',
        attributes: ['department_id', 'name']
      }]
    });

    if (!user) {
      throw new Error('Invalid email or password');
    }

    // Check if user is active
    if (user.status !== USER_STATUS.ACTIVE) {
      throw new Error('Account is not active. Please contact administrator.');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(validatedPassword, user.password_hash);
    if (!isPasswordValid) {
      throw new Error('Invalid email or password');
    }

    // Update last login
    await user.update({ last_login: new Date() });

    // Generate JWT token
    const token = this.generateToken({
      user_id: user.user_id,
      email: user.email,
      role: user.role,
      department_id: user.department_id
    });

    // Prepare user response
    const userResponse = this.formatUserResponse(user, true);

    return {
      user: userResponse,
      token,
      expires_in: JWT_EXPIRES_IN
    };
  }

  /**
   * Get user profile by ID
   * @param {number} userId - User ID
   * @returns {Promise<Object>} - User profile data
   */
  static async getUserProfile(userId) {
    const user = await User.findOne({
      where: { user_id: userId },
      include: [{
        model: Department,
        as: 'department',
        attributes: ['department_id', 'name']
      }],
      attributes: { exclude: ['password_hash'] }
    });

    if (!user) {
      throw new Error('User not found');
    }

    return user;
  }

  /**
   * Update user profile
   * @param {number} userId - User ID
   * @param {Object} updateData - Data to update
   * @returns {Promise<Object>} - Updated user data
   */
  static async updateUserProfile(userId, updateData) {
    // Validate input data
    const validation = validateData(updateData, authValidationSchemas.updateProfile);
    if (!validation.isValid) {
      const error = new Error('Validation failed');
      error.validationErrors = validation.errors;
      throw error;
    }

    const { 
      full_name, 
      phone, 
      position, 
      employee_id, 
      hire_date, 
      role, 
      department_id, 
      status 
    } = validation.data;

    const user = await User.findByPk(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Update allowed fields
    const fieldsToUpdate = {};
    if (full_name !== undefined) fieldsToUpdate.full_name = full_name;
    if (phone !== undefined) fieldsToUpdate.phone = phone;
    if (position !== undefined) fieldsToUpdate.position = position;
    if (employee_id !== undefined) fieldsToUpdate.employee_id = employee_id;
    if (hire_date !== undefined) fieldsToUpdate.hire_date = hire_date;
    if (role !== undefined) fieldsToUpdate.role = role;
    if (department_id !== undefined) fieldsToUpdate.department_id = department_id;
    if (status !== undefined) fieldsToUpdate.status = status;

    await user.update(fieldsToUpdate);

    // Get updated user with department info
    const updatedUser = await User.findOne({
      where: { user_id: userId },
      include: [{
        model: Department,
        as: 'department',
        attributes: ['department_id', 'name']
      }],
      attributes: { exclude: ['password_hash'] }
    });

    return updatedUser;
  }

  /**
   * Change user password
   * @param {number} userId - User ID
   * @param {string} currentPassword - Current password
   * @param {string} newPassword - New password
   * @returns {Promise<boolean>} - Success status
   */
  static async changeUserPassword(userId, currentPassword, newPassword) {
    // Validate input data
    const validation = validateData(
      { current_password: currentPassword, new_password: newPassword },
      authValidationSchemas.changePassword
    );
    if (!validation.isValid) {
      const error = new Error('Validation failed');
      error.validationErrors = validation.errors;
      throw error;
    }

    const { current_password, new_password } = validation.data;
    const user = await User.findByPk(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(current_password, user.password_hash);
    if (!isCurrentPasswordValid) {
      throw new Error('Current password is incorrect');
    }

    // Hash new password
    const saltRounds = 12;
    const new_password_hash = await bcrypt.hash(new_password, saltRounds);

    // Update password
    await user.update({ password_hash: new_password_hash });

    return true;
  }

  /**
   * Generate new JWT token
   * @param {Object} payload - Token payload
   * @returns {string} - JWT token
   */
  static generateToken(payload) {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
  }

  /**
   * Refresh JWT token
   * @param {Object} userData - User data from existing token
   * @returns {Object} - New token data
   */
  static refreshUserToken(userData) {
    const { user_id, email, role, department_id } = userData;

    const token = this.generateToken({
      user_id,
      email,
      role,
      department_id
    });

    return {
      token,
      expires_in: JWT_EXPIRES_IN
    };
  }

  /**
   * Verify JWT token
   * @param {string} token - JWT token
   * @returns {Object} - Decoded token payload
   */
  static verifyToken(token) {
    return jwt.verify(token, JWT_SECRET);
  }

  /**
   * Format user response (remove sensitive data)
   * @param {Object} user - User object
   * @param {boolean} includeDepartment - Whether to include department info
   * @returns {Object} - Formatted user response
   */
  static formatUserResponse(user, includeDepartment = false) {
    const userResponse = {
      user_id: user.user_id,
      full_name: user.full_name,
      email: user.email,
      phone: user.phone,
      department_id: user.department_id,
      role: user.role,
      employee_id: user.employee_id,
      position: user.position,
      hire_date: user.hire_date,
      status: user.status,
      created_at: user.created_at
    };

    if (includeDepartment && user.last_login) {
      userResponse.last_login = user.last_login;
    }

    if (includeDepartment && user.department) {
      userResponse.department = user.department;
    }

    return userResponse;
  }


}

module.exports = AuthService;
