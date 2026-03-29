const request = require('supertest');

jest.mock('../config/database', () => ({ connect: jest.fn(), disconnect: jest.fn() }));
jest.mock('../middleware/authMiddleware', () => (req, res, next) => {
  req.user = { _id: 'user123', role: 'syndic', building: 'building123' };
  next();
});

const makeQuery = (value) => {
  const q = { populate: jest.fn().mockReturnThis(), sort: jest.fn().mockReturnThis(),
    then: (r, j) => Promise.resolve(value).then(r, j), catch: (f) => Promise.resolve(value).catch(f) };
  return q;
};

const mockBudget = {
  _id: 'budget123', category: 'maintenance', period: 'monthly', year: 2025, month: 3,
  budgetedAmount: 10000, actualAmount: 8000, status: 'draft',
  createdBy: 'user123', building: 'building123',
  save: jest.fn().mockResolvedValue(undefined),
  populate: jest.fn().mockResolvedValue(undefined)
};

jest.mock('../models/Budget', () => {
  const Mock = jest.fn().mockImplementation(() => mockBudget);
  Mock.find = jest.fn();
  Mock.findById = jest.fn();
  return Mock;
});

jest.mock('../models/Building', () => ({
  findById: jest.fn(),
}));

const Budget = require('../models/Budget');
const Building = require('../models/Building');
const app = require('../server');
beforeEach(() => jest.clearAllMocks());

describe('GET /api/v1/budgets', () => {
  it('returns list of budgets', async () => {
    Budget.find.mockReturnValue(makeQuery([mockBudget]));
    const res = await request(app).get('/api/v1/budgets');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

describe('POST /api/v1/budgets', () => {
  it('returns 400 when required fields are missing', async () => {
    const res = await request(app).post('/api/v1/budgets').send({ category: 'maintenance' });
    expect(res.statusCode).toBe(400);
  });

  it('returns 400 when building not found', async () => {
    Building.findById.mockResolvedValue(null);
    const res = await request(app).post('/api/v1/budgets').send({ building: 'b1', category: 'maintenance', period: 'monthly', year: 2025, budgetedAmount: 5000 });
    expect(res.statusCode).toBe(400);
  });

  it('creates budget successfully', async () => {
    Building.findById.mockResolvedValue({ _id: 'building123' });
    mockBudget.save.mockResolvedValue(undefined);
    mockBudget.populate.mockResolvedValue(undefined);
    const res = await request(app).post('/api/v1/budgets').send({ building: 'building123', category: 'maintenance', period: 'monthly', year: 2025, budgetedAmount: 5000 });
    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
  });
});

describe('GET /api/v1/budgets/period/all', () => {
  it('returns 400 when required query params are missing', async () => {
    const res = await request(app).get('/api/v1/budgets/period/all?building=b1');
    expect(res.statusCode).toBe(400);
  });

  it('returns budgets for period', async () => {
    Budget.find.mockReturnValue(makeQuery([mockBudget]));
    const res = await request(app).get('/api/v1/budgets/period/all?building=building123&period=monthly&year=2025');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

describe('GET /api/v1/budgets/summary/overview', () => {
  it('returns 400 when required query params are missing', async () => {
    const res = await request(app).get('/api/v1/budgets/summary/overview?building=b1');
    expect(res.statusCode).toBe(400);
  });

  it('returns budget summary', async () => {
    Budget.find.mockReturnValue(makeQuery([mockBudget]));
    const res = await request(app).get('/api/v1/budgets/summary/overview?building=building123&year=2025');
    expect(res.statusCode).toBe(200);
    expect(res.body.data).toHaveProperty('totalBudgeted');
  });
});

describe('GET /api/v1/budgets/:budgetId', () => {
  it('returns 404 when not found', async () => {
    Budget.findById.mockReturnValue(makeQuery(null));
    const res = await request(app).get('/api/v1/budgets/notfound');
    expect(res.statusCode).toBe(404);
  });

  it('returns budget when found', async () => {
    Budget.findById.mockReturnValue(makeQuery(mockBudget));
    const res = await request(app).get('/api/v1/budgets/budget123');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

describe('PUT /api/v1/budgets/:budgetId', () => {
  it('returns 404 when not found', async () => {
    Budget.findById.mockResolvedValue(null);
    const res = await request(app).put('/api/v1/budgets/notfound').send({ budgetedAmount: 12000 });
    expect(res.statusCode).toBe(404);
  });

  it('updates budget successfully', async () => {
    Budget.findById.mockResolvedValue({ ...mockBudget, status: 'draft', createdBy: { toString: () => 'user123' } });
    const res = await request(app).put('/api/v1/budgets/budget123').send({ budgetedAmount: 12000 });
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

describe('DELETE /api/v1/budgets/:budgetId', () => {
  it('returns 404 when not found', async () => {
    Budget.findById.mockResolvedValue(null);
    const res = await request(app).delete('/api/v1/budgets/notfound');
    expect(res.statusCode).toBe(404);
  });

  it('deletes budget successfully', async () => {
    Budget.findById.mockResolvedValue({ ...mockBudget, createdBy: { toString: () => 'user123' }, save: jest.fn().mockResolvedValue(undefined) });
    const res = await request(app).delete('/api/v1/budgets/budget123');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

describe('POST /api/v1/budgets/:budgetId/approve', () => {
  it('returns 404 when not found', async () => {
    Budget.findById.mockResolvedValue(null);
    const res = await request(app).post('/api/v1/budgets/notfound/approve');
    expect(res.statusCode).toBe(404);
  });

  it('approves budget successfully', async () => {
    Budget.findById.mockResolvedValue({ ...mockBudget, status: 'draft', save: jest.fn().mockResolvedValue(undefined), populate: jest.fn().mockResolvedValue(undefined) });
    const res = await request(app).post('/api/v1/budgets/budget123/approve');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
