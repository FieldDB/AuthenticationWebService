const { expect } = require('chai');
const { Sequelize } = require('sequelize');

const OauthToken = require('../../models/oauth-token');

describe('models/oauth-token', () => {
  before(() => {
    OauthToken.init();
  });

  describe('persistance', () => {
    it('should create a OauthToken', (done) => {
      const json = {
        access_token: `test-${Date.now()}`,
        accessTokenExpiresAt: new Date(Date.now() + 1 * 60 * 60 * 1000),
        refresh_token: '23waejsowj4wejsrd',
        refresh_token_expires_on: new Date(Date.now() + 1 * 60 * 60 * 1000),
        client_id: 'acme123',
        user_id: 'abc21234efg',
      };

      OauthToken.create(json, (err, token) => {
        if (err) {
          return done(err);
        }

        expect(token.id).length(36);
        expect(token).to.deep.equal({
          id: token.id,
          access_token: json.access_token,
          accessTokenExpiresAt: json.accessTokenExpiresAt,
          client_id: json.client_id,
          refresh_token: json.refresh_token,
          refresh_token_expires_on: json.refresh_token_expires_on,
          user_id: json.user_id,
          updatedAt: token.updatedAt,
          createdAt: token.createdAt,
        });

        return done();
      });
    });

    it('should return null if OauthToken not found', (done) => {
      OauthToken
        .read({
          access_token: 'test-nonexistant-OauthToken',
        }, (err, token) => {
          if (err) {
            return done(err);
          }

          expect(token).to.equal(null);

          return done();
        });
    });

    describe('existing OauthTokens', () => {
      const clientId = `test-client${Date.now()}`;
      before((done) => {
        OauthToken
          .create({
            access_token: `test-token-lookup${clientId}`,
            accessTokenExpiresAt: new Date(1468108856432),
            refresh_token: 'test-refresh',
            refresh_token_expires_on: new Date(1468108856432),
            client_id: clientId,
            user_id: 'test-user-efg_random_uuid-lookup',
          }, () => done());
      });

      it('should look up an access token', (done) => {
        OauthToken
          .read({
            access_token: `test-token-lookup${clientId}`,
          }, (err, token) => {
            if (err) {
              return done(err);
            }

            expect(token.access_token).equal(`test-token-lookup${clientId}`);
            expect(token.refresh_token).equal('test-refresh');
            expect(token.client_id).equal(clientId);
            expect(token.user_id).equal('test-user-efg_random_uuid-lookup');

            expect(token.accessTokenExpiresAt instanceof Date).to.equal(true);
            expect(token.refresh_token_expires_on instanceof Date).to.equal(true);

            expect(JSON.stringify(token.accessTokenExpiresAt))
              .equal('"2016-07-10T00:00:56.432Z"');

            return done();
          });
      });

      it('should look up an refresh token', (done) => {
        OauthToken
          .read({
            refresh_token: 'test-refresh',
          }, (err, token) => {
            if (err) {
              return done(err);
            }

            expect(token.access_token).equal('test-token');
            expect(token.refresh_token).equal('test-refresh');

            return done();
          });
      });
    });
  });

  describe('collection', () => {
    beforeEach((done) => {
      const user = {
        id: 'test-user',
      };

      const client = {
        id: 'test-client',
      };

      OauthToken
        .read({
          access_token: 'testm-abc',
        }, (err, token) => {
          if (token) {
            return done();
          }
          return OauthToken
            .create({
              access_token: 'testm-abc',
              client_id: client.id,
              user_id: user.id,
            }, () => {
              OauthToken
                .create({
                  access_token: 'testm-efg',
                  client_id: client.id,
                  user_id: user.id,
                }, () => {
                  OauthToken
                    .create({
                      access_token: 'testm-hij',
                      client_id: client.id,
                      user_id: user.id,
                    }, () => done());
                });
            });
        });
    });

    it('should list an admin view of all tokens', (done) => {
      OauthToken.list({
        where: {
          access_token: {
            [Sequelize.Op.like]: 'testm-%',
          },
        },
        limit: 1000,
      }, (err, tokens) => {
        if (err) {
          return done(err);
        }

        expect(tokens).not.to.deep.equal([]);
        expect(tokens).length(3);

        const token = tokens[0];
        expect(token.access_token).to.not.equal(undefined);
        expect(token.client_id).to.not.equal(undefined);
        expect(token.user_id).to.not.equal(undefined);
        expect(token.deletedReason).to.equal(null);

        return done();
      });
    });
  });
});
