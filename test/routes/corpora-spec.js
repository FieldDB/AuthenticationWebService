const { expect } = require('chai');
const supertest = require('supertest');

// eslint-disable-next-line global-require
const authWebService = process.env.URL || require('../../auth_service');

describe('/corpora', () => {
  describe('DELETE', () => {
    it('should accept no options', () => supertest(authWebService)
      .delete('/corpora/testingprototype-testdeletecorpus')
      .send({
        username: 'testingprototype',
        password: 'test',
      })
      .then((res) => {
        expect(res.body).to.deep.equal({
          message: 'Internal server error',
          stack: res.body.stack,
          status: 500,
          userFriendlyErrors: ['Server erred, please report this 816'],
        });
        expect(res.body.stack).to.contain('corpusData.deleteCorpus is not a function');
      }));
  });
});
