const AsToken = require('../../lib/token');
const debug = require('debug')('test:integration:oauth');
const { expect } = require('chai');
const Express = require('express');
const OAuth2Strategy = require('passport-oauth2');
const passport = require('passport');
const querystring = require('querystring');
const session = require('express-session');
const supertest = require('supertest');
const url = require('url');

const service = process.env.URL || require('../../auth_service');
const OauthClient = require('../../models/oauth-client');
const UserModel = require('../../models/user');

const fixtures = {
  client: require('../fixtures/client.json'), // eslint-disable-line global-require
  user: require('../fixtures/user.json'), // eslint-disable-line global-require
};

describe('/oauth2', () => {
  /**
   * Register the client app

      participant User
      participant 3183
      participant 8011

      8011->3183: POST /v1/client { name, redirect_uri }
   */
  before((done) => {
    OauthClient.init()
      .then((() => {
        OauthClient
          .create(fixtures.client, (err, result) => {
            debug('created client', result);
            done();
          });
      }));
  });

  before((done) => {
    UserModel
      .create(fixtures.user, (err, result) => {
        debug('created user', result);
        done();
      });
  });

  describe('GET /oauth2/authorize', () => {
    it('should redirect to login if user is not present', () => supertest(service)
      .get('/oauth2/authorize')
      .query({
        client_id: 'test-client',
        client_secret: 'test-secret',
        grant_type: 'authorization_code',
        redirect_uri: 'http://localhost:8011/v1/users',
      })
      .expect(302)
      .expect('Content-Type', 'text/plain; charset=utf-8')
      .then((res) => {
        expect(res.text).to.contain('Found. Redirecting to');
        expect(res.text).to.equal('Found. Redirecting to /authentication/login/?client_id=test-client&grant_type=authorization_code&redirect_uri=http%3A%2F%2Flocalhost%3A8011%2Fv1%2Fusers'); // jshint ignore:line
      }));
  });

  describe('OAuth2 Dance', () => {
    let clientApp;
    let clientServer;
    const oauthOpts = {
      authorizationURL: 'http://localhost:3183/oauth2/authorize',
      tokenURL: 'http://localhost:3183/oauth2/token',
      clientID: fixtures.client.client_id,
      clientSecret: fixtures.client.client_secret,
      state: true,
      callbackURL: 'http://localhost:8011/auth/example/callback',
      scope: 'corpora, datalist, session, speech',
    };
    let port;
    let server;

    before((done) => {
      server = service.listen(0, () => {
        port = server.address().port;
        debug('Listening on http port %d', port);
        done();
      });
    });

    after(() => {
      server.close();
    });

    before((done) => {
      clientApp = new Express();
      clientApp.use(session({
        resave: true,
        saveUninitialized: true,
        secret: 'justtestingasanoauthclientapp',
      }));
      clientApp.use(passport.initialize());
      clientApp.use(passport.session());
      passport.serializeUser((passportUser, callback) => {
        callback(null, passportUser);
      });
      passport.deserializeUser((passportUser, callback) => {
        callback(null, passportUser);
      });
      oauthOpts.authorizationURL = oauthOpts.authorizationURL.replace('3183', port);
      oauthOpts.tokenURL = oauthOpts.tokenURL.replace('3183', port);
      debug('port', port, oauthOpts);
      passport.use(new OAuth2Strategy(oauthOpts,
        ((accessToken, refreshToken, profile, cb) => {
          debug('in the clientApp oauth OAuth2Strategy', accessToken, refreshToken, profile, cb);
          // Workaround for user missing in response from strategy
          const decoded = AsToken.verify(accessToken);
          decoded.user.accessToken = accessToken;

          // res.set('Authorization', 'Bearer ' + accessToken);
          return cb(null, decoded.user, { info: 'goes here' });
        })));
      clientApp.get('/auth/example', (req, res, next) => {
        const x = passport.authenticate('oauth2');
        debug('/auth/example will call passport.authenticate', x);
        debug('headers', req.headers);
        // res.set('Authorization', req.headers.authorization);
        return x(req, res, next);
      });
      clientApp.get('/auth/example/callback',
        passport.authenticate('oauth2', {
          failureRedirect: '/login',
        }),
        (req, res, next) => {
          debug('auth/example/callback got called back', req.headers, req.body, req.query);
          // Successful authentication, now try to use the token

          debug('requesting an authenticated route usnig this token', req.session.passport.user.accessToken);
          supertest(server)
            .get('/v1/user') // an authenticated route
            // .set('Authorization', req.headers.authorization)
            .set('Authorization', `Bearer ${req.session.passport.user.accessToken}`)
            .then((response) => {
              res.json({
                success: 'called back',
                headers: req.headers,
                body: req.body,
                locals: res.locals,
                query: req.query,
                session: req.session,
                response: response.body,
              });
            })
            .catch(next);
        });
      // eslint-disable-next-line no-unused-vars
      clientApp.use((err, req, res, next) => {
        debug('Error in the clientApp', err);
        res.status(err.status || 500);
        res.json(err);
      });
      clientServer = clientApp.listen(8011, () => {
        debug(`HTTP clientApp listening on http://localhost:${clientServer.address().port}`);
        done();
      });
    });

    after(() => {
      if (!clientServer) {
        return null;
      }
      debug('turning off client server');
      return clientServer.close();
    });

    /**
     * Login to client app via auth provider

      participant User
      participant 3183
      participant 8011

      User->8011: Login with: 3183 provider
      8011->3183: /oauth2/authorize { state }
      3183->User: Authorize 8011 to access your profile?
      User-->3183: Yes
      3183->User: Redirect to 8011 { code, state }
      User->8011: /callback { code, state }
      8011->3183: POST /oauth2/token { code, state }
      3183-->8011: { token, profile }
      8011-->User: Welcome anonymous!
     */
    it('should perform oauth2 dance', () => {
      let loginUrl;
      let clientAppSessionCookies;

      // Trigger the dance
      return supertest('http://localhost:8011')
        .get('/auth/example')
        .send({
          client_id: fixtures.client.client_id,
        })
        .set('Content-Type', 'application/x-www-form-urlencoded; charset=UTF-8')
        .then((res) => {
          debug(' client app redirect res.headers', res.headers);
          expect(res.status).to.equal(302, res.text);
          expect(res.headers.location).to.contain('/oauth2/authorize');
          expect(res.headers.location).to.contain('state=');
          clientAppSessionCookies = res.headers['set-cookie'];

          // Request authorization
          return supertest(server)
            .get(res.headers.location.replace(`http://localhost:${port}`, ''));
        })
        .then((res) => {
          debug(' service redirect res.headers', res.headers);
          expect(res.status).to.equal(302, res.text);
          loginUrl = url.parse(res.headers.location);
          loginUrl.params = querystring.parse(loginUrl.query);
          debug('loginUrl', loginUrl);
          expect(loginUrl.pathname).to.equal('/authentication/login/');
          expect(loginUrl.query).to.not.contain('undefined');
          expect(loginUrl.query).to.contain('state');

          // Simulate User Requests login page
          return supertest(server)
            .get(loginUrl.pathname)
            .query(loginUrl.params);
        })
        .then((res) => {
          expect(res.status).to.equal(200, res.text);
          expect(res.text).to.contain('Login');
          expect(res.text).to.contain('button');
          expect(res.text).to.contain('Password');

          debug('redirect res.body', res.body);
          debug('redirect res.headers', res.headers);

          loginUrl.params.redirect = `/oauth2/authorize?${querystring.stringify(loginUrl.params)}`;
          loginUrl.params.username = fixtures.user.username;
          loginUrl.params.password = 'phonemes';

          // Simulate User Logs in
          return supertest(server)
            .post(loginUrl.pathname)
            .send(loginUrl.params);
        })
        .then((res) => {
          debug('logged in res.body', res.body);
          debug('logged in res.headers', res.headers);
          expect(res.status).to.equal(302, res.text);
          expect(res.headers.location).to.contain('/oauth2/authorize');
          expect(res.headers.location).to.contain('state=');

          // Request authorization now that User is logged in
          return supertest(server)
            .get(res.headers.location)
            .set('Authorization', res.headers.authorization);
        })
        .then((res) => {
          let callbackUrl;
          debug('after authorize in res.body', res.body);
          debug('after authorize in res.headers', res.headers);
          expect(res.status).to.equal(302, res.text);
          expect(res.headers.location).to.contain('/auth/example/callback');
          expect(res.headers.authorization).to.contain('Bearer');

          const token = res.headers.authorization.replace(/Bearer v1\//, '');
          const decoded = AsToken.verify(token);
          expect(decoded).to.deep.equal({
            user: {
              name: {
                givenName: 'Anony',
                familyName: 'Mouse',
              },
              id: '6e6017b0-4235-11e6-afb5-8d78a35b2f79',
              revision: decoded.user.revision,
              // deletedAt: null,
              // deletedReason: '',
              username: 'test-anonymouse',
              email: '',
              gravatar: decoded.user.gravatar,
              description: 'Friendly',
              language: 'zh',
              // hash: decoded.user.hash,
              createdAt: decoded.user.createdAt,
              updatedAt: decoded.user.updatedAt,
            },
            client: {},
            iat: decoded.iat,
            exp: decoded.exp,
          });

          // Follow redirect back to client
          callbackUrl = res.headers.location.replace('http://localhost:8011', '');
          debug('callbackUrl', callbackUrl);
          return supertest(clientServer)
            .get(callbackUrl)
            .set('Authorization', res.headers.authorization)
            .set('Cookie', clientAppSessionCookies);
        })
        .then((res) => {
          debug('after app callback res.status', res.status);
          debug('after app callback res.body', res.body);
          debug('after app callback res.headers', res.headers);

          // Expect client succesfully got user profile and token
          expect(res.status).to.equal(200, res.text);
          expect(res.body.query.code).length(40);
          expect(res.body.query.state).length(24);
          expect(res.body.headers.authorization).to.contain('Bearer v1');

          const token = res.body.headers.authorization.replace(/Bearer v1\//, '');
          const decoded = AsToken.verify(token);
          expect(decoded).to.deep.equal({
            client: {},
            user: {
              name: {
                givenName: 'Anony',
                familyName: 'Mouse',
              },
              id: '6e6017b0-4235-11e6-afb5-8d78a35b2f79',
              revision: decoded.user.revision,
              // deletedAt: null,
              // deletedReason: '',
              username: 'test-anonymouse',
              email: '',
              gravatar: decoded.user.gravatar,
              description: 'Friendly',
              language: 'zh',
              // hash: decoded.user.hash,
              createdAt: decoded.user.createdAt,
              updatedAt: decoded.user.updatedAt,
            },
            iat: decoded.iat,
            exp: decoded.exp,
          });

          debug('body from calling app', res.body);
          expect(res.body.headers.cookie).to.contain('connect.sid=');
          expect(res.body).to.deep.equal({
            success: 'called back',
            headers: {
              host: '127.0.0.1:8011',
              'accept-encoding': 'gzip, deflate',
              // 'user-agent': 'node-superagent/3.8.3',
              authorization: res.body.headers.authorization,
              connection: 'close',
              cookie: res.body.headers.cookie,
            },
            query: {
              code: res.body.query.code,
              state: res.body.query.state,
            },
            locals: {},
            session: {
              cookie: {
                originalMaxAge: null,
                expires: null,
                httpOnly: true,
                path: '/',
              },
              passport: {
                user: {
                  accessToken: res.body.session.passport.user.accessToken,
                  name: {
                    givenName: 'Anony',
                    familyName: 'Mouse',
                  },
                  id: '6e6017b0-4235-11e6-afb5-8d78a35b2f79',
                  revision: decoded.user.revision,
                  username: 'test-anonymouse',
                  email: '',
                  gravatar: decoded.user.gravatar,
                  description: 'Friendly',
                  language: 'zh',
                  createdAt: decoded.user.createdAt,
                  updatedAt: decoded.user.updatedAt,
                },
              },
            },
            response: {
              name: {
                givenName: 'Anony',
                familyName: 'Mouse',
              },
              id: '6e6017b0-4235-11e6-afb5-8d78a35b2f79',
              revision: res.body.response.revision,
              username: 'test-anonymouse',
              email: '',
              gravatar: res.body.response.gravatar,
              description: 'Friendly',
              language: 'zh',
              hash: res.body.response.hash,
              createdAt: res.body.response.createdAt,
              updatedAt: res.body.response.updatedAt,
              deletedAt: null,
              deletedReason: '',
              token: `Bearer ${res.body.session.passport.user.accessToken}`,
            },
          });

          const newToken = AsToken.decode(res.body.session.passport.user.accessToken);
          expect(newToken.accessToken).length(36);
          expect(newToken.refreshToken).length(40);

          expect(newToken).to.deep.equal({
            accessToken: newToken.accessToken,
            accessTokenExpiresAt: newToken.accessTokenExpiresAt,
            refreshToken: newToken.refreshToken,
            client: {
              client_id: fixtures.client.client_id,
              scope: 'corpora, datalist, session, speech, activity',
            },
            user: {
              name: {
                givenName: 'Anony',
                familyName: 'Mouse',
              },
              id: '6e6017b0-4235-11e6-afb5-8d78a35b2f79',
              revision: newToken.user.revision,
              username: 'test-anonymouse',
              email: '',
              gravatar: newToken.user.gravatar,
              description: 'Friendly',
              language: 'zh',
              createdAt: newToken.user.createdAt,
              updatedAt: newToken.user.updatedAt,
            },
            iat: newToken.iat,
            exp: newToken.exp,
          });
        });
    });
  });

  describe('POST /oauth2/authorize', () => {
    it('should be not found', () => supertest(service)
      .post('/oauth2/authorize')
      .type('form')
      .send({
        client_id: fixtures.client.client_id,
        client_secret: 'test-secret',
        grant_type: 'authorization_code',
        redirect_uri: 'http://localhost:8011/v1/users',
      })
      .expect(404)
    // .expect('Content-Type', 'application/json; charset=utf-8')
      .then((res) => {
        expect(res.body).to.deep.equal({
          status: 404,
          userFriendlyErrors: ['Not Found'],
        });
      }));
  });

  describe('GET /oauth2/token', () => {
    it('should be not found', () => supertest(service)
      .get('/oauth2/token')
      .send({
        client_id: fixtures.client.client_id,
        client_secret: 'test-secret',
        grant_type: 'authorization_code',
        username: 'test-user',
        code: 'ABC',
      })
      .expect(404)
    // .expect('Content-Type', 'application/json; charset=utf-8')
      .then((res) => {
        expect(res.body).to.deep.equal({
          status: 404,
          message: 'Not Found',
          stack: res.body.stack,
          userFriendlyErrors: ['Not Found'],
        });
      }));
  });

  describe('POST /oauth2/token', () => {
    it('should validate the authorization code', () => supertest(service)
      .post('/oauth2/token')
      .type('form') // content must be application/x-www-form-urlencoded
      .send({
        client_id: fixtures.client.client_id,
        client_secret: 'test-secret',
        grant_type: 'authorization_code',
        username: 'test-user',
        code: 'ABC',
      })
      .expect(403)
      .expect('Content-Type', 'application/json; charset=utf-8')
      .then((res) => {
        expect(res.body).to.deep.equal({
          status: 403,
          userFriendlyErrors: ['Code is not authorized'],
        });
      }));
  });
});
