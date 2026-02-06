const { AssetTransaction, Asset, User, Department } = require('../models');
const { Op } = require('sequelize');
const logger = require('../utils/logger');
const {
  TRANSACTION_STATUS_ARRAY,
  TRANSACTION_ACTIONS,
  TRANSACTION_STATUS,
  USER_ROLES,
  PERMISSIONS,
  STATUS_TRANSITIONS,
  DEFAULTS
} = require('../utils/constants');

/**
 * List all asset transactions with filtering and pagination
 */
const list = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      action,
      priority,
      asset_id,
      requested_by,
      requested_to,
      from_date,
      to_date,
      search
    } = req.query;

    const offset = (page - 1) * limit;
    const where = {};

    // Build where conditions
    if (status) where.status = status;
    if (action) where.action = action;
    if (priority) where.priority = priority;
    if (asset_id) where.asset_id = asset_id;
    if (requested_by) where.requested_by = requested_by;
    if (requested_to) where.requested_to = requested_to;

    // Date range filtering
    if (from_date || to_date) {
      where.created_at = {};
      if (from_date) where.created_at[Op.gte] = new Date(from_date);
      if (to_date) where.created_at[Op.lte] = new Date(to_date);
    }

    // Search functionality - search across related tables using Sequelize nested syntax
    if (search) {
      where[Op.or] = [
        // Search in asset-related fields
        { '$asset.name$': { [Op.like]: `%${search}%` } },
        { '$asset.asset_tag$': { [Op.like]: `%${search}%` } },
        { '$asset.serial_number$': { [Op.like]: `%${search}%` } },
        // Search in requester fields
        { '$requester.full_name$': { [Op.like]: `%${search}%` } },
        { '$requester.email$': { [Op.like]: `%${search}%` } },
        { '$requester.employee_id$': { [Op.like]: `%${search}%` } },
        // Search in recipient fields
        { '$recipient.full_name$': { [Op.like]: `%${search}%` } },
        { '$recipient.email$': { [Op.like]: `%${search}%` } },
        { '$recipient.employee_id$': { [Op.like]: `%${search}%` } },
        // Search in transaction fields
        { notes: { [Op.like]: `%${search}%` } },
        { admin_notes: { [Op.like]: `%${search}%` } },
        { from_location: { [Op.like]: `%${search}%` } },
        { to_location: { [Op.like]: `%${search}%` } }
      ];
    }

    const { count, rows } = await AssetTransaction.findAndCountAll({
      where,
      include: [
        {
          model: Asset,
          as: 'asset',
          attributes: ['asset_id', 'asset_tag', 'name', 'serial_number', 'status', 'barcode']
        },
        {
          model: User,
          as: 'requester',
          attributes: ['user_id', 'full_name', 'email', 'employee_id'],
          include: [{
            model: Department,
            as: 'department',
            attributes: ['department_id', 'name']
          }]
        },
        {
          model: User,
          as: 'recipient',
          attributes: ['user_id', 'full_name', 'email', 'employee_id'],
          include: [{
            model: Department,
            as: 'department',
            attributes: ['department_id', 'name']
          }],
          required: false
        }
      ],
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset),
      distinct: true,
      subQuery: false
    });

    res.json({
      success: true,
      data: {
        transactions: rows,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(count / limit)
        }
      }
    });
  } catch (error) {
    logger.logError(error, {
      action: 'list_asset_transactions',
      userId: req.user?.user_id,
      query: req.query,
      ip: req.ip || req.connection.remoteAddress
    });

    res.status(500).json({
      success: false,
      message: 'Failed to retrieve asset transactions',
      error: error.message
    });
  }
};

/**
 * Get single asset transaction by ID
 */
