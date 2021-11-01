var expect = require('chai').expect;
var supertest = require('supertest');

var service = process.env.URL || require('./../../auth_service');

describe('/v1', function () {
  var NODE_ENV = process.env.NODE_ENV;

  afterEach(function () {
    process.env.NODE_ENV = NODE_ENV;
  });

  it('should load', function () {
    expect(service).to.be.a('function');
  });

  describe('is production ready', function () {
    it('should handle service endpoints which are not found', function () {
      process.env.NODE_ENV = 'production';

      return supertest(service)
        .get('/v1/notexistant')
        .expect('Content-Type', 'application/json; charset=utf-8')
        .expect(404)
        .then(function (res) {
          expect(res.status).to.equal(404);

          expect(res.body).to.deep.equal({
            userFriendlyErrors: ['Not Found'],
            status: 404
          });
        });
    });

    it('should reply with healthcheck', function () {
      process.env.NODE_ENV = 'development';

      return supertest(service)
        .get('/v1/healthcheck')
        .expect('Content-Type', 'application/json; charset=utf-8')
        .expect(200)
        .then(function (res) {
          expect(res.body).to.deep.equal({
            ok: true
          });
        });
    });
  });
});
