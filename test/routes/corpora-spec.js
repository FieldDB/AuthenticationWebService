var expect = require('chai').expect;
var supertest = require('supertest');

var authWebService = process.env.URL || require('./../../auth_service');

describe('/corpora', function () {
  describe('DELETE', function () {
    it('should accept no options', function () {
      return supertest(authWebService)
        .delete('/corpora/testingprototype-testdeletecorpus')
        .send({
          username: 'testingprototype',
          password: 'test'
        })
        .then(function (res) {
          expect(res.body).to.deep.equal({
            message: 'Internal server error',
            stack: res.body.stack,
            status: 500,
            userFriendlyErrors: ['Server erred, please report this 816']
          });
          expect(res.body.stack).to.contain('corpusData.deleteCorpus is not a function');
        });
    });
  });
});
