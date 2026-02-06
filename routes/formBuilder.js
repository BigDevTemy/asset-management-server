'use strict'

const express = require('express')
const router = express.Router()
const formBuilderController = require('../controllers/formBuilderController')
const { apiLimiter } = require('../middleware/securityMiddleware')

// List forms
router.get('/', apiLimiter, formBuilderController.list)

// Get single form with fields
router.get('/:id', apiLimiter, formBuilderController.getById)

// Create form with fields
router.post('/', apiLimiter, formBuilderController.create)

// Update form and replace fields
router.patch('/:id', apiLimiter, formBuilderController.update)

// Activate a form (only one active at a time)
router.patch('/:id/activate', apiLimiter, formBuilderController.activate)

// Deactivate a form
router.patch('/:id/deactivate', apiLimiter, formBuilderController.deactivate)

// Delete form and its fields
router.delete('/:id', apiLimiter, formBuilderController.remove)

module.exports = router
