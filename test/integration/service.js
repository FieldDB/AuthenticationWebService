const { expect } = require('chai');
const supertest = require('supertest');

// eslint-disable-next-line global-require
const service = process.env.URL || require('../../auth_service');

describe('/v1', () => {
  const { NODE_ENV } = process.env;

  afterEach(() => {
    process.env.NODE_ENV = NODE_ENV;
  });

  it('should load', () => {
    expect(service).to.be.a('function');
  });

  describe('is production ready', () => {
    it('should handle service endpoints which are not found', () => {
      process.env.NODE_ENV = 'production';

      return supertest(service)
        .get('/v1/notexistant')
        .expect('Content-Type', 'application/json; charset=utf-8')
        .expect(404)
        .then((res) => {
          expect(res.status).to.equal(404);

          expect(res.body).to.deep.equal({
            userFriendlyErrors: ['Not Found'],
            status: 404,
          });
        });
    });

    it('should reply with healthcheck', () => {
      process.env.NODE_ENV = 'development';

      return supertest(service)
        .get('/v1/healthcheck')
        .expect('Content-Type', 'application/json; charset=utf-8')
        .expect(200)
        .then((res) => {
          expect(res.body).to.deep.equal({
            ok: true,
          });
        });
    });
  });
});