const getById = async (req, res) => {
  try {
    const { id } = req.params;

    const transaction = await AssetTransaction.findByPk(id, {
      include: [
        {
          model: Asset,
          as: 'asset',
          include: [{
            model: require('../models').AssetCategory,
            as: 'category',
            attributes: ['category_id', 'name']
          }]
        },
        {
          model: User,
          as: 'requester',
          attributes: ['user_id', 'full_name', 'email', 'phone', 'employee_id', 'position'],
          include: [{
            model: Department,
            as: 'department',
            attributes: ['department_id', 'name']
          }]
        },
        {
          model: User,
          as: 'recipient',
          attributes: ['user_id', 'full_name', 'email', 'phone', 'employee_id', 'position'],
          include: [{
            model: Department,
            as: 'department',
            attributes: ['department_id', 'name']
          }]
        }
      ]
    });

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Asset transaction not found'
      });
    }

    res.json({
      success: true,
      data: transaction
    });
  } catch (error) {
    logger.logError(error, {
      action: 'get_asset_transaction_by_id',
      userId: req.user?.user_id,
      transactionId: req.params.id,
      ip: req.ip || req.connection.remoteAddress
    });

    res.status(500).json({
      success: false,
      message: 'Failed to retrieve asset transaction',
      error: error.message
    });
  }
};

/**
 * Create new asset transaction
 */
const create = async (req, res) => {
  try {
    const {
      asset_id,
      requested_to,
      action,
      from_location,
      to_location,
      notes,
      priority = DEFAULTS.TRANSACTION_PRIORITY,
      expected_completion_date
    } = req.body;

    // Validate required fields
    if (!asset_id || !action) {
      return res.status(400).json({
        success: false,
        message: 'Asset ID and action are required'
      });
    }

    // Check if asset exists
    const asset = await Asset.findByPk(asset_id);
    if (!asset) {
      return res.status(404).json({
        success: false,
        message: 'Asset not found'
      });
    }

    // Check if recipient exists (if provided)
    if (requested_to) {
      const recipient = await User.findByPk(requested_to);
      if (!recipient) {
        return res.status(404).json({
          success: false,
          message: 'Recipient user not found'
        });
      }
    }

    // Create transaction
    const transaction = await AssetTransaction.create({
      asset_id,
      requested_by: req.user.user_id, // From authenticated user
      requested_to,
      action,
      from_location,
      to_location,
      notes,
      priority,
      expected_completion_date,
      status: TRANSACTION_STATUS.PENDING
    });

    // Fetch the created transaction with associations
    const createdTransaction = await AssetTransaction.findByPk(transaction.transaction_id, {
      include: [
        {
          model: Asset,
          as: 'asset',
          attributes: ['asset_id', 'asset_tag', 'name', 'serial_number']
        },
        {
          model: User,
          as: 'requester',
          attributes: ['user_id', 'full_name', 'email', 'employee_id']
        },
        {
          model: User,
          as: 'recipient',
          attributes: ['user_id', 'full_name', 'email', 'employee_id']
        }
      ]
    });

    res.status(201).json({
      success: true,
      message: 'Asset transaction created successfully',
      data: createdTransaction
    });
  } catch (error) {
    logger.logError(error, {
      action: 'create_asset_transaction',
      userId: req.user?.user_id,
      transactionData: req.body,
      ip: req.ip || req.connection.remoteAddress
    });

    res.status(500).json({
      success: false,
      message: 'Failed to create asset transaction',
      error: error.message
    });
  }
};

/**
 * Update asset transaction
 */
