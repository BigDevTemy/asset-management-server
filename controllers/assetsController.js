const AssetService = require('../services/assetService');
const logger = require('../utils/logger');
const { ASSET_STATUS_ARRAY } = require('../utils/constants');
const path = require('path');
const fs = require('fs').promises;

const parseDateOnly = (value) => {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Invalid date: ${value}`);
  }

  const isoDate = parsed.toISOString().split('T')[0];
  return new Date(isoDate);
};

// Initialize custom asset service
const assetService = new AssetService();

// Lookup asset by barcode text (ASSET-######)
const getByBarcode = async (req, res) => {
  try {
    const { code } = req.params;
    const asset = await assetService.getByBarcode(code);

    if (!asset) {
      return res.status(404).json({
        success: false,
        message: 'Asset not found',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Asset retrieved successfully',
      data: asset,
    });
  } catch (error) {
    logger.logError(error, {
      action: 'get_asset_by_barcode',
      userId: req.user?.user_id,
      barcode: req.params.code,
      ip: req.ip || req.connection.remoteAddress
    });

    res.status(500).json({
      success: false,
      message: 'Failed to retrieve asset by barcode',
      error: error.message
    });
  }
};

// Dynamic lookup for dropdown/table-backed options
const lookup = async (req, res) => {
  try {
    const data = await assetService.lookupOptions(req.query);

    return res.status(200).json({
      success: true,
      message: 'Lookup data retrieved successfully',
      data,
    });
  } catch (error) {
    logger.logError(error, {
      action: 'lookup_options',
      userId: req.user?.user_id,
      query: req.query,
      ip: req.ip || req.connection.remoteAddress
    });

    const status = error.statusCode || 500;
    return res.status(status).json({
      success: false,
      message: error.statusCode ? error.message : 'Failed to retrieve lookup data',
      error: error.message,
    });
  }
};

// List all assets with pagination and search
const list = async (req, res) => {
  try {
    logger.info('Assets list request', {
      userId: req.user?.user_id,
      query: req.query,
      ip: req.ip || req.connection.remoteAddress
    });
    
    const result = await assetService.list(req.query);
    
    logger.info('Assets list successful', {
      userId: req.user?.user_id,
      count: result.data?.length || 0,
      total: result.pagination?.total || 0
    });
    
    res.status(200).json({
      success: true,
      message: 'Assets retrieved successfully',
      ...result
    });
  } catch (error) {
    logger.logError(error, {
      action: 'list_assets',
      userId: req.user?.user_id,
      query: req.query,
      ip: req.ip || req.connection.remoteAddress
    });
    
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve assets',
      error: error.message
    });
  }
};

// Get single asset by ID
const getById = async (req, res) => {
  try {
    const { id } = req.params;
    
    logger.info('Asset get by ID request', {
      userId: req.user?.user_id,
      assetId: id,
      ip: req.ip || req.connection.remoteAddress
    });
    
    const asset = await assetService.getById(id);
    
    if (!asset) {
      logger.warn('Asset not found', {
        userId: req.user?.user_id,
        assetId: id,
        ip: req.ip || req.connection.remoteAddress
      });
      
      return res.status(404).json({
        success: false,
        message: 'Asset not found'
      });
    }
    
    logger.info('Asset retrieved successfully', {
      userId: req.user?.user_id,
      assetId: id,
      assetTag: asset.asset_tag
    });
    
    res.status(200).json({
      success: true,
      message: 'Asset retrieved successfully',
      data: asset
    });
  } catch (error) {
    logger.logError(error, {
      action: 'get_asset_by_id',
      userId: req.user?.user_id,
      assetId: req.params.id,
      ip: req.ip || req.connection.remoteAddress
    });
    
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve asset',
      error: error.message
    });
  }
};

// Create new asset
const create = async (req, res) => {
  try {
    const assetData = req.body;
    
    logger.info('Asset creation request', {
      userId: req.user?.user_id,
      assetData: {
        name: assetData.name,
        asset_tag: assetData.asset_tag,
        category_id: assetData.category_id,
        status: assetData.status,
        form_id: assetData.form_id,
        form_response_keys: assetData.form_responses
          ? Object.keys(assetData.form_responses)
          : []
      },
      ip: req.ip || req.connection.remoteAddress
    });
    
    const asset = await assetService.createAsset(assetData, req.user);
    
    logger.logBusiness('asset_created', {
      userId: req.user?.user_id,
      assetId: asset.asset_id,
      assetTag: asset.asset_tag,
      name: asset.name
    });
    
    res.status(201).json({
      success: true,
      message: 'Asset created successfully',
      data: asset
    });
  } catch (error) {
    logger.logError(error, {
      action: 'create_asset',
      userId: req.user?.user_id,
      assetData: req.body,
      ip: req.ip || req.connection.remoteAddress
    });
    
    // Handle validation errors
    if (error.message === 'Validation failed' && error.validationErrors) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: error.validationErrors
      });
    }
    
    res.status(400).json({
      success: false,
      message: 'Failed to create asset',
      error: error.message
    });
  }
};

// Update asset
const update = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    logger.info('Asset update request', {
      userId: req.user?.user_id,
      assetId: id,
      updateData: Object.keys(updateData),
      ip: req.ip || req.connection.remoteAddress
    });
    
    const asset = await assetService.update(id, updateData);
    
    if (!asset) {
      logger.warn('Asset not found for update', {
        userId: req.user?.user_id,
        assetId: id,
        ip: req.ip || req.connection.remoteAddress
      });
      
      return res.status(404).json({
        success: false,
        message: 'Asset not found'
      });
    }
    
    logger.logBusiness('asset_updated', {
      userId: req.user?.user_id,
      assetId: id,
      assetTag: asset.asset_tag,
      updatedFields: Object.keys(updateData)
    });
    
    res.status(200).json({
      success: true,
      message: 'Asset updated successfully',
      data: asset
    });
  } catch (error) {
    logger.logError(error, {
      action: 'update_asset',
      userId: req.user?.user_id,
      assetId: req.params.id,
      updateData: req.body,
      ip: req.ip || req.connection.remoteAddress
    });
    
    // Handle validation errors
    if (error.message === 'Validation failed' && error.validationErrors) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: error.validationErrors
      });
    }
    
    res.status(400).json({
      success: false,
      message: 'Failed to update asset',
      error: error.message
    });
  }
};

// Delete asset (hard delete)
const remove = async (req, res) => {
  try {
    const { id } = req.params;
    
    logger.info('Asset deletion request', {
      userId: req.user?.user_id,
      assetId: id,
      ip: req.ip || req.connection.remoteAddress
    });
    
    const deleted = await assetService.delete(id);
    
    if (!deleted) {
      logger.warn('Asset not found for deletion', {
        userId: req.user?.user_id,
        assetId: id,
        ip: req.ip || req.connection.remoteAddress
      });
      
      return res.status(404).json({
        success: false,
        message: 'Asset not found'
      });
    }
    
    logger.logBusiness('asset_deleted', {
      userId: req.user?.user_id,
      assetId: id
    });
    
    res.status(200).json({
      success: true,
      message: 'Asset deleted successfully'
    });
  } catch (error) {
    logger.logError(error, {
      action: 'delete_asset',
      userId: req.user?.user_id,
      assetId: req.params.id,
      ip: req.ip || req.connection.remoteAddress
    });
    
    res.status(500).json({
      success: false,
      message: 'Failed to delete asset',
      error: error.message
    });
  }
};

// Change asset status
const APPROVAL_STATUSES = ['PENDING', 'REJECTED', 'APPROVED']

const changeApprovalStatus = async (req, res) => {
  try {
    const { id } = req.params
    const { approval_status, comment } = req.body

    if (!approval_status || !APPROVAL_STATUSES.includes(approval_status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid approval_status. Must be one of: ${APPROVAL_STATUSES.join(', ')}`,
      })
    }

    logger.info('Asset approval status change request', {
      userId: req.user?.user_id,
      assetId: id,
      newApprovalStatus: approval_status,
      comment,
      ip: req.ip || req.connection.remoteAddress,
    })

    const asset = await assetService.updateApprovalStatus(id, {
      approval_status,
      notes: comment ?? null,
    })

    if (!asset) {
      logger.warn('Asset not found for approval change', {
        userId: req.user?.user_id,
        assetId: id,
        ip: req.ip || req.connection.remoteAddress,
      })

      return res.status(404).json({
        success: false,
        message: 'Asset not found',
      })
    }

    logger.logBusiness('asset_approval_status_changed', {
      userId: req.user?.user_id,
      assetId: id,
      assetTag: asset.asset_tag,
      newApprovalStatus: approval_status,
    })

    res.status(200).json({
      success: true,
      message: 'Asset approval status updated successfully',
      data: asset,
    })
  } catch (error) {
    logger.logError(error, {
      action: 'change_asset_approval_status',
      userId: req.user?.user_id,
      assetId: req.params.id,
      newApprovalStatus: req.body?.approval_status,
      ip: req.ip || req.connection.remoteAddress,
    })

    res.status(400).json({
      success: false,
      message: 'Failed to update asset approval status',
      error: error.message,
    })
  }
}

const changeStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    logger.info('Asset status change request', {
      userId: req.user?.user_id,
      assetId: id,
      newStatus: status,
      ip: req.ip || req.connection.remoteAddress
    });
    
    // Validate status
    const validStatuses = ASSET_STATUS_ARRAY;
    if (!validStatuses.includes(status)) {
      logger.warn('Invalid asset status provided', {
        userId: req.user?.user_id,
        assetId: id,
        invalidStatus: status,
        validStatuses,
        ip: req.ip || req.connection.remoteAddress
      });
      
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be one of: ' + validStatuses.join(', ')
      });
    }
    
    const asset = await assetService.update(id, { status });
    
    if (!asset) {
      logger.warn('Asset not found for status change', {
        userId: req.user?.user_id,
        assetId: id,
        ip: req.ip || req.connection.remoteAddress
      });
      
      return res.status(404).json({
        success: false,
        message: 'Asset not found'
      });
    }
    
    logger.logBusiness('asset_status_changed', {
      userId: req.user?.user_id,
      assetId: id,
      assetTag: asset.asset_tag,
      oldStatus: asset.status,
      newStatus: status
    });
    
    res.status(200).json({
      success: true,
      message: 'Asset status updated successfully',
      data: asset
    });
  } catch (error) {
    logger.logError(error, {
      action: 'change_asset_status',
      userId: req.user?.user_id,
      assetId: req.params.id,
      newStatus: req.body.status,
      ip: req.ip || req.connection.remoteAddress
    });
    
    res.status(400).json({
      success: false,
      message: 'Failed to update asset status',
      error: error.message
    });
  }
};

