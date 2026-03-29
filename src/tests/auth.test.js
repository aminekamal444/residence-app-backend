const request = require('supertest');
const jwt = require('jsonwebtoken');

jest.mock('../config/database', () => ({
  connect: jest.fn().mockResolvedValue(undefined),
  disconnect: jest.fn().mockResolvedValue(undefined),
}));

// Helper: make a chainable + awaitable mock query
const makeQuery = (value) => {
  const q = {
    populate: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    sort: jest.fn().mockReturnThis(),
    lean: jest.fn().mockReturnThis(),
    then: (resolve, reject) => Promise.resolve(value).then(resolve, reject),
    catch: (fn) => Promise.resolve(value).catch(fn),
  };
  return q;
};

// Helper: generate a valid JWT for a test user
const makeToken = (role = 'syndic') =>
  jwt.sign(
    { userId: 'user123', role, building: 'building123' },
    'test-jwt-secret-do-not-use-in-production',
    { expiresIn: '1h' }
  );

// Mock User model
const mockUserInstance = {
  _id: 'user123',
  name: 'Test User',
  email: 'test@test.com',
  role: 'syndic',
  building: 'building123',
  status: 'active',
  password: '$2b$10$hashedpassword',
  lastLogin: null,
  save: jest.fn().mockResolvedValue(undefined),
  toJSON: jest.fn().mockReturnValue({ _id: 'user123', name: 'Test User', email: 'test@test.com', role: 'syndic' }),
};

jest.mock('../models/User', () => {
  const MockUser = jest.fn().mockImplementation(() => mockUserInstance);
  MockUser.findOne = jest.fn();
  MockUser.findById = jest.fn();
  MockUser.findByIdAndUpdate = jest.fn();
  return MockUser;
});

jest.mock('bcrypt', () => ({
  compare: jest.fn(),
  hash: jest.fn().mockResolvedValue('hashedpassword'),
  genSalt: jest.fn().mockResolvedValue('salt'),
}));

const bcrypt = require('bcrypt');
const User = require('../models/User');
const app = require('../server');

describe('POST /api/v1/auth/register', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    User.findOne.mockReturnValue(makeQuery(null)); // no existing user
    mockUserInstance.save.mockResolvedValue(undefined);
  });

  it('returns 400 when required fields are missing', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({});
    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('returns 400 when passwords do not match', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({
      name: 'Test', email: 'test@test.com', password: 'Pass1234!', passwordConfirm: 'Different1!', role: 'resident'
    });
    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('returns 400 for invalid role', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({
      name: 'Test', email: 'test@test.com', password: 'Pass1234!', passwordConfirm: 'Pass1234!', role: 'invalid_role'
    });
    expect(res.statusCode).toBe(400);
  });

  it('returns 409 when email already exists', async () => {
    User.findOne.mockReturnValue(makeQuery({ _id: 'existing' }));
    const res = await request(app).post('/api/v1/auth/register').send({
      name: 'Test', email: 'test@test.com', password: 'Pass1234!', passwordConfirm: 'Pass1234!', role: 'resident'
    });
    expect(res.statusCode).toBe(409);
  });

  it('returns 201 on successful registration', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({
      name: 'Test User', email: 'newuser@test.com', password: 'Pass1234!', passwordConfirm: 'Pass1234!', role: 'resident'
    });
    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('accessToken');
    expect(res.body.data).toHaveProperty('refreshToken');
  });
});

describe('POST /api/v1/auth/login', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 400 when email and password are missing', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({});
    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('returns 401 when user is not found', async () => {
    User.findOne.mockReturnValue(makeQuery(null));
    const res = await request(app).post('/api/v1/auth/login').send({ email: 'nobody@test.com', password: 'Pass1234!' });
    expect(res.statusCode).toBe(401);
  });

  it('returns 401 when password is wrong', async () => {
    User.findOne.mockReturnValue(makeQuery(mockUserInstance));
    bcrypt.compare.mockResolvedValue(false);
    const res = await request(app).post('/api/v1/auth/login').send({ email: 'test@test.com', password: 'WrongPass!' });
    expect(res.statusCode).toBe(401);
  });

  it('returns 200 with tokens on successful login', async () => {
    User.findOne.mockReturnValue(makeQuery(mockUserInstance));
    bcrypt.compare.mockResolvedValue(true);
    mockUserInstance.save.mockResolvedValue(undefined);
    const res = await request(app).post('/api/v1/auth/login').send({ email: 'test@test.com', password: 'Pass1234!' });
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('accessToken');
  });
});

describe('POST /api/v1/auth/refresh-token', () => {
  it('returns 400 when refresh token is missing', async () => {
    const res = await request(app).post('/api/v1/auth/refresh-token').send({});
    expect(res.statusCode).toBe(400);
  });

  it('returns 401 when refresh token is invalid', async () => {
    const res = await request(app).post('/api/v1/auth/refresh-token').send({ refreshToken: 'invalid.token.here' });
    expect(res.statusCode).toBe(401);
  });

  it('returns 200 with new tokens on valid refresh token', async () => {
    const refreshToken = jwt.sign(
      { userId: 'user123', role: 'syndic', building: 'building123' },
      'test-jwt-refresh-secret-do-not-use-in-production',
      { expiresIn: '7d' }
    );
    User.findById.mockReturnValue(makeQuery(mockUserInstance));
    const res = await request(app).post('/api/v1/auth/refresh-token').send({ refreshToken });
    expect(res.statusCode).toBe(200);
    expect(res.body.data).toHaveProperty('accessToken');
  });
});

describe('GET /api/v1/auth/me', () => {
  it('returns 401 without token', async () => {
    const res = await request(app).get('/api/v1/auth/me');
    expect(res.statusCode).toBe(401);
  });

  it('returns 200 with user data when authenticated', async () => {
    User.findById.mockReturnValue(makeQuery(mockUserInstance));
    const token = makeToken();
    const res = await request(app).get('/api/v1/auth/me').set('Authorization', `Bearer ${token}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

describe('POST /api/v1/auth/logout', () => {
  it('returns 401 without token', async () => {
    const res = await request(app).post('/api/v1/auth/logout').send({});
    expect(res.statusCode).toBe(401);
  });

  it('returns 200 when authenticated', async () => {
    User.findById.mockReturnValue(makeQuery(mockUserInstance));
    const token = makeToken();
    const res = await request(app).post('/api/v1/auth/logout').set('Authorization', `Bearer ${token}`).send({});
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

describe('POST /api/v1/auth/change-password', () => {
  it('returns 401 without token', async () => {
    const res = await request(app).post('/api/v1/auth/change-password').send({});
    expect(res.statusCode).toBe(401);
  });

  it('returns 400 when fields are missing', async () => {
    User.findById.mockReturnValue(makeQuery(mockUserInstance));
    const token = makeToken();
    const res = await request(app)
      .post('/api/v1/auth/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({});
    expect(res.statusCode).toBe(400);
  });

  it('returns 401 when current password is wrong', async () => {
    User.findById.mockReturnValue(makeQuery(mockUserInstance));
    bcrypt.compare.mockResolvedValue(false);
    const token = makeToken();
    const res = await request(app)
      .post('/api/v1/auth/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({ currentPassword: 'wrong', newPassword: 'NewPass1!', passwordConfirm: 'NewPass1!' });
    expect(res.statusCode).toBe(401);
  });
});
