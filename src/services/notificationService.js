const Notification = require('../models/Notification');
const User = require('../models/User');
const logger = require('../utils/logger');

class NotificationService {
  // Send notification
  async sendNotification(recipientId, notificationData) {
    try {
      const {
        type,
        title,
        body,
        data,
        priority = 'medium',
        channels = { push: true, email: true, sms: false },
        scheduledFor = null
      } = notificationData;

      // Get user preferences
      const user = await User.findById(recipientId);
      if (!user) {
        throw new Error('User not found');
      }

      // Create notification
      const notification = new Notification({
        recipient: recipientId,
        building: user.building,
        type,
        title,
        body,
        data,
        priority,
        channels,
        scheduledFor,
        status: scheduledFor ? 'pending' : 'sent',
        userPreferences: user.notificationPreferences,
        deliveryStatus: {
          push: { sent: false },
          email: { sent: false },
          sms: { sent: false }
        }
      });

      await notification.save();

      // Send immediately if not scheduled
      if (!scheduledFor) {
        await this._deliverNotification(notification);
      }

      logger.info(`Notification created: ${type} for user ${recipientId}`);

      return notification;
    } catch (error) {
      logger.error('Send notification error:', error);
      throw error;
    }
  }

  // Send to multiple users
  async broadcastNotification(userIds, notificationData) {
    try {
      const notifications = [];

      for (const userId of userIds) {
        const notification = await this.sendNotification(userId, notificationData);
        notifications.push(notification);
      }

      logger.info(`Broadcast notification sent to ${userIds.length} users`);

      return notifications;
    } catch (error) {
      logger.error('Broadcast notification error:', error);
      throw error;
    }
  }

  // Send to role
  async notifyRole(role, buildingId, notificationData) {
    try {
      const users = await User.find({
        role,
        building: buildingId,
        status: 'active'
      });

      const userIds = users.map(u => u._id);
      const notifications = await this.broadcastNotification(userIds, notificationData);

      logger.info(`Notification sent to all ${role} in building ${buildingId}`);

      return notifications;
    } catch (error) {
      logger.error('Notify role error:', error);
      throw error;
    }
  }

  // Get user notifications
  async getUserNotifications(userId, limit = 20, status = null) {
    try {
      const query = { recipient: userId };

      if (status) {
        query.status = status;
      }

      const notifications = await Notification.find(query)
        .sort({ createdAt: -1 })
        .limit(limit);

      return notifications;
    } catch (error) {
      logger.error('Get user notifications error:', error);
      throw error;
    }
  }

  // Mark notification as read
  async markAsRead(notificationId) {
    try {
      const notification = await Notification.findByIdAndUpdate(
        notificationId,
        { status: 'read', readAt: new Date() },
        { new: true }
      );

      return notification;
    } catch (error) {
      logger.error('Mark as read error:', error);
      throw error;
    }
  }

  // Mark all as read
  async markAllAsRead(userId) {
    try {
      const result = await Notification.updateMany(
        { recipient: userId, status: { $ne: 'read' } },
        { status: 'read', readAt: new Date() }
      );

      logger.info(`Marked ${result.modifiedCount} notifications as read for user ${userId}`);

      return result;
    } catch (error) {
      logger.error('Mark all as read error:', error);
      throw error;
    }
  }

  // Archive notification
  async archiveNotification(notificationId) {
    try {
      const notification = await Notification.findByIdAndUpdate(
        notificationId,
        { status: 'archived', archivedAt: new Date() },
        { new: true }
      );

      return notification;
    } catch (error) {
      logger.error('Archive notification error:', error);
      throw error;
    }
  }

  // Get unread count
  async getUnreadCount(userId) {
    try {
      const count = await Notification.countDocuments({
        recipient: userId,
        status: { $nin: ['read', 'archived'] }
      });

      return count;
    } catch (error) {
      logger.error('Get unread count error:', error);
      throw error;
    }
  }

  // Send payment reminder
  async sendPaymentReminder(chargeId, daysUntilDue) {
    try {
      const Charge = require('../models/Charge');
      const charge = await Charge.findById(chargeId)
        .populate('apartment')
        .populate('building');

      if (!charge) throw new Error('Charge not found');

      const resident = charge.apartment.resident;

      const notificationData = {
        type: daysUntilDue === 0 ? 'charge_due_today' : 'charge_due_soon',
        title: daysUntilDue === 0 ? '💳 Payment Due Today' : '⏰ Payment Due Soon',
        body: `€${charge.amount} due${daysUntilDue > 0 ? ` in ${daysUntilDue} days` : ' today'}`,
        data: {
          chargeId: charge._id,
          amount: charge.amount,
          dueDate: charge.dueDate
        },
        priority: daysUntilDue === 0 ? 'high' : 'medium',
        channels: { push: true, email: true, sms: true }
      };

      await this.sendNotification(resident, notificationData);

      logger.info(`Payment reminder sent for charge ${chargeId}`);
    } catch (error) {
      logger.error('Send payment reminder error:', error);
      throw error;
    }
  }

