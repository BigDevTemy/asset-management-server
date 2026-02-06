"use strict";

const MaintenanceService = require("../services/maintenanceService");
const {
  maintenanceValidationSchemas,
  validateData,
} = require("../utils/validationSchemas");
const logger = require("../utils/logger");

// Initialize maintenance service
const maintenanceService = new MaintenanceService();

// List all maintenance schedules
const listSchedules = async (req, res) => {
  try {
    logger.info("Maintenance schedules list request", {
      userId: req.user?.user_id,
      query: req.query,
      ip: req.ip || req.connection.remoteAddress,
    });

    const result = await maintenanceService.listSchedules(req.query);

    logger.info("Maintenance schedules list successful", {
      userId: req.user?.user_id,
      count: result.data?.length || 0,
      total: result.pagination?.total || 0,
    });

    res.status(200).json({
      success: true,
      message: "Maintenance schedules retrieved successfully",
      ...result,
    });
  } catch (error) {
    logger.logError(error, {
      action: "list_maintenance_schedules",
      userId: req.user?.user_id,
      query: req.query,
      ip: req.ip || req.connection.remoteAddress,
    });

    res.status(500).json({
      success: false,
      message: "Failed to retrieve maintenance schedules",
      error: error.message,
    });
  }
};

// Get single maintenance schedule by ID
const getScheduleById = async (req, res) => {
  try {
    const { id } = req.params;

    logger.info("Maintenance schedule get by ID request", {
      userId: req.user?.user_id,
      scheduleId: id,
      ip: req.ip || req.connection.remoteAddress,
    });

    const schedule = await maintenanceService.getScheduleById(id);

    logger.info("Maintenance schedule retrieved successfully", {
      userId: req.user?.user_id,
      scheduleId: id,
    });

    res.status(200).json({
      success: true,
      message: "Maintenance schedule retrieved successfully",
      data: schedule,
    });
  } catch (error) {
    logger.logError(error, {
      action: "get_maintenance_schedule_by_id",
      userId: req.user?.user_id,
      scheduleId: req.params.id,
      ip: req.ip || req.connection.remoteAddress,
    });

    if (error.statusCode === 404) {
      return res.status(404).json({
        success: false,
        message: "Maintenance schedule not found",
      });
    }

    res.status(500).json({
      success: false,
      message: "Failed to retrieve maintenance schedule",
      error: error.message,
    });
  }
};

// Create new maintenance schedule
const createSchedule = async (req, res) => {
  try {
    // Validate request data
    const validation = validateData(
      req.body,
      maintenanceValidationSchemas.createMaintenanceSchedule
    );

    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: validation.errors,
      });
    }

    logger.info("Maintenance schedule creation request", {
      userId: req.user?.user_id,
      scheduleData: {
        asset_id: validation.data.asset_id,
        title: validation.data.title,
        maintenance_type: validation.data.maintenance_type,
      },
      ip: req.ip || req.connection.remoteAddress,
    });

    const schedule = await maintenanceService.createSchedule(validation.data);

    logger.logBusiness("maintenance_schedule_created", {
      userId: req.user?.user_id,
      scheduleId: schedule.schedule_id,
      assetId: schedule.asset_id,
    });

    res.status(201).json({
      success: true,
      message: "Maintenance schedule created successfully",
      data: schedule,
    });
  } catch (error) {
    logger.logError(error, {
      action: "create_maintenance_schedule",
      userId: req.user?.user_id,
      scheduleData: req.body,
      ip: req.ip || req.connection.remoteAddress,
    });

    res.status(400).json({
      success: false,
      message: "Failed to create maintenance schedule",
      error: error.message,
    });
  }
};

// Update maintenance schedule
const updateSchedule = async (req, res) => {
  try {
    // Validate request data
    const validation = validateData(
      req.body,
      maintenanceValidationSchemas.updateMaintenanceSchedule
    );

    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: validation.errors,
      });
    }

    const { id } = req.params;

    logger.info("Maintenance schedule update request", {
      userId: req.user?.user_id,
      scheduleId: id,
      updateData: Object.keys(validation.data),
      ip: req.ip || req.connection.remoteAddress,
    });

    const schedule = await maintenanceService.updateSchedule(
      id,
      validation.data
    );

    logger.logBusiness("maintenance_schedule_updated", {
      userId: req.user?.user_id,
      scheduleId: id,
      updatedFields: Object.keys(validation.data),
    });

    res.status(200).json({
      success: true,
      message: "Maintenance schedule updated successfully",
      data: schedule,
    });
  } catch (error) {
    logger.logError(error, {
      action: "update_maintenance_schedule",
      userId: req.user?.user_id,
      scheduleId: req.params.id,
      updateData: req.body,
      ip: req.ip || req.connection.remoteAddress,
    });

    if (error.statusCode === 404) {
      return res.status(404).json({
        success: false,
        message: "Maintenance schedule not found",
      });
    }

    res.status(400).json({
      success: false,
      message: "Failed to update maintenance schedule",
      error: error.message,
    });
  }
};

