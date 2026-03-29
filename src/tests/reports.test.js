const request = require('supertest');

jest.mock('../config/database', () => ({ connect: jest.fn(), disconnect: jest.fn() }));
jest.mock('../middleware/authMiddleware', () => (req, res, next) => {
  req.user = { _id: 'user123', role: 'syndic', building: 'building123' };
  next();
});

const mockPayment = { _id: 'pay1', amount: 500, category: 'maintenance', status: 'completed' };

jest.mock('../models/Payment', () => ({
  find: jest.fn().mockResolvedValue([]),
  aggregate: jest.fn().mockResolvedValue([{ total: 1000 }]),
}));

jest.mock('../models/Charge', () => ({
  find: jest.fn().mockResolvedValue([]),
}));

jest.mock('../models/Budget', () => ({
  find: jest.fn().mockResolvedValue([]),
}));

jest.mock('../models/Apartment', () => ({
  find: jest.fn().mockResolvedValue([]),
}));

jest.mock('../models/FinancialReport', () => {
  const Mock = jest.fn().mockImplementation(() => ({
    save: jest.fn().mockResolvedValue(undefined)
  }));
  Mock.findOne = jest.fn().mockResolvedValue(null);
  return Mock;
});

const Payment = require('../models/Payment');
const Charge = require('../models/Charge');
const Budget = require('../models/Budget');
const app = require('../server');
beforeEach(() => jest.clearAllMocks());

describe('GET /api/v1/reports/dashboard', () => {
  it('returns dashboard data', async () => {
    Payment.find = jest.fn().mockResolvedValue([]);
    Charge.find = jest.fn().mockResolvedValue([]);
    Budget.find = jest.fn().mockResolvedValue([]);
    const res = await request(app).get('/api/v1/reports/dashboard');
    expect(res.statusCode).toBe(200);
    expect(res.body.data).toHaveProperty('currentMonth');
    expect(res.body.data).toHaveProperty('alerts');
  });
});

describe('POST /api/v1/reports/monthly', () => {
  it('returns 400 when year or month is missing', async () => {
    const res = await request(app).post('/api/v1/reports/monthly').send({ year: 2025 });
    expect(res.statusCode).toBe(400);
  });

  it('generates monthly report', async () => {
    Payment.find = jest.fn().mockResolvedValue([mockPayment]);
    Charge.find = jest.fn().mockResolvedValue([]);
    const res = await request(app).post('/api/v1/reports/monthly').send({ year: 2025, month: 3 });
    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
  });
});

describe('GET /api/v1/reports/revenue/category', () => {
  it('returns 400 when month or year is missing', async () => {
    const res = await request(app).get('/api/v1/reports/revenue/category?month=3');
    expect(res.statusCode).toBe(400);
  });

  it('returns revenue by category', async () => {
    Payment.find = jest.fn().mockResolvedValue([mockPayment]);
    const res = await request(app).get('/api/v1/reports/revenue/category?month=3&year=2025');
    expect(res.statusCode).toBe(200);
    expect(res.body.data).toHaveProperty('maintenance');
  });
});

describe('GET /api/v1/reports/revenue/trend', () => {
  it('returns 400 when year is missing', async () => {
    const res = await request(app).get('/api/v1/reports/revenue/trend');
    expect(res.statusCode).toBe(400);
  });

  it('returns revenue trend for the year', async () => {
    Payment.aggregate = jest.fn().mockResolvedValue([{ total: 1000 }]);
    const res = await request(app).get('/api/v1/reports/revenue/trend?year=2025');
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data).toHaveLength(12);
  });
});

describe('GET /api/v1/reports/apartments/payment-status', () => {
  it('returns payment status for all apartments', async () => {
    const Apartment = require('../models/Apartment');
    Apartment.find = jest.fn().mockReturnValue({ populate: jest.fn().mockResolvedValue([]) });
    const res = await request(app).get('/api/v1/reports/apartments/payment-status');
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});

describe('GET /api/v1/reports/yearly/comparison', () => {
  it('returns 400 when year is missing', async () => {
    const res = await request(app).get('/api/v1/reports/yearly/comparison');
    expect(res.statusCode).toBe(400);
  });

  it('returns yearly comparison', async () => {
    Payment.aggregate = jest.fn().mockResolvedValue([{ total: 5000 }]);
    const res = await request(app).get('/api/v1/reports/yearly/comparison?year=2025');
    expect(res.statusCode).toBe(200);
    expect(res.body.data).toHaveProperty('currentYear');
    expect(res.body.data).toHaveProperty('previousYear');
  });
});

describe('GET /api/v1/reports/cashflow/analysis', () => {
  it('returns 400 when month or year is missing', async () => {
    const res = await request(app).get('/api/v1/reports/cashflow/analysis?month=3');
    expect(res.statusCode).toBe(400);
  });

  it('returns cashflow analysis', async () => {
    Payment.aggregate = jest.fn().mockResolvedValue([{ total: 3000 }]);
    const res = await request(app).get('/api/v1/reports/cashflow/analysis?month=3&year=2025');
    expect(res.statusCode).toBe(200);
    expect(res.body.data).toHaveProperty('inflows');
    expect(res.body.data).toHaveProperty('netCashFlow');
  });
});