// Get assets assigned to the current user
const myAssets = async (req, res) => {
  try {
    logger.info('My assets request', {
      userId: req.user?.user_id,
      query: req.query,
      ip: req.ip || req.connection.remoteAddress
    });

    console.log(req.query)
    
    const result = await assetService.getMyAssets(req.user.user_id, req.query);
    
    logger.info('My assets retrieved successfully', {
      userId: req.user?.user_id,
      count: result.data?.length || 0,
      total: result.pagination?.total || 0
    });
    
    res.status(200).json({
      success: true,
      message: 'Your assigned assets retrieved successfully',
      ...result
    });
  } catch (error) {
    logger.logError(error, {
      action: 'get_my_assets',
      userId: req.user?.user_id,
      query: req.query,
      ip: req.ip || req.connection.remoteAddress
    });
    
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve your assets',
      error: error.message
    });
  }
};

const listByCreator = async (req, res) => {
  const userId = parseInt(req.params.userId, 10);
  if (!userId) {
    return res.status(400).json({
      success: false,
      message: 'Valid userId path parameter is required',
    });
  }

  let startDate;
  let endDateRaw;
  try {
    startDate = parseDateOnly(req.query.start_date);
    endDateRaw = parseDateOnly(req.query.end_date);
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }

  if (startDate && endDateRaw && endDateRaw < startDate) {
    return res.status(400).json({
      success: false,
      message: 'end_date must be on or after start_date',
    });
  }

  const endDate = endDateRaw
    ? new Date(endDateRaw.getTime() + 24 * 60 * 60 * 1000)
    : null;

  try {
    logger.info('Assets by creator request', {
      userId: req.user?.user_id,
      targetUserId: userId,
      query: req.query,
      ip: req.ip || req.connection.remoteAddress,
    });

    const pagingQuery = { ...req.query };
    delete pagingQuery.start_date;
    delete pagingQuery.end_date;

    const result = await assetService.getAssetsByCreator(
      userId,
      pagingQuery,
      { startDate, endDate },
    );

    logger.info('Assets by creator retrieved', {
      targetUserId: userId,
      count: result.data?.length || 0,
      total: result.pagination?.total || 0,
    });

    res.status(200).json({
      success: true,
      message: 'Assets retrieved for creator',
      ...result,
    });
  } catch (error) {
    logger.logError(error, {
      action: 'list_assets_by_creator',
      userId: req.user?.user_id,
      targetUserId: userId,
      query: req.query,
      ip: req.ip || req.connection.remoteAddress,
    });

    res.status(500).json({
      success: false,
      message: 'Failed to retrieve assets for creator',
      error: error.message,
    });
  }
};

