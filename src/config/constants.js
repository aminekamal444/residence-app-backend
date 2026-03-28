// User Roles
const ROLES = {
  RESIDENT: 'resident',
  SYNDIC: 'syndic',
  GARDIEN: 'gardien'
};

// Task Status
const TASK_STATUS = {
  PENDING: 'pending',
  ASSIGNED: 'assigned',
  IN_PROGRESS: 'in_progress',
  SUBMITTED_FOR_APPROVAL: 'submitted_for_approval',
  COMPLETED: 'completed',
  PENDING_APPROVAL: 'pending_approval',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  NEEDS_REVISION: 'needs_revision'
};

// Task Categories
const TASK_CATEGORIES = {
  CLEANING: 'cleaning',
  TRASH: 'trash',
  SECURITY: 'security',
  MAINTENANCE: 'maintenance'
};

// Notification Types
const NOTIFICATION_TYPES = {
  TASK_ASSIGNED: 'task_assigned',
  TASK_STARTED: 'task_started',
  TASK_COMPLETED: 'task_completed',
  TASK_APPROVED: 'task_approved',
  TASK_REJECTED: 'task_rejected',
  PAYMENT_RECEIVED: 'payment_received',
  ANNOUNCEMENT: 'announcement',
  VOTE_CREATED: 'vote_created',
  COMPLAINT_RECEIVED: 'complaint_received'
};

module.exports = {
  ROLES,
  TASK_STATUS,
  TASK_CATEGORIES,
  NOTIFICATION_TYPES
};