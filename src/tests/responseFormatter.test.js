const { ApiResponse } = require('../utils/responseFormatter');

describe('ApiResponse', () => {
  it('sets success=true for 2xx status codes', () => {
    const res = new ApiResponse(200, { id: 1 }, 'OK');
    expect(res.success).toBe(true);
    expect(res.statusCode).toBe(200);
    expect(res.data).toEqual({ id: 1 });
    expect(res.message).toBe('OK');
  });

  it('sets success=false for 4xx status codes', () => {
    const res = new ApiResponse(404, null, 'Not Found');
    expect(res.success).toBe(false);
    expect(res.statusCode).toBe(404);
    expect(res.data).toBeNull();
  });

  it('sets success=false for 5xx status codes', () => {
    const res = new ApiResponse(500, null, 'Server Error');
    expect(res.success).toBe(false);
  });

  it('defaults data to null and message to "Success"', () => {
    const res = new ApiResponse(201);
    expect(res.data).toBeNull();
    expect(res.message).toBe('Success');
  });

  it('includes a timestamp', () => {
    const res = new ApiResponse(200);
    expect(res.timestamp).toBeInstanceOf(Date);
  });
});
