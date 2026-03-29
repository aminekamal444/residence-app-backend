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

const mockCharge = { _id: 'charge123', amount: 500, category: 'maintenance', status: 'pending', building: 'building123', apartment: 'apt123', save: jest.fn().mockResolvedValue(undefined) };

jest.mock('../models/Charge', () => {
  const Mock = jest.fn().mockImplementation(() => mockCharge);
  Mock.find = jest.fn();
  Mock.findById = jest.fn();
  Mock.findByIdAndUpdate = jest.fn();
  Mock.findByIdAndDelete = jest.fn();
  Mock.countDocuments = jest.fn().mockResolvedValue(2);
  return Mock;
});

const Charge = require('../models/Charge');
const app = require('../server');
beforeEach(() => jest.clearAllMocks());

describe('GET /api/v1/charges', () => {
  it('returns list of charges', async () => {
    Charge.find.mockReturnValue(makeQuery([mockCharge]));
    Charge.countDocuments.mockResolvedValue(1);
    const res = await request(app).get('/api/v1/charges');
    expect(res.statusCode).toBe(200);
    expect(res.body.data).toHaveProperty('charges');
  });
});

describe('POST /api/v1/charges', () => {
  it('returns 400 when required fields are missing', async () => {
    const res = await request(app).post('/api/v1/charges').send({ amount: 500 });
    expect(res.statusCode).toBe(400);
  });

  it('creates charge successfully', async () => {
    mockCharge.save.mockResolvedValue(undefined);
    const res = await request(app).post('/api/v1/charges').send({
      apartment: 'apt123', amount: 500, dueDate: '2025-12-01', category: 'maintenance'
    });
    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
  });
});

describe('GET /api/v1/charges/overdue/list', () => {
  it('returns overdue charges', async () => {
    Charge.find.mockReturnValue(makeQuery([mockCharge]));
    const res = await request(app).get('/api/v1/charges/overdue/list');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

describe('GET /api/v1/charges/apartment/:apartmentId', () => {
  it('returns charges for an apartment', async () => {
    Charge.find.mockReturnValue(makeQuery([mockCharge]));
    const res = await request(app).get('/api/v1/charges/apartment/apt123');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

describe('GET /api/v1/charges/:chargeId', () => {
  it('returns 404 when not found', async () => {
    Charge.findById.mockReturnValue(makeQuery(null));
    const res = await request(app).get('/api/v1/charges/notfound');
    expect(res.statusCode).toBe(404);
  });

  it('returns charge when found', async () => {
    Charge.findById.mockReturnValue(makeQuery(mockCharge));
    const res = await request(app).get('/api/v1/charges/charge123');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

describe('PUT /api/v1/charges/:chargeId', () => {
  it('returns 404 when not found', async () => {
    Charge.findByIdAndUpdate.mockReturnValue(makeQuery(null));
    const res = await request(app).put('/api/v1/charges/notfound').send({ amount: 600 });
    expect(res.statusCode).toBe(404);
  });

  it('updates charge successfully', async () => {
    Charge.findByIdAndUpdate.mockReturnValue(makeQuery(mockCharge));
    const res = await request(app).put('/api/v1/charges/charge123').send({ amount: 600 });
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

describe('DELETE /api/v1/charges/:chargeId', () => {
  it('returns 404 when not found', async () => {
    Charge.findByIdAndDelete.mockResolvedValue(null);
    const res = await request(app).delete('/api/v1/charges/notfound');
    expect(res.statusCode).toBe(404);
  });

  it('deletes charge successfully', async () => {
    Charge.findByIdAndDelete.mockResolvedValue(mockCharge);
    const res = await request(app).delete('/api/v1/charges/charge123');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
