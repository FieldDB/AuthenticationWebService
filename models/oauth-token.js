const Sequelize = require('sequelize');
const lodash = require('lodash');

const { env } = process;
const { DEBUG } = env;
const { NODE_ENV } = env;
const sequelize = new Sequelize('database', 'id', 'password', {
  dialect: 'sqlite',
  // eslint-disable-next-line no-console
  logging: /(sql|oauth|token)/.test(DEBUG) ? console.log : false,
  pool: {
    max: 5,
    min: 0,
    idle: 10000,
  },
  storage: `db/oauth_tokens_${NODE_ENV}.sqlite`,
});

const oauthToken = sequelize.define('oauth_tokens', {
  id: {
    type: Sequelize.UUID,
    defaultValue: Sequelize.UUIDV1,
    primaryKey: true,
  },
  access_token: Sequelize.TEXT,
  accessTokenExpiresAt: Sequelize.DATE,
  client_id: Sequelize.TEXT,
  deletedAt: Sequelize.DATE,
  deletedReason: Sequelize.TEXT,
  refresh_token: Sequelize.TEXT,
  refresh_token_expires_on: Sequelize.DATE,
  user_id: {
    type: Sequelize.UUID,
  },
});

/**
 * Create a oauth token in the database
 * @param  {Token}   token
 * @return {Promise}
 */
function create(options, callback) {
  if (!options) {
    return callback(new Error('Invalid Options'));
  }

  return oauthToken
    .create(options)
    .then((dbToken) => {
      callback(null, dbToken.toJSON());
    })
    .catch(callback);
}

/**
 * Read an oauth token from the database
 * @param  {Token}   token
 * @return {Promise}
 */
function read(token, callback) {
  const options = {
    where: {},
  };

  if (token.access_token) {
    options.where = {
      access_token: token.access_token,
    };
  } else if (token.refresh_token) {
    options.where = {
      refresh_token: token.refresh_token,
    };
  } else {
    return callback(new Error('Read tokens by  either access_token or refresh_token'));
  }

  return oauthToken
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
 * List oauth token matching the options
 * @param  {Object} options [description]
 * @return {Promise}        [description] // TODO why converting promise to callback?
 */
function list(options, callback) {
  const opts = lodash.assign({
    limit: 10,
    offset: 0,
    where: {
      deletedAt: null,
    },
  }, options);

  opts.attributes = ['access_token', 'client_id', 'user_id', 'deletedReason'];

  return oauthToken
    .findAll(opts)
    .then((oauthTokens) => {
      if (!oauthTokens) {
        return callback(new Error('Unable to fetch oauthToken collection'));
      }

      return callback(null, oauthTokens.map((dbModel) => dbModel.toJSON()));
    })
    .catch(callback);
}

/**
 * Delete oauth_tokens matching the options
 * @param  {Token} options [description]
 * @return {Promise}        [description]
 */
function flagAsDeleted() {
  throw new Error('Unimplemented');
}

/**
 * Initialize the table if not already present
 * @return {Promise}        [description]
 */
function init() {
  return sequelize.sync();
}

module.exports.create = create;
module.exports.flagAsDeleted = flagAsDeleted;
module.exports.init = init;
module.exports.list = list;
module.exports.read = read;
