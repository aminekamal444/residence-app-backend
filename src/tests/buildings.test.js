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

const mockBuilding = { _id: 'building123', name: 'Residence A', address: '123 Main St', city: 'Casablanca', totalApartments: 20, save: jest.fn().mockResolvedValue(undefined) };

jest.mock('../models/Building', () => {
  const Mock = jest.fn().mockImplementation(() => mockBuilding);
  Mock.find = jest.fn();
  Mock.findById = jest.fn();
  Mock.findOne = jest.fn();
  Mock.findByIdAndUpdate = jest.fn();
  Mock.findByIdAndDelete = jest.fn();
  Mock.countDocuments = jest.fn().mockResolvedValue(1);
  return Mock;
});

jest.mock('../models/User', () => ({
  findById: jest.fn(),
  findByIdAndUpdate: jest.fn(),
  countDocuments: jest.fn().mockResolvedValue(0),
}));

jest.mock('../models/Apartment', () => ({
  countDocuments: jest.fn().mockResolvedValue(0),
}));

jest.mock('../models/Complaint', () => ({
  countDocuments: jest.fn().mockResolvedValue(0),
}));

const Building = require('../models/Building');
const User = require('../models/User');
const app = require('../server');
beforeEach(() => jest.clearAllMocks());

describe('GET /api/v1/buildings/my', () => {
  it('returns 404 when user has no building', async () => {
    User.findById.mockReturnValue(makeQuery({ _id: 'user123', building: null }));
    const res = await request(app).get('/api/v1/buildings/my');
    expect(res.statusCode).toBe(404);
  });

  it('returns the user\'s building', async () => {
    User.findById.mockReturnValue(makeQuery({ _id: 'user123', building: 'building123' }));
    Building.findById.mockReturnValue(makeQuery(mockBuilding));
    const res = await request(app).get('/api/v1/buildings/my');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

describe('GET /api/v1/buildings', () => {
  it('returns list of buildings', async () => {
    Building.find.mockReturnValue(makeQuery([mockBuilding]));
    Building.countDocuments.mockResolvedValue(1);
    const res = await request(app).get('/api/v1/buildings');
    expect(res.statusCode).toBe(200);
    expect(res.body.data).toHaveProperty('buildings');
  });
});

describe('POST /api/v1/buildings', () => {
  it('returns 400 when required fields are missing', async () => {
    const res = await request(app).post('/api/v1/buildings').send({ name: 'Residence A' });
    expect(res.statusCode).toBe(400);
  });

  it('returns 409 when building already exists', async () => {
    Building.findOne.mockResolvedValue(mockBuilding);
    const res = await request(app).post('/api/v1/buildings').send({ name: 'Residence A', address: '123 Main St', city: 'Casablanca', totalApartments: 20 });
    expect(res.statusCode).toBe(409);
  });

  it('creates building successfully', async () => {
    Building.findOne.mockResolvedValue(null);
    mockBuilding.save.mockResolvedValue(undefined);
    User.findByIdAndUpdate.mockResolvedValue({});
    const res = await request(app).post('/api/v1/buildings').send({ name: 'Residence B', address: '456 Side St', city: 'Rabat', totalApartments: 10 });
    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
  });
});

describe('GET /api/v1/buildings/:buildingId/stats', () => {
  it('returns 404 when building not found', async () => {
    Building.findById.mockResolvedValue(null);
    const res = await request(app).get('/api/v1/buildings/notfound/stats');
    expect(res.statusCode).toBe(404);
  });

  it('returns building stats', async () => {
    Building.findById.mockResolvedValue(mockBuilding);
    User.countDocuments.mockResolvedValue(5);
    const res = await request(app).get('/api/v1/buildings/building123/stats');
    expect(res.statusCode).toBe(200);
    expect(res.body.data).toHaveProperty('residents');
    expect(res.body.data).toHaveProperty('apartments');
  });
});

describe('POST /api/v1/buildings/:buildingId/assign-caretaker', () => {
  it('returns 400 when caretakerId is missing', async () => {
    const res = await request(app).post('/api/v1/buildings/building123/assign-caretaker').send({});
    expect(res.statusCode).toBe(400);
  });

  it('assigns caretaker successfully', async () => {
    Building.findById.mockResolvedValue(mockBuilding);
    User.findById.mockResolvedValue({ _id: 'gardien1', role: 'gardien' });
    Building.findByIdAndUpdate.mockReturnValue(makeQuery(mockBuilding));
    User.findByIdAndUpdate.mockResolvedValue({});
    const res = await request(app).post('/api/v1/buildings/building123/assign-caretaker').send({ caretakerId: 'gardien1' });
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

describe('GET /api/v1/buildings/:buildingId', () => {
  it('returns 404 when not found', async () => {
    Building.findById.mockReturnValue(makeQuery(null));
    const res = await request(app).get('/api/v1/buildings/notfound');
    expect(res.statusCode).toBe(404);
  });

  it('returns building when found', async () => {
    Building.findById.mockReturnValue(makeQuery(mockBuilding));
    const res = await request(app).get('/api/v1/buildings/building123');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

describe('PUT /api/v1/buildings/:buildingId', () => {
  it('returns 404 when not found', async () => {
    Building.findByIdAndUpdate.mockReturnValue(makeQuery(null));
    const res = await request(app).put('/api/v1/buildings/notfound').send({ city: 'Fes' });
    expect(res.statusCode).toBe(404);
  });

  it('updates building successfully', async () => {
    Building.findByIdAndUpdate.mockReturnValue(makeQuery(mockBuilding));
    const res = await request(app).put('/api/v1/buildings/building123').send({ city: 'Fes' });
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

describe('DELETE /api/v1/buildings/:buildingId', () => {
  it('returns 404 when not found', async () => {
    Building.findById.mockResolvedValue(null);
    const res = await request(app).delete('/api/v1/buildings/notfound');
    expect(res.statusCode).toBe(404);
  });

  it('returns 400 when building has active residents', async () => {
    Building.findById.mockResolvedValue(mockBuilding);
    User.countDocuments.mockResolvedValue(3);
    const res = await request(app).delete('/api/v1/buildings/building123');
    expect(res.statusCode).toBe(400);
  });

  it('deletes building successfully', async () => {
    Building.findById.mockResolvedValue(mockBuilding);
    User.countDocuments.mockResolvedValue(0);
    Building.findByIdAndDelete.mockResolvedValue(mockBuilding);
    const res = await request(app).delete('/api/v1/buildings/building123');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
