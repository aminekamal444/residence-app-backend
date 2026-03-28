const Announcement = require('../models/Announcement');
const { ApiResponse } = require('../utils/responseFormatter');
const { ValidationError, NotFoundError } = require('../utils/errors');
const logger = require('../utils/logger');

class AnnouncementController {
  // Get all announcements
  async getAllAnnouncements(req, res, next) {
    try {
      const building = req.user.building;
      const { type, page = 1, limit = 10 } = req.query;

      const query = { building };
      if (type) query.type = type;

      const announcements = await Announcement.find(query)
        .populate('createdBy', 'name')
        .populate('building', 'name')
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .sort({ createdAt: -1 });

      const total = await Announcement.countDocuments(query);

      res.status(200).json(
        new ApiResponse(
          200,
          { announcements, total, pages: Math.ceil(total / limit) },
          'Announcements retrieved successfully'
        )
      );
    } catch (error) {
      next(error);
    }
  }

  // Get announcement by ID
  async getAnnouncementById(req, res, next) {
    try {
      const { announcementId } = req.params;

      const announcement = await Announcement.findById(announcementId)
        .populate('createdBy', 'name')
        .populate('building', 'name');

      if (!announcement) {
        throw new NotFoundError(req.t('errors.not_found'));
      }

      res.status(200).json(
        new ApiResponse(
          200,
          announcement,
          'Announcement retrieved successfully'
        )
      );
    } catch (error) {
      next(error);
    }
  }

  // Create announcement (Syndic only)
  async createAnnouncement(req, res, next) {
    try {
      const { title, content, type, targetAudience, priority } = req.body;

      if (!title || !content || !type) {
        throw new ValidationError(req.t('errors.validation_error'));
      }

      const announcement = new Announcement({
        building: req.user.building,
        title,
        content,
        type,
        targetAudience: targetAudience || 'all',
        priority: priority || 'medium',
        createdBy: req.user._id,
        publishedDate: new Date(),
        viewedBy: []
      });

      await announcement.save();

      logger.info(`Announcement created: ${title}`);

      res.status(201).json(
        new ApiResponse(
          201,
          announcement,
          req.t('announcement.created')
        )
      );
    } catch (error) {
      next(error);
    }
  }

  // Update announcement
  async updateAnnouncement(req, res, next) {
    try {
      const { announcementId } = req.params;
      const { title, content, type, targetAudience, priority } = req.body;

      const updates = {};
      if (title) updates.title = title;
      if (content) updates.content = content;
      if (type) updates.type = type;
      if (targetAudience) updates.targetAudience = targetAudience;
      if (priority) updates.priority = priority;

      const announcement = await Announcement.findByIdAndUpdate(
        announcementId,
        updates,
        { new: true, runValidators: true }
      );

      if (!announcement) {
        throw new NotFoundError(req.t('errors.not_found'));
      }

      logger.info(`Announcement updated: ${announcementId}`);

      res.status(200).json(
        new ApiResponse(
          200,
          announcement,
          req.t('success.updated')
        )
      );
    } catch (error) {
      next(error);
    }
  }

  // Delete announcement
  async deleteAnnouncement(req, res, next) {
    try {
      const { announcementId } = req.params;

      const announcement = await Announcement.findByIdAndDelete(announcementId);

      if (!announcement) {
        throw new NotFoundError(req.t('errors.not_found'));
      }

      logger.info(`Announcement deleted: ${announcementId}`);

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

  // Mark announcement as viewed
  async markAsViewed(req, res, next) {
    try {
      const { announcementId } = req.params;
      const userId = req.user._id;

      const announcement = await Announcement.findByIdAndUpdate(
        announcementId,
        { $addToSet: { viewedBy: userId } },
        { new: true }
      );

      if (!announcement) {
        throw new NotFoundError(req.t('errors.not_found'));
      }

      res.status(200).json(
        new ApiResponse(
          200,
          announcement,
          'Announcement marked as viewed'
        )
      );
    } catch (error) {
      next(error);
    }
  }

  // Add comment to announcement
  async addComment(req, res, next) {
    try {
      const { announcementId } = req.params;
      const { text } = req.body;

      if (!text) {
        throw new ValidationError(req.t('errors.validation_error'));
      }

      const announcement = await Announcement.findByIdAndUpdate(
        announcementId,
        {
          $push: {
            comments: {
              user: req.user._id,
              text,
              createdAt: new Date()
            }
          }
        },
        { new: true }
      ).populate('comments.user', 'name');

      if (!announcement) {
        throw new NotFoundError(req.t('errors.not_found'));
      }

      logger.info(`Comment added to announcement: ${announcementId}`);

      res.status(200).json(
        new ApiResponse(
          200,
          announcement,
          'Comment added successfully'
        )
      );
    } catch (error) {
      next(error);
    }
  }

  // Like announcement
  async likeAnnouncement(req, res, next) {
    try {
      const { announcementId } = req.params;
      const userId = req.user._id;

      const announcement = await Announcement.findByIdAndUpdate(
        announcementId,
        { $addToSet: { likes: userId } },
        { new: true }
      );

      if (!announcement) {
        throw new NotFoundError(req.t('errors.not_found'));
      }

      res.status(200).json(
        new ApiResponse(
          200,
          { likes: announcement.likes ? announcement.likes.length : 0 },
          'Announcement liked successfully'
        )
      );
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AnnouncementController();