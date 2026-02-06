"use strict";

const logger = require("../utils/logger");

// Get notifications (placeholder for future in-app notifications)
const getNotifications = async (req, res) => {
  try {
    const userId = req.user.user_id;

    logger.info("Get notifications request", {
      userId,
      ip: req.ip || req.connection.remoteAddress,
    });

    // TODO: Implement in-app notification system
    // For now, return empty array
    res.status(200).json({
      success: true,
      message: "Notifications retrieved successfully",
      data: {
        notifications: [],
        unreadCount: 0,
      },
    });
  } catch (error) {
    logger.logError(error, {
      action: "get_notifications",
      userId: req.user?.user_id,
      ip: req.ip || req.connection.remoteAddress,
    });

    res.status(500).json({
      success: false,
      message: "Failed to retrieve notifications",
      error: error.message,
    });
  }
};

module.exports = {
  getNotifications,
};
