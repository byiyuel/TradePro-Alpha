const request = require('supertest');
const app = require('../src/backend/server-new');

describe('Health Check Endpoints', () => {
  test('GET /api/health should return health status', async () => {
    const response = await request(app)
      .get('/api/health')
      .expect('Content-Type', /json/);

    expect(response.status).toBeOneOf([200, 503]); // Healthy or degraded
    expect(response.body).toHaveProperty('success', true);
    expect(response.body).toHaveProperty('data');
    expect(response.body.data).toHaveProperty('status');
    expect(response.body.data).toHaveProperty('timestamp');
    expect(response.body.data).toHaveProperty('uptime');
    expect(response.body.data).toHaveProperty('memory');
    expect(response.body.data).toHaveProperty('cache');
    expect(response.body.data).toHaveProperty('api');
  });

  test('GET /api/health/ping should return pong', async () => {
    const response = await request(app)
      .get('/api/health/ping')
      .expect(200)
      .expect('Content-Type', /json/);

    expect(response.body).toHaveProperty('success', true);
    expect(response.body).toHaveProperty('message', 'pong');
    expect(response.body).toHaveProperty('timestamp');
  });

  test('GET /api/health/cache should return cache stats', async () => {
    const response = await request(app)
      .get('/api/health/cache')
      .expect(200)
      .expect('Content-Type', /json/);

    expect(response.body).toHaveProperty('success', true);
    expect(response.body).toHaveProperty('data');
    expect(response.body.data).toHaveProperty('size');
    expect(response.body.data).toHaveProperty('maxSize');
  });
});

// Jest custom matcher
expect.extend({
  toBeOneOf(received, array) {
    const pass = array.includes(received);
    if (pass) {
      return {
        message: () => `expected ${received} not to be one of ${array}`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be one of ${array}`,
        pass: false,
      };
    }
  },
});

