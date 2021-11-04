const { expect } = require('chai');

const oauth = require('../../middleware/oauth');

describe('middleware/oauth', () => {
  it('should load', () => {
    expect(oauth).to.be.a('object');
    expect(oauth.server).to.be.a('object');

    // https://github.com/oauthjs/express-oauth-server/blob/master/index.js#L64
    expect(oauth.server.authorize).to.be.a('function');

    expect(oauth.server.options).to.be.a('object');
    expect(oauth.server.options.model).to.be.a('object');

    expect(oauth.server.options.model.getClient).to.be.a('function');
    expect(oauth.server.options.model.getUser).to.be.a('function');
    expect(oauth.server.options.model.getAccessToken).to.be.a('function');
    expect(oauth.server.options.model.getRefreshToken).to.be.a('function');
    expect(oauth.server.options.model.saveAccessToken).to.be.a('function');
  });
});
