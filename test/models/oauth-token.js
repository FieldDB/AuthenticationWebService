var expect = require('chai').expect;
var Sequelize = require('sequelize').Sequelize;

var OauthToken = require('./../../models/oauth-token');

describe('models/oauth-token', function () {
  before(function () {
    OauthToken.init();
  });

  describe('persistance', function () {
    it('should create a OauthToken', function (done) {
      var json = {
        access_token: 'test-' + Date.now(),
        accessTokenExpiresAt: new Date(Date.now() + 1 * 60 * 60 * 1000),
        refresh_token: '23waejsowj4wejsrd',
        refresh_token_expires_on: new Date(Date.now() + 1 * 60 * 60 * 1000),
        client_id: 'acme123',
        user_id: 'abc21234efg'
      };

      OauthToken.create(json, function (err, token) {
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
          createdAt: token.createdAt
        });

        done();
      });
    });

    it('should return null if OauthToken not found', function (done) {
      OauthToken
        .read({
          access_token: 'test-nonexistant-OauthToken'
        }, function (err, token) {
          if (err) {
            return done(err);
          }

          expect(token).to.equal(null);

          done();
        });
    });

    describe('existing OauthTokens', function () {
      var clientId = 'test-client' + Date.now();
      before(function (done) {
        OauthToken
          .create({
            access_token: 'test-token-lookup' + clientId,
            accessTokenExpiresAt: new Date(1468108856432),
            refresh_token: 'test-refresh',
            refresh_token_expires_on: new Date(1468108856432),
            client_id: clientId,
            user_id: 'test-user-efg_random_uuid-lookup'
          }, function () {
            done();
          });
      });

      it('should look up an access token', function (done) {
        OauthToken
          .read({
            access_token: 'test-token-lookup' + clientId
          }, function (err, token) {
            if (err) {
              return done(err);
            }

            expect(token.access_token).equal('test-token-lookup' + clientId);
            expect(token.refresh_token).equal('test-refresh');
            expect(token.client_id).equal(clientId);
            expect(token.user_id).equal('test-user-efg_random_uuid-lookup');

            expect(token.accessTokenExpiresAt instanceof Date).to.equal(true);
            expect(token.refresh_token_expires_on instanceof Date).to.equal(true);

            expect(JSON.stringify(token.accessTokenExpiresAt))
              .equal('"2016-07-10T00:00:56.432Z"');

            done();
          });
      });

      it('should look up an refresh token', function (done) {
        OauthToken
          .read({
            refresh_token: 'test-refresh'
          }, function (err, token) {
            if (err) {
              return done(err);
            }

            expect(token.access_token).equal('test-token');
            expect(token.refresh_token).equal('test-refresh');

            done();
          });
      });
    });
  });

  describe('collection', function () {
    beforeEach(function (done) {
      var user = {
        id: 'test-user'
      };

      var client = {
        id: 'test-client'
      };

      OauthToken
        .read({
          access_token: 'testm-abc'
        }, function (err, token) {
          if (token) {
            return done();
          }
          OauthToken
            .create({
              access_token: 'testm-abc',
              client_id: client.id,
              user_id: user.id
            }, function () {
              OauthToken
                .create({
                  access_token: 'testm-efg',
                  client_id: client.id,
                  user_id: user.id
                }, function () {
                  OauthToken
                    .create({
                      access_token: 'testm-hij',
                      client_id: client.id,
                      user_id: user.id
                    }, function () {
                      done();
                    });
                });
            });
        });
    });

    it('should list an admin view of all tokens', function (done) {
      OauthToken.list({
        where: {
          access_token: {
            [Sequelize.Op.like]: 'testm-%'
          }
        },
        limit: 1000
      }, function (err, tokens) {
        if (err) {
          return done(err);
        }

        expect(tokens).not.to.deep.equal([]);
        expect(tokens).length(3);

        var token = tokens[0];
        expect(token.access_token).to.not.equal(undefined);
        expect(token.client_id).to.not.equal(undefined);
        expect(token.user_id).to.not.equal(undefined);
        expect(token.deletedReason).to.equal(null);

        done();
      });
    });
  });
});
