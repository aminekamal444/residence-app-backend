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

const mockTask = { _id: 'task123', title: 'Fix leak', category: 'plumbing', priority: 'high', status: 'pending', building: 'building123', save: jest.fn().mockResolvedValue(undefined) };

jest.mock('../models/Task', () => {
  const Mock = jest.fn().mockImplementation(() => mockTask);
  Mock.find = jest.fn();
  Mock.findById = jest.fn();
  Mock.findByIdAndUpdate = jest.fn();
  Mock.countDocuments = jest.fn().mockResolvedValue(3);
  return Mock;
});

const Task = require('../models/Task');
const app = require('../server');
beforeEach(() => jest.clearAllMocks());

describe('GET /api/v1/tasks', () => {
  it('returns list of tasks', async () => {
    Task.find.mockReturnValue(makeQuery([mockTask]));
    Task.countDocuments.mockResolvedValue(1);
    const res = await request(app).get('/api/v1/tasks');
    expect(res.statusCode).toBe(200);
    expect(res.body.data).toHaveProperty('tasks');
  });
});

describe('POST /api/v1/tasks', () => {
  it('returns 400 when required fields are missing', async () => {
    const res = await request(app).post('/api/v1/tasks').send({ title: 'Fix leak' });
    expect(res.statusCode).toBe(400);
  });

  it('creates task successfully', async () => {
    mockTask.save.mockResolvedValue(undefined);
    const res = await request(app).post('/api/v1/tasks').send({ title: 'Fix leak', category: 'plumbing', priority: 'high' });
    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
  });
});

describe('GET /api/v1/tasks/gardien/my-tasks', () => {
  it('returns 403 when user is not a gardien', async () => {
    const res = await request(app).get('/api/v1/tasks/gardien/my-tasks');
    expect(res.statusCode).toBe(403);
  });
});

describe('POST /api/v1/tasks/:taskId/assign', () => {
  it('returns 400 when assignedTo is missing', async () => {
    const res = await request(app).post('/api/v1/tasks/task123/assign').send({});
    expect(res.statusCode).toBe(400);
  });

  it('returns 404 when task not found', async () => {
    Task.findByIdAndUpdate.mockReturnValue(makeQuery(null));
    const res = await request(app).post('/api/v1/tasks/notfound/assign').send({ assignedTo: 'gardien1' });
    expect(res.statusCode).toBe(404);
  });

  it('assigns task successfully', async () => {
    Task.findByIdAndUpdate.mockReturnValue(makeQuery(mockTask));
    const res = await request(app).post('/api/v1/tasks/task123/assign').send({ assignedTo: 'gardien1' });
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

describe('PUT /api/v1/tasks/:taskId/status', () => {
  it('returns 400 when status is missing', async () => {
    const res = await request(app).put('/api/v1/tasks/task123/status').send({});
    expect(res.statusCode).toBe(400);
  });

  it('returns 404 when task not found', async () => {
    Task.findByIdAndUpdate.mockResolvedValue(null);
    const res = await request(app).put('/api/v1/tasks/notfound/status').send({ status: 'in_progress' });
    expect(res.statusCode).toBe(404);
  });

  it('updates task status successfully', async () => {
    Task.findByIdAndUpdate.mockResolvedValue(mockTask);
    const res = await request(app).put('/api/v1/tasks/task123/status').send({ status: 'in_progress' });
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

describe('POST /api/v1/tasks/:taskId/submit', () => {
  it('returns 403 when user is not a gardien', async () => {
    const res = await request(app).post('/api/v1/tasks/task123/submit');
    expect(res.statusCode).toBe(403);
  });
});

describe('POST /api/v1/tasks/:taskId/approve', () => {
  it('returns 404 when task not found', async () => {
    Task.findByIdAndUpdate.mockResolvedValue(null);
    const res = await request(app).post('/api/v1/tasks/notfound/approve');
    expect(res.statusCode).toBe(404);
  });

  it('approves task successfully', async () => {
    Task.findByIdAndUpdate.mockResolvedValue(mockTask);
    const res = await request(app).post('/api/v1/tasks/task123/approve');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

describe('POST /api/v1/tasks/:taskId/reject', () => {
  it('returns 400 when reason is missing', async () => {
    const res = await request(app).post('/api/v1/tasks/task123/reject').send({});
    expect(res.statusCode).toBe(400);
  });

  it('returns 404 when task not found', async () => {
    Task.findByIdAndUpdate.mockResolvedValue(null);
    const res = await request(app).post('/api/v1/tasks/notfound/reject').send({ reason: 'bad work' });
    expect(res.statusCode).toBe(404);
  });

  it('rejects task successfully', async () => {
    Task.findByIdAndUpdate.mockResolvedValue(mockTask);
    const res = await request(app).post('/api/v1/tasks/task123/reject').send({ reason: 'bad work' });
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

describe('GET /api/v1/tasks/:taskId', () => {
  it('returns 404 when task not found', async () => {
    Task.findById.mockReturnValue(makeQuery(null));
    const res = await request(app).get('/api/v1/tasks/notfound');
    expect(res.statusCode).toBe(404);
  });

  it('returns task when found', async () => {
    Task.findById.mockReturnValue(makeQuery(mockTask));
    const res = await request(app).get('/api/v1/tasks/task123');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
