const { expect } = require('chai');
const supertest = require('supertest');

// eslint-disable-next-line global-require
const api = process.env.URL || require('../../../auth_service');
const user = require('../../../models/user');
const userFixtures = require('../../fixtures/user.json');

const fixtures = {
  user: userFixtures,
};

describe('/v1/users', () => {
  beforeEach((done) => {
    user
      .create(fixtures.user, () => {
        done();
      });
  });

  it('should list users', () => supertest(api)
    .get('/v1/users')
    .expect('Content-Type', 'application/json; charset=utf-8')
    .expect(200)
    .then((res) => {
      expect(res.body.length > 0).to.equal(true);

      const sampleUserMask = res.body[0];
      expect(sampleUserMask).to.deep.equal({
        id: sampleUserMask.id,
        gravatar: sampleUserMask.gravatar,
        username: sampleUserMask.username,
      });
    }));

  it('should not get another users details', () => supertest(api)
    .get('/v1/users/test-anonymouse')
    .expect('Content-Type', 'application/json; charset=utf-8')
    .expect(403)
    .then((res) => {
      expect(res.body).to.deep.equal({
        status: 403,
        userFriendlyErrors: ['You must login to access this data'],
      });
    }));
});
