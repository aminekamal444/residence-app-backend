const express = require('express');
const router = express.Router();

const Payment = require('../models/Payment');
const Charge = require('../models/Charge');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const { ValidationError, NotFoundError } = require('../utils/errors');

// ─── GET / — get all payments in this building (syndic only) ──────────────
router.get('/', authMiddleware, roleMiddleware(['syndic']), async (req, res, next) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const query = { building: req.user.building };
    if (status) query.status = status;

    const payments = await Payment.find(query)
      .populate('apartment', 'number')
      .populate('resident', 'name')
      .populate('charge', 'amount category')
      .skip((page - 1) * limit).limit(Number(limit))
      .sort({ paidDate: -1 });

    const total = await Payment.countDocuments(query);
    res.json({ success: true, message: 'Payments retrieved', data: { payments, total, pages: Math.ceil(total / limit) } });
  } catch (error) {
    next(error);
  }
});

// ─── POST /initiate — resident starts a payment for a charge ──────────────
router.post('/initiate', authMiddleware, roleMiddleware(['resident']), async (req, res, next) => {
  try {
    const { chargeId, amount, paymentMethod } = req.body;
    if (!chargeId || !amount) throw new ValidationError('chargeId and amount are required');

    const charge = await Charge.findById(chargeId).populate('apartment');
    if (!charge) throw new NotFoundError('Charge not found');

    const payment = new Payment({
      building: charge.building,
      apartment: charge.apartment._id,
      resident: req.user._id,
      charge: chargeId,
      amount,
      paymentMethod,
      category: charge.category,
      status: 'pending'
    });
    await payment.save();

    res.status(201).json({ success: true, message: 'Payment initiated', data: payment });
  } catch (error) {
    next(error);
  }
});

// ─── GET /resident/history — get the logged-in resident's payment history ──
router.get('/resident/history', authMiddleware, roleMiddleware(['resident']), async (req, res, next) => {
  try {
    const payments = await Payment.find({ resident: req.user._id })
      .populate('charge')
      .sort({ paidDate: -1 });
    res.json({ success: true, message: 'Resident payments retrieved', data: payments });
  } catch (error) {
    next(error);
  }
});

// ─── GET /statistics/overview — payment counts by status (syndic only) ─────
router.get('/statistics/overview', authMiddleware, roleMiddleware(['syndic']), async (req, res, next) => {
  try {
    const building = req.user.building;
    const [completed, pending, failed] = await Promise.all([
      Payment.countDocuments({ building, status: 'completed' }),
      Payment.countDocuments({ building, status: 'pending' }),
      Payment.countDocuments({ building, status: 'failed' })
    ]);
    res.json({ success: true, message: 'Payment statistics retrieved', data: { completed, pending, failed } });
  } catch (error) {
    next(error);
  }
});

// ─── POST /:paymentId/confirm — mark a payment as completed ───────────────
router.post('/:paymentId/confirm', authMiddleware, async (req, res, next) => {
  try {
    const { stripePaymentIntentId, transactionId } = req.body;
    const payment = await Payment.findByIdAndUpdate(
      req.params.paymentId,
      { status: 'completed', paidDate: new Date(), stripePaymentIntentId, transactionId },
      { new: true }
    );
    if (!payment) throw new NotFoundError('Payment not found');

    // Mark the related charge as paid
    await Charge.findByIdAndUpdate(payment.charge, { status: 'paid' });

    res.json({ success: true, message: 'Payment confirmed', data: payment });
  } catch (error) {
    next(error);
  }
});

// ─── POST /:paymentId/cancel — cancel a payment ───────────────────────────
router.post('/:paymentId/cancel', authMiddleware, async (req, res, next) => {
  try {
    const { reason } = req.body;
    const payment = await Payment.findByIdAndUpdate(
      req.params.paymentId,
      { status: 'failed', failureReason: reason },
      { new: true }
    );
    if (!payment) throw new NotFoundError('Payment not found');
    res.json({ success: true, message: 'Payment cancelled', data: payment });
  } catch (error) {
    next(error);
  }
});

// ─── GET /:paymentId — get one payment by ID ──────────────────────────────
router.get('/:paymentId', authMiddleware, async (req, res, next) => {
  try {
    const payment = await Payment.findById(req.params.paymentId)
      .populate('apartment').populate('resident').populate('charge');
    if (!payment) throw new NotFoundError('Payment not found');
    res.json({ success: true, message: 'Payment retrieved', data: payment });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