const update = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      requested_to,
      from_location,
      to_location,
      notes,
      admin_notes,
      priority,
      expected_completion_date
    } = req.body;

    const transaction = await AssetTransaction.findByPk(id);
    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Asset transaction not found'
      });
    }

    // Check if user can update this transaction
    const canUpdate = PERMISSIONS.CAN_UPDATE_TRANSACTION.includes(req.user.role) ||
      transaction.requested_by === req.user.user_id;

    if (!canUpdate) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to update this transaction'
      });
    }

    // Check if recipient exists (if provided)
    if (requested_to) {
      const recipient = await User.findByPk(requested_to);
      if (!recipient) {
        return res.status(404).json({
          success: false,
          message: 'Recipient user not found'
        });
      }
    }

    // Update transaction
    await transaction.update({
      requested_to: requested_to !== undefined ? requested_to : transaction.requested_to,
      from_location: from_location !== undefined ? from_location : transaction.from_location,
      to_location: to_location !== undefined ? to_location : transaction.to_location,
      notes: notes !== undefined ? notes : transaction.notes,
      admin_notes: admin_notes !== undefined ? admin_notes : transaction.admin_notes,
      priority: priority !== undefined ? priority : transaction.priority,
      expected_completion_date: expected_completion_date !== undefined ? expected_completion_date : transaction.expected_completion_date
    });

    // Fetch updated transaction with associations
    const updatedTransaction = await AssetTransaction.findByPk(id, {
      include: [
        {
          model: Asset,
          as: 'asset',
          attributes: ['asset_id', 'asset_tag', 'name', 'serial_number']
        },
        {
          model: User,
          as: 'requester',
          attributes: ['user_id', 'full_name', 'email', 'employee_id']
        },
        {
          model: User,
          as: 'recipient',
          attributes: ['user_id', 'full_name', 'email', 'employee_id']
        }
      ]
    });

    res.json({
      success: true,
      message: 'Asset transaction updated successfully',
      data: updatedTransaction
    });
  } catch (error) {
    logger.logError(error, {
      action: 'update_asset_transaction',
      userId: req.user?.user_id,
      transactionId: req.params.id,
      updateData: req.body,
      ip: req.ip || req.connection.remoteAddress
    });

    res.status(500).json({
      success: false,
      message: 'Failed to update asset transaction',
      error: error.message
    });
  }
};

/**
 * Delete asset transaction
 */
const remove = async (req, res) => {
  try {
    const { id } = req.params;

    const transaction = await AssetTransaction.findByPk(id);
    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Asset transaction not found'
      });
    }

    // Check if user can delete this transaction
    const canDelete = PERMISSIONS.CAN_DELETE_TRANSACTION.includes(req.user.role) ||
      (transaction.requested_by === req.user.user_id && PERMISSIONS.DELETABLE_BY_REQUESTER_STATUS.includes(transaction.status));

    if (!canDelete) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to delete this transaction'
      });
    }

    await transaction.destroy();

    res.json({
      success: true,
      message: 'Asset transaction deleted successfully'
    });
  } catch (error) {
    logger.logError(error, {
      action: 'delete_asset_transaction',
      userId: req.user?.user_id,
      transactionId: req.params.id,
      ip: req.ip || req.connection.remoteAddress
    });

    res.status(500).json({
      success: false,
      message: 'Failed to delete asset transaction',
      error: error.message
    });
  }
};

/**
 * Change asset transaction status
 */
const changeStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, admin_notes } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Status is required'
      });
    }

    if (!TRANSACTION_STATUS_ARRAY.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be one of: ' + validStatuses.join(', ')
      });
    }

    const transaction = await AssetTransaction.findByPk(id, {
      include: [{
        model: Asset,
        as: 'asset'
      }]
    });

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Asset transaction not found'
      });
    }

    // Check if user can change status
    const canChangeStatus = PERMISSIONS.CAN_CHANGE_TRANSACTION_STATUS.includes(req.user.role);

    if (!canChangeStatus) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to change transaction status'
      });
    }

    // Update transaction status
    const updateData = { status };

    if (STATUS_TRANSITIONS.REQUIRES_RESPONSE_TIMESTAMP.includes(status)) {
      updateData.responded_at = new Date();
    }

    if (STATUS_TRANSITIONS.REQUIRES_COMPLETION_TIMESTAMP.includes(status)) {
      updateData.completed_at = new Date();
      updateData.actual_completion_date = new Date().toISOString().split('T')[0];
    }

    if (admin_notes) {
      updateData.admin_notes = admin_notes;
    }

    await transaction.update(updateData);

    // Update asset status based on transaction action and status
    if (status === TRANSACTION_STATUS.COMPLETED) {
      await updateAssetStatus(transaction);
    }

    // Fetch updated transaction with associations
    const updatedTransaction = await AssetTransaction.findByPk(id, {
      include: [
        {
          model: Asset,
          as: 'asset',
          attributes: ['asset_id', 'asset_tag', 'name', 'serial_number', 'status', 'barcode']
        },
        {
          model: User,
          as: 'requester',
          attributes: ['user_id', 'full_name', 'email', 'employee_id']
        },
        {
          model: User,
          as: 'recipient',
          attributes: ['user_id', 'full_name', 'email', 'employee_id']
        }
      ]
    });

    res.json({
      success: true,
      message: 'Asset transaction status updated successfully',
      data: updatedTransaction
    });
  } catch (error) {
    logger.logError(error, {
      action: 'change_asset_transaction_status',
      userId: req.user?.user_id,
      transactionId: req.params.id,
      newStatus: req.body.status,
      ip: req.ip || req.connection.remoteAddress
    });

    res.status(500).json({
      success: false,
      message: 'Failed to update asset transaction status',
      error: error.message
    });
  }
};