// Delete maintenance schedule
const deleteSchedule = async (req, res) => {
  try {
    const { id } = req.params;

    logger.info("Maintenance schedule deletion request", {
      userId: req.user?.user_id,
      scheduleId: id,
      ip: req.ip || req.connection.remoteAddress,
    });

    await maintenanceService.deleteSchedule(id);

    logger.logBusiness("maintenance_schedule_deleted", {
      userId: req.user?.user_id,
      scheduleId: id,
    });

    res.status(200).json({
      success: true,
      message: "Maintenance schedule deleted successfully",
    });
  } catch (error) {
    logger.logError(error, {
      action: "delete_maintenance_schedule",
      userId: req.user?.user_id,
      scheduleId: req.params.id,
      ip: req.ip || req.connection.remoteAddress,
    });

    if (error.statusCode === 404) {
      return res.status(404).json({
        success: false,
        message: "Maintenance schedule not found",
      });
    }

    res.status(500).json({
      success: false,
      message: "Failed to delete maintenance schedule",
      error: error.message,
    });
  }
};

// List all maintenance logs
const listLogs = async (req, res) => {
  try {
    logger.info("Maintenance logs list request", {
      userId: req.user?.user_id,
      query: req.query,
      ip: req.ip || req.connection.remoteAddress,
    });

    const result = await maintenanceService.listLogs(req.query);

    logger.info("Maintenance logs list successful", {
      userId: req.user?.user_id,
      count: result.data?.length || 0,
      total: result.pagination?.total || 0,
    });

    res.status(200).json({
      success: true,
      message: "Maintenance logs retrieved successfully",
      ...result,
    });
  } catch (error) {
    logger.logError(error, {
      action: "list_maintenance_logs",
      userId: req.user?.user_id,
      query: req.query,
      ip: req.ip || req.connection.remoteAddress,
    });

    res.status(500).json({
      success: false,
      message: "Failed to retrieve maintenance logs",
      error: error.message,
    });
  }
};

// Get single maintenance log by ID
const getLogById = async (req, res) => {
  try {
    const { id } = req.params;

    logger.info("Maintenance log get by ID request", {
      userId: req.user?.user_id,
      logId: id,
      ip: req.ip || req.connection.remoteAddress,
    });

    const log = await maintenanceService.getLogById(id);

    logger.info("Maintenance log retrieved successfully", {
      userId: req.user?.user_id,
      logId: id,
    });

    res.status(200).json({
      success: true,
      message: "Maintenance log retrieved successfully",
      data: log,
    });
  } catch (error) {
    logger.logError(error, {
      action: "get_maintenance_log_by_id",
      userId: req.user?.user_id,
      logId: req.params.id,
      ip: req.ip || req.connection.remoteAddress,
    });

    if (error.statusCode === 404) {
      return res.status(404).json({
        success: false,
        message: "Maintenance log not found",
      });
    }

    res.status(500).json({
      success: false,
      message: "Failed to retrieve maintenance log",
      error: error.message,
    });
  }
};

// Create new maintenance log
const createLog = async (req, res) => {
  try {
    // Validate request data
    const validation = validateData(
      req.body,
      maintenanceValidationSchemas.createMaintenanceLog
    );

    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: validation.errors,
      });
    }

    logger.info("Maintenance log creation request", {
      userId: req.user?.user_id,
      logData: {
        asset_id: validation.data.asset_id,
        title: validation.data.title,
        maintenance_type: validation.data.maintenance_type,
      },
      ip: req.ip || req.connection.remoteAddress,
    });

    const log = await maintenanceService.createLog(validation.data);

    logger.logBusiness("maintenance_log_created", {
      userId: req.user?.user_id,
      logId: log.log_id,
      assetId: log.asset_id,
    });

    res.status(201).json({
      success: true,
      message: "Maintenance log created successfully",
      data: log,
    });
  } catch (error) {
    logger.logError(error, {
      action: "create_maintenance_log",
      userId: req.user?.user_id,
      logData: req.body,
      ip: req.ip || req.connection.remoteAddress,
    });

    res.status(400).json({
      success: false,
      message: "Failed to create maintenance log",
      error: error.message,
    });
  }
};

