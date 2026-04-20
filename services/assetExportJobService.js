'use strict'

const { AssetExportJob } = require('../models')
const { Op } = require('sequelize')
const AssetService = require('./assetService')
const logger = require('../utils/logger')

class AssetExportJobService {
  constructor() {
    this.assetService = new AssetService()
    this.pendingJobIds = []
    this.pendingJobIdSet = new Set()
    this.processing = false
  }

  async createImageExportJob({ requestedBy }) {
    const job = await AssetExportJob.create({
      job_type: 'asset_images_export',
      status: 'queued',
      requested_by: requestedBy,
    })

    this.enqueue(job.export_job_id)
    return job
  }

  async getImageExportJobForUser(jobId, requestedBy) {
    return AssetExportJob.findOne({
      where: {
        export_job_id: jobId,
        requested_by: requestedBy,
        job_type: 'asset_images_export',
      },
    })
  }

  async resumePendingJobs() {
    const jobs = await AssetExportJob.findAll({
      where: {
        job_type: 'asset_images_export',
        status: {
          [Op.in]: ['queued', 'processing'],
        },
      },
      order: [['created_at', 'ASC']],
    })

    for (const job of jobs) {
      this.enqueue(job.export_job_id)
    }
  }

  enqueue(jobId) {
    if (!jobId || this.pendingJobIdSet.has(jobId)) {
      return
    }

    this.pendingJobIds.push(jobId)
    this.pendingJobIdSet.add(jobId)
    setImmediate(() => {
      this.processQueue().catch((error) => {
        logger.logError(error, {
          action: 'process_asset_export_job_queue',
        })
      })
    })
  }

  async processQueue() {
    if (this.processing) {
      return
    }

    this.processing = true

    try {
      while (this.pendingJobIds.length) {
        const jobId = this.pendingJobIds.shift()
        this.pendingJobIdSet.delete(jobId)
        await this.processJob(jobId)
      }
    } finally {
      this.processing = false
    }
  }

  async processJob(jobId) {
    const job = await AssetExportJob.findByPk(jobId)
    if (!job) {
      return
    }

    if (job.status === 'completed') {
      return
    }

    await job.update({
      status: 'processing',
      started_at: job.started_at || new Date(),
      error_message: null,
    })

    try {
      let lastSavedProcessedItems = -1
      let lastSavedProgress = -1
      const exportResult = await this.assetService.exportAssetImagesArchive({
        onProgress: async (progress) => {
          const shouldPersist =
            progress.processedItems === progress.totalItems ||
            progress.processedItems === 0 ||
            progress.processedItems - lastSavedProcessedItems >= 5 ||
            progress.progress - lastSavedProgress >= 5

          if (!shouldPersist) {
            return
          }

          lastSavedProcessedItems = progress.processedItems
          lastSavedProgress = progress.progress

          await job.update({
            status: 'processing',
            progress: progress.progress,
            total_items: progress.totalItems,
            processed_items: progress.processedItems,
            asset_count: progress.assetCount,
            image_count: progress.imageCount,
            skipped_images: progress.skippedImages,
          })
        },
      })

      await job.update({
        status: 'completed',
        progress: 100,
        total_items: exportResult.totalItems,
        processed_items: exportResult.totalItems,
        asset_count: exportResult.assetCount,
        image_count: exportResult.imageCount,
        skipped_images: exportResult.skippedImages,
        file_name: exportResult.fileName,
        file_path: exportResult.publicPath,
        error_message: null,
        completed_at: new Date(),
      })
    } catch (error) {
      logger.logError(error, {
        action: 'process_asset_image_export_job',
        jobId,
      })

      await job.update({
        status: 'failed',
        error_message: error.message,
        completed_at: new Date(),
      })
    }
  }
}

module.exports = new AssetExportJobService()
