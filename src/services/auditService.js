const TransactionAuditLog = require('../models/TransactionAuditLog');
const logger = require('../utils/logger');

class AuditService {
  // Log transaction
  async logTransaction(transactionData) {
    try {
      const {
        building,
        type,
        description,
        amount,
        category,
        entityType,
        entityId,
        performedBy,
        apartment,
        resident,
        previousValue,
        newValue,
        statusBefore,
        statusAfter,
        ipAddress,
        userAgent,
        notes
      } = transactionData;

      const auditLog = new TransactionAuditLog({
        building,
        type,
        description,
        amount,
        category,
        entityType,
        entityId,
        performedBy,
        apartment,
        resident,
        previousValue,
        newValue,
        statusBefore,
        statusAfter,
        ipAddress,
        userAgent,
        notes,
        transactionDate: new Date()
      });

      await auditLog.save();

      logger.info(`Audit log created: ${type} for ${entityType} ${entityId}`);

      return auditLog;
    } catch (error) {
      logger.error('Log transaction error:', error);
      throw error;
    }
  }

  // Log charge created
  async logChargeCreated(charge, performedBy, ipAddress, userAgent) {
    return this.logTransaction({
      building: charge.building,
      type: 'charge_created',
      description: `Charge created: ${charge.description}`,
      amount: charge.amount,
      category: charge.category,
      entityType: 'charge',
      entityId: charge._id,
      performedBy,
      apartment: charge.apartment,
      newValue: {
        amount: charge.amount,
        dueDate: charge.dueDate,
        status: charge.status
      },
      ipAddress,
      userAgent
    });
  }

  // Log payment received
  async logPaymentReceived(payment, performedBy, ipAddress, userAgent) {
    return this.logTransaction({
      building: payment.building,
      type: 'payment_received',
      description: `Payment received: ${payment.amount} for ${payment.category}`,
      amount: payment.amount,
      category: payment.category,
      entityType: 'payment',
      entityId: payment._id,
      performedBy,
      apartment: payment.apartment,
      resident: payment.resident,
      statusBefore: 'pending',
      statusAfter: payment.status,
      newValue: {
        amount: payment.amount,
        paymentMethod: payment.paymentMethod,
        transactionId: payment.transactionId
      },
      ipAddress,
      userAgent
    });
  }

  // Log payment failed
  async logPaymentFailed(payment, performedBy, ipAddress, userAgent) {
    return this.logTransaction({
      building: payment.building,
      type: 'payment_failed',
      description: `Payment failed: ${payment.amount} for ${payment.category}`,
      amount: payment.amount,
      category: payment.category,
      entityType: 'payment',
      entityId: payment._id,
      performedBy,
      apartment: payment.apartment,
      resident: payment.resident,
      statusBefore: 'pending',
      statusAfter: 'failed',
      notes: `Payment failed - Transaction ID: ${payment.transactionId}`,
      ipAddress,
      userAgent
    });
  }

  // Log task status change
  async logTaskStatusChange(task, oldStatus, newStatus, performedBy, ipAddress, userAgent) {
    return this.logTransaction({
      building: task.building,
      type: 'task_status_changed',
      description: `Task status changed: ${oldStatus} -> ${newStatus}`,
      category: task.category,
      entityType: 'task',
      entityId: task._id,
      performedBy,
      apartment: task.apartment,
      statusBefore: oldStatus,
      statusAfter: newStatus,
      newValue: {
        status: newStatus,
        updatedAt: new Date()
      },
      ipAddress,
      userAgent
    });
  }

  // Log budget change
  async logBudgetChange(budget, oldValue, newValue, performedBy, ipAddress, userAgent) {
    return this.logTransaction({
      building: budget.building,
      type: 'budget_updated',
      description: `Budget updated: ${budget.category} for ${budget.month}/${budget.year}`,
      category: budget.category,
      entityType: 'budget',
      entityId: budget._id,
      performedBy,
      amount: newValue.budgetedAmount,
      previousValue: {
        budgetedAmount: oldValue.budgetedAmount,
        actualSpent: oldValue.actualSpent
      },
      newValue: {
        budgetedAmount: newValue.budgetedAmount,
        actualSpent: newValue.actualSpent,
        status: newValue.status
      },
      ipAddress,
      userAgent
    });
  }

