const bcrypt = require('bcryptjs');
const debug = require('debug')('lib:user');
const config = require('config');
const nano = require('nano');
const url = require('url');
const {
  Connection,
} = require('fielddb/api/corpus/Connection');

const corpusmanagement = require('./corpusmanagement');

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
  user: fieldDBUser,
  req = {
    id: '',
    log: {
      error: console.error,
      warn: console.warn,
    },
  },
} = {}) {
  if (!fieldDBUser || !fieldDBUser.username) {
    return Promise.reject(new Error('Please provide a username 8933'));
  }

  if (process.env.INSTALABLE !== 'true' && sampleUsers.indexOf(fieldDBUser.username) > -1) {
    return Promise.resolve({
      user: fieldDBUser,
      info: {
        message: 'User is a reserved user and cannot be updated in this manner.',
      },
    });
  }
  const user = fieldDBUser.toJSON ? fieldDBUser.toJSON() : fieldDBUser;
  // dont need the salt
  delete user.salt;

  // Preparing the couch connection
  const usersdb = nano({
    requestDefaults: {
      headers: {
        'x-request-id': req.id,
      },
    },
    url: couchConnectUrl,
  }).db.use(config.usersDbConnection.dbname);
  // Put the user in the database and callback
  return usersdb.insert(user, user.username)
    .then((resultuser) => {
      if (resultuser.ok) {
        debug(`${new Date()} No error saving a user: ${JSON.stringify(resultuser)}`);
        // eslint-disable-next-line no-underscore-dangle
        fieldDBUser._rev = resultuser.rev;
        return {
          user: fieldDBUser,
          info: {
            message: 'User details saved.',
          },
        };
      }
      throw new Error('Unknown server result, this might be a bug.');
    })
    .catch((error) => {
      error.status = error.statusCode || error.status || 500;
      let message = 'Error saving a user in the database. ';
      if (error.status === 409) {
        message = 'Conflict saving user in the database. Please try again.';
      }
      debug(`${new Date()} Error saving a user: ${JSON.stringify(error)}`);
      debug(`${new Date()} This is the user who was not saved: ${JSON.stringify(user)}`);
      error.userFriendlyErrors = [message];
      throw error;
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
        debug(`${new Date()} User found: ${result.username}`);
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
 * uses tries to look up users by email
 * if optionallyRestrictToIncorrectLoginAttempts
 *  then it will look up users who might be calling forgotPassword
 */
function findByEmail({
  email,
  optionallyRestrictToIncorrectLoginAttempts,
  req = {
    id: '',
    log: {
      error: console.error,
      warn: console.warn,
    },
  },
} = {}) {
  if (!email) {
    return Promise.reject(new Error('Please provide an email'));
  }
  let usersQuery = 'usersByEmail';
  if (optionallyRestrictToIncorrectLoginAttempts) {
    usersQuery = 'userWhoHaveTroubleLoggingIn';
  }
  usersQuery = `${usersQuery}?key="${email}"`;
  const usersdb = nano({
    requestDefaults: {
      headers: {
        'x-request-id': req.id,
      },
    },
    url: couchConnectUrl,
  }).db.use(config.usersDbConnection.dbname);
  // Query the database and callback with matching users
  return usersdb.view('users', usersQuery)
    .then((body) => {
      debug(`${new Date()} ${usersQuery} requested users who have this email ${email} from the server, and recieved results `);
      const users = body.rows.map((row) => row.value);
      debug(`${new Date()} users ${JSON.stringify(users)}`);
      let userFriendlyExplaination = `Found ${users.length} users for ${optionallyRestrictToIncorrectLoginAttempts}`;
      if (users.length === 0) {
        userFriendlyExplaination = `Sorry, there are no users who have failed to login who have the email you provided ${email}. You cannot request a temporary password until you have at least tried to login once with your correct username. If you are not able to guess your username please contact us for assistance.`;
        const err = new Error(`No matching users for ${optionallyRestrictToIncorrectLoginAttempts}`);
        err.status = 401;
        err.userFriendlyErrors = [userFriendlyExplaination];
        throw err;
      }
      return ({
        users,
        info: {
          message: userFriendlyExplaination,
        },
      });
    })
    .catch((error) => {
      req.log.error(`${new Date()} Error quering ${usersQuery} ${JSON.stringify(error)}`);
      error.status = error.statusCode || 500;
      error.userFriendlyErrors = ['Server is not responding to request. Please report this 1609'];
      throw error;
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
  username,
} = {}) {
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

  return findByUsername({ username })
    .then(({ user }) => {
      debug(`${new Date()} Found user in setPassword: ${JSON.stringify(user)}`);

      return verifyPassword({
        user,
        password: oldpassword,
      });
    })
    .then((user) => {
      const salt = bcrypt.genSaltSync(10);
      user.hash = bcrypt.hashSync(newpassword, salt);

      // Save new password to couch too
      // TODO change this to run as a blocking request?
      corpusmanagement.changeUsersPassword(user.corpora[user.corpora.length - 1], user, newpassword,
        (res) => {
          debug(`${new Date()} There was success in creating changing the couchdb password: ${JSON.stringify(res)}\n`);
        },
        (err) => {
          debug(`${new Date()} There was an error in creating changing the couchdb password ${JSON.stringify(err)}\n`);
        });
      return saveUpdateUserToDatabase({ user });
    })
    .then(({ user, info }) => {
      // Change the success message to be more appropriate
      if (info.message === 'User details saved.') {
        info.message = 'Your password has succesfully been updated.';
      }
      return { user, info };
    })
    .catch((err) => {
      debug(`${new Date()} Error setPassword  ${username} : ${JSON.stringify(err.stack)}`);

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
