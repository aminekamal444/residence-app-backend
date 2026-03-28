const TaskPhoto = require('../models/TaskPhoto');
const Task = require('../models/Task');
const { NotFoundError, ValidationError } = require('../utils/errors');
const logger = require('../utils/logger');

class PhotoService {
  // Upload task photo
  async uploadTaskPhoto(taskId, photoData, uploadedBy) {
    try {
      const { photoUrl, photoType, caption, metadata } = photoData;

      // Validate photo type
      const validTypes = ['before', 'after', 'progress'];
      if (!validTypes.includes(photoType)) {
        throw new ValidationError('Invalid photo type');
      }

      // Check task exists
      const task = await Task.findById(taskId);
      if (!task) {
        throw new NotFoundError('Task not found');
      }

      // Create photo document
      const photo = new TaskPhoto({
        task: taskId,
        photoUrl,
        photoType,
        caption,
        uploadedBy,
        metadata: {
          fileSize: metadata?.fileSize,
          mimeType: metadata?.mimeType,
          width: metadata?.width,
          height: metadata?.height,
          uploadedAt: new Date(),
          location: metadata?.location
        }
      });

      await photo.save();

      // Add to task
      task.photos.push(photo._id);
      await task.save();

      logger.info(`Photo uploaded for task ${taskId}`);

      return photo;
    } catch (error) {
      logger.error('Upload photo error:', error);
      throw error;
    }
  }

  // Validate photo quality (blur, darkness, etc.)
  async validatePhotoQuality(photoId, validationData) {
    try {
      const photo = await TaskPhoto.findById(photoId);
      if (!photo) {
        throw new NotFoundError('Photo not found');
      }

      const {
        blurDetected,
        blurScore,
        darknessDetected,
        darknessScore,
        similarityDetected,
        similarityScore,
        validationMessage
      } = validationData;

      // Update validation fields
      photo.validation = {
        blur: blurDetected || false,
        blurScore: blurScore || 0,
        darkness: darknessDetected || false,
        darknessScore: darknessScore || 0,
        similarity: similarityDetected || false,
        similarityScore: similarityScore || 0,
        confidence: this._calculateConfidence(blurScore, darknessScore, similarityScore),
        isValid: this._isPhotoValid(blurScore, darknessScore),
        validationMessage: validationMessage || '',
        validatedAt: new Date()
      };

      await photo.save();

      logger.info(`Photo validated: ${photoId}, confidence: ${photo.validation.confidence}`);

      return photo;
    } catch (error) {
      logger.error('Validate photo error:', error);
      throw error;
    }
  }

  // Get photos for task
  async getPhotosForTask(taskId) {
    try {
      const photos = await TaskPhoto.find({ task: taskId })
        .populate('uploadedBy', 'name email')
        .populate('approvedBy', 'name email')
        .sort({ createdAt: -1 });

      return photos;
    } catch (error) {
      logger.error('Get task photos error:', error);
      throw error;
    }
  }

  // Get photos by type
  async getPhotosByType(taskId, photoType) {
    try {
      const photos = await TaskPhoto.find({
        task: taskId,
        photoType: photoType
      }).sort({ createdAt: -1 });

      return photos;
    } catch (error) {
      logger.error('Get photos by type error:', error);
      throw error;
    }
  }

  // Approve photo
  async approvePhoto(photoId, approvedBy, approvalReason = '') {
    try {
      const photo = await TaskPhoto.findById(photoId);
      if (!photo) {
        throw new NotFoundError('Photo not found');
      }

      photo.approvedBy = approvedBy;
      photo.approvalStatus = 'approved';
      photo.approvalReason = approvalReason;
      photo.approvalDate = new Date();

      await photo.save();

      logger.info(`Photo approved: ${photoId}`);

      return photo;
    } catch (error) {
      logger.error('Approve photo error:', error);
      throw error;
    }
  }

