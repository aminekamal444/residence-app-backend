const request = require('supertest');

jest.mock('../config/database', () => ({ connect: jest.fn(), disconnect: jest.fn() }));
jest.mock('../middleware/authMiddleware', () => (req, res, next) => {
  req.user = { _id: 'user123', role: 'syndic', building: 'building123' };
  next();
});

const mockNotification = { _id: 'notif123', title: 'New charge', status: 'unread', recipient: 'user123' };

// Mock notificationService so we don't need a real database
jest.mock('../services/notificationService', () => ({
  getUserNotifications: jest.fn(),
  getUnreadCount: jest.fn(),
  markAllAsRead: jest.fn(),
  markAsRead: jest.fn(),
  archiveNotification: jest.fn(),
}));

const notificationService = require('../services/notificationService');
const app = require('../server');
beforeEach(() => jest.clearAllMocks());

describe('GET /api/v1/notifications', () => {
  it('returns list of notifications', async () => {
    notificationService.getUserNotifications.mockResolvedValue([mockNotification]);
    const res = await request(app).get('/api/v1/notifications');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

describe('GET /api/v1/notifications/unread-count', () => {
  it('returns the unread notification count', async () => {
    notificationService.getUnreadCount.mockResolvedValue(5);
    const res = await request(app).get('/api/v1/notifications/unread-count');
    expect(res.statusCode).toBe(200);
    expect(res.body.data).toHaveProperty('count');
    expect(res.body.data.count).toBe(5);
  });
});

describe('PUT /api/v1/notifications/mark-all-read', () => {
  it('marks all notifications as read', async () => {
    notificationService.markAllAsRead.mockResolvedValue({ modifiedCount: 3 });
    const res = await request(app).put('/api/v1/notifications/mark-all-read');
    expect(res.statusCode).toBe(200);
    expect(res.body.data).toHaveProperty('modified');
    expect(res.body.data.modified).toBe(3);
  });
});

describe('PUT /api/v1/notifications/:notificationId/read', () => {
  it('marks one notification as read', async () => {
    notificationService.markAsRead.mockResolvedValue({ ...mockNotification, status: 'read' });
    const res = await request(app).put('/api/v1/notifications/notif123/read');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

describe('PUT /api/v1/notifications/:notificationId/archive', () => {
  it('archives a notification', async () => {
    notificationService.archiveNotification.mockResolvedValue({ ...mockNotification, status: 'archived' });
    const res = await request(app).put('/api/v1/notifications/notif123/archive');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
