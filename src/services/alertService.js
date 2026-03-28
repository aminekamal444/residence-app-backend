const Charge = require('../models/Charge');
const Budget = require('../models/Budget');
const Payment = require('../models/Payment');
const logger = require('../utils/logger');

class AlertService {
  // Check overdue payments
  async checkOverduePayments(buildingId) {
    try {
      const today = new Date();

      const overdueCharges = await Charge.find({
        building: buildingId,
        dueDate: { $lt: today },
        status: { $nin: ['paid', 'cancelled'] }
      }).populate('apartment', 'number floor');

      const alerts = overdueCharges.map(charge => ({
        type: 'overdue_payment',
        severity: this._calculatePaymentSeverity(charge.dueDate),
        buildingId: charge.building,
        apartmentId: charge.apartment._id,
        chargeId: charge._id,
        amount: charge.amount,
        daysOverdue: this._calculateDaysOverdue(charge.dueDate),
        message: `Payment overdue for ${charge.daysOverdue} days: ${charge.apartment.number} - €${charge.amount}`,
        createdAt: new Date()
      }));

      logger.info(`Overdue payment alerts generated: ${alerts.length}`);

      return alerts;
    } catch (error) {
      logger.error('Check overdue payments error:', error);
      throw error;
    }
  }

  // Check budget thresholds
  async checkBudgetThresholds(buildingId, year, month) {
    try {
      const budgets = await Budget.find({
        building: buildingId,
        year,
        month
      });

      const alerts = [];

      budgets.forEach(budget => {
        const percentageUsed = (budget.actualAmount / budget.budgetedAmount) * 100;

        if (budget.actualAmount > budget.budgetedAmount) {
          // Budget exceeded
          alerts.push({
            type: 'budget_exceeded',
            severity: 'critical',
            buildingId: budget.building,
            budgetId: budget._id,
            category: budget.category,
            budgeted: budget.budgetedAmount,
            spent: budget.actualAmount,
            overspend: budget.actualAmount - budget.budgetedAmount,
            message: `${budget.category} budget EXCEEDED by €${Math.round(budget.actualAmount - budget.budgetedAmount)}`,
            createdAt: new Date()
          });
        } else if (percentageUsed >= 80 && percentageUsed < 100) {
          // Budget warning
          alerts.push({
            type: 'budget_warning',
            severity: 'high',
            buildingId: budget.building,
            budgetId: budget._id,
            category: budget.category,
            budgeted: budget.budgetedAmount,
            spent: budget.actualAmount,
            percentageUsed: Math.round(percentageUsed),
            message: `${budget.category} budget at ${Math.round(percentageUsed)}% - ${Math.round(budget.budgetedAmount - budget.actualAmount)} remaining`,
            createdAt: new Date()
          });
        }
      });

      logger.info(`Budget threshold alerts generated: ${alerts.length}`);

      return alerts;
    } catch (error) {
      logger.error('Check budget thresholds error:', error);
      throw error;
    }
  }

