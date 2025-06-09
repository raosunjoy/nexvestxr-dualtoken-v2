const request = require('supertest');
const app = require('../backend/src/server').app;

describe('NexVestXR Platform Integration Tests', () => {
  let token;

  beforeAll(async () => {
    // Mock user login to get token
    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@nexvestxr.com', password: 'password123' });
    token = response.body.token;
  });

  test('Health check endpoint should return 200', async () => {
    const response = await request(app).get('/health');
    expect(response.status).toBe(200);
    expect(response.body.status).toBe('healthy');
  });

  test('Authenticated user can fetch payment methods', async () => {
    const response = await request(app)
      .get('/api/payment/methods')
      .set('Authorization', `Bearer ${token}`);
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.methods).toBeInstanceOf(Array);
  });
});