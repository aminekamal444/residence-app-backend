const request = require('supertest');

jest.mock('../config/database', () => ({ connect: jest.fn(), disconnect: jest.fn() }));
jest.mock('../middleware/authMiddleware', () => (req, res, next) => {
  req.user = { _id: 'user123', role: 'syndic', building: 'building123' };
  next();
});

const makeQuery = (value) => {
  const q = { populate: jest.fn().mockReturnThis(), skip: jest.fn().mockReturnThis(), limit: jest.fn().mockReturnThis(), sort: jest.fn().mockReturnThis(), lean: jest.fn().mockReturnThis(),
    then: (r, j) => Promise.resolve(value).then(r, j), catch: (f) => Promise.resolve(value).catch(f) };
  return q;
};

const mockApt = { _id: 'apt123', number: '101', floor: 1, building: 'building123', status: 'vacant', save: jest.fn().mockResolvedValue(undefined) };

jest.mock('../models/Apartment', () => {
  const Mock = jest.fn().mockImplementation(() => mockApt);
  Mock.find = jest.fn();
  Mock.findById = jest.fn();
  Mock.findByIdAndUpdate = jest.fn();
  Mock.findByIdAndDelete = jest.fn();
  Mock.countDocuments = jest.fn().mockResolvedValue(3);
  return Mock;
});

const Apartment = require('../models/Apartment');
const app = require('../server');
beforeEach(() => jest.clearAllMocks());

describe('GET /api/v1/apartments', () => {
  it('returns list of apartments', async () => {
    Apartment.find.mockReturnValue(makeQuery([mockApt]));
    Apartment.countDocuments.mockResolvedValue(1);
    const res = await request(app).get('/api/v1/apartments');
    expect(res.statusCode).toBe(200);
    expect(res.body.data).toHaveProperty('apartments');
  });
});

describe('POST /api/v1/apartments', () => {
  it('returns 400 when number or floor is missing', async () => {
    const res = await request(app).post('/api/v1/apartments').send({ number: '101' });
    expect(res.statusCode).toBe(400);
  });

  it('creates apartment successfully', async () => {
    mockApt.save.mockResolvedValue(undefined);
    const res = await request(app).post('/api/v1/apartments').send({ number: '101', floor: 1 });
    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
  });
});

describe('GET /api/v1/apartments/:apartmentId', () => {
  it('returns 404 when not found', async () => {
    Apartment.findById.mockReturnValue(makeQuery(null));
    const res = await request(app).get('/api/v1/apartments/notfound');
    expect(res.statusCode).toBe(404);
  });

  it('returns apartment when found', async () => {
    Apartment.findById.mockReturnValue(makeQuery(mockApt));
    const res = await request(app).get('/api/v1/apartments/apt123');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

describe('PUT /api/v1/apartments/:apartmentId', () => {
  it('returns 404 when not found', async () => {
    Apartment.findByIdAndUpdate.mockReturnValue(makeQuery(null));
    const res = await request(app).put('/api/v1/apartments/notfound').send({ floor: 2 });
    expect(res.statusCode).toBe(404);
  });

  it('updates apartment successfully', async () => {
    Apartment.findByIdAndUpdate.mockReturnValue(makeQuery(mockApt));
    const res = await request(app).put('/api/v1/apartments/apt123').send({ floor: 2 });
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

describe('DELETE /api/v1/apartments/:apartmentId', () => {
  it('returns 404 when not found', async () => {
    Apartment.findByIdAndDelete.mockResolvedValue(null);
    const res = await request(app).delete('/api/v1/apartments/notfound');
    expect(res.statusCode).toBe(404);
  });

  it('deletes apartment successfully', async () => {
    Apartment.findByIdAndDelete.mockResolvedValue(mockApt);
    const res = await request(app).delete('/api/v1/apartments/apt123');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

describe('POST /api/v1/apartments/:apartmentId/assign-resident', () => {
  it('returns 400 when residentId is missing', async () => {
    const res = await request(app).post('/api/v1/apartments/apt123/assign-resident').send({});
    expect(res.statusCode).toBe(400);
  });

  it('assigns resident successfully', async () => {
    Apartment.findByIdAndUpdate.mockReturnValue(makeQuery(mockApt));
    const res = await request(app).post('/api/v1/apartments/apt123/assign-resident').send({ residentId: 'user456' });
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

describe('DELETE /api/v1/apartments/:apartmentId/resident', () => {
  it('removes resident successfully', async () => {
    Apartment.findByIdAndUpdate.mockReturnValue(makeQuery(mockApt));
    const res = await request(app).delete('/api/v1/apartments/apt123/resident');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
