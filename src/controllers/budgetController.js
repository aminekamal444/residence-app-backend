const budgetService = require('../services/budgetService');
const { ValidationError } = require('../utils/errors');
const logger = require('../utils/logger');

class BudgetController {
  async createBudget(req, res, next) {
    try {
      const { building, category, period, year, month, budgetedAmount, description } = req.body;
      const userId = req.user._id;

      if (!building || !category || !period || !year || !budgetedAmount) {
        throw new ValidationError('Missing required fields');
      }

      const budget = await budgetService.createBudget(
        { building, category, period, year, month, budgetedAmount, description },
        userId
      );

      res.status(201).json({
        statusCode: 201,
        success: true,
        message: 'Budget created successfully',
        data: budget
      });
    } catch (error) {
      next(error);
    }
  }

  async getAllBudgets(req, res, next) {
    try {
      const { building, category, status, year } = req.query;

      const filters = {};
      if (building) filters.building = building;
      if (category) filters.category = category;
      if (status) filters.status = status;
      if (year) filters.year = year;

      const budgets = await budgetService.getAllBudgets(filters);

      res.status(200).json({
        statusCode: 200,
        success: true,
        message: 'Budgets retrieved successfully',
        data: budgets
      });
    } catch (error) {
      next(error);
    }
  }

  async getBudgetById(req, res, next) {
    try {
      const { budgetId } = req.params;

      const budget = await budgetService.getBudgetById(budgetId);

      res.status(200).json({
        statusCode: 200,
        success: true,
        message: 'Budget retrieved successfully',
        data: budget
      });
    } catch (error) {
      next(error);
    }
  }

  async updateBudget(req, res, next) {
    try {
      const { budgetId } = req.params;
      const userId = req.user._id;

      const budget = await budgetService.updateBudget(budgetId, req.body, userId);

      res.status(200).json({
        statusCode: 200,
        success: true,
        message: 'Budget updated successfully',
        data: budget
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteBudget(req, res, next) {
    try {
      const { budgetId } = req.params;
      const userId = req.user._id;

      await budgetService.deleteBudget(budgetId, userId);

      res.status(200).json({
        statusCode: 200,
        success: true,
        message: 'Budget deleted successfully',
        data: null
      });
    } catch (error) {
      next(error);
    }
  }

  async getBudgetsForPeriod(req, res, next) {
    try {
      const { building, period, year } = req.query;

      if (!building || !period || !year) {
        throw new ValidationError('building, period, and year are required');
      }

      const budgets = await budgetService.getBudgetsForPeriod(building, period, year);

      res.status(200).json({
        statusCode: 200,
        success: true,
        message: 'Budgets for period retrieved successfully',
        data: budgets
      });
    } catch (error) {
      next(error);
    }
  }

  async getBudgetSummary(req, res, next) {
    try {
      const { building, year } = req.query;

      if (!building || !year) {
        throw new ValidationError('building and year are required');
      }

      const summary = await budgetService.getBudgetSummary(building, year);

      res.status(200).json({
        statusCode: 200,
        success: true,
        message: 'Budget summary retrieved successfully',
        data: summary
      });
    } catch (error) {
      next(error);
    }
  }

  async approveBudget(req, res, next) {
    try {
      const { budgetId } = req.params;
      const userId = req.user._id;

      const budget = await budgetService.approveBudget(budgetId, userId);

      res.status(200).json({
        statusCode: 200,
        success: true,
        message: 'Budget approved successfully',
        data: budget
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new BudgetController();