// Update maintenance log
const updateLog = async (req, res) => {
  try {
    // Validate request data
    const validation = validateData(
      req.body,
      maintenanceValidationSchemas.updateMaintenanceLog
    );

    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: validation.errors,
      });
    }

    const { id } = req.params;

    logger.info("Maintenance log update request", {
      userId: req.user?.user_id,
      logId: id,
      updateData: Object.keys(validation.data),
      ip: req.ip || req.connection.remoteAddress,
    });

    const log = await maintenanceService.updateLog(id, validation.data);

    logger.logBusiness("maintenance_log_updated", {
      userId: req.user?.user_id,
      logId: id,
      updatedFields: Object.keys(validation.data),
    });

    res.status(200).json({
      success: true,
      message: "Maintenance log updated successfully",
      data: log,
    });
  } catch (error) {
    logger.logError(error, {
      action: "update_maintenance_log",
      userId: req.user?.user_id,
      logId: req.params.id,
      updateData: req.body,
      ip: req.ip || req.connection.remoteAddress,
    });

    if (error.statusCode === 404) {
      return res.status(404).json({
        success: false,
        message: "Maintenance log not found",
      });
    }

    res.status(400).json({
      success: false,
      message: "Failed to update maintenance log",
      error: error.message,
    });
  }
};

// Delete maintenance log
const deleteLog = async (req, res) => {
  try {
    const { id } = req.params;

    logger.info("Maintenance log deletion request", {
      userId: req.user?.user_id,
      logId: id,
      ip: req.ip || req.connection.remoteAddress,
    });

    await maintenanceService.deleteLog(id);

    logger.logBusiness("maintenance_log_deleted", {
      userId: req.user?.user_id,
      logId: id,
    });

    res.status(200).json({
      success: true,
      message: "Maintenance log deleted successfully",
    });
  } catch (error) {
    logger.logError(error, {
      action: "delete_maintenance_log",
      userId: req.user?.user_id,
      logId: req.params.id,
      ip: req.ip || req.connection.remoteAddress,
    });

    if (error.statusCode === 404) {
      return res.status(404).json({
        success: false,
        message: "Maintenance log not found",
      });
    }

    res.status(500).json({
      success: false,
      message: "Failed to delete maintenance log",
      error: error.message,
    });
  }
};

// Get upcoming maintenance for an asset
const getUpcomingMaintenance = async (req, res) => {
  try {
    const { assetId } = req.params;
    const { days = 30 } = req.query;

    logger.info("Upcoming maintenance request", {
      userId: req.user?.user_id,
      assetId,
      days,
      ip: req.ip || req.connection.remoteAddress,
    });

    const schedules = await maintenanceService.getUpcomingMaintenance(
      assetId,
      parseInt(days, 10)
    );

    res.status(200).json({
      success: true,
      message: "Upcoming maintenance retrieved successfully",
      data: schedules,
    });
  } catch (error) {
    logger.logError(error, {
      action: "get_upcoming_maintenance",
      userId: req.user?.user_id,
      assetId: req.params.assetId,
      ip: req.ip || req.connection.remoteAddress,
    });

    res.status(500).json({
      success: false,
      message: "Failed to retrieve upcoming maintenance",
      error: error.message,
    });
  }
};

// Get maintenance history for an asset
const getAssetMaintenanceHistory = async (req, res) => {
  try {
    const { assetId } = req.params;

    logger.info("Maintenance history request", {
      userId: req.user?.user_id,
      assetId,
      ip: req.ip || req.connection.remoteAddress,
    });

    const logs = await maintenanceService.getMaintenanceHistory(assetId);

    res.status(200).json({
      success: true,
      message: "Maintenance history retrieved successfully",
      data: logs,
    });
  } catch (error) {
    logger.logError(error, {
      action: "get_maintenance_history",
      userId: req.user?.user_id,
      assetId: req.params.assetId,
      ip: req.ip || req.connection.remoteAddress,
    });

    res.status(500).json({
      success: false,
      message: "Failed to retrieve maintenance history",
      error: error.message,
    });
  }
};

module.exports = {
  listSchedules,
  getScheduleById,
  createSchedule,
  updateSchedule,
  deleteSchedule,
  listLogs,
  getLogById,
  createLog,
  updateLog,
  deleteLog,
  getUpcomingMaintenance,
  getAssetMaintenanceHistory,
};
