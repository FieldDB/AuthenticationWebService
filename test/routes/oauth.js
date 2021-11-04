const { expect } = require('chai');
const sinon = require('sinon');

const oauth = require('../../routes/oauth2');
const oauthModel = require('../../models/oauth-client');

describe('routes/oauth2', () => {
  it('should load', () => {
    expect(oauth).to.be.a('object');
    expect(oauth.getAuthorize).to.be.a('object');
    expect(oauth.getToken).to.not.be.a('object');
    expect(oauth.postAuthorize).to.not.be.a('object');
    expect(oauth.postToken).to.be.a('object');
  });

  it('should postToken', (done) => {
    const req = {
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
        'content-length': 2,
      },
      method: 'POST',
      query: {},
      body: {
        client_id: 'test-mock-client',
        client_secret: 'test-mock-secret',
        grant_type: 'authorization_code',
        code: 'ABC',
      },
      log: {
        fields: {},
      },
    };

    const res = {
      headers: {},
      locals: {},
      set() {},
      status() {
        return this;
      },
      json() {
        return this;
      },
      send() {
        return this;
      },
    };
    const mockCode = {
      client: {
        id: 'test-mock-client',
      },
      user: {
        something: 'here',
      },
      expiresAt: new Date(Date.now() + 1000),
    };

    const mockClient = {
      id: 'test-mock-client',
      client: {
        id: 'test-mock-client',
        client_id: 'test-mock-client',
        other: 'stuff',
      },
      grants: ['authorization_code'],
      redirectUris: ['somewhere'],
    };

    sinon.stub(oauthModel, 'getAuthorizationCode').returns(mockCode);
    sinon.stub(oauthModel, 'getClient').returns(mockClient);

    oauth.postToken.action(req, res, (err) => {
      expect(err).to.equal(undefined);
    });

    // Workaround to test the fact that the next is not called unless there is an error.
    setTimeout(() => {
      expect(res.locals).to.deep.equal({
        oauth: {
          token: {
            jwt: res.locals.oauth.token.jwt,
            accessToken: res.locals.oauth.token.accessToken,
            accessTokenExpiresAt: res.locals.oauth.token.accessTokenExpiresAt,
            client: mockClient.client,
            user: mockCode.user,
            refreshToken: res.locals.oauth.token.refreshToken,
            refreshTokenExpiresOn: undefined,
          },
        },
      });
      done();
    }, 500);
  });
});
