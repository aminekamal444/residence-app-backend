const Budget = require('../models/Budget');
const Building = require('../models/Building');
const { ValidationError, UnauthorizedError, NotFoundError } = require('../utils/errors');
const logger = require('../utils/logger');

class BudgetService {
  // Create budget
  async createBudget(budgetData, userId) {
    try {
      const { building, category, period, year, month, budgetedAmount, description } = budgetData;

      // Validate building exists
      const buildingExists = await Building.findById(building);
      if (!buildingExists) {
        throw new ValidationError('Building not found');
      }

      // Validate amount
      if (!budgetedAmount || budgetedAmount <= 0) {
        throw new ValidationError('Budgeted amount must be positive');
      }

      // Validate period
      if (!['monthly', 'quarterly', 'yearly'].includes(period)) {
        throw new ValidationError('Invalid period');
      }

      const budget = new Budget({
        building,
        category,
        period,
        year,
        month: period === 'monthly' ? month : null,
        budgetedAmount,
        description,
        createdBy: userId,
        status: 'draft'
      });

      await budget.save();
      await budget.populate('createdBy', 'name email');
      await budget.populate('building', 'name');

      logger.info(`Budget created: ${budget._id}`);
      return budget.toJSON();

    } catch (error) {
      logger.error('Create budget error:', error.message);
      throw error;
    }
  }

  // Get all budgets
  async getAllBudgets(filters = {}) {
    try {
      const query = Budget.find();

      if (filters.building) {
        query.where('building').equals(filters.building);
      }

      if (filters.category) {
        query.where('category').equals(filters.category);
      }

      if (filters.status) {
        query.where('status').equals(filters.status);
      }

      if (filters.year) {
        query.where('year').equals(filters.year);
      }

      const budgets = await query
        .populate('createdBy', 'name email')
        .populate('approvedBy', 'name email')
        .populate('building', 'name')
        .sort({ year: -1, month: -1 });

      return budgets.map(b => b.toJSON());

    } catch (error) {
      logger.error('Get budgets error:', error.message);
      throw error;
    }
  }

  // Get budget by ID
  async getBudgetById(budgetId) {
    try {
      const budget = await Budget.findById(budgetId)
        .populate('createdBy', 'name email')
        .populate('approvedBy', 'name email')
        .populate('building', 'name');

      if (!budget) {
        throw new NotFoundError('Budget not found');
      }

      return budget.toJSON();

    } catch (error) {
      logger.error('Get budget error:', error.message);
      throw error;
    }
  }

  // Update budget
  async updateBudget(budgetId, updateData, userId) {
    try {
      const budget = await Budget.findById(budgetId);

      if (!budget) {
        throw new NotFoundError('Budget not found');
      }

      // Only draft budgets can be edited
      if (budget.status !== 'draft') {
        throw new ValidationError('Only draft budgets can be edited');
      }

      // Only creator can edit
      if (budget.createdBy.toString() !== userId) {
        throw new UnauthorizedError('You can only edit your own budgets');
      }

      const { budgetedAmount, description, category } = updateData;

      if (budgetedAmount) {
        budget.budgetedAmount = budgetedAmount;
      }
      if (description) {
        budget.description = description;
      }
      if (category) {
        budget.category = category;
      }

      await budget.save();
      await budget.populate('createdBy', 'name email');
      await budget.populate('building', 'name');

      logger.info(`Budget updated: ${budgetId}`);
      return budget.toJSON();

    } catch (error) {
      logger.error('Update budget error:', error.message);
      throw error;
    }
  }

  // Delete budget (soft delete)
  async deleteBudget(budgetId, userId) {
    try {
      const budget = await Budget.findById(budgetId);

      if (!budget) {
        throw new NotFoundError('Budget not found');
      }

      // Only creator can delete
      if (budget.createdBy.toString() !== userId) {
        throw new UnauthorizedError('You can only delete your own budgets');
      }

      budget.deletedAt = new Date();
      await budget.save();

      logger.info(`Budget deleted: ${budgetId}`);
      return { message: 'Budget deleted successfully' };

    } catch (error) {
      logger.error('Delete budget error:', error.message);
      throw error;
    }
  }

  // Get budgets for period
  async getBudgetsForPeriod(building, period, year) {
    try {
      if (!['monthly', 'quarterly', 'yearly'].includes(period)) {
        throw new ValidationError('Invalid period');
      }

      const query = {
        building,
        period,
        year
      };

      const budgets = await Budget.find(query)
        .populate('createdBy', 'name email')
        .populate('building', 'name')
        .sort({ month: 1 });

      return budgets.map(b => b.toJSON());

    } catch (error) {
      logger.error('Get budgets for period error:', error.message);
      throw error;
    }
  }

  // Get budget summary
  async getBudgetSummary(building, year) {
    try {
      const budgets = await Budget.find({
        building,
        year,
        status: { $in: ['approved', 'active', 'completed'] }
      });

      let totalBudgeted = 0;
      let totalActual = 0;
      const byCategory = {};

      budgets.forEach(budget => {
        totalBudgeted += budget.budgetedAmount;
        totalActual += budget.actualAmount;

        if (!byCategory[budget.category]) {
          byCategory[budget.category] = {
            budgeted: 0,
            actual: 0,
            variance: 0
          };
        }

        byCategory[budget.category].budgeted += budget.budgetedAmount;
        byCategory[budget.category].actual += budget.actualAmount;
        byCategory[budget.category].variance = 
          byCategory[budget.category].budgeted - byCategory[budget.category].actual;
      });

      return {
        year,
        totalBudgeted,
        totalActual,
        totalVariance: totalBudgeted - totalActual,
        byCategory
      };

    } catch (error) {
      logger.error('Get budget summary error:', error.message);
      throw error;
    }
  }

  // Approve budget
  async approveBudget(budgetId, userId) {
    try {
      const budget = await Budget.findById(budgetId);

      if (!budget) {
        throw new NotFoundError('Budget not found');
      }

      if (budget.status !== 'draft') {
        throw new ValidationError('Only draft budgets can be approved');
      }

      budget.status = 'approved';
      budget.approvedBy = userId;
      budget.approvalDate = new Date();

      await budget.save();
      await budget.populate('approvedBy', 'name email');

      logger.info(`Budget approved: ${budgetId}`);
      return budget.toJSON();

    } catch (error) {
      logger.error('Approve budget error:', error.message);
      throw error;
    }
  }

  // Update actual amount (when charges are recorded)
  async updateActualAmount(budgetId, amount) {
    try {
      const budget = await Budget.findById(budgetId);

      if (!budget) {
        throw new NotFoundError('Budget not found');
      }

      budget.actualAmount += amount;
      budget.variance = budget.budgetedAmount - budget.actualAmount;

      await budget.save();

      logger.info(`Budget actual amount updated: ${budgetId}`);
      return budget.toJSON();

    } catch (error) {
      logger.error('Update actual amount error:', error.message);
      throw error;
    }
  }
}

module.exports = new BudgetService();