/**
 * Get transactions by user (requester or recipient)
 */
const getByUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { type = 'all' } = req.query; // 'requested', 'received', or 'all'

    const where = {};
    if (type === 'requested') {
      where.requested_by = userId;
    } else if (type === 'received') {
      where.requested_to = userId;
    } else {
      where[Op.or] = [
        { requested_by: userId },
        { requested_to: userId }
      ];
    }

    const transactions = await AssetTransaction.findAll({
      where,
      include: [
        {
          model: Asset,
          as: 'asset',
          attributes: ['asset_id', 'asset_tag', 'name', 'serial_number', 'status', 'barcode']
        },
        {
          model: User,
          as: 'requester',
          attributes: ['user_id', 'full_name', 'email', 'employee_id']
        },
        {
          model: User,
          as: 'recipient',
          attributes: ['user_id', 'full_name', 'email', 'employee_id']
        }
      ],
      order: [['created_at', 'DESC']]
    });

    transactions.map(transaction => {
      if (typeof transaction.notes === 'string') {
        transaction.notes = transaction.notes.replace(/\n\n/g, '<br/>');
      }
      if (typeof transaction.reason === 'string') {
        transaction.reason = transaction.reason.replace(/\n\n/g, '<br/>');
      }
    });

    res.json({
      success: true,
      data: transactions
    });
  } catch (error) {
    console.error('Error getting user transactions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve user transactions',
      error: error.message
    });
  }
};

/**
 * Get transactions by asset
 */
const getByAsset = async (req, res) => {
  try {
    const { assetId } = req.params;

    const transactions = await AssetTransaction.findAll({
      where: { asset_id: assetId },
      include: [
        {
          model: Asset,
          as: 'asset',
          attributes: ['asset_id', 'asset_tag', 'name', 'serial_number', 'status', 'barcode']
        },
        {
          model: User,
          as: 'requester',
          attributes: ['user_id', 'full_name', 'email', 'employee_id']
        },
        {
          model: User,
          as: 'recipient',
          attributes: ['user_id', 'full_name', 'email', 'employee_id']
        }
      ],
      order: [['created_at', 'DESC']]
    });

    res.json({
      success: true,
      data: transactions
    });
  } catch (error) {
    console.error('Error getting asset transactions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve asset transactions',
      error: error.message
    });
  }
};

/**
 * Get transaction statistics
 */
const getStatistics = async (req, res) => {
  try {
    const { period = '30' } = req.query; // days
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(period));

    const stats = await AssetTransaction.findAll({
      where: {
        created_at: {
          [Op.gte]: startDate
        }
      },
      attributes: [
        'status',
        'action',
        'priority',
        [AssetTransaction.sequelize.fn('COUNT', AssetTransaction.sequelize.col('transaction_id')), 'count']
      ],
      group: ['status', 'action', 'priority'],
      raw: true
    });

    // Process statistics
    const processedStats = {
      total: stats.reduce((sum, stat) => sum + parseInt(stat.count), 0),
      byStatus: {},
      byAction: {},
      byPriority: {}
    };

    stats.forEach(stat => {
      processedStats.byStatus[stat.status] = (processedStats.byStatus[stat.status] || 0) + parseInt(stat.count);
      processedStats.byAction[stat.action] = (processedStats.byAction[stat.action] || 0) + parseInt(stat.count);
      processedStats.byPriority[stat.priority] = (processedStats.byPriority[stat.priority] || 0) + parseInt(stat.count);
    });

    res.json({
      success: true,
      data: processedStats
    });
  } catch (error) {
    console.error('Error getting transaction statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve transaction statistics',
      error: error.message
    });
  }
};

