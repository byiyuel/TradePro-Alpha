const request = require('supertest');
const app = require('../src/backend/server-new');

describe('Stocks API Endpoints', () => {
  test('GET /api/stocks should return stocks data', async () => {
    const response = await request(app)
      .get('/api/stocks')
      .expect('Content-Type', /json/);

    expect(response.status).toBeOneOf([200, 503]); // Success or service unavailable
    expect(response.body).toHaveProperty('success', true);
    expect(response.body).toHaveProperty('data');
    expect(response.body).toHaveProperty('timestamp');
    
    if (response.status === 200) {
      expect(Array.isArray(response.body.data)).toBe(true);
    }
  });

  test('GET /api/stocks/:symbol should return specific stock data', async () => {
    const symbol = 'AAPL';
    const response = await request(app)
      .get(`/api/stocks/${symbol}`)
      .expect('Content-Type', /json/);

    expect(response.status).toBeOneOf([200, 503]); // Success or service unavailable
    expect(response.body).toHaveProperty('success', true);
    expect(response.body).toHaveProperty('data');
    expect(response.body).toHaveProperty('timestamp');
  });

  test('GET /api/stocks/search/:query should return search results', async () => {
    const query = 'Apple';
    const response = await request(app)
      .get(`/api/stocks/search/${query}`)
      .expect(200)
      .expect('Content-Type', /json/);

    expect(response.body).toHaveProperty('success', true);
    expect(response.body).toHaveProperty('data');
    expect(Array.isArray(response.body.data)).toBe(true);
    expect(response.body).toHaveProperty('timestamp');
  });

  test('GET /api/stocks/search/:query should reject short queries', async () => {
    const query = 'A';
    const response = await request(app)
      .get(`/api/stocks/search/${query}`)
      .expect(400)
      .expect('Content-Type', /json/);

    expect(response.body).toHaveProperty('success', false);
    expect(response.body).toHaveProperty('error');
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

