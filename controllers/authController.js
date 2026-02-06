const AuthService = require('../services/authService');
const logger = require('../utils/logger');

/**
 * Register a new user
 */
const register = async (req, res) => {
  try {
    logger.info('User registration attempt', {
      email: req.body.email,
      employeeId: req.body.employee_id,
      ip: req.ip || req.connection.remoteAddress,
      body: req.body, // Add full body for debugging
    });

    const userResponse = await AuthService.registerUser(req.body);

    logger.logAuth('register', userResponse.user_id, true, {
      email: req.body.email,
      employeeId: req.body.employee_id,
    });

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: userResponse
    });
  } catch (error) {
    logger.logError(error, {
      action: 'user_registration',
      email: req.body.email,
      employeeId: req.body.employee_id,
    });

    // Handle validation errors
    if (error.message === 'Validation failed' && error.validationErrors) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: error.validationErrors
      });
    }

    // Handle specific error types
    if (error.message.includes('already exists') || error.message.includes('Employee ID')) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: 'Internal server error during registration',
      error: error.message
    });
  }
};

/**
 * Login user
 */
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    logger.info('User login attempt', {
      email,
      ip: req.ip || req.connection.remoteAddress,
    });

    const loginResult = await AuthService.loginUser(email, password);

    logger.logAuth('login', loginResult.user.id, true, {
      email,
    });

    res.json({
      success: true,
      message: 'Login successful',
      data: loginResult
    });
  } catch (error) {
    logger.logAuth('login', null, false, {
      email: req.body.email,
      reason: error.message,
    });

    // Handle validation errors
    if (error.message === 'Validation failed' && error.validationErrors) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: error.validationErrors
      });
    }

    // Handle authentication errors
    if (error.message.includes('Invalid email or password') ||
      error.message.includes('Account is not active')) {
      return res.status(401).json({
        success: false,
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: 'Internal server error during login',
      error: error.message
    });
  }
};

/**
 * Logout user (client-side token removal)
 */
const logout = async (req, res) => {
  try {
    logger.logAuth('logout', req.user ? req.user.user_id : null, true, {
      ip: req.ip || req.connection.remoteAddress,
    });

    // Since we're using JWT, logout is primarily handled on the client side
    // by removing the token. This endpoint can be used for logging purposes
    res.json({
      success: true,
      message: 'Logout successful'
    });
  } catch (error) {
    logger.logError(error, {
      action: 'logout',
      userId: req.user ? req.user.user_id : null,
    });
    res.status(500).json({
      success: false,
      message: 'Internal server error during logout',
      error: error.message
    });
  }
};

/**
 * Get current user profile
 */
const getProfile = async (req, res) => {
  try {
    const userId = req.user.user_id;

    const user = await AuthService.getUserProfile(userId);

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Get profile error:', error);

    if (error.message === 'User not found') {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

/**
 * Update user profile
 */
const updateProfile = async (req, res) => {
  try {
    const userId = req.user.user_id;

    const updatedUser = await AuthService.updateUserProfile(userId, req.body);

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: updatedUser
    });
  } catch (error) {
    console.error('Update profile error:', error);

    // Handle validation errors
    if (error.message === 'Validation failed' && error.validationErrors) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: error.validationErrors
      });
    }

    if (error.message === 'User not found') {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

/**
 * Change password
 */
const changePassword = async (req, res) => {
  try {
    const userId = req.user.user_id;
    const { current_password, new_password } = req.body;

    await AuthService.changeUserPassword(userId, current_password, new_password);

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Change password error:', error);

    // Handle validation errors
    if (error.message === 'Validation failed' && error.validationErrors) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: error.validationErrors
      });
    }

    if (error.message === 'User not found') {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }

    if (error.message === 'Current password is incorrect') {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

/**
 * Refresh token
 */
const refreshToken = async (req, res) => {
  try {
    const tokenData = AuthService.refreshUserToken(req.user);

    res.json({
      success: true,
      message: 'Token refreshed successfully',
      data: tokenData
    });
  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

/**
 * Verify token (middleware helper)
 */
const verifyToken = async (req, res) => {
  try {
    // If we reach here, the token is valid (middleware already verified it)
    res.json({
      success: true,
      message: 'Token is valid',
      data: {
        user: req.user
      }
    });
  } catch (error) {
    console.error('Verify token error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

module.exports = {
  register,
  login,
  logout,
  getProfile,
  updateProfile,
  changePassword,
  refreshToken,
  verifyToken
};
