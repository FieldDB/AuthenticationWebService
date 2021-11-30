const debug = require('debug')('middleware:oauth');
const OAuthServer = require('express-oauth-server');
const OAuthClient = require('../models/oauth-client');

const oauth = new OAuthServer({
  debug: /(oauth)/.test(process.env.DEBUG),
  // handleError: errorMiddleware,
  useErrorHandler: true,
  continueMiddleware: true,
  allowBearerTokensInQueryString: false,
  addAcceptedScopesHeader: true,
  addAuthorizedScopesHeader: true,
  model: OAuthClient, // See https://github.com/thomseddon/node-oauth2-server for specification
});

debug('oauth', oauth.server);
// Debug changes in the express-oauth-server implementation
// eslint-disable-next-line no-restricted-syntax, guard-for-in
for (const att in oauth.server) {
  debug('oauth server has: ', att);
}
module.exports = oauth;
