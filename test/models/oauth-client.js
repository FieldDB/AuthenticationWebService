const { expect } = require('chai');
const { Sequelize } = require('sequelize');
const AsToken = require('../../lib/token');

const OAuthClient = require('../../models/oauth-client');
const OAuthToken = require('../../models/oauth-token');
const User = require('../../models/user');

const fixtures = {
  client: require('../fixtures/client.json'), // eslint-disable-line global-require
  user: require('../fixtures/user.json'), // eslint-disable-line global-require
};

describe('models/oauth-client', () => {
  const token = {
    access_token: 'test-token',
    accessTokenExpiresAt: new Date(1468108856432),
    refresh_token: 'test-refresh',
    refresh_token_expires_on: new Date(1468108856432),
    client_id: fixtures.client.client_id,
    user_id: fixtures.user.id,
  };

  before((done) => {
    OAuthClient.init();
    User.init();
    OAuthToken.init();

    setTimeout(() => {
      OAuthClient.create(fixtures.client, () => {
        User.create(fixtures.user, () => {
          OAuthToken.create(token, () => {
            done();
          });
        });
      });
    }, 300);
  });

  describe('persistance', () => {
    it('should create a OAuthClient', (done) => {
      const json = {
        client_secret: '29j3werd',
        extranious: 123,
      };

      OAuthClient.create(json, (err, client) => {
        if (err) {
          return done(err);
        }

        expect(client.client_id).length(36);
        expect(client).to.deep.equal({
          client_id: client.client_id,
          client_secret: '29j3werd',
          createdAt: client.createdAt,
          updatedAt: client.updatedAt,
          expiresAt: client.expiresAt,
          throttle: 500,
          hour_limit: 600,
          day_limit: 6000,
        });

        done();
      });
    });

    it('should return null if client not found', (done) => {
      OAuthClient
        .read({
          client_id: 'test-nonexistant-client',
        }, (err, client) => {
          if (err) {
            return done(err);
          }

          expect(client).to.equal(null);

          done();
        });
    });

    describe('existing OAuthClients', () => {
      it('should look up a client using id and secret', (done) => {
        OAuthClient
          .read({
            client_id: fixtures.client.client_id,
            client_secret: 'test-secret',
          }, (err, client) => {
            if (err) {
              return done(err);
            }

            expect(client).not.to.equal(null);

            expect(client).to.deep.equal({
              client_id: fixtures.client.client_id,
              client_secret: 'test-secret',
              contact: 'Joe Smoe <joe@smoe.ca>',
              title: 'Testing Client',
              description: 'Client used for testing the oauth flow',
              hour_limit: 600,
              day_limit: 6000,
              throttle: 500,
              scope: 'corpora, datalist, session, speech, activity',
              redirect_uri: 'http://localhost:8011/auth/example/callback',
              deletedAt: null,
              deletedReason: null,
              expiresAt: client.expiresAt,
              createdAt: client.createdAt,
              updatedAt: client.updatedAt,
            });

            done();
          });
      });

      it('should look up using id', (done) => {
        OAuthClient
          .read({
            client_id: fixtures.client.client_id,
          }, (err, client) => {
            if (err) {
              return done(err);
            }

            expect(client).not.to.equal(null);
            expect(client.client_id).equal(fixtures.client.client_id);

            done();
          });
      });
    });
  });

  describe('collection', () => {
    beforeEach((done) => {
      OAuthClient
        .create({
          client_id: 'testm-abc',
          title: 'Puppies app',
        }, () => {
          OAuthClient
            .create({
              client_id: 'testm-hij',
              deletedAt: new Date(1341967961140),
              deletedReason: 'spidering on July 9 2012',
            }, () => {
              done();
            });
        });
    });

    it('should list an admin view of all clients', (done) => {
      OAuthClient.list({
        where: {
          client_id: {
            [Sequelize.Op.like]: 'testm-%',
          },
        },
        limit: 1000,
      }, (err, clients) => {
        if (err) {
          return done(err);
        }

        expect(clients).not.to.deep.equal([]);
        expect(clients).length(2);

        const client = clients[0];
        expect(client.client_id).to.not.equal(undefined);
        expect(client.title).to.not.equal(undefined);
        expect(client.deletedReason).to.equal(null);

        done();
      });
    });

    it('should list an admin view of deactivated clients', (done) => {
      OAuthClient.list({
        where: {
          deletedReason: {
            [Sequelize.Op.like]: '%spider%',
          },
        },
        limit: 1000,
      }, (err, clients) => {
        if (err) {
          return done(err);
        }

        expect(clients).not.to.deep.equal([]);
        expect(clients).length(1);

        const client = clients[0];
        expect(client.client_id).to.not.equal(undefined);
        expect(client.deletedReason).to.not.equal(undefined);

        done();
      });
    });
  });

  // https://github.com/oauthjs/node-oauth2-server/wiki/Model-specification
  describe('express-oauth-server support', () => {
    describe('tokens', () => {
      it('should save an access token', () => OAuthClient
        .saveAccessToken('test-token', { client: fixtures.client }, fixtures.user)
        .then((resultToken) => {
          expect(resultToken).not.to.equal(null);
          expect(resultToken).deep.equal({
            accessToken: resultToken.accessToken,
            jwt: resultToken.jwt,
            client: fixtures.client,
            // clientId: 'test-client',
            accessTokenExpiresAt: undefined,
            refreshToken: undefined,
            refreshTokenExpiresOn: undefined,
            // userId: fixtures.user.id,
            user: fixtures.user,
          });
        }));

      it('should get an access token', () => {
        const bearerToken = AsToken.sign({
          accessToken: 'test-token',
          user: {
            id: '123',
            something: 'else',
          },
          client: {
            id: 'test-client',
            here: 'too',
          },
        }, 60 * 24);
        return OAuthClient
          .getAccessToken(bearerToken)
          .then((resultToken) => {
            expect(resultToken).not.to.equal(null);
            expect(resultToken).deep.equal({
              accessToken: resultToken.accessToken,
              client: {
                id: 'test-client2',
              },
              accessTokenExpiresAt: resultToken.accessTokenExpiresAt,
              user: {
                id: '6e6017b0-4235-11e6-afb5-8d78a35b2f79',
              },
            });
            expect(AsToken.decode(resultToken.accessToken)).deep.equal(null);
          });
      });

      it('should get an refresh token', (done) => {
        OAuthClient.getRefreshToken('test-refresh', (err, refreshToken) => {
          if (err) {
            return done(err);
          }

          expect(refreshToken).not.to.equal(null);
          expect(refreshToken).deep.equal({
            accessToken: 'test-token',
            clientId: fixtures.client.client_id,
            accessTokenExpiresAt: refreshToken.accessTokenExpiresAt,
            userId: '6e6017b0-4235-11e6-afb5-8d78a35b2f79',
          });

          done();
        });
      });
    });

    describe('clients', () => {
      it('should get a client', () => OAuthClient
        .getClient(fixtures.client.client_id, 'test-secret')
        .then((clientInfo) => {
          expect(clientInfo).not.to.equal(null);
          expect(clientInfo).deep.equal({
            id: 'test-client2',
            grants: ['authorization_code'],
            redirectUris: ['http://localhost:8011/auth/example/callback'],
            client: {
              client_id: 'test-client2',
              title: 'Testing Client',
              description: 'Client used for testing the oauth flow',
              contact: 'Joe Smoe <joe@smoe.ca>',
              redirect_uri: 'http://localhost:8011/auth/example/callback',
              hour_limit: 600,
              day_limit: 6000,
              throttle: 500,
              scope: 'corpora, datalist, session, speech, activity',
              expiresAt: clientInfo.client.expiresAt,
              deletedAt: null,
              deletedReason: null,
              createdAt: clientInfo.client.createdAt,
              updatedAt: clientInfo.client.updatedAt,
              id: fixtures.client.client_id,
            },
          });
        }));

      it('should handle client not found', () => OAuthClient
        .getClient('not-a-known-client', undefined)
        .then((clientInfo) => {
          throw new Error('should not succeed');
        }).catch((err) => {
          expect(err.message).to.equal('Client id or secret is invalid');
        }));
    });

    describe('users', () => {
      it('should get a user', (done) => {
        OAuthClient.getUser('test-user', 'aje24wersdfgs324rfe+woe', (err, profile) => {
          if (err) {
            return done(err);
          }

          expect(profile).not.to.equal(null);
          expect(profile).to.deep.equal({
            name: {
              givenName: '',
              familyName: '',
            },
            id: 'test-user-efg_random_uuid',
            revision: profile.revision,
            deletedAt: null,
            deletedReason: '',
            username: 'test-user',
            email: '',
            gravatar: '9cb479887459352928d4126f898454cf',
            description: '',
            language: '',
            hash: profile.hash,
            createdAt: profile.createdAt,
            updatedAt: profile.updatedAt,
          });

          done();
        });
      });
    });
  });
});
