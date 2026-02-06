"use strict";

const {
  MaintenanceSchedule,
  MaintenanceLog,
  Asset,
  User,
} = require("../models");
const { Op } = require("sequelize");
const logger = require("../utils/logger");

/**
 * Maintenance Service
 * Handles maintenance schedules and logs business logic
 */
class MaintenanceService {
  /**
   * List all maintenance schedules with pagination and filters
   * @param {Object} queryParams - Query parameters
   * @returns {Object} Paginated schedules
   */
  async listSchedules(queryParams = {}) {
    try {
      const {
        page = 1,
        limit = 10,
        search = "",
        sortBy = "next_maintenance_date",
        sortOrder = "ASC",
        asset_id,
        maintenance_type,
        assigned_to,
        is_active,
        ...filters
      } = queryParams;

      const pageNumber = Math.max(1, parseInt(page, 10));
      const pageSize = Math.min(100, Math.max(1, parseInt(limit, 10)));
      const offset = (pageNumber - 1) * pageSize;

      // Build where clause
      const where = {};

      if (asset_id) {
        where.asset_id = asset_id;
      }

      if (maintenance_type) {
        where.maintenance_type = maintenance_type;
      }

      if (assigned_to) {
        where.assigned_to = assigned_to;
      }

      if (is_active !== undefined) {
        where.is_active = is_active === "true" || is_active === true;
      }

      if (search) {
        where[Op.or] = [
          { title: { [Op.like]: `%${search}%` } },
          { description: { [Op.like]: `%${search}%` } },
        ];
      }

      // Build order clause
      const order = [[sortBy, sortOrder.toUpperCase()]];

      // Execute query
      const { count, rows } = await MaintenanceSchedule.findAndCountAll({
        where,
        include: [
          {
            model: Asset,
            as: "asset",
            attributes: ["asset_id", "asset_tag", "name", "status"],
          },
          {
            model: User,
            as: "assignedUser",
            attributes: ["user_id", "full_name", "email"],
          },
        ],
        order,
        limit: pageSize,
        offset: offset,
        distinct: true,
      });

      const totalPages = Math.ceil(count / pageSize);

      return {
        data: rows,
        pagination: {
          currentPage: pageNumber,
          totalPages,
          totalItems: count,
          itemsPerPage: pageSize,
          hasNextPage: pageNumber < totalPages,
          hasPrevPage: pageNumber > 1,
        },
      };
    } catch (error) {
      logger.logError(error, {
        action: "list_maintenance_schedules",
        queryParams,
      });
      throw error;
    }
  }

  /**
   * Get single maintenance schedule by ID
   * @param {number} id - Schedule ID
   * @returns {Object} Schedule with associations
   */
  async getScheduleById(id) {
    try {
      const schedule = await MaintenanceSchedule.findByPk(id, {
        include: [
          {
            model: Asset,
            as: "asset",
          },
          {
            model: User,
            as: "assignedUser",
          },
          {
            model: MaintenanceLog,
            as: "logs",
            include: [
              {
                model: User,
                as: "performedBy",
                attributes: ["user_id", "full_name", "email"],
              },
            ],
            order: [["performed_date", "DESC"]],
          },
        ],
      });

      if (!schedule) {
        const error = new Error("Maintenance schedule not found");
        error.statusCode = 404;
        throw error;
      }

      return schedule;
    } catch (error) {
      logger.logError(error, {
        action: "get_maintenance_schedule_by_id",
        scheduleId: id,
      });
      throw error;
    }
  }

  /**
   * Create new maintenance schedule
   * @param {Object} data - Schedule data
   * @returns {Object} Created schedule
   */
  async createSchedule(data) {
    try {
      const schedule = await MaintenanceSchedule.create(data, {
        include: [
          {
            model: Asset,
            as: "asset",
            attributes: ["asset_id", "asset_tag", "name"],
          },
          {
            model: User,
            as: "assignedUser",
            attributes: ["user_id", "full_name", "email"],
          },
        ],
      });

      logger.info("Maintenance schedule created", {
        scheduleId: schedule.schedule_id,
        assetId: schedule.asset_id,
      });

      return schedule;
    } catch (error) {
      logger.logError(error, {
        action: "create_maintenance_schedule",
        data,
      });
      throw error;
    }
  }

