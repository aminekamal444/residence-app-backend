const buildingService = require('../services/buildingService');
const { ApiResponse } = require('../utils/responseFormatter');
const { ValidationError } = require('../utils/errors');
const logger = require('../utils/logger');

class BuildingController {
  // Create building (syndic only)
  async createBuilding(req, res, next) {
    try {
      const { name, address, city, postalCode, country, totalApartments, description, amenities } = req.body;

      if (!name || !address || !city || !totalApartments) {
        throw new ValidationError('name, address, city, and totalApartments are required');
      }

      const building = await buildingService.createBuilding(
        { name, address, city, postalCode, country, totalApartments, description, amenities },
        req.user._id
      );

      logger.info(`Building created: ${building._id}`);

      res.status(201).json(
        new ApiResponse(201, building, 'Building created successfully')
      );
    } catch (error) {
      next(error);
    }
  }

  // Get all buildings
  async getAllBuildings(req, res, next) {
    try {
      const { page, limit, city, country } = req.query;

      const result = await buildingService.getAllBuildings(
        { city, country },
        { page, limit }
      );

      res.status(200).json(
        new ApiResponse(200, result, 'Buildings retrieved successfully')
      );
    } catch (error) {
      next(error);
    }
  }

  // Get my building (auto-detect from user)
  async getMyBuilding(req, res, next) {
    try {
      const building = await buildingService.getMyBuilding(req.user._id);

      res.status(200).json(
        new ApiResponse(200, building, 'Building retrieved successfully')
      );
    } catch (error) {
      next(error);
    }
  }

  // Get building by ID
  async getBuildingById(req, res, next) {
    try {
      const { buildingId } = req.params;

      const building = await buildingService.getBuildingById(buildingId);

      res.status(200).json(
        new ApiResponse(200, building, 'Building retrieved successfully')
      );
    } catch (error) {
      next(error);
    }
  }

  // Update building
  async updateBuilding(req, res, next) {
    try {
      const { buildingId } = req.params;

      const building = await buildingService.updateBuilding(buildingId, req.body, req.user._id);

      logger.info(`Building updated: ${buildingId}`);

      res.status(200).json(
        new ApiResponse(200, building, 'Building updated successfully')
      );
    } catch (error) {
      next(error);
    }
  }

  // Delete building
  async deleteBuilding(req, res, next) {
    try {
      const { buildingId } = req.params;

      await buildingService.deleteBuilding(buildingId);

      logger.info(`Building deleted: ${buildingId}`);

      res.status(200).json(
        new ApiResponse(200, null, 'Building deleted successfully')
      );
    } catch (error) {
      next(error);
    }
  }

  // Assign caretaker to building
  async assignCaretaker(req, res, next) {
    try {
      const { buildingId } = req.params;
      const { caretakerId } = req.body;

      if (!caretakerId) {
        throw new ValidationError('caretakerId is required');
      }

      const building = await buildingService.assignCaretaker(buildingId, caretakerId);

      logger.info(`Caretaker assigned to building: ${buildingId}`);

      res.status(200).json(
        new ApiResponse(200, building, 'Caretaker assigned successfully')
      );
    } catch (error) {
      next(error);
    }
  }

  // Get building statistics
  async getBuildingStats(req, res, next) {
    try {
      const buildingId = req.params.buildingId || req.user.building;

      if (!buildingId) {
        throw new ValidationError('No building specified');
      }

      const stats = await buildingService.getBuildingStats(buildingId);

      res.status(200).json(
        new ApiResponse(200, stats, 'Building stats retrieved successfully')
      );
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new BuildingController();