  // Get audit trail by entity
  async getAuditTrail(entityType, entityId, limit = 50) {
    try {
      const logs = await TransactionAuditLog.find({
        entityType,
        entityId
      })
        .populate('performedBy', 'name email role')
        .sort({ createdAt: -1 })
        .limit(limit);

      return logs;
    } catch (error) {
      logger.error('Get audit trail error:', error);
      throw error;
    }
  }

  // Get audit trail by building
  async getAuditTrailByBuilding(buildingId, filters = {}, limit = 100) {
    try {
      const query = { building: buildingId };

      if (filters.type) {
        query.type = filters.type;
      }
      if (filters.entityType) {
        query.entityType = filters.entityType;
      }
      if (filters.performedBy) {
        query.performedBy = filters.performedBy;
      }
      if (filters.dateFrom || filters.dateTo) {
        query.createdAt = {};
        if (filters.dateFrom) query.createdAt.$gte = new Date(filters.dateFrom);
        if (filters.dateTo) query.createdAt.$lte = new Date(filters.dateTo);
      }

      const logs = await TransactionAuditLog.find(query)
        .populate('performedBy', 'name email role')
        .populate('apartment', 'number floor')
        .populate('resident', 'name email')
        .sort({ createdAt: -1 })
        .limit(limit);

      return logs;
    } catch (error) {
      logger.error('Get audit trail by building error:', error);
      throw error;
    }
  }

  // Get transaction summary
  async getTransactionSummary(buildingId, month, year) {
    try {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0);

      const transactions = await TransactionAuditLog.find({
        building: buildingId,
        createdAt: { $gte: startDate, $lte: endDate }
      });

      const summary = {
        period: `${month}/${year}`,
        totalTransactions: transactions.length,
        byType: {},
        byEntityType: {},
        totalAmount: 0
      };

      transactions.forEach(t => {
        // Group by type
        summary.byType[t.type] = (summary.byType[t.type] || 0) + 1;

        // Group by entity type
        summary.byEntityType[t.entityType] = (summary.byEntityType[t.entityType] || 0) + 1;

        // Sum amounts
        summary.totalAmount += t.amount || 0;
      });

      return summary;
    } catch (error) {
      logger.error('Get transaction summary error:', error);
      throw error;
    }
  }

  // Generate audit report
  async generateAuditReport(buildingId, startDate, endDate) {
    try {
      const logs = await TransactionAuditLog.find({
        building: buildingId,
        transactionDate: {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        }
      })
        .populate('performedBy', 'name email role')
        .sort({ createdAt: -1 });

      const report = {
        period: {
          start: startDate,
          end: endDate
        },
        totalTransactions: logs.length,
        transactions: logs,
        statistics: this._calculateAuditStatistics(logs)
      };

      return report;
    } catch (error) {
      logger.error('Generate audit report error:', error);
      throw error;
    }
  }

  // Get user activity
  async getUserActivity(userId, limit = 50) {
    try {
      const logs = await TransactionAuditLog.find({
        performedBy: userId
      })
        .populate('building', 'name')
        .sort({ createdAt: -1 })
        .limit(limit);

      return logs;
    } catch (error) {
      logger.error('Get user activity error:', error);
      throw error;
    }
  }

  // Helper: Calculate statistics
  _calculateAuditStatistics(logs) {
    const stats = {
      byType: {},
      byEntityType: {},
      byUser: {},
      totalAmount: 0,
      averageAmount: 0
    };

    logs.forEach(log => {
      stats.byType[log.type] = (stats.byType[log.type] || 0) + 1;
      stats.byEntityType[log.entityType] = (stats.byEntityType[log.entityType] || 0) + 1;
      stats.byUser[log.performedBy] = (stats.byUser[log.performedBy] || 0) + 1;
      stats.totalAmount += log.amount || 0;
    });

    stats.averageAmount = logs.length > 0 ? stats.totalAmount / logs.length : 0;

    return stats;
  }
}

module.exports = new AuditService();