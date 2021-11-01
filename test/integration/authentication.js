var expect = require('chai').expect;
var supertest = require('supertest');
var AsToken = require('../../lib/token');

var service = process.env.URL || require('./../../auth_service');
var User = require('./../../models/user');

describe('/authentication', function () {
  before(function (done) {
    User.init();

    User.create({
      id: 'test-user-efg_random_uuid',
      username: 'test-user',
      password: 'aje24wersdfgs324rfe+woe'
    }, function () {
      done();
    });
  });

  describe('GET /authentication/login', function () {
    it('should display', function () {
      return supertest(service)
        .get('/authentication/login/')
        .expect(200)
        .expect('Content-Type', 'text/html; charset=UTF-8')
        .then(function (res) {
          expect(res.text).to.contain('Login');
          expect(res.text).to.contain('button');
          expect(res.text).to.contain('Password');
        });
    });

    it('should serve client side files', function () {
      return supertest(service)
        .get('/authentication/login/login.js')
        .expect(200)
        .expect('Content-Type', 'application/javascript; charset=UTF-8')
        .then(function (res) {
          expect(res.text).to.contain('login');
        });
    });

    it('should redirect to login/', function () {
      return supertest(service)
        .get('/authentication/login?anything=query_should_be_kept')
        .expect(301)
        .expect('Content-Type', 'text/html; charset=UTF-8')
        .then(function (res) {
          expect(res.text).to.contain('Redirecting');
          expect(res.text).to.contain('?anything=query_should_be_kept');
        });
    });
  });

  describe('POST /authentication/login', function () {
    it('should require a body', function () {
      return supertest(service)
        .post('/authentication/login')
        .expect(403)
        .expect('Content-Type', 'application/json; charset=utf-8')
        .then(function (res) {
          expect(res.body).to.deep.equal({
            status: 403,
            userFriendlyErrors: ['Please provide a username and a password']
          });
        });
    });

    it('should require a username', function () {
      return supertest(service)
        .post('/authentication/login')
        .send({
          password: 'aje24wersdfgs324rfe+woe'
        })
        .expect(403)
        .expect('Content-Type', 'application/json; charset=utf-8')
        .then(function (res) {
          expect(res.body).to.deep.equal({
            message: 'Please provide a username and a password',
            userFriendlyErrors: ['Please provide a username and a password'],
            stack: res.body.stack,
            status: 403
          });
        });
    });

    it('should require a password', function () {
      return supertest(service)
        .post('/authentication/login')
        .send({
          username: 'test-user'
        })
        .expect(403)
        .expect('Content-Type', 'application/json; charset=utf-8')
        .then(function (res) {
          expect(res.body).to.deep.equal({
            message: 'Please provide a username and a password',
            userFriendlyErrors: ['Please provide a username and a password'],
            stack: res.body.stack,
            status: 403
          });
        });
    });

    it('should login and redirect to the requested url', function () {
      return supertest(service)
        .post('/authentication/login')
        .send({
          client_id: 'abc-li-12-li',
          redirect_uri: 'http://localhost:8011/some/place/users?with=other-stuff',
          username: 'test-user',
          password: 'aje24wersdfgs324rfe+woe'
        })
        .expect(302)
        .expect('Content-Type', 'text/plain; charset=utf-8')
        .expect('Set-Cookie', /Authorization=Bearer /)
        .expect('Authorization', /Bearer v1\//)
        .then(function (res) {
          expect(res.text).to.contain('Found. Redirecting');
          expect(res.text).to.equal('Found. Redirecting to http://localhost:8011/some/place/users?with=other-stuff?client_id=abc-li-12-li&redirect_uri=http%3A%2F%2Flocalhost%3A8011%2Fsome%2Fplace%2Fusers%3Fwith%3Dother-stuff&username=test-user');

          var token = res.headers.authorization.replace(/Bearer v1\//, '');
          expect(token).to.not.equal(undefined);

          var decoded = AsToken.decode(token);
          expect(decoded).to.deep.equal({
            client: {},
            user: {
              name: {
                givenName: '',
                familyName: ''
              },
              id: 'test-user-efg_random_uuid',
              revision: decoded.user.revision,
              // deletedAt: null,
              // deletedReason: '',
              username: 'test-user',
              email: '',
              gravatar: decoded.user.gravatar,
              description: '',
              language: '',
              // hash: decoded.user.hash,
              createdAt: decoded.user.createdAt,
              updatedAt: decoded.user.updatedAt
            },
            iat: decoded.iat,
            exp: decoded.exp
          });

          var verified = AsToken.verify(token);
          expect(verified).to.deep.equal(decoded);
        });
    });
  });

  describe('GET /authentication/signup', function () {
    it('should display', function () {
      return supertest(service)
        .get('/authentication/signup/')
        .expect(200)
        .expect('Content-Type', 'text/html; charset=UTF-8')
        .then(function (res) {
          expect(res.text).to.contain('Signup');
          expect(res.text).to.contain('button');
          expect(res.text).to.contain('Password');
        });
    });

    it('should serve client side files', function () {
      return supertest(service)
        .get('/authentication/signup/signup.js')
        .expect(200)
        .expect('Content-Type', 'application/javascript; charset=UTF-8')
        .then(function (res) {
          expect(res.text).to.contain('signup');
        });
    });

    it('should redirect to signup/', function () {
      return supertest(service)
        .get('/authentication/signup?anything=query_should_be_kept')
        .expect(301)
        .expect('Content-Type', 'text/html; charset=UTF-8')
        .then(function (res) {
          expect(res.text).to.contain('Redirecting');
          expect(res.text).to.contain('?anything=query_should_be_kept');
        });
    });
  });

  describe('POST /authentication/register', function () {
    it('should require a body', function () {
      return supertest(service)
        .post('/authentication/register')
        .expect(403)
        .expect('Content-Type', 'application/json; charset=utf-8')
        .then(function (res) {
          expect(res.body).to.deep.equal({
            userFriendlyErrors: ['Please provide a username which is 4 characters'
              + ' or longer and a password which is 8 characters or longer'],
            status: 403
          });
        });
    });

    it('should require a username', function () {
      return supertest(service)
        .post('/authentication/register')
        .send({
          password: 'aje24wersdfgs324rfe+woe'
        })
        .expect(403)
        .expect('Content-Type', 'application/json; charset=utf-8')
        .then(function (res) {
          expect(res.body).to.deep.equal({
            message: 'Please provide a username which is 4 characters'
              + ' or longer and a password which is 8 characters or longer',
            userFriendlyErrors: ['Please provide a username which is 4 characters'
              + ' or longer and a password which is 8 characters or longer'],
            stack: res.body.stack,
            status: 403
          });
        });
    });

    it('should require a password', function () {
      return supertest(service)
        .post('/authentication/register')
        .send({
          username: 'test-user'
        })
        .expect(403)
        .expect('Content-Type', 'application/json; charset=utf-8')
        .then(function (res) {
          expect(res.body).to.deep.equal({
            message: 'Please provide a password which is 8 characters or longer',
            userFriendlyErrors: ['Please provide a password which is 8 characters or longer'],
            stack: res.body.stack,
            status: 403
          });
        });
    });

    it('should require non-trivial password', function () {
      return supertest(service)
        .post('/authentication/register')
        .send({
          username: 'test-user',
          password: 'test'
        })
        .expect(403)
        .expect('Content-Type', 'application/json; charset=utf-8')
        .then(function (res) {
          expect(res.body).to.deep.equal({
            message: 'Please provide a password which is 8 characters or longer',
            userFriendlyErrors: ['Please provide a password which is 8 characters or longer'],
            stack: res.body.stack,
            status: 403
          });
        });
    });

    it('should not register an existing username', function () {
      return supertest(service)
        .post('/authentication/register?client_id=abc-li-12-li&'
          + 'redirect_uri=http%3A%2F%2Flocalhost%3A8011%2Fsome%2Fplace%2Fusers%3Fwith%3Dother-stuff')
        .send({
          username: 'test-user',
          password: 'aje24wersdfgs324rfe+woe'
        })
        .expect(403)
        .expect('Content-Type', 'application/json; charset=utf-8')
        .then(function (res) {
          expect(res.body).to.deep.equal({
            message: 'Username test-user is already taken, please try another username',
            userFriendlyErrors: ['Username test-user is already taken, please try another username'],
            stack: res.body.stack,
            status: 403
          });
        });
    });

    it('should register and redirect to the requested url', function () {
      var username = 'test-' + Date.now();
      return supertest(service)
        .post('/authentication/register')
        .send({
          client_id: 'abc-li-12-li',
          redirect_uri: '/v1/users/' + username + '?with=other-stuff',
          username: username,
          password: 'aje24wersdfgs324rfe+woe'
        })
        .expect(302)
        .expect('Content-Type', 'text/plain; charset=utf-8')
        .then(function (res) {
          expect(res.text).to.contain('Found. Redirecting');
          expect(res.text).to.deep.equal('Found. Redirecting to /v1/users/' + username + '?with=other-stuff');

          return supertest(service)
            .get(res.headers.location)
            .set('Authorization', res.headers.authorization);
          // .expect(302);
        })
        .then(function (res) {
          expect(res.body).to.deep.equal({
            name: {
              givenName: '',
              familyName: ''
            },
            id: res.body.id,
            revision: res.body.revision,
            deletedAt: null,
            deletedReason: '',
            username: username,
            email: '',
            gravatar: res.body.gravatar,
            description: '',
            language: '',
            hash: res.body.hash,
            createdAt: res.body.createdAt,
            updatedAt: res.body.updatedAt
          });
        });
    });
  });
});
