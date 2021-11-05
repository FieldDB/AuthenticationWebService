const bcrypt = require('bcryptjs');
const debug = require('debug')('lib:user');
const config = require('config');
const nano = require('nano');
const url = require('url');
const {
  Connection,
} = require('fielddb/api/corpus/Connection');

const {
  NODE_ENV,
} = process.env;
if (!Connection || !Connection.knownConnections || !Connection.knownConnections.production) {
  throw new Error(`The app config for ${NODE_ENV} is missing app types to support. `);
}
/*
 * we are getting too many user signups from the Learn X users and the speech recognition trainer users,
 * they are starting to overpower the field linguist users. So if when we add the ability for them
 * to backup and share their languages lessions, then
 * we will create their dbs  with a non-anonymous username.
 */
const dontCreateDBsForLearnXUsersBecauseThereAreTooManyOfThem = true;
const backwardCompatible = false;

const parsed = url.parse(config.usersDbConnection.url);
const couchConnectUrl = `${parsed.protocol}//${config.couchKeys.username}:${config.couchKeys.password}@${parsed.host}`;

let sampleUsers = ['public'];
for (const userType in config.sampleUsers) {
  if (config.sampleUsers.hasOwnProperty(userType) && config.sampleUsers[userType].length > 0) {
    sampleUsers = sampleUsers.concat(config.sampleUsers[userType]);
  }
}
debug(`${new Date()}  Sample users will not recieve save preferences changes.`, sampleUsers);

function undoCorpusCreation({
  // user,
  // connection,
  // docs,
} = {}) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      reject(new Error('not implemented'));
    });
  });
}
/*
 * Looks up the user by username, gets the user, confirms this is the right
 * password. Takes user details from the request and saves them into the user,
 *
 * If its not the right password does some logging to find out how many times
 * they have attempted, if its too many it emails them a temp password if they
 * have given us a valid email. If this is a local or dev server config, it
 * doesn't email, or change their password.
 */
function authenticateUser({
  // username,
  // password,
  // req,
} = {}) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      reject(new Error('not implemented'));
    });
  });
}

/*
 * Ensures the requesting user to make the permissions
 * modificaitons. Then adds the role to the user if they exist
 */
function addRoleToUser({
  // req,
} = {}) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      reject(new Error('not implemented'));
    });
  });
}

function sortByUsername(a, b) {
  if (a.username < b.username) {
    return -1;
  }
  if (a.username > b.username) {
    return 1;
  }
  return 0;
}

/*
 * Looks returns a list of users ordered by role in that corpus
 */
function fetchCorpusPermissions({
  // req,
} = {}) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      reject(new Error('not implemented'));
    });
  });
}

function addCorpusToUser({
  // error,
  // username,
  // newConnection,
  // userPermissionResult,
} = {}) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      reject(new Error('not implemented'));
    });
  });
}

function createNewCorpusesIfDontExist({
  // user,
  // corpora,
} = {}) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      reject(new Error('not implemented'));
    });
  });
}

/**
function is called back
 * with (error, user, info) where error contains the server's detailed error
 * (not to be shared with the client), and info contains a client readible error
 * message.
 *
 * @param user
 */
function saveUpdateUserToDatabase({
  // user,
} = {}) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      reject(new Error('not implemented'));
    });
  });
}

/**
 * connects to the usersdb, tries to retrieve the doc with the
 * provided id
 *
 * @param id
 */
function findByUsername({
  username,
  req = {
    id: '',
    log: {
      error: console.error,
      warn: console.warn,
    },
  },
} = {}) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (!username) {
        reject(new Error('username is required'));
        return;
      }

      const usersdb = nano({
        requestDefaults: {
          headers: {
            'x-request-id': req.id,
          },
        },
        url: couchConnectUrl,
      }).db.use(config.usersDbConnection.dbname);

      usersdb.get(username, (error, result) => {
        if (error) {
          if (error.error === 'not_found') {
            req.log.warn(error, `${new Date()} No User found: ${username}`);
            const err = new Error(`User ${username} does not exist`);
            err.status = 401;
            err.userFriendlyErrors = ['Username or password is invalid. Please try again'];
            return reject(err);
          }

          if (error.error === 'unauthorized') {
            req.log.error(error, `${new Date()} Wrong admin username and password`);
            return reject(new Error('Server is mis-configured. Please report this error 8914.'));
          }

          req.log.error(error, `${new Date()} Unexpected error findByUsername: ${username} ${JSON.stringify(error)}`);
          return reject(new Error('Server is not responding to request. Please report this error 8913.'));
        }

        if (result) {
          debug(`${new Date()} User found: ${result._id}`);
          if (result.serverlogs && result.serverlogs.disabled) {
            const err = new Error(`User ${username} has been disabled, probably because of a violation of the terms of service. ${result.serverlogs.disabled}`);
            err.status = 401;
            err.userFriendlyErrors = [`This username has been disabled. Please contact us at support@lingsync.org if you would like to reactivate this username. Reasons: ${result.serverlogs.disabled}`];
            return reject(err);
          }

          const user = {
            ...result,
          };
          user.corpora = user.corpora || user.corpuses || [];
          if (user.corpuses) {
            debug(` Upgrading ${user.username} data structure to v3.0`);
            delete user.corpuses;
          }
          return resolve({ user });
        }

        const err = new Error('unexpected case: missing error and result');
        req.log.error(err, `${new Date()} No User found: ${username}`);
        return reject(err);
      });
    });
  });
}

/**
function uses tries to look up users by email
 */
function findByEmail({
  // email,
  // optionallyRestrictToIncorrectLoginAttempts,
} = {}) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      reject(new Error('not implemented'));
    });
  });
}

/**
 *
 *
 * @param oldpassword
 * @param newpassword
 * @param username
 */
function setPassword({
  // oldpassword,
  // newpassword,
  // username,
} = {}) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      reject(new Error('not implemented'));
    });
  });
}

/**
function accepts an email, finds associated users who have had incorrect login
 *
 *
 * @param email
 */
function forgotPassword({
  // email,
} = {}) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      reject(new Error('not implemented'));
    });
  });
}

function verifyPassword({
  password,
  user,
} = {}) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      try {
        /*
         * If the user didnt furnish a password, set a fake one. It will return
         * unauthorized.
         */
        resolve(bcrypt.compare(password || ' ', user.hash));
      } catch (err) {
        reject(err);
      }
    });
  });
}

module.exports = {
  addCorpusToUser,
  addRoleToUser,
  authenticateUser,
  createNewCorpusesIfDontExist,
  fetchCorpusPermissions,
  findByEmail,
  findByUsername,
  forgotPassword,
  sampleUsers,
  saveUpdateUserToDatabase,
  setPassword,
  sortByUsername,
  undoCorpusCreation,
  verifyPassword,
};
