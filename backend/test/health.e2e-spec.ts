import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';

describe('Health (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('/health (GET) reports application status', () => {
    return request(app.getHttpServer())
      .get('/health')
      .expect((response) => {
        expect([200, 503]).toContain(response.status);
        expect(response.body).toHaveProperty('status');
        expect(response.body).toHaveProperty('database');
        expect(response.body).toHaveProperty('timestamp');
      });
  });
});
