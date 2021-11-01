var expect = require('chai').expect;
var supertest = require('supertest');

var authWebService = process.env.URL || require('./../../auth_service');

describe('/ deprecated', function () {
  describe('login', function () {
    it('should handle invalid users', function () {
      return supertest(authWebService)
        .post('/login')
        .send({
          username: 'testinglogin',
          password: 'test'
        })
        .then(function (res) {
          expect(res.body.userFriendlyErrors).to.deep.equal(['Username or password is invalid. Please try again.']);
        });
    });

    it('should handle invalid passwords', function () {
      return supertest(authWebService)
        .post('/login')
        .send({
          username: 'testingprototype',
          password: 'wrongpassword'
        })
        .then(function (res) {
          expect(res.body.userFriendlyErrors).to.deep.equal(['You have tried to log in too many times and you dont seem to have a valid email so we cant send you a temporary password.']);
        });
    });

    it('should handle valid passwords', function () {
      return supertest(authWebService)
        .post('/login')
        .send({
          username: 'lingllama',
          password: 'phoneme'
        })
        .then(function (res) {
          expect(res.body.userFriendlyErrors).to.equal(undefined);
          expect(res.body.user._id).to.equal('lingllama'); // eslint-disable-line no-underscore-dangle
          expect(res.body.user.username).to.equal('lingllama');
          expect(res.body.user.corpora).length(3);
        });
    });
  });
});
