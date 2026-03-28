const Task = require('../models/Task');
const TaskPhoto = require('../models/TaskPhoto');
const { TASK_STATUS } = require('../config/constants');
const { NotFoundError, ValidationError, UnauthorizedError } = require('../utils/errors');
const logger = require('../utils/logger');

class TaskService {
  // Create task
  async createTask(taskData, userId) {
    try {
      const { title, description, category, priority, building, apartment, dueDate, assignedTo } = taskData;

      const task = new Task({
        title,
        description,
        category,
        priority,
        building,
        apartment,
        dueDate,
        assignedTo,
        createdBy: userId,
        status: TASK_STATUS.PENDING
      });

      await task.save();
      await task.populate(['assignedTo', 'createdBy', 'apartment']);

      logger.info(`Task created: ${task._id}`);

      return task;
    } catch (error) {
      logger.error('Create task error:', error);
      throw error;
    }
  }

  // Get task by ID
  async getTaskById(taskId) {
    try {
      const task = await Task.findById(taskId)
        .populate('building', 'name address')
        .populate('apartment', 'number floor')
        .populate('assignedTo', 'name email phone')
        .populate('createdBy', 'name email')
        .populate('photos');

      if (!task) {
        throw new NotFoundError('Task not found');
      }

      return task;
    } catch (error) {
      logger.error('Get task error:', error);
      throw error;
    }
  }

  // Get all tasks by building
  async getTasksByBuilding(buildingId, filters = {}) {
    try {
      const query = { building: buildingId };

      // Apply filters
      if (filters.status) {
        query.status = filters.status;
      }
      if (filters.assignedTo) {
        query.assignedTo = filters.assignedTo;
      }
      if (filters.category) {
        query.category = filters.category;
      }
      if (filters.priority) {
        query.priority = filters.priority;
      }

      const tasks = await Task.find(query)
        .populate('assignedTo', 'name email')
        .populate('apartment', 'number floor')
        .sort({ dueDate: 1 });

      return tasks;
    } catch (error) {
      logger.error('Get tasks by building error:', error);
      throw error;
    }
  }

  // Get tasks assigned to user
  async getTasksAssignedToUser(userId, status = null) {
    try {
      const query = { assignedTo: userId };
      
      if (status) {
        query.status = status;
      }

      const tasks = await Task.find(query)
        .populate('building', 'name address')
        .populate('apartment', 'number floor')
        .populate('photos')
        .sort({ dueDate: 1 });

      return tasks;
    } catch (error) {
      logger.error('Get user tasks error:', error);
      throw error;
    }
  }

  // Update task status
  async updateTaskStatus(taskId, newStatus, userId) {
    try {
      const validStatuses = Object.values(TASK_STATUS);
      
      if (!validStatuses.includes(newStatus)) {
        throw new ValidationError('Invalid task status');
      }

      const task = await Task.findById(taskId);
      if (!task) {
        throw new NotFoundError('Task not found');
      }

      const oldStatus = task.status;
      task.status = newStatus;

      // Set completion timestamp if marked as done
      if (newStatus === TASK_STATUS.COMPLETED) {
        task.completedAt = new Date();
      }

      // Set started timestamp if marked as in progress
      if (newStatus === TASK_STATUS.IN_PROGRESS && !task.startedAt) {
        task.startedAt = new Date();
      }

      await task.save();

      logger.info(`Task status updated: ${taskId} from ${oldStatus} to ${newStatus}`);

      return task;
    } catch (error) {
      logger.error('Update task status error:', error);
      throw error;
    }
  }

  // Assign task to gardien
  async assignTaskToGardien(taskId, gardenId) {
    try {
      const task = await Task.findById(taskId);
      if (!task) {
        throw new NotFoundError('Task not found');
      }

      task.assignedTo = gardenId;
      task.status = TASK_STATUS.ASSIGNED;
      await task.save();

      logger.info(`Task ${taskId} assigned to gardien ${gardenId}`);

      return task;
    } catch (error) {
      logger.error('Assign task error:', error);
      throw error;
    }
  }

  // Submit task for approval
  async submitTaskForApproval(taskId, photos, notes) {
    try {
      const task = await Task.findById(taskId);
      if (!task) {
        throw new NotFoundError('Task not found');
      }

      // Validate photos exist
      if (!photos || photos.length === 0) {
        throw new ValidationError('At least one photo required for approval');
      }

      task.photos = photos;
      task.gardienNote = notes;
      task.status = TASK_STATUS.SUBMITTED_FOR_APPROVAL;
      await task.save();

      logger.info(`Task ${taskId} submitted for approval`);

      return task;
    } catch (error) {
      logger.error('Submit task error:', error);
      throw error;
    }
  }