  // Send task assignment
  async sendTaskAssignment(taskId, gardenId) {
    try {
      const Task = require('../models/Task');
      const task = await Task.findById(taskId);

      if (!task) throw new Error('Task not found');

      const notificationData = {
        type: task.priority === 'urgent' ? 'task_assigned_urgent' : 'task_assigned',
        title: task.priority === 'urgent' ? '🚨 URGENT Task Assigned' : '🔨 New Task Assigned',
        body: task.title,
        data: {
          taskId: task._id,
          priority: task.priority,
          dueDate: task.dueDate
        },
        priority: task.priority === 'urgent' ? 'critical' : 'high',
        channels: { push: true, email: true, sms: task.priority === 'urgent' }
      };

      await this.sendNotification(gardenId, notificationData);

      logger.info(`Task assignment notification sent for task ${taskId}`);
    } catch (error) {
      logger.error('Send task assignment error:', error);
      throw error;
    }
  }

  // Send complaint status update
  async sendComplaintStatusUpdate(complaintId, newStatus) {
    try {
      const Complaint = require('../models/Complaint');
      const complaint = await Complaint.findById(complaintId);

      if (!complaint) throw new Error('Complaint not found');

      const notificationData = {
        type: 'complaint_status_update',
        title: '📝 Complaint Status Updated',
        body: `Your complaint status: ${newStatus}`,
        data: {
          complaintId: complaint._id,
          status: newStatus
        },
        priority: 'medium',
        channels: { push: true, email: true }
      };

      await this.sendNotification(complaint.resident, notificationData);

      logger.info(`Complaint status update sent for complaint ${complaintId}`);
    } catch (error) {
      logger.error('Send complaint status update error:', error);
      throw error;
    }
  }

  // Send announcement
  async sendAnnouncement(announcementId) {
    try {
      const Announcement = require('../models/Announcement');
      const announcement = await Announcement.findById(announcementId);

      if (!announcement) throw new Error('Announcement not found');

      const notificationData = {
        type: 'announcement',
        title: `📢 ${announcement.type === 'emergency' ? '🚨 EMERGENCY' : 'Announcement'}`,
        body: announcement.title,
        data: {
          announcementId: announcement._id,
          type: announcement.type
        },
        priority: announcement.type === 'emergency' ? 'critical' : announcement.priority,
        channels: { 
          push: true, 
          email: true, 
          sms: announcement.type === 'emergency' 
        }
      };

      // Send to target audience
      if (announcement.targetAudience === 'all') {
        const Building = require('../models/Building');
        const building = await Building.findById(announcement.building);
        
        const residents = await User.find({
          building: announcement.building,
          role: { $in: ['resident', 'syndic', 'gardien'] }
        });

        await this.broadcastNotification(
          residents.map(r => r._id),
          notificationData
        );
      } else {
        // Send to specific role
        await this.notifyRole(announcement.targetAudience, announcement.building, notificationData);
      }

      logger.info(`Announcement sent for ${announcementId}`);
    } catch (error) {
      logger.error('Send announcement error:', error);
      throw error;
    }
  }

  // Helper: Deliver notification
  async _deliverNotification(notification) {
    try {
      // Simulate delivery (real implementation would integrate with Firebase, Twilio, etc.)

      if (notification.channels.push) {
        notification.deliveryStatus.push.sent = true;
        notification.deliveryStatus.push.sentAt = new Date();
      }

      if (notification.channels.email) {
        notification.deliveryStatus.email.sent = true;
        notification.deliveryStatus.email.sentAt = new Date();
      }

      if (notification.channels.sms) {
        notification.deliveryStatus.sms.sent = true;
        notification.deliveryStatus.sms.sentAt = new Date();
      }

      notification.status = 'sent';
      await notification.save();

      logger.info(`Notification delivered: ${notification._id}`);
    } catch (error) {
      logger.error('Deliver notification error:', error);
      notification.status = 'failed';
      await notification.save();
    }
  }

  // Delete old notifications (older than 30 days)
  async deleteOldNotifications() {
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      const result = await Notification.deleteMany({
        createdAt: { $lt: thirtyDaysAgo },
        status: { $in: ['read', 'archived'] }
      });

      logger.info(`Deleted ${result.deletedCount} old notifications`);

      return result;
    } catch (error) {
      logger.error('Delete old notifications error:', error);
      throw error;
    }
  }
}

module.exports = new NotificationService();