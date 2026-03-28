const FinancialReport = require('../models/FinancialReport');
const Payment = require('../models/Payment');
const Charge = require('../models/Charge');
const Budget = require('../models/Budget');
const Apartment = require('../models/Apartment');
const { NotFoundError, ValidationError } = require('../utils/errors');
const logger = require('../utils/logger');

class ReportService {
  // Generate monthly financial report
  async generateMonthlyReport(buildingId, year, month, userId) {
    try {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0);

      // Get revenue data
      const payments = await Payment.find({
        building: buildingId,
        paidDate: { $gte: startDate, $lte: endDate },
        status: 'completed'
      });

      const revenueByCategory = this._groupByCategory(payments);
      const totalRevenue = payments.reduce((sum, p) => sum + p.amount, 0);

      // Get charge data
      const charges = await Charge.find({
        building: buildingId,
        createdAt: { $gte: startDate, $lte: endDate }
      });

      const totalCharges = charges.length;
      const paidCharges = charges.filter(c => c.status === 'paid').length;
      const pendingCharges = charges.filter(c => c.status === 'pending').length;
      const overdueCharges = charges.filter(c => c.status === 'overdue').length;

      // Get apartment status
      const apartments = await Apartment.find({ building: buildingId });
      const apartmentStatus = {
        paid: paidCharges,
        pending: pendingCharges,
        overdue: overdueCharges
      };

      // Get previous month data for comparison
      const previousStartDate = new Date(year, month - 2, 1);
      const previousEndDate = new Date(year, month - 1, 0);
      
      const previousPayments = await Payment.find({
        building: buildingId,
        paidDate: { $gte: previousStartDate, $lte: previousEndDate },
        status: 'completed'
      });

      const previousRevenue = previousPayments.reduce((sum, p) => sum + p.amount, 0);

      // Create report
      const report = new FinancialReport({
        building: buildingId,
        period: 'monthly',
        year,
        month,
        totalRevenue,
        revenueByCategory,
        totalCharges,
        apartmentStatus,
        previousPeriodRevenue: previousRevenue,
        generatedBy: userId,
        status: 'finalized',
        monthlyData: [{
          month: `${year}-${String(month).padStart(2, '0')}`,
          revenue: totalRevenue,
          expenses: 0,
          net: totalRevenue
        }]
      });

      await report.save();

      logger.info(`Monthly report generated for building ${buildingId}, ${month}/${year}`);

      return report;
    } catch (error) {
      logger.error('Generate monthly report error:', error);
      throw error;
    }
  }

  // Get financial dashboard data
  async getFinancialDashboard(buildingId) {
    try {
      const today = new Date();
      const currentYear = today.getFullYear();
      const currentMonth = today.getMonth() + 1;

      // Get current month report
      const report = await FinancialReport.findOne({
        building: buildingId,
        year: currentYear,
        month: currentMonth,
        period: 'monthly'
      });

      // Get budget data
      const budgets = await Budget.find({
        building: buildingId,
        year: currentYear,
        month: currentMonth
      });

      // Get pending charges
      const pendingCharges = await Charge.countDocuments({
        building: buildingId,
        status: 'pending'
      });

      // Get overdue charges
      const overdueCharges = await Charge.find({
        building: buildingId,
        status: 'overdue'
      });

      // Calculate metrics
      const dashboard = {
        currentMonth: {
          revenue: report?.totalRevenue || 0,
          expenses: report?.totalExpenses || 0,
          netIncome: report?.netIncome || 0,
          chargesCreated: report?.totalCharges || 0,
          paidCharges: report?.apartmentStatus.paid || 0,
          pendingCharges: report?.apartmentStatus.pending || 0,
          overdueCharges: report?.apartmentStatus.overdue || 0
        },
        budgets: budgets.map(b => ({
          category: b.category,
          budgeted: b.budgetedAmount,
          spent: b.actualAmount,
          variance: b.variance,
          status: b.status
        })),
        alerts: this._generateAlerts(report, budgets, overdueCharges),
        previousComparison: {
          revenue: report?.previousPeriodRevenue || 0,
          variance: (report?.totalRevenue || 0) - (report?.previousPeriodRevenue || 0),
          variancePercentage: report?.variancePercentage || 0
        }
      };

      return dashboard;
    } catch (error) {
      logger.error('Get financial dashboard error:', error);
      throw error;
    }
  }

  // Get revenue by category
  async getRevenueByCategory(buildingId, month, year) {
    try {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0);

      const payments = await Payment.find({
        building: buildingId,
        paidDate: { $gte: startDate, $lte: endDate },
        status: 'completed'
      });

      const revenueByCategory = {
        maintenance: 0,
        utilities: 0,
        security: 0,
        parking: 0,
        other: 0
      };

      payments.forEach(payment => {
        revenueByCategory[payment.category] += payment.amount;
      });

      return revenueByCategory;
    } catch (error) {
      logger.error('Get revenue by category error:', error);
      throw error;
    }
  }

  // Get monthly revenue trend (12 months)
  async getMonthlyRevenueTrend(buildingId, year) {
    try {
      const trend = [];

      for (let month = 1; month <= 12; month++) {
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0);

        const totalRevenue = await Payment.aggregate([
          {
            $match: {
              building: buildingId,
              paidDate: { $gte: startDate, $lte: endDate },
              status: 'completed'
            }
          },
          {
            $group: {
              _id: null,
              total: { $sum: '$amount' }
            }
          }
        ]);

        trend.push({
          month: `${year}-${String(month).padStart(2, '0')}`,
          revenue: totalRevenue[0]?.total || 0
        });
      }

      return trend;
    } catch (error) {
      logger.error('Get monthly revenue trend error:', error);
      throw error;
    }
  }

  // Get apartment payment status
  async getApartmentPaymentStatus(buildingId) {
    try {
      const apartments = await Apartment.find({ building: buildingId })
        .populate('resident', 'name email phone');

      const status = await Promise.all(
        apartments.map(async (apt) => {
          const latestCharge = await Charge.findOne({
            apartment: apt._id
          }).sort({ dueDate: -1 });

          return {
            apartment: apt.number,
            resident: apt.resident?.name || 'Vacant',
            status: latestCharge?.status || 'no_charges',
            dueDate: latestCharge?.dueDate,
            amount: latestCharge?.amount
          };
        })
      );

      return status;
    } catch (error) {
      logger.error('Get apartment payment status error:', error);
      throw error;
    }
  }

  // Get yearly revenue comparison
  async getYearlyComparison(buildingId, currentYear) {
    try {
      const previousYear = currentYear - 1;

      const currentYearRevenue = await Payment.aggregate([
        {
          $match: {
            building: buildingId,
            paidDate: {
              $gte: new Date(currentYear, 0, 1),
              $lte: new Date(currentYear, 11, 31)
            },
            status: 'completed'
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$amount' }
          }
        }
      ]);

      const previousYearRevenue = await Payment.aggregate([
        {
          $match: {
            building: buildingId,
            paidDate: {
              $gte: new Date(previousYear, 0, 1),
              $lte: new Date(previousYear, 11, 31)
            },
            status: 'completed'
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$amount' }
          }
        }
      ]);

      const current = currentYearRevenue[0]?.total || 0;
      const previous = previousYearRevenue[0]?.total || 0;
      const variance = current - previous;
      const variancePercentage = previous > 0 ? ((variance / previous) * 100).toFixed(2) : 0;

      return {
        currentYear: {
          year: currentYear,
          revenue: current
        },
        previousYear: {
          year: previousYear,
          revenue: previous
        },
        variance,
        variancePercentage
      };
    } catch (error) {
      logger.error('Get yearly comparison error:', error);
      throw error;
    }
  }

  // Get cash flow analysis
  async getCashFlowAnalysis(buildingId, month, year) {
    try {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0);

      const inflows = await Payment.aggregate([
        {
          $match: {
            building: buildingId,
            paidDate: { $gte: startDate, $lte: endDate },
            status: 'completed'
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$amount' }
          }
        }
      ]);

      return {
        period: `${month}/${year}`,
        inflows: inflows[0]?.total || 0,
        outflows: 0,
        netCashFlow: (inflows[0]?.total || 0)
      };
    } catch (error) {
      logger.error('Get cash flow analysis error:', error);
      throw error;
    }
  }

  // Helper: Group payments by category
  _groupByCategory(payments) {
    const grouped = {
      maintenance: 0,
      utilities: 0,
      security: 0,
      parking: 0,
      other: 0
    };

    payments.forEach(payment => {
      grouped[payment.category] += payment.amount;
    });

    return grouped;
  }

  // Helper: Generate alerts
  _generateAlerts(report, budgets, overdueCharges) {
    const alerts = [];

    if (overdueCharges.length > 0) {
      alerts.push({
        type: 'overdue_payments',
        severity: 'high',
        message: `${overdueCharges.length} charges are overdue`,
        count: overdueCharges.length
      });
    }

    budgets.forEach(budget => {
      if (budget.status === 'exceeded') {
        alerts.push({
          type: 'budget_exceeded',
          severity: 'high',
          message: `${budget.category} budget exceeded by ${Math.abs(budget.variance)}`,
          category: budget.category
        });
      } else if (budget.status === 'warning') {
        alerts.push({
          type: 'budget_warning',
          severity: 'medium',
          message: `${budget.category} budget at ${(budget.actualAmount / budget.budgetedAmount * 100).toFixed(0)}%`,
          category: budget.category
        });
      }
    });

    return alerts;
  }
}

module.exports = new ReportService();