// Get barcode for an asset
const getBarcode = async (req, res) => {
  try {
    const { id } = req.params;
    const { format = 'url' } = req.query; // format can be 'image' or 'url'
    
    logger.info('Asset barcode request', {
      userId: req.user?.user_id,
      assetId: id,
      format,
      ip: req.ip || req.connection.remoteAddress
    });
    
    // Get the asset
    const asset = await assetService.getById(id);
    
    if (!asset) {
      logger.warn('Asset not found for barcode', {
        userId: req.user?.user_id,
        assetId: id,
        ip: req.ip || req.connection.remoteAddress
      });
      
      return res.status(404).json({
        success: false,
        message: 'Asset not found'
      });
    }
    
    // If format is 'image', send the PNG file directly
    if (format === 'image') {
      // If barcode file exists, send it
      if (asset.barcode) {
        const barcodePath = path.join(__dirname, '../public', asset.barcode);
        
        try {
          await fs.access(barcodePath);
          
          logger.info('Barcode file sent', {
            userId: req.user?.user_id,
            assetId: id,
            assetTag: asset.asset_tag,
            barcodePath: asset.barcode
          });
          
          return res.sendFile(barcodePath);
        } catch (error) {
          logger.warn('Barcode file not found', {
            userId: req.user?.user_id,
            assetId: id,
            expectedPath: barcodePath
          });
          
          return res.status(404).json({
            success: false,
            message: 'Barcode image not found'
          });
        }
      } else {
        return res.status(404).json({
          success: false,
          message: 'Barcode not generated for this asset'
        });
      }
    }
    
    // Default: Return barcode URL in JSON response
    if (asset.barcode) {
      // Construct full URL for the barcode
      const protocol = req.protocol;
      const host = req.get('host');
      const barcodeUrl = `${protocol}://${host}${asset.barcode}`;
      
      logger.info('Barcode URL returned', {
        userId: req.user?.user_id,
        assetId: id,
        assetTag: asset.asset_tag,
        barcodeUrl
      });
      
      return res.status(200).json({
        success: true,
        message: 'Barcode retrieved successfully',
        data: {
          asset_id: asset.asset_id,
          asset_tag: asset.asset_tag,
          barcode_url: barcodeUrl,
          barcode_path: asset.barcode
        }
      });
    } else {
      logger.warn('Barcode not found for asset', {
        userId: req.user?.user_id,
        assetId: id,
        assetTag: asset.asset_tag
      });
      
      return res.status(404).json({
        success: false,
        message: 'Barcode not generated for this asset'
      });
    }
    
  } catch (error) {
    logger.logError(error, {
      action: 'get_asset_barcode',
      userId: req.user?.user_id,
      assetId: req.params.id,
      ip: req.ip || req.connection.remoteAddress
    });
    
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve barcode',
      error: error.message
    });
  }
};

module.exports = {
  getByBarcode,
  lookup,
  list,
  getById,
  create,
  update,
  remove,
  changeStatus,
  changeApprovalStatus,
  myAssets,
  listByCreator,
  getBarcode
};
