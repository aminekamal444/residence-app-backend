const express = require('express');
const router = express.Router();

const Task = require('../models/Task');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const { ValidationError, NotFoundError } = require('../utils/errors');

// ─── GET / — get all tasks in this building ───────────────────────────────
router.get('/', authMiddleware, async (req, res, next) => {
  try {
    const { status, priority, page = 1, limit = 10 } = req.query;
    const query = { building: req.user.building };
    if (status) query.status = status;
    if (priority) query.priority = priority;

    const tasks = await Task.find(query)
      .populate('apartment', 'number')
      .populate('assignedTo', 'name')
      .skip((page - 1) * limit).limit(Number(limit))
      .sort({ createdAt: -1 });

    const total = await Task.countDocuments(query);
    res.json({ success: true, message: 'Tasks retrieved', data: { tasks, total, pages: Math.ceil(total / limit) } });
  } catch (error) {
    next(error);
  }
});

// ─── POST / — create a new task (syndic only) ─────────────────────────────
router.post('/', authMiddleware, roleMiddleware(['syndic']), async (req, res, next) => {
  try {
    const { title, description, category, priority, apartment, dueDate } = req.body;
    if (!title || !category || !priority) throw new ValidationError('title, category and priority are required');

    const task = new Task({
      building: req.user.building,
      title, description, category, priority, apartment, dueDate,
      status: 'pending',
      createdBy: req.user._id
    });
    await task.save();

    res.status(201).json({ success: true, message: 'Task created', data: task });
  } catch (error) {
    next(error);
  }
});

// ─── GET /gardien/my-tasks — get tasks assigned to this gardien ───────────
router.get('/gardien/my-tasks', authMiddleware, roleMiddleware(['gardien']), async (req, res, next) => {
  try {
    const tasks = await Task.find({ assignedTo: req.user._id })
      .populate('apartment', 'number')
      .populate('building', 'name')
      .sort({ createdAt: -1 });
    res.json({ success: true, message: 'Tasks retrieved', data: tasks });
  } catch (error) {
    next(error);
  }
});

// ─── POST /:taskId/assign — assign task to a gardien (syndic only) ─────────
router.post('/:taskId/assign', authMiddleware, roleMiddleware(['syndic']), async (req, res, next) => {
  try {
    const { assignedTo } = req.body;
    if (!assignedTo) throw new ValidationError('assignedTo is required');

    const task = await Task.findByIdAndUpdate(
      req.params.taskId,
      { assignedTo, status: 'assigned' },
      { new: true }
    ).populate('assignedTo', 'name');

    if (!task) throw new NotFoundError('Task not found');
    res.json({ success: true, message: 'Task assigned', data: task });
  } catch (error) {
    next(error);
  }
});

// ─── PUT /:taskId/status — update task status ─────────────────────────────
router.put('/:taskId/status', authMiddleware, async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!status) throw new ValidationError('status is required');

    const task = await Task.findByIdAndUpdate(req.params.taskId, { status }, { new: true });
    if (!task) throw new NotFoundError('Task not found');
    res.json({ success: true, message: 'Task status updated', data: task });
  } catch (error) {
    next(error);
  }
});

// ─── POST /:taskId/submit — gardien submits task for approval ─────────────
router.post('/:taskId/submit', authMiddleware, roleMiddleware(['gardien']), async (req, res, next) => {
  try {
    const task = await Task.findByIdAndUpdate(
      req.params.taskId,
      { status: 'submitted_for_approval' },
      { new: true }
    );
    if (!task) throw new NotFoundError('Task not found');
    res.json({ success: true, message: 'Task submitted for approval', data: task });
  } catch (error) {
    next(error);
  }
});

// ─── POST /:taskId/approve — syndic approves the task ─────────────────────
router.post('/:taskId/approve', authMiddleware, roleMiddleware(['syndic']), async (req, res, next) => {
  try {
    const task = await Task.findByIdAndUpdate(
      req.params.taskId,
      { status: 'completed', approvedBy: req.user._id, approvedAt: new Date() },
      { new: true }
    );
    if (!task) throw new NotFoundError('Task not found');
    res.json({ success: true, message: 'Task approved', data: task });
  } catch (error) {
    next(error);
  }
});

// ─── POST /:taskId/reject — syndic rejects the task ──────────────────────
router.post('/:taskId/reject', authMiddleware, roleMiddleware(['syndic']), async (req, res, next) => {
  try {
    const { reason } = req.body;
    if (!reason) throw new ValidationError('reason is required');

    const task = await Task.findByIdAndUpdate(
      req.params.taskId,
      { status: 'rejected', lastRejectionReason: reason, $inc: { rejectionCount: 1 } },
      { new: true }
    );
    if (!task) throw new NotFoundError('Task not found');
    res.json({ success: true, message: 'Task rejected', data: task });
  } catch (error) {
    next(error);
  }
});

// ─── GET /:taskId — get one task by ID ───────────────────────────────────
router.get('/:taskId', authMiddleware, async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.taskId)
      .populate('apartment').populate('assignedTo').populate('approvedBy');
    if (!task) throw new NotFoundError('Task not found');
    res.json({ success: true, message: 'Task retrieved', data: task });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
