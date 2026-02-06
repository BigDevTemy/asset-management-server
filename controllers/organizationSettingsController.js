const { OrganizationSettings } = require('../models');
const { createOrganizationSettingsCrudService } = require('../services/crudServiceFactory');
const logger = require('../utils/logger');
const crudService = createOrganizationSettingsCrudService();


// Get organization settings (single item)
const get = async (req, res) => {
  try {
    logger.info('Organization settings get request', {
      userId: req.user?.user_id,
      ip: req.ip || req.connection.remoteAddress
    });
    
    const result = await OrganizationSettings.findOne();

    if (!result) {
      logger.warn('Organization settings not found', {
        userId: req.user?.user_id,
        ip: req.ip || req.connection.remoteAddress
      });
      
      return res.status(404).json({
        success: false,
        message: 'Organization settings not found'
      });
    }

    logger.info('Organization settings retrieved successfully', {
      userId: req.user?.user_id,
      organizationName: result.organization_name
    });

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.logError(error, {
      action: 'get_organization_settings',
      userId: req.user?.user_id,
      ip: req.ip || req.connection.remoteAddress
    });
    
    res.status(500).json({
      success: false,
      message: 'Error retrieving organization settings',
      error: error.message
    });
  }
};

// Create new organization setting (single item)
const create = async (req, res) => {
  try {
    logger.info('Organization settings creation request', {
      userId: req.user?.user_id,
      settingsData: {
        organization_name: req.body.organization_name,
        contact_email: req.body.contact_email
      },
      ip: req.ip || req.connection.remoteAddress
    });
    
    // Check if organization settings already exist
    const existingSettings = await OrganizationSettings.findOne();
    if (existingSettings) {
      logger.warn('Organization settings already exist', {
        userId: req.user?.user_id,
        existingSettingsId: existingSettings.setting_id,
        ip: req.ip || req.connection.remoteAddress
      });
      
      return res.status(400).json({
        success: false,
        message: 'Organization settings already exist. Use update instead.'
      });
    }

    const result = await crudService.create(req.body);

    logger.logBusiness('organization_settings_created', {
      userId: req.user?.user_id,
      settingsId: result.setting_id,
      organizationName: result.organization_name
    });

    res.status(201).json({
      success: true,
      message: 'Organization settings created successfully',
      data: result
    });
  } catch (error) {
    logger.logError(error, {
      action: 'create_organization_settings',
      userId: req.user?.user_id,
      settingsData: req.body,
      ip: req.ip || req.connection.remoteAddress
    });
    
    res.status(500).json({
      success: false,
      message: 'Error creating organization settings',
      error: error.message
    });
  }
};

// Update organization setting (single item)
const update = async (req, res) => {
  try {
    logger.info('Organization settings update request', {
      userId: req.user?.user_id,
      updateData: Object.keys(req.body),
      ip: req.ip || req.connection.remoteAddress
    });
    
    const existingSettings = await OrganizationSettings.findOne();

    if (!existingSettings) {
      logger.warn('Organization settings not found for update', {
        userId: req.user?.user_id,
        ip: req.ip || req.connection.remoteAddress
      });
      
      return res.status(404).json({
        success: false,
        message: 'Organization settings not found. Create them first.'
      });
    }

    const result = await crudService.update(existingSettings.setting_id, req.body);

    logger.logBusiness('organization_settings_updated', {
      userId: req.user?.user_id,
      settingsId: existingSettings.setting_id,
      organizationName: result.organization_name,
      updatedFields: Object.keys(req.body)
    });

    res.json({
      success: true,
      message: 'Organization settings updated successfully',
      data: result
    });
  } catch (error) {
    logger.logError(error, {
      action: 'update_organization_settings',
      userId: req.user?.user_id,
      updateData: req.body,
      ip: req.ip || req.connection.remoteAddress
    });
    
    res.status(500).json({
      success: false,
      message: 'Error updating organization settings',
      error: error.message
    });
  }
};

// Get organization logo only (public endpoint - no authentication required)
const getLogo = async (req, res) => {
  try {
    logger.info('Organization logo get request (public)', {
      ip: req.ip || req.connection.remoteAddress
    });
    
    const result = await OrganizationSettings.findOne({
      attributes: ['logo_url', 'organization_name'] // Only fetch logo_url and organization_name
    });

    if (!result) {
      logger.warn('Organization settings not found for logo', {
        ip: req.ip || req.connection.remoteAddress
      });
      
      return res.status(404).json({
        success: false,
        message: 'Organization logo not found'
      });
    }

    logger.info('Organization logo retrieved successfully', {
      organizationName: result.organization_name,
      hasLogo: !!result.logo_url
    });

    res.json({
      success: true,
      data: {
        logo_url: result.logo_url,
        organization_name: result.organization_name
      }
    });
  } catch (error) {
    logger.logError(error, {
      action: 'get_organization_logo_public',
      ip: req.ip || req.connection.remoteAddress
    });
    
    res.status(500).json({
      success: false,
      message: 'Error retrieving organization logo',
      error: error.message
    });
  }
};

module.exports = {
  get,
  create,
  update,
  getLogo,
};