  // Check cash flow
  async checkCashFlow(buildingId, month, year) {
    try {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0);

      // Get inflows
      const payments = await Payment.find({
        building: buildingId,
        paidDate: { $gte: startDate, $lte: endDate },
        status: 'completed'
      });

      const totalInflows = payments.reduce((sum, p) => sum + p.amount, 0);

      const alerts = [];

      // Alert if low cash flow
      if (totalInflows < 5000) {
        alerts.push({
          type: 'low_cash_flow',
          severity: 'high',
          buildingId,
          period: `${month}/${year}`,
          cashFlow: totalInflows,
          message: `Low cash flow for ${month}/${year}: €${totalInflows}`,
          createdAt: new Date()
        });
      }

      logger.info(`Cash flow alerts generated: ${alerts.length}`);

      return alerts;
    } catch (error) {
      logger.error('Check cash flow error:', error);
      throw error;
    }
  }

  // Generate all alerts for building
  async generateAlerts(buildingId, year, month) {
    try {
      const allAlerts = [];

      // Get overdue payment alerts
      const overdueAlerts = await this.checkOverduePayments(buildingId);
      allAlerts.push(...overdueAlerts);

      // Get budget alerts
      const budgetAlerts = await this.checkBudgetThresholds(buildingId, year, month);
      allAlerts.push(...budgetAlerts);

      // Get cash flow alerts
      const cashFlowAlerts = await this.checkCashFlow(buildingId, month, year);
      allAlerts.push(...cashFlowAlerts);

      // Sort by severity
      const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      allAlerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

      logger.info(`Total alerts generated for building ${buildingId}: ${allAlerts.length}`);

      return allAlerts;
    } catch (error) {
      logger.error('Generate alerts error:', error);
      throw error;
    }
  }

  // Get active alerts
  async getActiveAlerts(buildingId) {
    try {
      const today = new Date();
      const currentYear = today.getFullYear();
      const currentMonth = today.getMonth() + 1;

      const alerts = await this.generateAlerts(buildingId, currentYear, currentMonth);

      return alerts.filter(alert => alert.severity !== 'low');
    } catch (error) {
      logger.error('Get active alerts error:', error);
      throw error;
    }
  }

  // Check for payment reminders
  async checkPaymentReminders(buildingId) {
    try {
      const today = new Date();
      const threeDaysLater = new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000);

      // Find charges due in next 3 days
      const upcomingCharges = await Charge.find({
        building: buildingId,
        dueDate: { $gte: today, $lte: threeDaysLater },
        status: 'pending'
      }).populate('apartment', 'number');

      const reminders = upcomingCharges.map(charge => ({
        type: 'payment_due_soon',
        severity: 'medium',
        buildingId: charge.building,
        chargeId: charge._id,
        apartmentId: charge.apartment._id,
        amount: charge.amount,
        dueDate: charge.dueDate,
        daysUntilDue: Math.ceil((charge.dueDate - today) / (1000 * 60 * 60 * 24)),
        message: `Payment due in ${Math.ceil((charge.dueDate - today) / (1000 * 60 * 60 * 24))} days: €${charge.amount}`,
        createdAt: new Date()
      }));

      logger.info(`Payment reminders generated: ${reminders.length}`);

      return reminders;
    } catch (error) {
      logger.error('Check payment reminders error:', error);
      throw error;
    }
  }

  // Alert on high rejection rate
  async checkTaskRejectionRate(buildingId) {
    try {
      // This would need Task model integration
      // For now, return empty to show structure

      const alerts = [];

      logger.info(`Task rejection rate alerts generated: ${alerts.length}`);

      return alerts;
    } catch (error) {
      logger.error('Check task rejection rate error:', error);
      throw error;
    }
  }

  // Helper: Calculate payment severity
  _calculatePaymentSeverity(dueDate) {
    const today = new Date();
    const daysOverdue = Math.floor((today - dueDate) / (1000 * 60 * 60 * 24));

    if (daysOverdue > 30) return 'critical';
    if (daysOverdue > 14) return 'high';
    if (daysOverdue > 7) return 'medium';
    return 'low';
  }

  // Helper: Calculate days overdue
  _calculateDaysOverdue(dueDate) {
    const today = new Date();
    return Math.floor((today - dueDate) / (1000 * 60 * 60 * 24));
  }

  // Alert summary
  async getAlertSummary(buildingId) {
    try {
      const today = new Date();
      const year = today.getFullYear();
      const month = today.getMonth() + 1;

      const alerts = await this.generateAlerts(buildingId, year, month);
      const reminders = await this.checkPaymentReminders(buildingId);

      const summary = {
        totalAlerts: alerts.length,
        critical: alerts.filter(a => a.severity === 'critical').length,
        high: alerts.filter(a => a.severity === 'high').length,
        medium: alerts.filter(a => a.severity === 'medium').length,
        low: alerts.filter(a => a.severity === 'low').length,
        paymentReminders: reminders.length,
        alerts: alerts.slice(0, 10), // Top 10 alerts
        reminders: reminders.slice(0, 5) // Top 5 reminders
      };

      return summary;
    } catch (error) {
      logger.error('Get alert summary error:', error);
      throw error;
    }
  }
}

module.exports = new AlertService();