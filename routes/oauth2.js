const debug = require('debug')('oauth:routes');
const param = require('@cesine/swagger-node-express/Common/node/paramTypes.js');
const querystring = require('querystring');

const errorMiddleware = require('../middleware/error-handler').errorHandler;
const oauth = require('../middleware/oauth');

/**
 * Get authorization from a given user
 * @param  {Request} req
 * @param  {Response} res
 * @param  {Function} next
 */
exports.getAuthorize = {
  spec: {
    path: '/oauth2/authorize',
    description: 'Operations about authorization',
    notes: 'Requests authorization',
    summary: 'Retrieves authorization',
    method: 'GET',
    parameters: [
      param.body('client_id', 'client_id of the application', 'string'),
      param.body('redirect_uri', 'requested redirect_uri after registration', 'string'),
    ],
    responseClass: 'Authorization',
    errorResponses: [],
    nickname: 'getAuthorize',
  },
  action: function getAuthorize(req, res, next) {
    let middleware;
    debug('getAuthorize res.locals', res.locals);
    debug('req.path', req.path);
    debug('req.query', req.query);
    debug('req.body', req.body);

    // Redirect anonymous users to login page.
    if (!res.locals.user) {
      delete req.query.client_secret;
      return res.redirect(`/authentication/login/?${querystring.stringify(req.query)}`);
    }

    // https://oauth2-server.readthedocs.io/en/latest/api/oauth2-server.html#authorize-request-response-options-callback
    const authenticateHandler = {
      handle(request, response) {
        return res.locals.user;
      },
    };

    middleware = oauth.authorize({
      scope: req.query.scope,
      authenticateHandler,
      continueMiddleware: true, // does not call through
    });
    debug('There is a user res.locals.user', res.locals.user, middleware);
    debug('req.headers', req.headers);

    return middleware(req, res, (err) => {
      debug('done the authorize middleware', err, req.user, res.locals);
      if (err) {
        debug('error authorizing client', err, req.query);
        return next(err);
      }
      // next(); // cannot set headers after they are set
    });
  },
};

/**
 * Create an OAuth2 token
 *
 * @type {[type]}
 */
exports.postToken = {
  spec: {
    path: '/oauth2/token',
    description: 'Operations about tokens',
    notes: 'Requests a token',
    summary: 'Retrieves a token',
    method: 'POST',
    parameters: [
      param.form('client_id', 'client_id of the application', 'string'),
      param.form('redirect_uri', 'requested redirect_uri after registration', 'string'),
    ],
    responseClass: 'Token',
    errorResponses: [],
    nickname: 'postToken',
  },
  action: function postToken(req, res, next) {
    let middleware;
    debug('postToken', req.query, req.body, res.headers);
    // req.user = res.locals.user; TODO where does the user that is passed to client come from

    middleware = oauth.token({
      // continueMiddleware: true,
    });

    middleware(req, res, (err) => {
      debug('done the token middleware', err, req.user, res.locals);

      if (err) {
        debug('error authorizing client', err, req.query);
        return next(err);
      }
      // TODO this has no effect
      // instead working around it by return jwt in saveToken response as accesToken
      res.set('Authorization', `Bearer ${res.locals.oauth.token.jwt}`);

      // next();
    });
  },
};
// comes from https://github.com/oauthjs/express-oauth-server/blob/master/index.js#L64
// service.use(service.oauth.authorise()); // service.oauth.authorise is not a function

// Comes from https://github.com/oauthjs/node-oauth2-server#quick-start
// Invalid argument: `response` must be an instance of Response
// service.use(service.oauth.authenticate());
