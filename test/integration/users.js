const debug = require('debug')('test:install');
const {
  expect,
} = require('chai');
const path = require('path');
const replay = require('replay');
const supertest = require('supertest');
const authWebService = process.env.URL || require('../../auth_service');

const originalLocalhosts = replay._localhosts;
const requestId = 'deprecated-spec';
replay.fixtures = path.join(__dirname, '/../fixtures/replay');

describe.skip('/users', () => {
  before(() => {
    replay._localhosts = new Set(['127.0.0.1', '::1']);
    debug('before replay localhosts', replay._localhosts);
  });
  after(() => {
    replay._localhosts = originalLocalhosts;
    debug('after replay localhosts', replay._localhosts);
  });

  describe('POST /users/:username', () => {
    const username = `test${Date.now()}`;
    // const username = `anonymous${Date.now()}`;
    it('should register a new user', () => supertest(authWebService)
      .post(`/users/${username}`)
      .set('x-request-id', `${requestId}-register`)
      .send({
        username,
        password: 'test',
      })
      .then((res) => {
        if (res.body.userFriendlyErrors) {
          expect(res.body.userFriendlyErrors).to.deep.equal([
            `Username ${username} already exists, try a different username.`,
          ]);
        } else {
          debug(JSON.stringify(res.body));
          expect(res.body.user.username).to.equal(username);
          expect(res.body.user.appbrand).to.equal(undefined);
        }

        return supertest(`http://${username}:test@localhost:5984`)
          .get('/_session')
          .set('x-request-id', `${requestId}-register`)
          .set('Accept', 'application/json');
      })
      .then((res) => {
        debug(JSON.stringify(res.body));
        expect(res.status).to.equal(200, 'should have roles');
        expect(res.body).to.deep.equal({
          ok: true,
          userCtx: {
            name: username,
            roles: [
              `${username}-firstcorpus_admin`,
              `${username}-firstcorpus_writer`,
              `${username}-firstcorpus_reader`,
              `${username}-firstcorpus_commenter`,
              'public-firstcorpus_reader',
              'fielddbuser',
              'user',
            ],
          },
          info: {
            authentication_db: '_users',
            authentication_handlers: ['oauth', 'cookie', 'default'],
            authenticated: 'default',
          },
        }, 'should have roles');

        return supertest(`http://${username}:test@localhost:5984`)
          .get(`/${username}-firstcorpus/_design/lexicon/_view/lexiconNodes`)
        // .set('x-request-id', requestId + '-register')
          .set('Accept', 'application/json');
      })
      .then((res) => {
        if (res.status === 200) {
          debug(JSON.stringify(res.body));
          expect(res.status).to.equal(200, 'should replicate the lexicon');
          expect(res.body).to.deep.equal({
            rows: [{
              key: null,
              value: 6,
            }],
          }, 'should replicate the lexicon');
        } else {
          expect(res.status).to.be.oneOf([401, 404]); // delay in lexicon creation on new resources
        }
      }));

    it('should register wordcloud users if not already registered', () => supertest(authWebService)
      .post('/users/anonymouswordclouduser1401365327719')
      .set('x-request-id', `${requestId}-register`)
      .send({
        username: 'anonymouswordclouduser1401365327719',
        password: 'testtest',
        email: '',
        firstname: '',
        lastname: '',
        appbrand: 'ilanguagecloud',
      })
      .then((res) => {
        if (res.body.userFriendlyErrors) {
          expect(res.body.userFriendlyErrors).to.deep.equal([
            'Username anonymouswordclouduser1401365327719 already exists, try a different username.',
          ]);
        } else {
          debug(JSON.stringify(res.body));
          expect(res.body.user.username).to.equal('anonymouswordclouduser1401365327719');
          expect(res.body.user.appbrand).to.equal('ilanguagecloud');
        }
      }));

    it('should register phophlo users if not already registered', () => supertest(authWebService)
      .post('/users/testingphophlo')
      .set('x-request-id', `${requestId}-register`)
      .send({
        username: 'testingphophlo',
        password: 'test',
        email: '',
        firstname: '',
        lastname: '',
        appbrand: 'phophlo',
      })
      .then((res) => {
        if (res.body.userFriendlyErrors) {
          expect(res.body.userFriendlyErrors).to.deep.equal([
            'Username testingphophlo already exists, try a different username.',
          ]);
        } else {
          debug(JSON.stringify(res.body));
          expect(res.body.user.username).to.equal('testingphophlo');
          expect(res.body.user.appbrand).to.equal('phophlo');
        }
      }));

    it('should refuse to register existing names', () => supertest(authWebService)
      .post('/users/jenkins')
      .set('x-request-id', `${requestId}-register`)
      .send({
        username: 'jenkins',
        password: 'phoneme',
        appbrand: 'learnx',
      })
      .then((res) => {
        if (res.body.userFriendlyErrors) {
          expect(res.body.userFriendlyErrors).to.deep.equal([
            'Username jenkins already exists, try a different username.',
          ]);
        } else {
          debug(JSON.stringify(res.body));
          expect(res.body.user.username).to.equal('jenkins');
          expect(res.body.user.appbrand).to.equal('learnx');
        }
      }));

    it('should refuse to register short usernames', () => supertest(authWebService)
      .post('/users/ba')
      .set('x-request-id', `${requestId}-register`)
      .send({
        username: 'ba',
        password: 'phoneme',
      })
      .then((res) => {
        expect(res.body.userFriendlyErrors).to.deep.equal([
          'Please choose a longer username `ba` is too short.',
        ]);
      }));

    it('should refuse to register non ascii usernames', () => supertest(authWebService)
      .post(`/users/${encodeURIComponent('ნინო ბერიძე')}`)
      .set('x-request-id', `${requestId}-register`)
      .send({
        username: 'ნინო ბერიძე',
        password: 'phoneme',
      })
      .then((res) => {
        expect(res.body.userFriendlyErrors).to.deep.equal([
          "You asked to use ნინო ბერიძე but we would reccomend using this instead:  the following are a list of reason's why.",
          "You have some characters which web servers wouldn't trust in your identifier.",
          'Your identifier is really too short.',
        ]);
      }));

    it('should refuse to register near ascii usernames', () => supertest(authWebService)
      .post(`/users/${encodeURIComponent('Jênk iлs')}`)
      .set('x-request-id', `${requestId}-register`)
      .send({
        username: 'Jênk iлs',
        password: 'phoneme',
      })
      .then((res) => {
        expect(res.body.userFriendlyErrors).to.deep.equal([
          "You asked to use Jênk iлs but we would reccomend using this instead: jenkins the following are a list of reason's why.",
          'The identifier has to be lowercase so that it can be used in your CouchDB database names.',
          'You have to use ascii characters in your identifiers because your identifier is used in your in web urls, so its better if you can use something more web friendly.',
          "You have some characters which web servers wouldn't trust in your identifier.",
        ]);
      }));

    it('should require a password', () => supertest(authWebService)
      .post('/users/notavalidbody')
      .set('x-request-id', `${requestId}-register`)
      .send({})
      .then((res) => {
        expect(res.body.userFriendlyErrors).to.deep.equal([
          'Please provide a password',
        ]);
      }));

    it('should require a longer password', () => supertest(authWebService)
      .post('/users/notavalidbody')
      .set('x-request-id', `${requestId}-register`)
      .send({
        password: 'hi',
      })
      .then((res) => {
        expect(res.body.userFriendlyErrors).to.deep.equal([
          'Please provide a longer password',
        ]);
      }));
  });
});
