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

const mockVoteOption = { _id: 'opt1', optionText: 'Option A', voteCount: 0 };
mockVoteOption.save = jest.fn().mockResolvedValue(mockVoteOption);
const mockVote = {
  _id: 'vote123', title: 'Best color?', type: 'multiple_choice', status: 'active', building: 'building123',
  voters: [], totalVotes: 0, options: [mockVoteOption],
  save: jest.fn().mockResolvedValue(undefined)
};

jest.mock('../models/Vote', () => {
  const Mock = jest.fn().mockImplementation(() => mockVote);
  Mock.find = jest.fn();
  Mock.findById = jest.fn();
  Mock.findByIdAndUpdate = jest.fn();
  Mock.countDocuments = jest.fn().mockResolvedValue(2);
  return Mock;
});

jest.mock('../models/VoteOption', () => {
  const Mock = jest.fn().mockImplementation(() => mockVoteOption);
  Mock.findByIdAndUpdate = jest.fn().mockResolvedValue(mockVoteOption);
  return Mock;
});

const Vote = require('../models/Vote');
const app = require('../server');
beforeEach(() => jest.clearAllMocks());

describe('GET /api/v1/votes', () => {
  it('returns list of votes', async () => {
    Vote.find.mockReturnValue(makeQuery([mockVote]));
    Vote.countDocuments.mockResolvedValue(1);
    const res = await request(app).get('/api/v1/votes');
    expect(res.statusCode).toBe(200);
    expect(res.body.data).toHaveProperty('votes');
  });
});

describe('POST /api/v1/votes', () => {
  it('returns 400 when required fields are missing', async () => {
    const res = await request(app).post('/api/v1/votes').send({ title: 'Color?' });
    expect(res.statusCode).toBe(400);
  });

  it('returns 400 when less than 2 options are provided', async () => {
    const res = await request(app).post('/api/v1/votes').send({ title: 'Color?', voteType: 'multiple_choice', options: ['Red'] });
    expect(res.statusCode).toBe(400);
  });

  it('creates vote successfully', async () => {
    mockVote.save.mockResolvedValue(undefined);
    const res = await request(app).post('/api/v1/votes').send({
      title: 'Best color?', voteType: 'multiple_choice', options: ['Red', 'Blue'], endDate: '2025-12-31'
    });
    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
  });
});

describe('POST /api/v1/votes/:voteId/vote/:optionId', () => {
  it('returns 404 when vote not found', async () => {
    Vote.findById.mockResolvedValue(null);
    const res = await request(app).post('/api/v1/votes/notfound/vote/opt1');
    expect(res.statusCode).toBe(404);
  });

  it('casts vote successfully', async () => {
    const freshVote = { ...mockVote, voters: [], save: jest.fn().mockResolvedValue(undefined) };
    Vote.findById
      .mockResolvedValueOnce(freshVote)
      .mockReturnValueOnce(makeQuery(freshVote));
    const res = await request(app).post('/api/v1/votes/vote123/vote/opt1');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

describe('GET /api/v1/votes/:voteId/results', () => {
  it('returns 404 when vote not found', async () => {
    Vote.findById.mockReturnValue(makeQuery(null));
    const res = await request(app).get('/api/v1/votes/notfound/results');
    expect(res.statusCode).toBe(404);
  });

  it('returns vote results', async () => {
    Vote.findById.mockReturnValue(makeQuery(mockVote));
    const res = await request(app).get('/api/v1/votes/vote123/results');
    expect(res.statusCode).toBe(200);
    expect(res.body.data).toHaveProperty('results');
  });
});

describe('POST /api/v1/votes/:voteId/close', () => {
  it('returns 404 when vote not found', async () => {
    Vote.findByIdAndUpdate.mockReturnValue(makeQuery(null));
    const res = await request(app).post('/api/v1/votes/notfound/close');
    expect(res.statusCode).toBe(404);
  });

  it('closes vote successfully', async () => {
    Vote.findByIdAndUpdate.mockReturnValue(makeQuery({ ...mockVote, status: 'closed' }));
    const res = await request(app).post('/api/v1/votes/vote123/close');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

describe('GET /api/v1/votes/:voteId', () => {
  it('returns 404 when not found', async () => {
    Vote.findById.mockReturnValue(makeQuery(null));
    const res = await request(app).get('/api/v1/votes/notfound');
    expect(res.statusCode).toBe(404);
  });

  it('returns vote when found', async () => {
    Vote.findById.mockReturnValue(makeQuery(mockVote));
    const res = await request(app).get('/api/v1/votes/vote123');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