/**
 * Accept asset transaction (specific endpoint for better UX)
 */
const acceptTransaction = async (req, res) => {
  try {
    const { id } = req.params;
    const { admin_notes } = req.body;

    const transaction = await AssetTransaction.findByPk(id, {
      include: [{
        model: Asset,
        as: 'asset'
      }]
    });

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Asset transaction not found'
      });
    }

    // Check if user can accept this transaction using permission system
    const { checkPermission } = require('../utils/permissions');
    const canAccept = checkPermission(req.user.role, 'transactions', 'change_status');

    if (!canAccept) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to accept transactions'
      });
    }

    // Check if transaction can be accepted
    if (transaction.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Cannot accept transaction with status: ${transaction.status}`
      });
    }

    // Update transaction status
    const updateData = {
      status: 'accepted',
      responded_at: new Date()
    };

    if (admin_notes) {
      updateData.admin_notes = admin_notes;
    }

    await transaction.update(updateData);

    // Update asset status based on transaction action when accepted
    if (transaction.action === 'assign' && transaction.requested_to) {
      try {
        await Asset.update(
          {
            assigned_to: transaction.requested_to,
            assignment_date: new Date(),
            status: 'assigned' // Update asset status to assigned
          },
          {
            where: { asset_id: transaction.asset_id }
          }
        );

        logger.info(`Asset ${transaction.asset_id} assigned to user ${transaction.requested_to}`, {
          transactionId: transaction.transaction_id,
          assetId: transaction.asset_id,
          assignedTo: transaction.requested_to,
          action: 'asset_assignment'
        });
      } catch (assetUpdateError) {
        logger.error('Error updating asset assignment:', assetUpdateError, {
          transactionId: transaction.transaction_id,
          assetId: transaction.asset_id,
          assignedTo: transaction.requested_to
        });
        // Don't fail the transaction acceptance if asset update fails
        // Just log the error and continue
      }
    } else if (transaction.action === 'repair') {
      try {
        // For repair requests, set asset status to 'in_repair' and assign to the employee who accepted
        await Asset.update(
          {
            status: 'in_repair',
            assigned_to: req.user.user_id, // Assign to the employee who accepted the repair
            assignment_date: new Date()
          },
          {
            where: { asset_id: transaction.asset_id }
          }
        );

        logger.info(`Asset ${transaction.asset_id} set to repair status and assigned to user ${req.user.user_id}`, {
          transactionId: transaction.transaction_id,
          assetId: transaction.asset_id,
          assignedTo: req.user.user_id,
          action: 'asset_repair_accepted'
        });
      } catch (assetUpdateError) {
        logger.error('Error updating asset for repair:', assetUpdateError, {
          transactionId: transaction.transaction_id,
          assetId: transaction.asset_id
        });
        // Don't fail the transaction acceptance if asset update fails
        // Just log the error and continue
      }
    } else if (transaction.action === 'return') {
      try {
        // For return requests, assign the asset to the person who accepted the return (usually IT Manager)
        await Asset.update(
          {
            status: 'assigned',
            assigned_to: req.user.user_id, // Assign to the person who accepted the return
            assignment_date: new Date()
          },
          {
            where: { asset_id: transaction.asset_id }
          }
        );

        logger.info(`Asset ${transaction.asset_id} returned and assigned to user ${req.user.user_id}`, {
          transactionId: transaction.transaction_id,
          assetId: transaction.asset_id,
          assignedTo: req.user.user_id,
          action: 'asset_return_accepted'
        });
      } catch (assetUpdateError) {
        logger.error('Error updating asset for return:', assetUpdateError, {
          transactionId: transaction.transaction_id,
          assetId: transaction.asset_id
        });
        // Don't fail the transaction acceptance if asset update fails
        // Just log the error and continue
      }
    }

    // Fetch updated transaction with associations
    const updatedTransaction = await AssetTransaction.findByPk(id, {
      include: [
        {
          model: Asset,
          as: 'asset',
          attributes: ['asset_id', 'asset_tag', 'name', 'serial_number', 'status', 'barcode']
        },
        {
          model: User,
          as: 'requester',
          attributes: ['user_id', 'full_name', 'email', 'employee_id']
        },
        {
          model: User,
          as: 'recipient',
          attributes: ['user_id', 'full_name', 'email', 'employee_id']
        }
      ]
    });

    res.json({
      success: true,
      message: 'Asset transaction accepted successfully',
      data: updatedTransaction
    });
  } catch (error) {
    console.error('Error accepting asset transaction:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to accept asset transaction',
      error: error.message
    });
  }
};

/**
 * Reject asset transaction (specific endpoint for better UX)
 */
const rejectTransaction = async (req, res) => {
  try {
    const { id } = req.params;
    const { admin_notes, reason } = req.body;

    const transaction = await AssetTransaction.findByPk(id, {
      include: [{
        model: Asset,
        as: 'asset'
      }]
    });

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Asset transaction not found'
      });
    }

    // Check if user can reject this transaction using permission system
    const { checkPermission } = require('../utils/permissions');
    const canReject = checkPermission(req.user.role, 'transactions', 'change_status');

    if (!canReject) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to reject transactions'
      });
    }

    // Check if transaction can be rejected
    if (transaction.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Cannot reject transaction with status: ${transaction.status}`
      });
    }

    // Update transaction status
    const updateData = {
      status: 'rejected',
      responded_at: new Date()
    };

    if (admin_notes) {
      updateData.admin_notes = admin_notes;
    }

    // Add rejection reason to notes if provided
    if (reason) {
      const currentNotes = transaction.notes || '';
      updateData.notes = currentNotes + (currentNotes ? '\n\n' : '') + `Rejection Reason: ${reason}`;
    }

    await transaction.update(updateData);

    // If this was an assignment transaction that was rejected, ensure asset is not assigned
    if (transaction.action === 'assign' && transaction.requested_to) {
      try {
        // Check if the asset was previously assigned to the intended recipient
        const asset = await Asset.findByPk(transaction.asset_id);
        if (asset && asset.assigned_to === transaction.requested_to) {
          // Unassign the asset since the transaction was rejected
          await Asset.update(
            {
              assigned_to: null,
              assignment_date: null,
              status: 'available' // Set back to available
            },
            {
              where: { asset_id: transaction.asset_id }
            }
          );

          logger.info(`Asset ${transaction.asset_id} unassigned due to rejected transaction`, {
            transactionId: transaction.transaction_id,
            assetId: transaction.asset_id,
            previouslyAssignedTo: transaction.requested_to,
            action: 'asset_unassignment_due_to_rejection'
          });
        }
      } catch (assetUpdateError) {
        logger.error('Error updating asset after rejection:', assetUpdateError, {
          transactionId: transaction.transaction_id,
          assetId: transaction.asset_id
        });
        // Don't fail the transaction rejection if asset update fails
      }
    }

    // Fetch updated transaction with associations
    const updatedTransaction = await AssetTransaction.findByPk(id, {
      include: [
        {
          model: Asset,
          as: 'asset',
          attributes: ['asset_id', 'asset_tag', 'name', 'serial_number', 'status', 'barcode']
        },
        {
          model: User,
          as: 'requester',
          attributes: ['user_id', 'full_name', 'email', 'employee_id']
        },
        {
          model: User,
          as: 'recipient',
          attributes: ['user_id', 'full_name', 'email', 'employee_id']
        }
      ]
    });

    res.json({
      success: true,
      message: 'Asset transaction rejected successfully',
      data: updatedTransaction
    });
  } catch (error) {
    console.error('Error rejecting asset transaction:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reject asset transaction',
      error: error.message
    });
  }
};

