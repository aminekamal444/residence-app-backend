const Task = require('../models/Task');
const { ApiResponse } = require('../utils/responseFormatter');
const { ValidationError, NotFoundError } = require('../utils/errors');
const logger = require('../utils/logger');

class TaskController {
  // Get all tasks
  async getAllTasks(req, res, next) {
    try {
      const building = req.user.building;
      const { status, priority, page = 1, limit = 10 } = req.query;

      const query = { building };
      if (status) query.status = status;
      if (priority) query.priority = priority;

      const tasks = await Task.find(query)
        .populate('apartment', 'number')
        .populate('assignedTo', 'name')
        .populate('building', 'name')
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .sort({ createdAt: -1 });

      const total = await Task.countDocuments(query);

      res.status(200).json(
        new ApiResponse(
          200,
          { tasks, total, pages: Math.ceil(total / limit) },
          'Tasks retrieved successfully'
        )
      );
    } catch (error) {
      next(error);
    }
  }

  // Get task by ID
  async getTaskById(req, res, next) {
    try {
      const { taskId } = req.params;

      const task = await Task.findById(taskId)
        .populate('apartment')
        .populate('assignedTo')
        .populate('approvedBy');

      if (!task) {
        throw new NotFoundError(req.t('errors.not_found'));
      }

      res.status(200).json(
        new ApiResponse(
          200,
          task,
          'Task retrieved successfully'
        )
      );
    } catch (error) {
      next(error);
    }
  }

  // Create task
  async createTask(req, res, next) {
    try {
      const { title, description, category, priority, apartment, dueDate } = req.body;

      if (!title || !category || !priority) {
        throw new ValidationError(req.t('errors.validation_error'));
      }

      const task = new Task({
        building: req.user.building,
        title,
        description,
        category,
        priority,
        apartment,
        dueDate,
        status: 'pending',
        createdBy: req.user._id
      });

      await task.save();

      logger.info(`Task created: ${title}`);

      res.status(201).json(
        new ApiResponse(
          201,
          task,
          req.t('success.created')
        )
      );
    } catch (error) {
      next(error);
    }
  }

  // Assign task
  async assignTask(req, res, next) {
    try {
      const { taskId } = req.params;
      const { assignedTo } = req.body;

      if (!assignedTo) {
        throw new ValidationError(req.t('errors.validation_error'));
      }

      const task = await Task.findByIdAndUpdate(
        taskId,
        { assignedTo, status: 'assigned' },
        { new: true }
      ).populate('assignedTo', 'name');

      if (!task) {
        throw new NotFoundError(req.t('errors.not_found'));
      }

      logger.info(`Task assigned: ${taskId} to ${assignedTo}`);

      res.status(200).json(
        new ApiResponse(
          200,
          task,
          req.t('task.assigned')
        )
      );
    } catch (error) {
      next(error);
    }
  }

  // Update task status
  async updateTaskStatus(req, res, next) {
    try {
      const { taskId } = req.params;
      const { status } = req.body;

      if (!status) {
        throw new ValidationError(req.t('errors.validation_error'));
      }

      const task = await Task.findByIdAndUpdate(
        taskId,
        { status },
        { new: true }
      );

      if (!task) {
        throw new NotFoundError(req.t('errors.not_found'));
      }

      logger.info(`Task status updated: ${taskId} to ${status}`);

      res.status(200).json(
        new ApiResponse(
          200,
          task,
          req.t('success.updated')
        )
      );
    } catch (error) {
      next(error);
    }
  }

  // Submit task for approval
  async submitTask(req, res, next) {
    try {
      const { taskId } = req.params;

      const task = await Task.findByIdAndUpdate(
        taskId,
        { status: 'submitted_for_approval' },
        { new: true }
      );

      if (!task) {
        throw new NotFoundError(req.t('errors.not_found'));
      }

      logger.info(`Task submitted: ${taskId}`);

      res.status(200).json(
        new ApiResponse(
          200,
          task,
          req.t('task.submitted')
        )
      );
    } catch (error) {
      next(error);
    }
  }

  // Approve task
  async approveTask(req, res, next) {
    try {
      const { taskId } = req.params;

      const task = await Task.findByIdAndUpdate(
        taskId,
        { 
          status: 'completed',
          approvedBy: req.user._id,
          approvedAt: new Date()
        },
        { new: true }
      );

      if (!task) {
        throw new NotFoundError(req.t('errors.not_found'));
      }

      logger.info(`Task approved: ${taskId}`);

      res.status(200).json(
        new ApiResponse(
          200,
          task,
          req.t('task.completed')
        )
      );
    } catch (error) {
      next(error);
    }
  }

  // Reject task
  async rejectTask(req, res, next) {
    try {
      const { taskId } = req.params;
      const { reason } = req.body;

      if (!reason) {
        throw new ValidationError(req.t('errors.validation_error'));
      }

      const task = await Task.findByIdAndUpdate(
        taskId,
        {
          status: 'rejected',
          lastRejectionReason: reason,
          $inc: { rejectionCount: 1 }
        },
        { new: true }
      );

      if (!task) {
        throw new NotFoundError(req.t('errors.not_found'));
      }

      logger.info(`Task rejected: ${taskId}`);

      res.status(200).json(
        new ApiResponse(
          200,
          task,
          req.t('task.rejected')
        )
      );
    } catch (error) {
      next(error);
    }
  }

  // Get gardien tasks
  async getGardienTasks(req, res, next) {
    try {
      const gardienId = req.user._id;

      const tasks = await Task.find({ assignedTo: gardienId })
        .populate('apartment', 'number')
        .populate('building', 'name')
        .sort({ createdAt: -1 });

      res.status(200).json(
        new ApiResponse(
          200,
          tasks,
          'Gardien tasks retrieved successfully'
        )
      );
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new TaskController();