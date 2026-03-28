const Vote = require('../models/Vote');
const VoteOption = require('../models/VoteOption');
const { ApiResponse } = require('../utils/responseFormatter');
const { ValidationError, NotFoundError } = require('../utils/errors');
const logger = require('../utils/logger');

class VoteController {
  // Get all votes
  async getAllVotes(req, res, next) {
    try {
      const building = req.user.building;
      const { status, page = 1, limit = 10 } = req.query;

      const query = { building };
      if (status) query.status = status;

      const votes = await Vote.find(query)
        .populate('createdBy', 'name')
        .populate('options')
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .sort({ createdAt: -1 });

      const total = await Vote.countDocuments(query);

      res.status(200).json(
        new ApiResponse(
          200,
          { votes, total, pages: Math.ceil(total / limit) },
          'Votes retrieved successfully'
        )
      );
    } catch (error) {
      next(error);
    }
  }

  // Get vote by ID
  async getVoteById(req, res, next) {
    try {
      const { voteId } = req.params;

      const vote = await Vote.findById(voteId)
        .populate('createdBy', 'name')
        .populate('options');

      if (!vote) {
        throw new NotFoundError(req.t('errors.not_found'));
      }

      res.status(200).json(
        new ApiResponse(
          200,
          vote,
          'Vote retrieved successfully'
        )
      );
    } catch (error) {
      next(error);
    }
  }

  // Create vote (Syndic only)
  async createVote(req, res, next) {
    try {
      const { title, description, voteType, options, endDate, targetAudience } = req.body;

      if (!title || !voteType || !options || options.length < 2) {
        throw new ValidationError(req.t('errors.validation_error'));
      }

      const vote = new Vote({
        building: req.user.building,
        title,
        description,
        type: voteType || 'multiple_choice',
        startDate: new Date(),
        endDate,
        createdBy: req.user._id,
        status: 'active',
        voters: []
      });

      await vote.save();

      // Create vote options
      const voteOptions = await Promise.all(
        options.map((optionText, index) =>
          new VoteOption({
            vote: vote._id,
            optionText,
            optionNumber: index + 1,
            voteCount: 0
          }).save()
        )
      );

      vote.options = voteOptions.map(opt => opt._id);
      await vote.save();

      logger.info(`Vote created: ${title}`);

      res.status(201).json(
        new ApiResponse(
          201,
          vote,
          req.t('vote.created')
        )
      );
    } catch (error) {
      next(error);
    }
  }

  // Vote on option
  async voteOnOption(req, res, next) {
    try {
      const { voteId, optionId } = req.params;
      const userId = req.user._id;

      // Check if user already voted
      const vote = await Vote.findById(voteId);

      if (!vote) {
        throw new NotFoundError(req.t('errors.not_found'));
      }

      const alreadyVoted = vote.voters.some(
        v => v.userId && v.userId.toString() === userId.toString()
      );
      if (alreadyVoted) {
        throw new ValidationError('You have already voted on this poll');
      }

      // Update option vote count
      await VoteOption.findByIdAndUpdate(
        optionId,
        { $inc: { voteCount: 1 } },
        { new: true }
      );

      // Add voter to vote
      vote.voters.push({ userId, votedAt: new Date() });
      vote.totalVotes = (vote.totalVotes || 0) + 1;
      await vote.save();

      logger.info(`User ${userId} voted on vote ${voteId}`);

      const updatedVote = await Vote.findById(voteId).populate('options');

      res.status(200).json(
        new ApiResponse(
          200,
          updatedVote,
          'Vote recorded successfully'
        )
      );
    } catch (error) {
      next(error);
    }
  }

  // Get vote results
  async getVoteResults(req, res, next) {
    try {
      const { voteId } = req.params;

      const vote = await Vote.findById(voteId).populate('options');

      if (!vote) {
        throw new NotFoundError(req.t('errors.not_found'));
      }

      const totalVotes = vote.voters.length;

      const results = vote.options.map(option => ({
        text: option.optionText,
        votes: option.voteCount,
        percentage: totalVotes > 0 ? ((option.voteCount / totalVotes) * 100).toFixed(2) : 0,
        isWinning: option.voteCount === Math.max(...vote.options.map(o => o.voteCount))
      }));

      res.status(200).json(
        new ApiResponse(
          200,
          { vote: vote.title, totalVotes, results },
          req.t('vote.results')
        )
      );
    } catch (error) {
      next(error);
    }
  }

  // Close vote
  async closeVote(req, res, next) {
    try {
      const { voteId } = req.params;

      const vote = await Vote.findByIdAndUpdate(
        voteId,
        { status: 'closed', endDate: new Date() },
        { new: true }
      ).populate('options');

      if (!vote) {
        throw new NotFoundError(req.t('errors.not_found'));
      }

      logger.info(`Vote closed: ${voteId}`);

      res.status(200).json(
        new ApiResponse(
          200,
          vote,
          'Vote closed successfully'
        )
      );
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new VoteController();