  // Reject photo
  async rejectPhoto(photoId, approvedBy, rejectionReason) {
    try {
      const photo = await TaskPhoto.findById(photoId);
      if (!photo) {
        throw new NotFoundError('Photo not found');
      }

      photo.approvedBy = approvedBy;
      photo.approvalStatus = 'rejected';
      photo.approvalReason = rejectionReason;
      photo.approvalDate = new Date();

      await photo.save();

      logger.info(`Photo rejected: ${photoId}, reason: ${rejectionReason}`);

      return photo;
    } catch (error) {
      logger.error('Reject photo error:', error);
      throw error;
    }
  }

  // Compare before/after photos
  async compareBeforeAfterPhotos(taskId) {
    try {
      const beforePhotos = await TaskPhoto.find({
        task: taskId,
        photoType: 'before'
      });

      const afterPhotos = await TaskPhoto.find({
        task: taskId,
        photoType: 'after'
      });

      if (beforePhotos.length === 0 || afterPhotos.length === 0) {
        throw new ValidationError('Before and after photos required for comparison');
      }

      // Link comparison
      const comparison = {
        beforePhotos: beforePhotos.map(p => ({
          id: p._id,
          url: p.photoUrl,
          quality: p.validation.confidence
        })),
        afterPhotos: afterPhotos.map(p => ({
          id: p._id,
          url: p.photoUrl,
          quality: p.validation.confidence
        })),
        overallQuality: this._calculateOverallQuality(
          [...beforePhotos, ...afterPhotos]
        )
      };

      return comparison;
    } catch (error) {
      logger.error('Compare photos error:', error);
      throw error;
    }
  }

  // Get photo statistics for task
  async getPhotoStatistics(taskId) {
    try {
      const allPhotos = await TaskPhoto.find({ task: taskId });
      
      const stats = {
        totalPhotos: allPhotos.length,
        beforePhotos: allPhotos.filter(p => p.photoType === 'before').length,
        afterPhotos: allPhotos.filter(p => p.photoType === 'after').length,
        progressPhotos: allPhotos.filter(p => p.photoType === 'progress').length,
        approvedPhotos: allPhotos.filter(p => p.approvalStatus === 'approved').length,
        rejectedPhotos: allPhotos.filter(p => p.approvalStatus === 'rejected').length,
        pendingPhotos: allPhotos.filter(p => p.approvalStatus === 'pending').length,
        averageQuality: this._calculateOverallQuality(allPhotos)
      };

      return stats;
    } catch (error) {
      logger.error('Get photo statistics error:', error);
      throw error;
    }
  }

  // Delete photo
  async deletePhoto(photoId) {
    try {
      const photo = await TaskPhoto.findById(photoId);
      if (!photo) {
        throw new NotFoundError('Photo not found');
      }

      // Remove from task
      await Task.findByIdAndUpdate(photo.task, {
        $pull: { photos: photoId }
      });

      await TaskPhoto.findByIdAndDelete(photoId);

      logger.info(`Photo deleted: ${photoId}`);

      return { message: 'Photo deleted successfully' };
    } catch (error) {
      logger.error('Delete photo error:', error);
      throw error;
    }
  }

  // Helper: Calculate confidence score
  _calculateConfidence(blurScore = 0, darknessScore = 0, similarityScore = 0) {
    const avgScore = (blurScore + darknessScore + similarityScore) / 3;
    return Math.round(100 - avgScore);
  }

  // Helper: Check if photo is valid
  _isPhotoValid(blurScore = 0, darknessScore = 0) {
    // Photos are valid if blur < 30 and darkness < 30
    return blurScore < 30 && darknessScore < 30;
  }

  // Helper: Calculate overall quality
  _calculateOverallQuality(photos) {
    if (photos.length === 0) return 0;

    const totalConfidence = photos.reduce((sum, photo) => {
      return sum + (photo.validation?.confidence || 0);
    }, 0);

    return Math.round(totalConfidence / photos.length);
  }
}

module.exports = new PhotoService();