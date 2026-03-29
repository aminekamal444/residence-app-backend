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

const mockComplaint = { _id: 'complaint123', title: 'Noise issue', category: 'noise', status: 'open', building: 'building123', save: jest.fn().mockResolvedValue(undefined) };

jest.mock('../models/Complaint', () => {
  const Mock = jest.fn().mockImplementation(() => mockComplaint);
  Mock.find = jest.fn();
  Mock.findById = jest.fn();
  Mock.findByIdAndUpdate = jest.fn();
  Mock.countDocuments = jest.fn().mockResolvedValue(2);
  return Mock;
});

const Complaint = require('../models/Complaint');
const app = require('../server');
beforeEach(() => jest.clearAllMocks());

describe('GET /api/v1/complaints', () => {
  it('returns list of complaints', async () => {
    Complaint.find.mockReturnValue(makeQuery([mockComplaint]));
    Complaint.countDocuments.mockResolvedValue(1);
    const res = await request(app).get('/api/v1/complaints');
    expect(res.statusCode).toBe(200);
    expect(res.body.data).toHaveProperty('complaints');
  });
});

describe('POST /api/v1/complaints', () => {
  it('returns 400 when required fields are missing', async () => {
    const res = await request(app).post('/api/v1/complaints').send({ title: 'Noise' });
    expect(res.statusCode).toBe(400);
  });

  it('creates complaint successfully', async () => {
    mockComplaint.save.mockResolvedValue(undefined);
    const res = await request(app).post('/api/v1/complaints').send({ title: 'Noise', description: 'Very loud', category: 'noise' });
    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
  });
});

describe('GET /api/v1/complaints/resident/my-complaints', () => {
  it('returns 403 when user is not a resident', async () => {
    const res = await request(app).get('/api/v1/complaints/resident/my-complaints');
    expect(res.statusCode).toBe(403);
  });
});

describe('PUT /api/v1/complaints/:complaintId/status', () => {
  it('returns 400 when status is missing', async () => {
    const res = await request(app).put('/api/v1/complaints/complaint123/status').send({});
    expect(res.statusCode).toBe(400);
  });

  it('returns 404 when complaint not found', async () => {
    Complaint.findByIdAndUpdate.mockReturnValue(makeQuery(null));
    const res = await request(app).put('/api/v1/complaints/notfound/status').send({ status: 'in_progress' });
    expect(res.statusCode).toBe(404);
  });

  it('updates complaint status successfully', async () => {
    Complaint.findByIdAndUpdate.mockReturnValue(makeQuery(mockComplaint));
    const res = await request(app).put('/api/v1/complaints/complaint123/status').send({ status: 'in_progress' });
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

describe('POST /api/v1/complaints/:complaintId/response', () => {
  it('returns 400 when text is missing', async () => {
    const res = await request(app).post('/api/v1/complaints/complaint123/response').send({});
    expect(res.statusCode).toBe(400);
  });

  it('returns 404 when complaint not found', async () => {
    Complaint.findByIdAndUpdate.mockReturnValue(makeQuery(null));
    const res = await request(app).post('/api/v1/complaints/notfound/response').send({ text: 'We will fix it' });
    expect(res.statusCode).toBe(404);
  });

  it('adds response successfully', async () => {
    Complaint.findByIdAndUpdate.mockReturnValue(makeQuery(mockComplaint));
    const res = await request(app).post('/api/v1/complaints/complaint123/response').send({ text: 'We will fix it' });
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

describe('POST /api/v1/complaints/:complaintId/rate', () => {
  it('returns 403 when user is not a resident', async () => {
    const res = await request(app).post('/api/v1/complaints/complaint123/rate').send({ rating: 4 });
    expect(res.statusCode).toBe(403);
  });
});

describe('GET /api/v1/complaints/:complaintId', () => {
  it('returns 404 when not found', async () => {
    Complaint.findById.mockReturnValue(makeQuery(null));
    const res = await request(app).get('/api/v1/complaints/notfound');
    expect(res.statusCode).toBe(404);
  });

  it('returns complaint when found', async () => {
    Complaint.findById.mockReturnValue(makeQuery(mockComplaint));
    const res = await request(app).get('/api/v1/complaints/complaint123');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
