const express = require('express');
const router = express.Router();

const Vote = require('../models/Vote');
const VoteOption = require('../models/VoteOption');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const { ValidationError, NotFoundError } = require('../utils/errors');

// ─── GET / — get all votes in this building ───────────────────────────────
router.get('/', authMiddleware, async (req, res, next) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const query = { building: req.user.building };
    if (status) query.status = status;

    const votes = await Vote.find(query)
      .populate('createdBy', 'name')
      .populate('options')
      .skip((page - 1) * limit).limit(Number(limit))
      .sort({ createdAt: -1 });

    const total = await Vote.countDocuments(query);
    res.json({ success: true, message: 'Votes retrieved', data: { votes, total, pages: Math.ceil(total / limit) } });
  } catch (error) {
    next(error);
  }
});

// ─── POST / — create a new vote/poll (syndic only) ────────────────────────
router.post('/', authMiddleware, roleMiddleware(['syndic']), async (req, res, next) => {
  try {
    const { title, description, voteType, options, endDate } = req.body;
    if (!title || !voteType || !options || options.length < 2) {
      throw new ValidationError('title, voteType and at least 2 options are required');
    }

    const vote = new Vote({
      building: req.user.building,
      title, description,
      type: voteType || 'multiple_choice',
      startDate: new Date(),
      endDate,
      createdBy: req.user._id,
      status: 'active',
      voters: []
    });
    await vote.save();

    // Create options for this vote
    const voteOptions = await Promise.all(
      options.map((optionText, index) =>
        new VoteOption({ vote: vote._id, optionText, optionNumber: index + 1, voteCount: 0 }).save()
      )
    );

    vote.options = voteOptions.map(o => o._id);
    await vote.save();

    res.status(201).json({ success: true, message: 'Vote created', data: vote });
  } catch (error) {
    next(error);
  }
});

// ─── POST /:voteId/vote/:optionId — cast a vote on an option ─────────────
router.post('/:voteId/vote/:optionId', authMiddleware, async (req, res, next) => {
  try {
    const vote = await Vote.findById(req.params.voteId);
    if (!vote) throw new NotFoundError('Vote not found');

    // Check if user already voted
    const alreadyVoted = vote.voters.some(v => v.userId?.toString() === req.user._id.toString());
    if (alreadyVoted) throw new ValidationError('You have already voted on this poll');

    // Increment option vote count
    await VoteOption.findByIdAndUpdate(req.params.optionId, { $inc: { voteCount: 1 } });

    // Record voter
    vote.voters.push({ userId: req.user._id, votedAt: new Date() });
    vote.totalVotes = (vote.totalVotes || 0) + 1;
    await vote.save();

    const updated = await Vote.findById(req.params.voteId).populate('options');
    res.json({ success: true, message: 'Vote recorded', data: updated });
  } catch (error) {
    next(error);
  }
});

// ─── GET /:voteId/results — see the results of a vote ────────────────────
router.get('/:voteId/results', authMiddleware, async (req, res, next) => {
  try {
    const vote = await Vote.findById(req.params.voteId).populate('options');
    if (!vote) throw new NotFoundError('Vote not found');

    const totalVotes = vote.voters.length;
    const results = vote.options.map(option => ({
      text: option.optionText,
      votes: option.voteCount,
      percentage: totalVotes > 0 ? ((option.voteCount / totalVotes) * 100).toFixed(2) : 0,
      isWinning: option.voteCount === Math.max(...vote.options.map(o => o.voteCount))
    }));

    res.json({ success: true, message: 'Vote results retrieved', data: { vote: vote.title, totalVotes, results } });
  } catch (error) {
    next(error);
  }
});

// ─── POST /:voteId/close — close a vote (syndic only) ────────────────────
router.post('/:voteId/close', authMiddleware, roleMiddleware(['syndic']), async (req, res, next) => {
  try {
    const vote = await Vote.findByIdAndUpdate(
      req.params.voteId,
      { status: 'closed', endDate: new Date() },
      { new: true }
    ).populate('options');
    if (!vote) throw new NotFoundError('Vote not found');
    res.json({ success: true, message: 'Vote closed', data: vote });
  } catch (error) {
    next(error);
  }
});

// ─── GET /:voteId — get one vote by ID ───────────────────────────────────
router.get('/:voteId', authMiddleware, async (req, res, next) => {
  try {
    const vote = await Vote.findById(req.params.voteId).populate('createdBy', 'name').populate('options');
    if (!vote) throw new NotFoundError('Vote not found');
    res.json({ success: true, message: 'Vote retrieved', data: vote });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
