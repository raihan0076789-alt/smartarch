import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import app from '../server.js';

describe('AI Architect Backend API Tests', () => {
  let server;

  beforeAll(() => {
    server = app;
  });

  afterAll((done) => {
    if (server && server.close) {
      server.close(done);
    } else {
      done();
    }
  });

  describe('Health Endpoints', () => {
    it('should return health status', async () => {
      const response = await request(server)
        .get('/health')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('uptime');
      expect(response.body).toHaveProperty('message', 'OK');
      expect(response.body).toHaveProperty('timestamp');
    });

    it('should return service status', async () => {
      const response = await request(server)
        .get('/api/status')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('status', 'operational');
      expect(response.body).toHaveProperty('service', 'AI Architect Backend');
      expect(response.body).toHaveProperty('version');
    });
  });

  describe('Architecture Endpoints', () => {
    it('should reject empty requirements for generation', async () => {
      const response = await request(server)
        .post('/api/architecture/generate')
        .send({ requirements: '' })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should validate architecture generation request', async () => {
      const response = await request(server)
        .post('/api/architecture/generate')
        .send({
          requirements: 'Build a scalable web application with microservices',
          preferences: {
            cloud: 'AWS',
            architecture: 'microservices'
          }
        })
        .expect('Content-Type', /json/);

      expect(response.status).toBeGreaterThanOrEqual(200);
    });

    it('should validate architecture analysis request', async () => {
      const response = await request(server)
        .post('/api/architecture/analyze')
        .send({
          architecture: {
            name: 'Test Architecture',
            components: ['API Gateway', 'Services', 'Database']
          },
          analysisType: 'comprehensive'
        })
        .expect('Content-Type', /json/);

      expect(response.status).toBeGreaterThanOrEqual(200);
    });

    it('should reject comparison with less than 2 architectures', async () => {
      const response = await request(server)
        .post('/api/architecture/compare')
        .send({
          architectures: [{ name: 'Single Architecture' }]
        })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Error Handling', () => {
    it('should return 404 for unknown routes', async () => {
      const response = await request(server)
        .get('/api/unknown-route')
        .expect('Content-Type', /json/)
        .expect(404);

      expect(response.body).toHaveProperty('error', 'Not Found');
    });

    it('should handle invalid JSON', async () => {
      const response = await request(server)
        .post('/api/architecture/generate')
        .set('Content-Type', 'application/json')
        .send('invalid json')
        .expect(400);
    });
  });

  describe('Rate Limiting', () => {
    it('should allow requests within rate limit', async () => {
      const response = await request(server)
        .get('/health')
        .expect(200);

      expect(response.headers).not.toHaveProperty('retry-after');
    });
  });
});
