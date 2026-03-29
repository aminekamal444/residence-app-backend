const request = require('supertest');

jest.mock('../config/database', () => ({ connect: jest.fn(), disconnect: jest.fn() }));
jest.mock('../middleware/authMiddleware', () => (req, res, next) => {
  req.user = { _id: 'user123', role: 'syndic', building: 'building123' };
  next();
});

const makeQuery = (value) => {
  const q = { populate: jest.fn().mockReturnThis(), skip: jest.fn().mockReturnThis(), limit: jest.fn().mockReturnThis(), sort: jest.fn().mockReturnThis(),
    then: (r, j) => Promise.resolve(value).then(r, j), catch: (f) => Promise.resolve(value).catch(f) };
  return q;
};

const mockPayment = { _id: 'pay123', amount: 500, status: 'pending', building: 'building123', charge: 'charge123', save: jest.fn().mockResolvedValue(undefined) };

jest.mock('../models/Payment', () => {
  const Mock = jest.fn().mockImplementation(() => mockPayment);
  Mock.find = jest.fn();
  Mock.findById = jest.fn();
  Mock.findByIdAndUpdate = jest.fn();
  Mock.countDocuments = jest.fn().mockResolvedValue(2);
  return Mock;
});

jest.mock('../models/Charge', () => ({
  findById: jest.fn(),
  findByIdAndUpdate: jest.fn(),
}));

const Payment = require('../models/Payment');
const Charge = require('../models/Charge');
const app = require('../server');
beforeEach(() => jest.clearAllMocks());

describe('GET /api/v1/payments', () => {
  it('returns list of payments', async () => {
    Payment.find.mockReturnValue(makeQuery([mockPayment]));
    Payment.countDocuments.mockResolvedValue(1);
    const res = await request(app).get('/api/v1/payments');
    expect(res.statusCode).toBe(200);
    expect(res.body.data).toHaveProperty('payments');
  });
});

describe('POST /api/v1/payments/initiate', () => {
  it('returns 403 when user is not a resident', async () => {
    const res = await request(app).post('/api/v1/payments/initiate').send({ chargeId: 'c1', amount: 100 });
    expect(res.statusCode).toBe(403);
  });
});

describe('GET /api/v1/payments/resident/history', () => {
  it('returns 403 when user is not a resident', async () => {
    const res = await request(app).get('/api/v1/payments/resident/history');
    expect(res.statusCode).toBe(403);
  });
});

describe('GET /api/v1/payments/statistics/overview', () => {
  it('returns payment statistics', async () => {
    Payment.countDocuments.mockResolvedValue(5);
    const res = await request(app).get('/api/v1/payments/statistics/overview');
    expect(res.statusCode).toBe(200);
    expect(res.body.data).toHaveProperty('completed');
    expect(res.body.data).toHaveProperty('pending');
    expect(res.body.data).toHaveProperty('failed');
  });
});

describe('POST /api/v1/payments/:paymentId/confirm', () => {
  it('returns 404 when payment not found', async () => {
    Payment.findByIdAndUpdate.mockReturnValue(makeQuery(null));
    const res = await request(app).post('/api/v1/payments/notfound/confirm').send({});
    expect(res.statusCode).toBe(404);
  });

  it('confirms payment successfully', async () => {
    Payment.findByIdAndUpdate.mockReturnValue(makeQuery({ ...mockPayment, charge: 'charge123' }));
    Charge.findByIdAndUpdate.mockResolvedValue({});
    const res = await request(app).post('/api/v1/payments/pay123/confirm').send({ transactionId: 'txn001' });
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

describe('POST /api/v1/payments/:paymentId/cancel', () => {
  it('returns 404 when payment not found', async () => {
    Payment.findByIdAndUpdate.mockReturnValue(makeQuery(null));
    const res = await request(app).post('/api/v1/payments/notfound/cancel').send({});
    expect(res.statusCode).toBe(404);
  });

  it('cancels payment successfully', async () => {
    Payment.findByIdAndUpdate.mockReturnValue(makeQuery(mockPayment));
    const res = await request(app).post('/api/v1/payments/pay123/cancel').send({ reason: 'test' });
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

describe('GET /api/v1/payments/:paymentId', () => {
  it('returns 404 when payment not found', async () => {
    Payment.findById.mockReturnValue(makeQuery(null));
    const res = await request(app).get('/api/v1/payments/notfound');
    expect(res.statusCode).toBe(404);
  });

  it('returns payment when found', async () => {
    Payment.findById.mockReturnValue(makeQuery(mockPayment));
    const res = await request(app).get('/api/v1/payments/pay123');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