/**
 * Complete asset transaction (specific endpoint for better UX)
 */
const completeTransaction = async (req, res) => {
  try {
    const { id } = req.params;
    const { admin_notes } = req.body;

    const transaction = await AssetTransaction.findByPk(id, {
      include: [{
        model: Asset,
        as: 'asset'
      }]
    });

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Asset transaction not found'
      });
    }

    // Check if user can complete this transaction using permission system
    const { checkPermission } = require('../utils/permissions');
    const canComplete = checkPermission(req.user.role, 'transactions', 'change_status');

    if (!canComplete) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to complete transactions'
      });
    }

    // Check if transaction can be completed
    if (!['accepted', 'pending'].includes(transaction.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot complete transaction with status: ${transaction.status}`
      });
    }

    // Update transaction status
    const updateData = {
      status: 'completed',
      completed_at: new Date(),
      actual_completion_date: new Date().toISOString().split('T')[0]
    };

    if (admin_notes) {
      updateData.admin_notes = admin_notes;
    }

    await transaction.update(updateData);

    // Update asset status based on transaction action
    await updateAssetStatus(transaction);

    // Fetch updated transaction with associations
    const updatedTransaction = await AssetTransaction.findByPk(id, {
      include: [
        {
          model: Asset,
          as: 'asset',
          attributes: ['asset_id', 'asset_tag', 'name', 'serial_number', 'status', 'barcode']
        },
        {
          model: User,
          as: 'requester',
          attributes: ['user_id', 'full_name', 'email', 'employee_id']
        },
        {
          model: User,
          as: 'recipient',
          attributes: ['user_id', 'full_name', 'email', 'employee_id']
        }
      ]
    });

    res.json({
      success: true,
      message: 'Asset transaction completed successfully',
      data: updatedTransaction
    });
  } catch (error) {
    console.error('Error completing asset transaction:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to complete asset transaction',
      error: error.message
    });
  }
};

/**
 * Get pending transactions for approval (dashboard endpoint)
 */
const getPendingTransactions = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    const { count, rows } = await AssetTransaction.findAndCountAll({
      where: { status: 'pending' },
      include: [
        {
          model: Asset,
          as: 'asset',
          attributes: ['asset_id', 'asset_tag', 'name', 'serial_number', 'status', 'barcode']
        },
        {
          model: User,
          as: 'requester',
          attributes: ['user_id', 'full_name', 'email', 'employee_id'],
          include: [{
            model: Department,
            as: 'department',
            attributes: ['department_id', 'name']
          }]
        },
        {
          model: User,
          as: 'recipient',
          attributes: ['user_id', 'full_name', 'email', 'employee_id'],
          include: [{
            model: Department,
            as: 'department',
            attributes: ['department_id', 'name']
          }]
        }
      ],
      order: [
        ['priority', 'DESC'], // urgent, high, medium, low
        ['created_at', 'ASC']  // oldest first within same priority
      ],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      success: true,
      data: {
        transactions: rows,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(count / limit)
        }
      }
    });
  } catch (error) {
    console.error('Error getting pending transactions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve pending transactions',
      error: error.message
    });
  }
};

/**
 * Helper function to update asset status based on completed transaction
 */
const updateAssetStatus = async (transaction) => {
  try {
    const asset = await Asset.findByPk(transaction.asset_id);
    if (!asset) return;

    let newStatus = asset.status;
    let assignedTo = asset.assigned_to;
    let assignmentDate = asset.assignment_date;

    switch (transaction.action) {
      case 'assign':
        if ((transaction.status === 'accepted' || transaction.status === 'completed') && transaction.requested_to) {
          newStatus = 'assigned';
          assignedTo = transaction.requested_to;
          assignmentDate = new Date().toISOString().split('T')[0];
        }
        break;
      case 'return':
        if (transaction.status === 'completed') {
          // For return completion, keep the asset assigned to the person who accepted the return
          // The assignment was already handled in acceptTransaction function
          newStatus = 'assigned';
          // Keep current assignment (don't change assignedTo and assignmentDate)
        } else if (transaction.status === 'accepted') {
          // This case is handled in acceptTransaction function
          newStatus = 'assigned';
        }
        break;
      case 'repair':
        if (transaction.status === 'completed') {
          newStatus = 'available';
          assignedTo = null; // Unassign after repair completion
          assignmentDate = null;
        } else if (transaction.status === 'accepted') {
          newStatus = 'in_repair';
          // Note: Assignment is handled in acceptTransaction function
          // This function is called from completeTransaction, so we don't change assignment here
        }
        break;
      case 'retire':
      case 'dispose':
        if (transaction.status === 'completed') {
          newStatus = transaction.action === 'retire' ? 'retired' : 'disposed';
          assignedTo = null;
          assignmentDate = null;
        }
        break;
      case 'transfer':
        if (transaction.status === 'completed' && transaction.requested_to) {
          assignedTo = transaction.requested_to;
          assignmentDate = new Date().toISOString().split('T')[0];
        }
        break;
    }

    await asset.update({
      status: newStatus,
      assigned_to: assignedTo,
      assignment_date: assignmentDate
    });
  } catch (error) {
    logger.logError(error, {
      action: 'update_asset_status_from_transaction',
      transactionId: transaction.transaction_id,
      assetId: transaction.asset_id
    });
  }
};

/**
 * Get user dashboard statistics (My Requests, Approved, Pending counts)
 */
const getUserDashboardStats = async (req, res) => {
  try {
    const userId = req.user.user_id;

    // Get total requests count for the user
    const totalRequests = await AssetTransaction.count({
      where: { requested_by: userId }
    });

    // Get approved requests count (requests created by user OR received by user that are accepted/completed)
    const approvedRequests = await AssetTransaction.count({
      where: {
        [Op.and]: [
          {
            status: {
              [Op.in]: ['accepted', 'completed']
            }
          },
          {
            [Op.or]: [
              { requested_by: userId },
              { requested_to: userId }
            ]
          }
        ]
      }
    });

    // Get pending requests count
    const pendingRequests = await AssetTransaction.count({
      where: {
        [Op.and]: [
          {
            status: {
              [Op.in]: ['pending', 'in_progress']
            }
          },
          {
            [Op.or]: [
              { requested_by: userId },
              { requested_to: userId }
            ]
          }
        ]
      }
    });

    // Get rejected requests count
    const rejectedRequests = await AssetTransaction.count({
      where: { 
        requested_by: userId,
        status: 'rejected'
      }
    });

    const stats = {
      totalRequests,
      approvedRequests,
      pendingRequests,
      rejectedRequests
    };

    // Debug: Get actual transactions to see their statuses
    const allUserTransactions = await AssetTransaction.findAll({
      where: { requested_by: userId },
      attributes: ['transaction_id', 'status', 'action'],
      order: [['created_at', 'DESC']]
    });

    // Debug logging
    console.log('🔍 Dashboard Stats Debug:');
    console.log('👤 User ID:', userId);
    console.log('📊 Total Requests:', totalRequests);
    console.log('✅ Approved Requests:', approvedRequests);
    console.log('⏳ Pending Requests:', pendingRequests);
    console.log('❌ Rejected Requests:', rejectedRequests);
    console.log('📋 All User Transactions:', allUserTransactions.map(t => ({
      id: t.transaction_id,
      status: t.status,
      action: t.action
    })));

    logger.info(`Dashboard stats retrieved for user ${userId}`, { stats });

    res.json({
      success: true,
      message: 'Dashboard statistics retrieved successfully',
      data: stats
    });

  } catch (error) {
    logger.error('Error getting user dashboard stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve dashboard statistics',
      error: error.message
    });
  }
};

module.exports = {
  list,
  getById,
  create,
  update,
  remove,
  changeStatus,
  getByUser,
  getByAsset,
  getStatistics,
  acceptTransaction,
  rejectTransaction,
  completeTransaction,
  getPendingTransactions,
  getUserDashboardStats
};
