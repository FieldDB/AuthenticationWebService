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
  if (!username) {
    return Promise.reject(new Error('username is required'));
  }

  const usersdb = nano({
    requestDefaults: {
      headers: {
        'x-request-id': req.id,
      },
    },
    url: couchConnectUrl,
  }).db.use(config.usersDbConnection.dbname);

  return usersdb.get(username)
    .then((result) => {
      if (result) {
        debug(`${new Date()} User found: ${result._id}`);
        if (result.serverlogs && result.serverlogs.disabled) {
          const err = new Error(`User ${username} has been disabled, probably because of a violation of the terms of service. ${result.serverlogs.disabled}`);
          err.status = 401;
          err.userFriendlyErrors = [`This username has been disabled. Please contact us at support@lingsync.org if you would like to reactivate this username. Reasons: ${result.serverlogs.disabled}`];
          throw err;
        }

        const user = {
          ...result,
        };
        user.corpora = user.corpora || user.corpuses || [];
        if (user.corpuses) {
          debug(` Upgrading ${user.username} data structure to v3.0`);
          delete user.corpuses;
        }

        // console.log('resolving the user', user)
        return { user };
      }

      const err = new Error('unexpected case: missing error and result');
      req.log.error(err, `${new Date()} No User found: ${username}`);
      throw err;
    })
    .catch((error) => {
      if (error.error === 'not_found') {
        req.log.warn(error, `${new Date()} No User found: ${username}`);
        const err = new Error(`User ${username} does not exist`);
        err.status = 401;
        err.userFriendlyErrors = ['Username or password is invalid. Please try again'];
        throw err;
      }

      if (error.error === 'unauthorized') {
        req.log.error(error, `${new Date()} Wrong admin username and password`);
        throw new Error('Server is mis-configured. Please report this error 8914.');
      }

      throw error;
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
 * accepts an old and new password, a user and a function to be
 * called with (error, user, info)
 * TODO rename to changePassword
 *
 * @param oldpassword
 * @param newpassword
 * @param username
 */
function setPassword({
  oldpassword,
  newpassword,
  user = {},
} = {}) {
  const { username } = user;
  if (!username) {
    const err = new Error('Please provide a username');
    err.status = 412;
    return Promise.reject(err);
  }
  if (!oldpassword) {
    const err = new Error('Please provide your old password');
    err.status = 412;
    return Promise.reject(err);
  }
  if (!newpassword) {
    const err = new Error('Please provide your new password');
    err.status = 412;
    return Promise.reject(err);
  }
  const safeUsernameForCouchDB = Connection.validateUsername(username);
  if (username !== safeUsernameForCouchDB.identifier) {
    const err = new Error('Username or password is invalid. Please try again');
    err.status = 412;
    return Promise.reject(err);
  }

  console.log('inside setPassword before findByUsername', username);
  return findByUsername({ username })
    .then(({ user }) => {
      debug(`${new Date()} Found user in setPassword: ${util.inspect(user)}`);

      return verifyPassword({
        user,
        password: oldpassword,
      });
    })
    .then(({ user }) => {
      const salt = user.salt = bcrypt.genSaltSync(10);
      user.hash = bcrypt.hashSync(newpassword, salt);
      debug(salt, user.hash);
      // Save new password to couch too
      corpusmanagement.changeUsersPassword(user.corpora[user.corpora.length - 1], user, newpassword,
        (res) => {
          debug(`${new Date()} There was success in creating changing the couchdb password: ${util.inspect(res)}\n`);
        },
        (err) => {
          debug(`${new Date()} There was an error in creating changing the couchdb password ${util.inspect(err)}\n`);
        });
      // Save user to database and change the success message to be more appropriate
      saveUpdateUserToDatabase(user, (err, user, info) => {
        if (info.message === 'User details saved.') {
          info.message = 'Your password has succesfully been updated.';
        }
        return resolve({ user, info });
      });
    })
    .catch((err) => {
      debug(`${new Date()} Error looking up user  ${username} : ${util.inspect(err)}`);

      throw err;
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
        bcrypt.compare(password || ' ', user.hash)

          .then((matches) => {
            if (matches) {
              resolve(user);
            }

            if (!matches) {
              const err = new Error('Username or password is invalid. Please try again.');
              err.status = 401;
              return reject(err);
            }
          });
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
