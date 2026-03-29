const request = require('supertest');

jest.mock('../config/database', () => ({ connect: jest.fn(), disconnect: jest.fn() }));
jest.mock('../middleware/authMiddleware', () => (req, res, next) => {
  req.user = { _id: 'user123', role: 'syndic', building: 'building123' };
  next();
});

const mockPhoto = { _id: 'photo123', photoUrl: 'http://example.com/photo.jpg', photoType: 'before', approvalStatus: 'pending' };

// Mock the entire photoService so we don't need a real database
jest.mock('../services/photoService', () => ({
  uploadTaskPhoto: jest.fn(),
  getPhotosForTask: jest.fn(),
  getPhotosByType: jest.fn(),
  compareBeforeAfterPhotos: jest.fn(),
  getPhotoStatistics: jest.fn(),
  validatePhotoQuality: jest.fn(),
  approvePhoto: jest.fn(),
  rejectPhoto: jest.fn(),
  deletePhoto: jest.fn(),
}));

const photoService = require('../services/photoService');
const app = require('../server');
beforeEach(() => jest.clearAllMocks());

describe('POST /api/v1/photos/:taskId/upload', () => {
  it('returns 403 when user is not a gardien', async () => {
    const res = await request(app).post('/api/v1/photos/task123/upload').send({ photoUrl: 'http://x.com/img.jpg', photoType: 'before' });
    expect(res.statusCode).toBe(403);
  });
});

describe('GET /api/v1/photos/:taskId/list', () => {
  it('returns list of photos for a task', async () => {
    photoService.getPhotosForTask.mockResolvedValue([mockPhoto]);
    const res = await request(app).get('/api/v1/photos/task123/list');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});

describe('GET /api/v1/photos/:taskId/type/:type', () => {
  it('returns photos filtered by type', async () => {
    photoService.getPhotosByType.mockResolvedValue([mockPhoto]);
    const res = await request(app).get('/api/v1/photos/task123/type/before');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

describe('GET /api/v1/photos/:taskId/compare', () => {
  it('returns comparison data', async () => {
    photoService.compareBeforeAfterPhotos.mockResolvedValue({ beforePhotos: [], afterPhotos: [] });
    const res = await request(app).get('/api/v1/photos/task123/compare');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

describe('GET /api/v1/photos/:taskId/statistics', () => {
  it('returns photo statistics', async () => {
    photoService.getPhotoStatistics.mockResolvedValue({ totalPhotos: 3, beforePhotos: 1, afterPhotos: 2 });
    const res = await request(app).get('/api/v1/photos/task123/statistics');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

describe('POST /api/v1/photos/:photoId/validate', () => {
  it('validates photo quality', async () => {
    photoService.validatePhotoQuality.mockResolvedValue(mockPhoto);
    const res = await request(app).post('/api/v1/photos/photo123/validate').send({ blurScore: 10 });
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

describe('POST /api/v1/photos/:photoId/approve', () => {
  it('approves photo', async () => {
    photoService.approvePhoto.mockResolvedValue({ ...mockPhoto, approvalStatus: 'approved' });
    const res = await request(app).post('/api/v1/photos/photo123/approve');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

describe('POST /api/v1/photos/:photoId/reject', () => {
  it('returns 400 when reason is missing', async () => {
    const res = await request(app).post('/api/v1/photos/photo123/reject').send({});
    expect(res.statusCode).toBe(400);
  });

  it('rejects photo with reason', async () => {
    photoService.rejectPhoto.mockResolvedValue({ ...mockPhoto, approvalStatus: 'rejected' });
    const res = await request(app).post('/api/v1/photos/photo123/reject').send({ reason: 'Too blurry' });
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

describe('DELETE /api/v1/photos/:photoId', () => {
  it('deletes photo successfully', async () => {
    photoService.deletePhoto.mockResolvedValue({ message: 'Photo deleted successfully' });
    const res = await request(app).delete('/api/v1/photos/photo123');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
