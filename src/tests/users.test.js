const request = require('supertest');

jest.mock('../config/database', () => ({
  connect: jest.fn().mockResolvedValue(undefined),
  disconnect: jest.fn().mockResolvedValue(undefined),
}));

const makeQuery = (value) => {
  const q = {
    populate: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    sort: jest.fn().mockReturnThis(),
    lean: jest.fn().mockReturnThis(),
    then: (resolve, reject) => Promise.resolve(value).then(resolve, reject),
    catch: (fn) => Promise.resolve(value).catch(fn),
  };
  return q;
};

// Mock auth middleware — inject a syndic user
jest.mock('../middleware/authMiddleware', () => (req, res, next) => {
  req.user = { _id: 'user123', role: 'syndic', building: 'building123' };
  next();
});

const mockUser = { _id: 'user456', name: 'John', email: 'john@test.com', role: 'resident', building: 'building123', apartment: 'apt123', save: jest.fn().mockResolvedValue(undefined), toJSON: jest.fn().mockReturnValue({ _id: 'user456', name: 'John' }) };

jest.mock('../models/User', () => {
  const MockUser = jest.fn().mockImplementation(() => mockUser);
  MockUser.find = jest.fn();
  MockUser.findById = jest.fn();
  MockUser.findOne = jest.fn();
  MockUser.findByIdAndDelete = jest.fn();
  MockUser.countDocuments = jest.fn().mockResolvedValue(5);
  return MockUser;
});

jest.mock('../models/Apartment', () => ({
  findById: jest.fn(),
  findByIdAndUpdate: jest.fn(),
}));

jest.mock('../models/Building', () => ({
  findById: jest.fn(),
}));

const User = require('../models/User');
const Apartment = require('../models/Apartment');
const app = require('../server');

beforeEach(() => jest.clearAllMocks());

describe('GET /api/v1/users', () => {
  it('returns list of users', async () => {
    User.find.mockReturnValue(makeQuery([mockUser]));
    User.countDocuments.mockResolvedValue(1);
    const res = await request(app).get('/api/v1/users');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('users');
  });
});

describe('POST /api/v1/users', () => {
  it('returns 400 when required fields are missing', async () => {
    const res = await request(app).post('/api/v1/users').send({ name: 'John' });
    expect(res.statusCode).toBe(400);
  });

  it('returns 409 when email already exists', async () => {
    User.findOne.mockReturnValue(makeQuery({ _id: 'existing' }));
    const res = await request(app).post('/api/v1/users').send({ name: 'John', email: 'john@test.com', password: 'Pass1!', role: 'resident' });
    expect(res.statusCode).toBe(409);
  });

  it('returns 201 on successful creation', async () => {
    User.findOne.mockReturnValue(makeQuery(null));
    mockUser.save.mockResolvedValue(undefined);
    const res = await request(app).post('/api/v1/users').send({ name: 'John', email: 'new@test.com', password: 'Pass1!', role: 'resident' });
    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
  });
});

describe('GET /api/v1/users/residents/list', () => {
  it('returns list of residents', async () => {
    User.find.mockReturnValue(makeQuery([mockUser]));
    User.countDocuments.mockResolvedValue(1);
    const res = await request(app).get('/api/v1/users/residents/list');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

describe('GET /api/v1/users/statistics/all', () => {
  it('returns user statistics', async () => {
    User.countDocuments.mockResolvedValue(10);
    const res = await request(app).get('/api/v1/users/statistics/all');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('total');
  });
});

describe('GET /api/v1/users/:userId', () => {
  it('returns 404 when user not found', async () => {
    User.findById.mockReturnValue(makeQuery(null));
    const res = await request(app).get('/api/v1/users/nonexistentid123');
    expect(res.statusCode).toBe(404);
  });

  it('returns user when found', async () => {
    User.findById.mockReturnValue(makeQuery(mockUser));
    const res = await request(app).get('/api/v1/users/user456');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

describe('PUT /api/v1/users/:userId', () => {
  it('returns 404 when user not found', async () => {
    User.findById.mockResolvedValue(null);
    const res = await request(app).put('/api/v1/users/nonexistent').send({ name: 'New Name' });
    expect(res.statusCode).toBe(404);
  });

  it('updates user successfully', async () => {
    User.findById.mockResolvedValue(mockUser);
    mockUser.save.mockResolvedValue(undefined);
    const res = await request(app).put('/api/v1/users/user456').send({ name: 'Updated Name' });
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

describe('DELETE /api/v1/users/:userId', () => {
  it('returns 404 when user not found', async () => {
    User.findById.mockResolvedValue(null);
    const res = await request(app).delete('/api/v1/users/nonexistent');
    expect(res.statusCode).toBe(404);
  });

  it('deletes user successfully', async () => {
    User.findById.mockResolvedValue({ ...mockUser, role: 'syndic', apartment: null });
    User.findByIdAndDelete.mockResolvedValue(mockUser);
    const res = await request(app).delete('/api/v1/users/user456');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

describe('POST /api/v1/users/assign-resident', () => {
  it('returns 400 when fields are missing', async () => {
    const res = await request(app).post('/api/v1/users/assign-resident').send({});
    expect(res.statusCode).toBe(400);
  });

  it('assigns resident to apartment successfully', async () => {
    User.findById.mockResolvedValue(mockUser);
    Apartment.findById.mockResolvedValue({ _id: 'apt123', building: 'building123', save: jest.fn().mockResolvedValue(undefined) });
    mockUser.save.mockResolvedValue(undefined);
    const res = await request(app).post('/api/v1/users/assign-resident').send({ residentId: 'user456', apartmentId: 'apt123' });
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