  // Approve task
  async approveTask(taskId, syndicComment, userId) {
    try {
      const task = await Task.findById(taskId);
      if (!task) {
        throw new NotFoundError('Task not found');
      }

      task.status = TASK_STATUS.COMPLETED;
      task.syndicComment = syndicComment;
      task.completedAt = new Date();

      // Add to approval history
      task.approvalHistory.push({
        approvedBy: userId,
        approvedAt: new Date(),
        status: TASK_STATUS.COMPLETED,
        comment: syndicComment
      });

      await task.save();

      logger.info(`Task ${taskId} approved by syndic`);

      return task;
    } catch (error) {
      logger.error('Approve task error:', error);
      throw error;
    }
  }

  // Reject task
  async rejectTask(taskId, rejectionReason, userId) {
    try {
      const task = await Task.findById(taskId);
      if (!task) {
        throw new NotFoundError('Task not found');
      }

      task.status = TASK_STATUS.REJECTED;
      task.rejectionCount += 1;
      task.lastRejectionReason = rejectionReason;
      task.syndicComment = rejectionReason;

      // Add to approval history
      task.approvalHistory.push({
        approvedBy: userId,
        approvedAt: new Date(),
        status: TASK_STATUS.REJECTED,
        comment: rejectionReason
      });

      await task.save();

      logger.info(`Task ${taskId} rejected (rejection count: ${task.rejectionCount})`);

      return task;
    } catch (error) {
      logger.error('Reject task error:', error);
      throw error;
    }
  }

  // Get overdue tasks
  async getOverdueTasks(buildingId) {
    try {
      const today = new Date();
      
      const tasks = await Task.find({
        building: buildingId,
        dueDate: { $lt: today },
        status: { $ne: TASK_STATUS.COMPLETED }
      })
        .populate('assignedTo', 'name email')
        .populate('apartment', 'number floor')
        .sort({ dueDate: 1 });

      return tasks;
    } catch (error) {
      logger.error('Get overdue tasks error:', error);
      throw error;
    }
  }

  // Get task statistics
  async getTaskStatistics(buildingId) {
    try {
      const stats = {
        total: await Task.countDocuments({ building: buildingId }),
        pending: await Task.countDocuments({ building: buildingId, status: TASK_STATUS.PENDING }),
        assigned: await Task.countDocuments({ building: buildingId, status: TASK_STATUS.ASSIGNED }),
        inProgress: await Task.countDocuments({ building: buildingId, status: TASK_STATUS.IN_PROGRESS }),
        submitted: await Task.countDocuments({ building: buildingId, status: TASK_STATUS.SUBMITTED_FOR_APPROVAL }),
        completed: await Task.countDocuments({ building: buildingId, status: TASK_STATUS.COMPLETED }),
        rejected: await Task.countDocuments({ building: buildingId, status: TASK_STATUS.REJECTED }),
        overdue: await Task.countDocuments({
          building: buildingId,
          dueDate: { $lt: new Date() },
          status: { $ne: TASK_STATUS.COMPLETED }
        })
      };

      return stats;
    } catch (error) {
      logger.error('Get task statistics error:', error);
      throw error;
    }
  }

  // Mark gardien unavailable
  async markGardienUnavailable(taskId, reason) {
    try {
      const task = await Task.findById(taskId);
      if (!task) {
        throw new NotFoundError('Task not found');
      }

      task.gardienUnavailable = true;
      task.unavailabilityReason = reason;
      task.status = TASK_STATUS.PENDING; // Reset to pending

      await task.save();

      logger.info(`Task ${taskId} marked - gardien unavailable`);

      return task;
    } catch (error) {
      logger.error('Mark gardien unavailable error:', error);
      throw error;
    }
  }

  // Delete task
  async deleteTask(taskId) {
    try {
      // Delete associated photos
      await TaskPhoto.deleteMany({ task: taskId });

      const task = await Task.findByIdAndDelete(taskId);
      if (!task) {
        throw new NotFoundError('Task not found');
      }

      logger.info(`Task deleted: ${taskId}`);

      return { message: 'Task deleted successfully' };
    } catch (error) {
      logger.error('Delete task error:', error);
      throw error;
    }
  }
}

module.exports = new TaskService();