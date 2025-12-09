#!/usr/local/bin/node
const bodyParser = require('body-parser');
const bunyan = require('express-bunyan-logger');
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
const config = require('config');
const crossOriginResourceSharing = require('cors');
const debug = require('debug')('auth:service');
const express = require('express');
const favicon = require('serve-favicon');
const path = require('path');

/* Load modules provided by this codebase */
const authWebServiceRoutes = require('./routes/routes');
const { errorHandler } = require('./middleware/error-handler');
const deprecatedRoutes = require('./routes/deprecated');

const apiVersion = 'v1'; // 'v' + parseInt(require('./package.json').version, 10);
const corsOptions = {
  credentials: true,
  maxAge: 86400,
  methods: 'HEAD, POST, GET, PUT, PATCH, DELETE',
  allowedHeaders: 'Access-Control-Allow-Origin, access-control-request-headers, accept, accept-charset, accept-encoding, accept-language, authorization, content-length, content-type, host, origin, proxy-connection, referer, user-agent, x-requested-with',
  origin: function isOriginWhiteListed(origin, callback) {
    let originIsWhitelisted = false;
    if (/* permit curl */ origin === undefined || /* permit android */ origin === 'null' || origin === null || !origin) {
      originIsWhitelisted = true;
    } else if (origin.search(/^https?:\/\/.*\.lingsync.org$/) > -1
      || origin.search(/^https?:\/\/.*\.phophlo.ca$/) > -1
      || origin.search(/^https?:\/\/(localhost|127.0.0.1):[0-9]*$/) > -1
      || origin.search(/^chrome-extension:\/\/[^/]*$/) > -1
      || origin.search(/^https?:\/\/.*\.jrwdunham.com$/) > -1) {
      originIsWhitelisted = true;
    }
    debug(`${new Date()} Responding with CORS options for ${origin} accept as whitelisted is: ${originIsWhitelisted}`);
    callback(null, originIsWhitelisted);
  },
};
/**
 * Use Express to create the authWebService see http://expressjs.com/ for more details
 */
const authWebService = express();
authWebService.use(crossOriginResourceSharing(corsOptions));
// Accept versions
// authWebService.use(function versionMiddleware(req, res, next) {
//   if (req.url.indexOf('/' + apiVersion) === 0) {
//     req.url = req.url.replace('/' + apiVersion, '');
//   }
//   next();
// });
debug(`Accepting api version ${apiVersion}`);

/**
 * Middleware
 */

authWebService.use(favicon(path.join(__dirname, '/public/favicon.ico')));
authWebService.use(bunyan({
  name: 'fielddb-auth',
  streams: [{
    level: process.env.BUNYAN_LOG_LEVEL || 'warn',
    stream: process.stdout,
  }],
}));
authWebService.use((req, res, next) => {
  if (req.headers && req.headers['x-request-id']) {
    // eslint-disable-next-line no-param-reassign
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
  extended: true,
}));
// authWebService.use(methodOverride());
// authWebService.use(authWebService.router);
/*
 * Although this is mostly a webservice used by machines (not a websserver used by humans)
 * we are still serving a user interface for the api sandbox in the public folder
 */
authWebService.use(express.static(path.join(__dirname, 'public')));
authWebService.use((req, res, next) => {
  if (req.method === 'OPTIONS') {
    debug('responding to OPTIONS request');
    res.send(204);
    return;
  }
  next();
});

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
authWebService.use((req, res, next) => {
  // if (apiRegex.test(req.path) || req.method !== 'GET') {
  const err = new Error('Not Found');
  debug(`${req.url} was not found/handled`);
  err.status = 404;
  // return next(err, req, res, next);
  // }
  next(err);
});

authWebService.use(errorHandler);

module.exports = authWebService;
