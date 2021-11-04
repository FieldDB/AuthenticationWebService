var expect = require('chai').expect;
var sinon = require('sinon');

var oauth = require('./../../routes/oauth2');
var oauthModel = require('./../../models/oauth-client');

describe('routes/oauth2', function () {
  it('should load', function () {
    expect(oauth).to.be.a('object');
    expect(oauth.getAuthorize).to.be.a('object');
    expect(oauth.getToken).to.not.be.a('object');
    expect(oauth.postAuthorize).to.not.be.a('object');
    expect(oauth.postToken).to.be.a('object');
  });

  it('should postToken', function (done) {
    var req = {
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
        'content-length': 2
      },
      method: 'POST',
      query: {},
      body: {
        client_id: 'test-mock-client',
        client_secret: 'test-mock-secret',
        grant_type: 'authorization_code',
        code: 'ABC'
      },
      log: {
        fields: {}
      }
    };

    var res = {
      headers: {},
      locals: {},
      set: function () {},
      status: function () {
        return this;
      },
      json: function () {
        return this;
      },
      send: function () {
        return this;
      }
    };
    var mockCode = {
      client: {
        id: 'test-mock-client'
      },
      user: {
        something: 'here'
      },
      expiresAt: new Date(Date.now() + 1000)
    };

    var mockClient = {
      id: 'test-mock-client',
      client: {
        id: 'test-mock-client',
        client_id: 'test-mock-client',
        other: 'stuff'
      },
      grants: ['authorization_code'],
      redirectUris: ['somewhere']
    };

    sinon.stub(oauthModel, 'getAuthorizationCode').returns(mockCode);
    sinon.stub(oauthModel, 'getClient').returns(mockClient);

    oauth.postToken.action(req, res, function (err) {
      expect(err).to.equal(undefined);
    });

    // Workaround to test the fact that the next is not called unless there is an error.
    setTimeout(function () {
      expect(res.locals).to.deep.equal({
        oauth: {
          token: {
            jwt: res.locals.oauth.token.jwt,
            accessToken: res.locals.oauth.token.accessToken,
            accessTokenExpiresAt: res.locals.oauth.token.accessTokenExpiresAt,
            client: mockClient.client,
            user: mockCode.user,
            refreshToken: res.locals.oauth.token.refreshToken,
            refreshTokenExpiresOn: undefined
          }
        }
      });
      done();
    }, 500);
  });
});
