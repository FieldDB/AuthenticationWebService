#!/usr/local/bin/node
var bodyParser = require('body-parser');
var bunyan = require('express-bunyan-logger');
/**
 * You can control aspects of the deployment by using Environment Variables
 *
 * Examples:
 * $ NODE_ENV=production        # uses config/production.js
 * $ NODE_ENV=test              # uses config/test.js
 * $ NODE_ENV=development       # uses config/development.js
 * $ NODE_ENV=local             # uses config/local.js
 * $ NODE_ENV=yoursecretconfig  # uses config/yoursecretconfig.js
 */
var config = require('config');
var crossOriginResourceSharing = require('cors');
var debug = require('debug')('auth:service');
var express = require('express');
var favicon = require('serve-favicon');
var path = require('path');

/* Load modules provided by this codebase */
var authenticationMiddleware = require('./middleware/authentication');
var authWebServiceRoutes = require('./routes/routes');
var errorHandler = require('./middleware/error-handler').errorHandler;
var deprecatedRoutes = require('./routes/deprecated');
var apiVersion = 'v1'; // 'v' + parseInt(require('./package.json').version, 10);
var corsOptions = {
  credentials: true,
  maxAge: 86400,
  methods: 'HEAD, POST, GET, PUT, PATCH, DELETE',
  allowedHeaders: 'Access-Control-Allow-Origin, access-control-request-headers, accept, accept-charset, accept-encoding, accept-language, authorization, content-length, content-type, host, origin, proxy-connection, referer, user-agent, x-requested-with',
  origin: function isOriginWhiteListed(origin, callback) {
    var originIsWhitelisted = false;
    if (/* permit curl */ origin === undefined || /* permit android */ origin === 'null' || origin === null || !origin) {
      originIsWhitelisted = true;
    } else if (origin.search(/^https?:\/\/.*\.lingsync.org$/) > -1
      || origin.search(/^https?:\/\/.*\.phophlo.ca$/) > -1
      || origin.search(/^https?:\/\/(localhost|127.0.0.1):[0-9]*$/) > -1
      || origin.search(/^chrome-extension:\/\/[^/]*$/) > -1
      || origin.search(/^https?:\/\/.*\.jrwdunham.com$/) > -1) {
      originIsWhitelisted = true;
    }
    debug(new Date() + ' Responding with CORS options for ' + origin + ' accept as whitelisted is: ' + originIsWhitelisted);
    callback(null, originIsWhitelisted);
  }
};
/**
 * Use Express to create the authWebService see http://expressjs.com/ for more details
 */
var authWebService = express();
authWebService.use(crossOriginResourceSharing(corsOptions));
// Accept versions
// authWebService.use(function versionMiddleware(req, res, next) {
//   if (req.url.indexOf('/' + apiVersion) === 0) {
//     req.url = req.url.replace('/' + apiVersion, '');
//   }
//   next();
// });
debug('Accepting api version ' + apiVersion);

/**
 * Middleware
 */
// The example attaches it to the express
// https://github.com/oauthjs/express-oauth-server#quick-start
// service.oauth = oauthMiddleware;
authWebService.use(authenticationMiddleware.jwt);

authWebService.use(favicon(path.join(__dirname, '/public/favicon.ico')));
authWebService.use(bunyan({
  name: 'fielddb-auth',
  streams: [{
    level: process.env.BUNYAN_LOG_LEVEL || 'warn',
    stream: process.stdout
  }]
}));
authWebService.use(function (req, res, next) {
  if (req.headers && req.headers['x-request-id']) {
    req.id = req.headers['x-request-id'];
  }
  next();
});

// authWebService.use(session({
//   resave: true,
//   saveUninitialized: true,
//   secret: config.sessionKey
// }));
authWebService.use(bodyParser.json());
authWebService.use(bodyParser.urlencoded({
  extended: true
}));
// authWebService.use(methodOverride());
// authWebService.use(authWebService.router);
/*
 * Although this is mostly a webservice used by machines (not a websserver used by humans)
 * we are still serving a user interface for the api sandbox in the public folder
 */
authWebService.use(express.static(path.join(__dirname, 'public')));
authWebService.options('*', function options(req, res) {
  if (req.method === 'OPTIONS') {
    debug('responding to OPTIONS request');
    res.send(204);
  }
});

authWebService.use('/bower_components', express.static(path.join(__dirname,
  '/public/components/as-ui-auth/bower_components')));
authWebService.use('/authentication', authenticationMiddleware.redirectAuthenticatedUser, express.static(path.join(__dirname, '/public/components/as-ui-auth/components')));
authWebService.use('/authentication/register', authenticationMiddleware.redirectAuthenticatedUser,
  express.static(path.join(__dirname, '/public/components/as-ui-auth/components/signup')));

/**
 * Set up all the available URL authWebServiceRoutes see routes/routes.js for more details
 */
authWebServiceRoutes.setup(authWebService);
/**
 * Set up all the old routes until all client apps have migrated to the v2+ api
 */
deprecatedRoutes.addDeprecatedRoutes(authWebService, config);

/**
 * Not found
 */
authWebService.use(function notFoundMiddleware(req, res, next) {
  // if (apiRegex.test(req.path) || req.method !== 'GET') {
  var err = new Error('Not Found');
  debug(req.url + ' was not found/handled');
  err.status = 404;
  return next(err, req, res, next);
  // }
  // next();
});

authWebService.use(errorHandler);

module.exports = authWebService;
