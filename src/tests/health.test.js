const request = require('supertest');

// Mock database so the app loads without a real MongoDB connection
jest.mock('../config/database', () => ({
  connect: jest.fn().mockResolvedValue(undefined),
  disconnect: jest.fn().mockResolvedValue(undefined),
}));

const app = require('../server');

describe('GET /api/v1/health', () => {
  it('returns 200 with status OK', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('OK');
    expect(res.body).toHaveProperty('timestamp');
    expect(res.body).toHaveProperty('uptime');
    expect(res.body.apiVersion).toBe('v1');
  });
});

describe('Unknown routes', () => {
  it('returns 404 for unrecognised paths', async () => {
    const res = await request(app).get('/api/v1/does-not-exist');
    expect(res.statusCode).toBe(404);
    expect(res.body.success).toBe(false);
  });
});

describe('Auth routes exist', () => {
  it('POST /api/v1/auth/login returns 400 (not 404) when body is missing', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({});
    expect(res.statusCode).not.toBe(404);
  });

  it('POST /api/v1/auth/register returns 400 (not 404) when body is missing', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({});
    expect(res.statusCode).not.toBe(404);
  });
});
