const debug = require('debug')('model:oauth');
const fs = require('fs');
const Sequelize = require('sequelize');
const lodash = require('lodash');
const AsToken = require('../lib/token');

const OAuthToken = require('./oauth-token');
const User = require('./user');

const { env } = process;
const { DEBUG } = env;
const { NODE_ENV } = env;
const YEAR = 1000 * 60 * 60 * 24 * 365;
const AUTHORIZATION_CODE_TRANSIENT_STORE = {};

try {
  fs.mkdirSync('db');
} catch (err) {
  if (err.message !== 'EEXIST: file already exists, mkdir \'db\'') {
    // eslint-disable-next-line no-console
    console.log('err', err);
  }
}
const sequelize = new Sequelize('database', 'id', 'password', {
  dialect: 'sqlite',
  // eslint-disable-next-line no-console
  logging: /(sql|oauth)/.test(DEBUG) ? console.log : false,
  pool: {
    max: 5,
    min: 0,
    idle: 10000,
  },
  storage: `db/oauth_clients_${NODE_ENV}.sqlite`,
});

const oauthClient = sequelize.define('oauth_clients', {
  client_id: {
    type: Sequelize.UUID,
    defaultValue: Sequelize.UUIDV1,
    primaryKey: true,
  },
  client_secret: Sequelize.TEXT,
  title: Sequelize.TEXT,
  description: Sequelize.TEXT,
  scope: Sequelize.TEXT,
  contact: Sequelize.TEXT,
  redirect_uri: Sequelize.TEXT,
  hour_limit: Sequelize.BIGINT, // requests per hour
  day_limit: Sequelize.BIGINT, // requests per calendar day
  throttle: Sequelize.INTEGER, // miliseconds
  expiresAt: Sequelize.DATE, // expiry date
  deletedAt: Sequelize.DATE,
  deletedReason: Sequelize.TEXT,
});

function signUserAsToken(json) {
  const tokenJson = lodash.omit(json, ['exp']);
  tokenJson.user = lodash.omit(json.user, ['hash', 'deletedAt', 'deletedReason']);
  tokenJson.client = lodash.pick(json.client, ['client_id', 'scope']);

  debug('signUserAsToken', tokenJson);
  return AsToken.sign(tokenJson, 60 * 24);
}

/**
 * Create a oauth client in the database
 * @param  {oauthClient}   client
 * @param callback
 */
function create(options, callback) {
  // TODO avoid sql injections
  const opts = lodash.clone(options);
  if (!options) {
    return callback(new Error('Invalid Options'));
  }
  opts.expiresAt = Date.now() + 5 * YEAR;
  opts.hour_limit = 600;
  opts.day_limit = 6000;
  opts.throttle = 500;

  return oauthClient
    .create(opts)
    .then((dbModel) => callback(null, dbModel.toJSON()))
    .catch(callback);
}

/**
 * Read an oauth client from the database
 * @param  {oauthClient}   client
 * @param callback
 */
function read(client, callback) {
  const options = {
    where: client,
  };

  oauthClient
    .findOne(options)
    .then((dbModel) => {
      if (!dbModel) {
        return callback(null, null);
      }
      return callback(null, dbModel.toJSON());
    })
    .catch(callback);
}

/**
 * List oauth client matching the options
 * @param  {String} options [description]
 * @param callback        [description]
 */
function list(opts, callback) {
  const options = lodash.clone(opts || {});
  options.limit = options.limit || 10;
  options.offset = options.offset || 0;
  options.where = options.where || {
    deletedAt: null,
  };

  options.attributes = [
    'client_id',
    'title',
    'redirect_uri',
    'description',
    'contact',
    'createdAt',
    'deletedReason',
  ];

  oauthClient
    .findAll(options)
    .then((oauthClients) => {
      if (!oauthClients) {
        return callback(new Error('Unable to fetch oauthClient collection'));
      }

      return callback(null, oauthClients.map((dbModel) => dbModel.toJSON()));
    })
    .catch(callback);
}

/**
 * Delete oauth_clients matching the options
 * @param  {String} options [description]
 * @param callback        [description]
 */
