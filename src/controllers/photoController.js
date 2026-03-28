const photoService = require('../services/photoService');
const { ApiResponse } = require('../utils/responseFormatter');
const { ValidationError, NotFoundError } = require('../utils/errors');
const logger = require('../utils/logger');

class PhotoController {
  // Upload task photo
  async uploadTaskPhoto(req, res, next) {
    try {
      const { taskId } = req.params;
      const { photoUrl, photoType, caption, metadata } = req.body;

      if (!photoUrl || !photoType) {
        throw new ValidationError(req.t('errors.validation_error'));
      }

      const photoData = {
        photoUrl,
        photoType,
        caption,
        metadata
      };

      const photo = await photoService.uploadTaskPhoto(
        taskId,
        photoData,
        req.user._id
      );

      logger.info(`Photo uploaded for task: ${taskId}`);

      res.status(201).json(
        new ApiResponse(
          201,
          photo,
          req.t('success.created')
        )
      );
    } catch (error) {
      next(error);
    }
  }

  // Get photos for task
  async getPhotosForTask(req, res, next) {
    try {
      const { taskId } = req.params;

      const photos = await photoService.getPhotosForTask(taskId);

      res.status(200).json(
        new ApiResponse(
          200,
          photos,
          'Task photos retrieved successfully'
        )
      );
    } catch (error) {
      next(error);
    }
  }

  // Get photos by type (before/after)
  async getPhotosByType(req, res, next) {
    try {
      const { taskId } = req.params;
      const { photoType } = req.query;

      if (!photoType) {
        throw new ValidationError(req.t('errors.validation_error'));
      }

      const photos = await photoService.getPhotosByType(taskId, photoType);

      res.status(200).json(
        new ApiResponse(
          200,
          photos,
          'Photos retrieved successfully'
        )
      );
    } catch (error) {
      next(error);
    }
  }

  // Validate photo quality
  async validatePhotoQuality(req, res, next) {
    try {
      const { photoId } = req.params;
      const {
        blurDetected, blurScore,
        darknessDetected, darknessScore,
        similarityDetected, similarityScore,
        validationMessage
      } = req.body;

      if (blurScore === undefined || darknessScore === undefined) {
        throw new ValidationError(req.t('errors.validation_error'));
      }

      const validationData = {
        blurDetected, blurScore,
        darknessDetected, darknessScore,
        similarityDetected, similarityScore,
        validationMessage
      };

      const result = await photoService.validatePhotoQuality(
        photoId,
        validationData
      );

      logger.info(`Photo validated: ${photoId}`);

      res.status(200).json(
        new ApiResponse(
          200,
          result,
          'Photo validated successfully'
        )
      );
    } catch (error) {
      next(error);
    }
  }

  // Approve photo
  async approvePhoto(req, res, next) {
    try {
      const { photoId } = req.params;

      const photo = await photoService.approvePhoto(photoId, req.user._id);

      logger.info(`Photo approved: ${photoId}`);

      res.status(200).json(
        new ApiResponse(
          200,
          photo,
          'Photo approved successfully'
        )
      );
    } catch (error) {
      next(error);
    }
  }

  // Reject photo
  async rejectPhoto(req, res, next) {
    try {
      const { photoId } = req.params;
      const { reason } = req.body;

      if (!reason) {
        throw new ValidationError(req.t('errors.validation_error'));
      }

      const photo = await photoService.rejectPhoto(photoId, req.user._id, reason);

      logger.info(`Photo rejected: ${photoId}`);

      res.status(200).json(
        new ApiResponse(
          200,
          photo,
          'Photo rejected successfully'
        )
      );
    } catch (error) {
      next(error);
    }
  }

  // Compare before/after photos
  async compareBeforeAfterPhotos(req, res, next) {
    try {
      const { taskId } = req.params;

      const comparison = await photoService.compareBeforeAfterPhotos(taskId);

      res.status(200).json(
        new ApiResponse(
          200,
          comparison,
          'Photos compared successfully'
        )
      );
    } catch (error) {
      next(error);
    }
  }

  // Get photo statistics
  async getPhotoStatistics(req, res, next) {
    try {
      const { taskId } = req.params;

      const stats = await photoService.getPhotoStatistics(taskId);

      res.status(200).json(
        new ApiResponse(
          200,
          stats,
          'Photo statistics retrieved successfully'
        )
      );
    } catch (error) {
      next(error);
    }
  }

  // Delete photo
  async deletePhoto(req, res, next) {
    try {
      const { photoId } = req.params;

      await photoService.deletePhoto(photoId);

      logger.info(`Photo deleted: ${photoId}`);

      res.status(200).json(
        new ApiResponse(
          200,
          null,
          req.t('success.deleted')
        )
      );
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new PhotoController();