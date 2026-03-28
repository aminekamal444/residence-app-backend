const reportService = require('../services/reportService');
const { ApiResponse } = require('../utils/responseFormatter');
const { ValidationError } = require('../utils/errors');
const logger = require('../utils/logger');

class ReportController {
  // Get financial dashboard
  async getFinancialDashboard(req, res, next) {
    try {
      const building = req.user.building;

      const dashboard = await reportService.getFinancialDashboard(building);

      res.status(200).json(
        new ApiResponse(
          200,
          dashboard,
          'Financial dashboard retrieved successfully'
        )
      );
    } catch (error) {
      next(error);
    }
  }

  // Generate monthly report
  async generateMonthlyReport(req, res, next) {
    try {
      const { year, month } = req.body;
      const building = req.user.building;

      if (!year || !month) {
        throw new ValidationError(req.t('errors.validation_error'));
      }

      const report = await reportService.generateMonthlyReport(
        building,
        year,
        month,
        req.user._id
      );

      logger.info(`Monthly report generated: ${month}/${year}`);

      res.status(201).json(
        new ApiResponse(
          201,
          report,
          'Monthly report generated successfully'
        )
      );
    } catch (error) {
      next(error);
    }
  }

  // Get revenue by category
  async getRevenueByCategory(req, res, next) {
    try {
      const { month, year } = req.query;
      const building = req.user.building;

      if (!month || !year) {
        throw new ValidationError(req.t('errors.validation_error'));
      }

      const revenue = await reportService.getRevenueByCategory(
        building,
        parseInt(month),
        parseInt(year)
      );

      res.status(200).json(
        new ApiResponse(
          200,
          revenue,
          'Revenue by category retrieved successfully'
        )
      );
    } catch (error) {
      next(error);
    }
  }

  // Get monthly revenue trend
  async getMonthlyRevenueTrend(req, res, next) {
    try {
      const { year } = req.query;
      const building = req.user.building;

      if (!year) {
        throw new ValidationError(req.t('errors.validation_error'));
      }

      const trend = await reportService.getMonthlyRevenueTrend(
        building,
        parseInt(year)
      );

      res.status(200).json(
        new ApiResponse(
          200,
          trend,
          'Monthly revenue trend retrieved successfully'
        )
      );
    } catch (error) {
      next(error);
    }
  }

  // Get apartment payment status
  async getApartmentPaymentStatus(req, res, next) {
    try {
      const building = req.user.building;

      const status = await reportService.getApartmentPaymentStatus(building);

      res.status(200).json(
        new ApiResponse(
          200,
          status,
          'Apartment payment status retrieved successfully'
        )
      );
    } catch (error) {
      next(error);
    }
  }

  // Get yearly comparison
  async getYearlyComparison(req, res, next) {
    try {
      const { year } = req.query;
      const building = req.user.building;

      if (!year) {
        throw new ValidationError(req.t('errors.validation_error'));
      }

      const comparison = await reportService.getYearlyComparison(
        building,
        parseInt(year)
      );

      res.status(200).json(
        new ApiResponse(
          200,
          comparison,
          'Yearly comparison retrieved successfully'
        )
      );
    } catch (error) {
      next(error);
    }
  }

  // Get cash flow analysis
  async getCashFlowAnalysis(req, res, next) {
    try {
      const { month, year } = req.query;
      const building = req.user.building;

      if (!month || !year) {
        throw new ValidationError(req.t('errors.validation_error'));
      }

      const cashFlow = await reportService.getCashFlowAnalysis(
        building,
        parseInt(month),
        parseInt(year)
      );

      res.status(200).json(
        new ApiResponse(
          200,
          cashFlow,
          'Cash flow analysis retrieved successfully'
        )
      );
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ReportController();