function flagAsDeleted() {
  throw new Error('Unimplemented');
}

/**
 * Initialize the oauth token and oauth client table if not already present
 * @param callback        [description]
 */
function init() {
  return OAuthToken.init().then(() => sequelize.sync());
}

/*
 * OAuth2 Provider Model
 * https://github.com/oauthjs/node-oauth2-server/wiki/Model-specification
 */

/*
 * https://oauth2-server.readthedocs.io/en/latest/misc/migrating-v2-to-v3.html?highlight=getAccessToken
 * getAccessToken(token) should return an object with:
 *    accessToken (String)
 *    accessTokenExpiresAt (Date)
 *    client (Object), containing at least an id property that matches the supplied client
 *    scope (optional String)
 *    user (Object)
 */
function getAccessToken(bearerToken) {
  return new Promise((resolve, reject) => {
    const decoded = AsToken.verify(bearerToken);
    debug('getAccessToken for token', bearerToken, decoded);

    OAuthToken.read({
      access_token: decoded.accessToken,
    }, (err, token) => {
      if (err) {
        return reject(err);
      }
      if (!token) {
        return reject(new Error('Unable to get access token, please report this'));
      }

      debug('getAccessToken created token', token);
      return resolve({
        accessToken: token.id,
        accessTokenExpiresAt: token.accessTokenExpiresAt,
        client: {
          // TODO could fetch client details
          id: token.client_id,
        },
        user: {
          // TODO could fetch user details
          id: token.user_id,
        },
      });
    });
  });
}

/**
 * Get oauth client details
 */
function getClient(clientId /* clientSecret */) {
  // eslint-disable-next-line prefer-rest-params
  debug('getClient arguments', arguments);

  return oauthClient.findOne({
    where: {
      client_id: clientId,
      // TODO examples show that that this is required, but when called via oauth.authorize it is missing
      // client_secret: clientSecret,
      deletedAt: null,
    },
  }).then((client) => {
    if (!client) {
      throw new Error('Client id or secret is invalid');
    }

    const json = {
      client: lodash.omit(client.toJSON(), ['client_secret']), // remove the secret
      id: clientId,
      grants: ['authorization_code'],
      redirectUris: client.redirect_uri ? client.redirect_uri.split(',') : [],
    };
    json.client.id = client.client_id;

    return json;
  });
}

/**
 * Get details for a given authorization code
 */
function getAuthorizationCode(code) {
  // eslint-disable-next-line prefer-rest-params
  debug('getAuthorizationCode', arguments, AUTHORIZATION_CODE_TRANSIENT_STORE);
  debug('AUTHORIZATION_CODE_TRANSIENT_STORE', AUTHORIZATION_CODE_TRANSIENT_STORE);

  return new Promise((resolve, reject) => {
    const result = AUTHORIZATION_CODE_TRANSIENT_STORE[code];
    if (result) {
      // delete AUTHORIZATION_CODE_TRANSIENT_STORE[code];
      result.expiresAt = new Date(result.expiresAt);
      // result.user = {
      //   id: client.user_id
      // };
      return resolve(result);
    }
    const err = new Error('Code is not authorized', {
      code: 403,
    });
    err.status = 403;

    return reject(err);
  });
}

/**
 * Revoke a given authorization code
 */
function revokeAuthorizationCode(code) {
  // eslint-disable-next-line prefer-rest-params
  debug('revokeAuthorizationCode', arguments);

  return new Promise((resolve) => {
    const revokedCode = lodash.clone(code);
    const itWas = AUTHORIZATION_CODE_TRANSIENT_STORE[code.code];
    debug('revoked ', itWas);

    revokedCode.expiresAt = new Date(Date.now() - 1000);
    delete AUTHORIZATION_CODE_TRANSIENT_STORE[code.code];

    resolve(revokedCode);
  });
}

/**
 * Save details for an authorization code
 */