  /**
   * Update maintenance schedule
   * @param {number} id - Schedule ID
   * @param {Object} data - Update data
   * @returns {Object} Updated schedule
   */
  async updateSchedule(id, data) {
    try {
      const schedule = await MaintenanceSchedule.findByPk(id);

      if (!schedule) {
        const error = new Error("Maintenance schedule not found");
        error.statusCode = 404;
        throw error;
      }

      await schedule.update(data);

      logger.info("Maintenance schedule updated", {
        scheduleId: id,
        updates: Object.keys(data),
      });

      return schedule;
    } catch (error) {
      logger.logError(error, {
        action: "update_maintenance_schedule",
        scheduleId: id,
        data,
      });
      throw error;
    }
  }

  /**
   * Delete maintenance schedule
   * @param {number} id - Schedule ID
   * @returns {boolean} Success status
   */
  async deleteSchedule(id) {
    try {
      const schedule = await MaintenanceSchedule.findByPk(id);

      if (!schedule) {
        const error = new Error("Maintenance schedule not found");
        error.statusCode = 404;
        throw error;
      }

      await schedule.destroy();

      logger.info("Maintenance schedule deleted", {
        scheduleId: id,
      });

      return true;
    } catch (error) {
      logger.logError(error, {
        action: "delete_maintenance_schedule",
        scheduleId: id,
      });
      throw error;
    }
  }

  /**
   * List all maintenance logs with pagination and filters
   * @param {Object} queryParams - Query parameters
   * @returns {Object} Paginated logs
   */
  async listLogs(queryParams = {}) {
    try {
      const {
        page = 1,
        limit = 10,
        search = "",
        sortBy = "performed_date",
        sortOrder = "DESC",
        asset_id,
        schedule_id,
        maintenance_type,
        performed_by,
        performed_date_from,
        performed_date_to,
        ...filters
      } = queryParams;

      const pageNumber = Math.max(1, parseInt(page, 10));
      const pageSize = Math.min(100, Math.max(1, parseInt(limit, 10)));
      const offset = (pageNumber - 1) * pageSize;

      // Build where clause
      const where = {};

      if (asset_id) {
        where.asset_id = asset_id;
      }

      if (schedule_id) {
        where.schedule_id = schedule_id;
      }

      if (maintenance_type) {
        where.maintenance_type = maintenance_type;
      }

      if (performed_by) {
        where.performed_by = performed_by;
      }

      if (performed_date_from || performed_date_to) {
        where.performed_date = {};
        if (performed_date_from) {
          where.performed_date[Op.gte] = performed_date_from;
        }
        if (performed_date_to) {
          where.performed_date[Op.lte] = performed_date_to;
        }
      }

      if (search) {
        where[Op.or] = [
          { title: { [Op.like]: `%${search}%` } },
          { description: { [Op.like]: `%${search}%` } },
          { notes: { [Op.like]: `%${search}%` } },
        ];
      }

      // Build order clause
      const order = [[sortBy, sortOrder.toUpperCase()]];

      // Execute query
      const { count, rows } = await MaintenanceLog.findAndCountAll({
        where,
        include: [
          {
            model: Asset,
            as: "asset",
            attributes: ["asset_id", "asset_tag", "name", "status"],
          },
          {
            model: MaintenanceSchedule,
            as: "schedule",
            attributes: ["schedule_id", "title", "maintenance_type"],
          },
          {
            model: User,
            as: "performedBy",
            attributes: ["user_id", "full_name", "email"],
          },
        ],
        order,
        limit: pageSize,
        offset: offset,
        distinct: true,
      });

      const totalPages = Math.ceil(count / pageSize);

      return {
        data: rows,
        pagination: {
          currentPage: pageNumber,
          totalPages,
          totalItems: count,
          itemsPerPage: pageSize,
          hasNextPage: pageNumber < totalPages,
          hasPrevPage: pageNumber > 1,
        },
      };
    } catch (error) {
      logger.logError(error, {
        action: "list_maintenance_logs",
        queryParams,
      });
      throw error;
    }
  }

