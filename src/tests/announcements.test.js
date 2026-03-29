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

const mockAnnouncement = { _id: 'ann123', title: 'Meeting', content: 'We meet at 6pm', type: 'general', building: 'building123', likes: [], save: jest.fn().mockResolvedValue(undefined) };

jest.mock('../models/Announcement', () => {
  const Mock = jest.fn().mockImplementation(() => mockAnnouncement);
  Mock.find = jest.fn();
  Mock.findById = jest.fn();
  Mock.findByIdAndUpdate = jest.fn();
  Mock.findByIdAndDelete = jest.fn();
  Mock.countDocuments = jest.fn().mockResolvedValue(2);
  return Mock;
});

const Announcement = require('../models/Announcement');
const app = require('../server');
beforeEach(() => jest.clearAllMocks());

describe('GET /api/v1/announcements', () => {
  it('returns list of announcements', async () => {
    Announcement.find.mockReturnValue(makeQuery([mockAnnouncement]));
    Announcement.countDocuments.mockResolvedValue(1);
    const res = await request(app).get('/api/v1/announcements');
    expect(res.statusCode).toBe(200);
    expect(res.body.data).toHaveProperty('announcements');
  });
});

describe('POST /api/v1/announcements', () => {
  it('returns 400 when required fields are missing', async () => {
    const res = await request(app).post('/api/v1/announcements').send({ title: 'Meeting' });
    expect(res.statusCode).toBe(400);
  });

  it('creates announcement successfully', async () => {
    mockAnnouncement.save.mockResolvedValue(undefined);
    const res = await request(app).post('/api/v1/announcements').send({ title: 'Meeting', content: 'We meet at 6pm', type: 'general' });
    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
  });
});

describe('POST /api/v1/announcements/:announcementId/view', () => {
  it('returns 404 when announcement not found', async () => {
    Announcement.findByIdAndUpdate.mockReturnValue(makeQuery(null));
    const res = await request(app).post('/api/v1/announcements/notfound/view');
    expect(res.statusCode).toBe(404);
  });

  it('marks announcement as viewed', async () => {
    Announcement.findByIdAndUpdate.mockReturnValue(makeQuery(mockAnnouncement));
    const res = await request(app).post('/api/v1/announcements/ann123/view');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

describe('POST /api/v1/announcements/:announcementId/comment', () => {
  it('returns 400 when text is missing', async () => {
    const res = await request(app).post('/api/v1/announcements/ann123/comment').send({});
    expect(res.statusCode).toBe(400);
  });

  it('adds comment successfully', async () => {
    Announcement.findByIdAndUpdate.mockReturnValue(makeQuery(mockAnnouncement));
    const res = await request(app).post('/api/v1/announcements/ann123/comment').send({ text: 'Good news!' });
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

describe('POST /api/v1/announcements/:announcementId/like', () => {
  it('returns 404 when announcement not found', async () => {
    Announcement.findByIdAndUpdate.mockReturnValue(makeQuery(null));
    const res = await request(app).post('/api/v1/announcements/notfound/like');
    expect(res.statusCode).toBe(404);
  });

  it('likes announcement successfully', async () => {
    Announcement.findByIdAndUpdate.mockReturnValue(makeQuery(mockAnnouncement));
    const res = await request(app).post('/api/v1/announcements/ann123/like');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

describe('GET /api/v1/announcements/:announcementId', () => {
  it('returns 404 when not found', async () => {
    Announcement.findById.mockReturnValue(makeQuery(null));
    const res = await request(app).get('/api/v1/announcements/notfound');
    expect(res.statusCode).toBe(404);
  });

  it('returns announcement when found', async () => {
    Announcement.findById.mockReturnValue(makeQuery(mockAnnouncement));
    const res = await request(app).get('/api/v1/announcements/ann123');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

describe('PUT /api/v1/announcements/:announcementId', () => {
  it('returns 404 when not found', async () => {
    Announcement.findByIdAndUpdate.mockReturnValue(makeQuery(null));
    const res = await request(app).put('/api/v1/announcements/notfound').send({ title: 'Updated' });
    expect(res.statusCode).toBe(404);
  });

  it('updates announcement successfully', async () => {
    Announcement.findByIdAndUpdate.mockReturnValue(makeQuery(mockAnnouncement));
    const res = await request(app).put('/api/v1/announcements/ann123').send({ title: 'Updated' });
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

describe('DELETE /api/v1/announcements/:announcementId', () => {
  it('returns 404 when not found', async () => {
    Announcement.findByIdAndDelete.mockResolvedValue(null);
    const res = await request(app).delete('/api/v1/announcements/notfound');
    expect(res.statusCode).toBe(404);
  });

  it('deletes announcement successfully', async () => {
    Announcement.findByIdAndDelete.mockResolvedValue(mockAnnouncement);
    const res = await request(app).delete('/api/v1/announcements/ann123');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