function saveAuthorizationCode(authorizationCode, value, user) {
  debug('saveAuthorizationCode authorizationCode', authorizationCode);
  debug('saveAuthorizationCode value', value);
  debug('saveAuthorizationCode user', user);

  return new Promise((resolve) => {
    const result = {
      authorizationCode: authorizationCode.authorizationCode,
      code: authorizationCode,
      client: value.client,
      user,
      expiresAt: authorizationCode.expiresAt,
    };
    AUTHORIZATION_CODE_TRANSIENT_STORE[authorizationCode.authorizationCode] = result;
    debug('AUTHORIZATION_CODE_TRANSIENT_STORE', AUTHORIZATION_CODE_TRANSIENT_STORE);

    resolve(result);
  });
}

/**
 * Get refresh token
 */
function getRefreshToken(bearerToken, callback) {
  OAuthToken.read({
    refresh_token: bearerToken,
  }, (err, token) => {
    if (err) {
      return callback(err);
    }
    if (!token) {
      return callback(null);
    }

    return callback(null, {
      accessToken: token.access_token,
      clientId: token.client_id,
      accessTokenExpiresAt: token.accessTokenExpiresAt,
      userId: token.user_id,
    });
  });
}

/*
 * Get user details
 */
function getUser(username, password, callback) {
  debug('getUser', getUser);
  User.verifyPassword({
    username,
    password,
  }, (err, profile) => {
    if (err) {
      return callback(err);
    }
    if (!profile) {
      return callback(null);
    }

    return callback(null, profile);
  });
}

/**
 * Verify the scope for a token matches the scope pemitted
 */
function verifyScope(decodedToken, scope, callback) {
  // eslint-disable-next-line prefer-rest-params
  debug('verifyScope', arguments);
  // TODO look up if the client permits those scopes
  return callback(null, true);
}

// function validateScope(user, decodedToken) {
//   debug('validateScope', arguments);
//   return decodedToken && decodedToken.client && decodedToken.client.scope;
// }

/**
 * Save token
 */
function saveToken(token, value, user) {
  // eslint-disable-next-line prefer-rest-params
  debug('saveToken ', arguments);
  return new Promise((resolve, reject) => {
    if (!token || !value || !user) {
      return reject(new Error('Invalid Options'));
    }

    return OAuthToken.create({
      access_token: token.accessToken,
      accessTokenExpiresAt: token.accessTokenExpiresAt,
      client_id: value.client.client_id,
      refresh_token: token.refreshToken,
      refresh_token_expires_on: token.refreshTokenExpiresOn,
      user_id: user.id,
    }, (err, result) => {
      if (err) {
        return reject(err);
      }
      if (!result) {
        return reject(new Error('Unable to create token, please report this.'));
      }

      const jwt = signUserAsToken({
        accessToken: result.id,
        accessTokenExpiresAt: result.accessTokenExpiresAt,
        client: value.client,
        user,
        refreshToken: result.refresh_token,
        refreshTokenExpiresOn: result.refresh_token_expires_on,
      });
      debug('updated jwt', jwt);
      debug('saveToken saved result', result.id);

      return resolve({
        jwt,
        accessToken: jwt,
        accessTokenExpiresAt: result.accessTokenExpiresAt,
        // clientId: result.client_id,
        client: value.client,
        user,
        refreshToken: result.refresh_token,
        refreshTokenExpiresOn: result.refresh_token_expires_on,
        // userId: result.user_id
      });
    });
  });
}

module.exports.create = create;
module.exports.flagAsDeleted = flagAsDeleted;
module.exports.init = init;
module.exports.list = list;
module.exports.read = read;

module.exports.signUserAsToken = signUserAsToken;
module.exports.getAccessToken = getAccessToken;
module.exports.getAuthorizationCode = getAuthorizationCode;
module.exports.saveAuthorizationCode = saveAuthorizationCode;
module.exports.revokeAuthorizationCode = revokeAuthorizationCode;
module.exports.getClient = getClient;
module.exports.getRefreshToken = getRefreshToken;
module.exports.getUser = getUser;
module.exports.saveToken = saveToken;
module.exports.saveAccessToken = saveToken;
// module.exports.validateScope = validateScope;
module.exports.verifyScope = verifyScope;