  /**
   * Get single maintenance log by ID
   * @param {number} id - Log ID
   * @returns {Object} Log with associations
   */
  async getLogById(id) {
    try {
      const log = await MaintenanceLog.findByPk(id, {
        include: [
          {
            model: Asset,
            as: "asset",
          },
          {
            model: MaintenanceSchedule,
            as: "schedule",
          },
          {
            model: User,
            as: "performedBy",
          },
        ],
      });

      if (!log) {
        const error = new Error("Maintenance log not found");
        error.statusCode = 404;
        throw error;
      }

      return log;
    } catch (error) {
      logger.logError(error, {
        action: "get_maintenance_log_by_id",
        logId: id,
      });
      throw error;
    }
  }

  /**
   * Create new maintenance log
   * @param {Object} data - Log data
   * @returns {Object} Created log
   */
  async createLog(data) {
    try {
      const log = await MaintenanceLog.create(data, {
        include: [
          {
            model: Asset,
            as: "asset",
            attributes: ["asset_id", "asset_tag", "name"],
          },
          {
            model: MaintenanceSchedule,
            as: "schedule",
            attributes: ["schedule_id", "title"],
          },
          {
            model: User,
            as: "performedBy",
            attributes: ["user_id", "full_name", "email"],
          },
        ],
      });

      logger.info("Maintenance log created", {
        logId: log.log_id,
        assetId: log.asset_id,
      });

      return log;
    } catch (error) {
      logger.logError(error, {
        action: "create_maintenance_log",
        data,
      });
      throw error;
    }
  }

  /**
   * Update maintenance log
   * @param {number} id - Log ID
   * @param {Object} data - Update data
   * @returns {Object} Updated log
   */
  async updateLog(id, data) {
    try {
      const log = await MaintenanceLog.findByPk(id);

      if (!log) {
        const error = new Error("Maintenance log not found");
        error.statusCode = 404;
        throw error;
      }

      await log.update(data);

      logger.info("Maintenance log updated", {
        logId: id,
        updates: Object.keys(data),
      });

      return log;
    } catch (error) {
      logger.logError(error, {
        action: "update_maintenance_log",
        logId: id,
        data,
      });
      throw error;
    }
  }

  /**
   * Delete maintenance log
   * @param {number} id - Log ID
   * @returns {boolean} Success status
   */
  async deleteLog(id) {
    try {
      const log = await MaintenanceLog.findByPk(id);

      if (!log) {
        const error = new Error("Maintenance log not found");
        error.statusCode = 404;
        throw error;
      }

      await log.destroy();

      logger.info("Maintenance log deleted", {
        logId: id,
      });

      return true;
    } catch (error) {
      logger.logError(error, {
        action: "delete_maintenance_log",
        logId: id,
      });
      throw error;
    }
  }

  /**
   * Get upcoming maintenance for an asset
   * @param {number} assetId - Asset ID
   * @param {number} days - Number of days ahead to check (default: 30)
   * @returns {Array} Upcoming maintenance schedules
   */
  async getUpcomingMaintenance(assetId, days = 30) {
    try {
      const today = new Date();
      const futureDate = new Date();
      futureDate.setDate(today.getDate() + days);

      const schedules = await MaintenanceSchedule.findAll({
        where: {
          asset_id: assetId,
          is_active: true,
          next_maintenance_date: {
            [Op.between]: [today, futureDate],
          },
        },
        include: [
          {
            model: Asset,
            as: "asset",
            attributes: ["asset_id", "asset_tag", "name"],
          },
          {
            model: User,
            as: "assignedUser",
            attributes: ["user_id", "full_name", "email"],
          },
        ],
        order: [["next_maintenance_date", "ASC"]],
      });

      return schedules;
    } catch (error) {
      logger.logError(error, {
        action: "get_upcoming_maintenance",
        assetId,
        days,
      });
      throw error;
    }
  }

  /**
   * Get maintenance history for an asset
   * @param {number} assetId - Asset ID
   * @returns {Array} Maintenance logs for the asset
   */
  async getMaintenanceHistory(assetId) {
    try {
      const logs = await MaintenanceLog.findAll({
        where: {
          asset_id: assetId,
        },
        include: [
          {
            model: MaintenanceSchedule,
            as: "schedule",
            attributes: ["schedule_id", "title", "maintenance_type"],
          },
          {
            model: User,
            as: "performedBy",
            attributes: ["user_id", "full_name", "email"],
          },
        ],
        order: [["performed_date", "DESC"]],
      });

      return logs;
    } catch (error) {
      logger.logError(error, {
        action: "get_maintenance_history",
        assetId,
      });
      throw error;
    }
  }
}

module.exports = MaintenanceService;
