const bcrypt = require('bcryptjs');
const debug = require('debug')('lib:user');
const config = require('config');
const nano = require('nano');
const md5 = require('md5');
const url = require('url');
const {
  Connection,
} = require('fielddb/api/corpus/Connection');
const { User } = require('fielddb/api/user/User');

const emailFunctions = require('./email');
const corpus = require('./corpus');
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
  user,
  connection,
  docs,
} = {}) {
  debug(`${new Date()} TODO need to clean up a broken corpus.${JSON.stringify(connection)}`, docs);
  return emailFunctions.emailCorusCreationFailure({ connection, user });
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
  req = {
    id: '',
    body: {},
  },
} = {}) {
  let dbConn;
  // If serverCode is present, request is coming from Spreadsheet app
  if (req.body.serverCode) {
    dbConn = Connection.defaultConnection(req.body.serverCode);
    dbConn.dbname = req.body.dbname;
  } else {
    dbConn = req.body.connection;
  }
  if (!req || !req.body.username || !req.body.username) {
    const err = new Error('Please provide a username, you must be a member of a corpus in order to find out who else is a member.');
    err.status = 412;
    return Promise.reject(err);
  }
  if (!dbConn) {
    const err = new Error('Client didn\'t define the database connection.');
    err.status = 412;
    err.userFriendlyErrors = ['This app has made an invalid request. Please notify its developer. missing: serverCode or connection'];
    return Promise.reject(err);
  }
  const dbname = dbConn.dbname || dbConn.pouchname;
  const requestingUser = req.body.username;
  let requestingUserIsAMemberOfCorpusTeam = false;
  if (dbConn && dbConn.domain && dbConn.domain.indexOf('iriscouch') > -1) {
    dbConn.port = '6984';
  }
  debug(`${new Date()} ${requestingUser} requested the team on ${dbname}`);
  const nanoforpermissions = nano({
    requestDefaults: {
      headers: {
        'x-request-id': req.id || '',
      },
    },
    url: couchConnectUrl,
  });
  /*
   * Get user names and roles from the server
   *
   * https://127.0.0.1:6984/_users/_design/users/_view/userroles
   */
  const usersdb = nanoforpermissions.db.use('_users');
  let whichUserGroup = 'normalusers';
  if (requestingUser.indexOf('test') > -1 || requestingUser.indexOf('anonymous') > -1) {
    whichUserGroup = 'betatesters';
  }
  let userroles;
  return usersdb.view('users', whichUserGroup)
    .then((body) => {
      userroles = body.rows;
      /*
     * Get user masks from the server
     */
      const fieldDBUsersDB = nanoforpermissions.db.use(config.usersDbConnection.dbname);
      // Put the user in the database and callback
      return fieldDBUsersDB.view('users', 'usermasks');
    })
    .then((body) => {
      const usermasks = body.rows;
      /*
       Convert the array into a hash to avoid n*m behavior (instead we have n+m+h)
       */
      const usershash = {};
      let userIndex;
      let key;
      let currentUsername;
      let userIsOnTeam;
      let thisUsersMask;
      const rolesAndUsers = {};
      let roles;
      let roleIndex;
      let roleType;
      rolesAndUsers.notonteam = [];
      rolesAndUsers.allusers = [];
      // Put the user roles in
      for (userIndex = userroles.length - 1; userIndex >= 0; userIndex--) {
        if (!userroles[userIndex].key || !userroles[userIndex].value) {
          continue;
        }
        key = userroles[userIndex].key;
        usershash[key] = usershash[key] || {};
        usershash[key].roles = userroles[userIndex].value;
      }
      // Put the gravatars in for users who are in this category
      for (userIndex = usermasks.length - 1; userIndex >= 0; userIndex--) {
        if (!usermasks[userIndex].value || !usermasks[userIndex].value.username) {
          continue;
        }
        key = usermasks[userIndex].value.username;
        // if this usermask isnt in this category of users, skip them.
        if (!usershash[key]) {
          continue;
        }
        // debug(key, usershash[key]);
        usershash[key] = usershash[key] || {};
        usershash[key].username = usermasks[userIndex].value.username;
        usershash[key].gravatar = usermasks[userIndex].value.gravatar;
        // debug(new Date() + "  the value of this user ", usermasks[userIndex]);
        usershash[key].gravatar_email = usermasks[userIndex].value.gravatar_email;
      }
      // Put the users into the list of roles and users
      for (currentUsername in usershash) {
        if (!usershash.hasOwnProperty(currentUsername) || !currentUsername) {
          continue;
        }
        // debug(new Date() + " Looking at " + currentUsername);
        userIsOnTeam = false;
        thisUsersMask = usershash[currentUsername];
        if ((!thisUsersMask.gravatar || thisUsersMask.gravatar.indexOf('user_gravatar') > -1) && thisUsersMask.gravatar_email) {
          debug(`${new Date()}  the gravtar of ${currentUsername} was missing/old `, thisUsersMask);
          thisUsersMask.gravatar = md5(thisUsersMask.gravatar_email);
        }
        // Find out if this user is a member of the team
        roles = thisUsersMask.roles;
        if (!roles) {
          debug(`${new Date()} this is odd, ${currentUsername} doesnt have any roles defined, skipping this user, even for hte typeahead`);
          continue;
        }
        // Add this user to the typeahead
        rolesAndUsers.allusers.push({
          username: currentUsername,
          gravatar: thisUsersMask.gravatar,
        });
        for (roleIndex = roles.length - 1; roleIndex >= 0; roleIndex--) {
          const role = roles[roleIndex];
          if (role.indexOf(`${dbname}_`) === 0) {
            userIsOnTeam = true;
            // debug(new Date() + currentUsername + " is a member of this corpus: " + role);
            if (currentUsername === requestingUser) {
              requestingUserIsAMemberOfCorpusTeam = true;
            }
            /*
                 * If the role is for this corpus, insert the users's mask into
                 * the relevant roles, this permits the creation of new roles in the system
                 */
            roleType = `${role.replace(`${dbname}_`, '')}s`;
            rolesAndUsers[roleType] = rolesAndUsers[roleType] || [];
            rolesAndUsers[roleType].push({
              username: currentUsername,
              gravatar: thisUsersMask.gravatar,
            });
          }
        }
        if (!userIsOnTeam) {
          rolesAndUsers.notonteam.push({
            username: currentUsername,
            gravatar: thisUsersMask.gravatar,
          });
        }
      }

      /* sort alphabetically the real roles (typeaheads dont matter) */
      if (rolesAndUsers.admins) {
        rolesAndUsers.admins.sort(sortByUsername);
      }
      if (rolesAndUsers.writers) {
        rolesAndUsers.writers.sort(sortByUsername);
      }
      if (rolesAndUsers.readers) {
        rolesAndUsers.readers.sort(sortByUsername);
      }
      if (rolesAndUsers.commenters) {
        rolesAndUsers.commenters.sort(sortByUsername);
      }
      /*
       * Send the results, if the user is part of the team
       */
      if (requestingUserIsAMemberOfCorpusTeam) {
        return {
          rolesAndUsers,
          info: {
            message: 'Look up successful.',
          },
        };
      }

      debug(`Requesting user \`${requestingUser}\` is not a member of the corpus team.${dbname}`);
      const err = new Error(`Requesting user \`${requestingUser}\` is not a member of the corpus team.`);
      err.status = 401;
      err.userFriendlyErrors = ['Unauthorized, you are not a member of this corpus team.'];
      throw err;
    // });
    })
    .catch((error) => {
      console.log(`${new Date()} Error quering userroles: ${error}`);
      error.userFriendlyErrors = error.userFriendlyErrors || ['Server is not responding for request to query corpus permissions. Please report this 1289'];
      throw error;
    });
}

function createNewCorpusesIfDontExist({
  user,
  corpora,
} = {}) {
  if (!corpora || corpora.length === 0) {
    return Promise.resolve([]);
  }

  const requestedDBCreation = {};
  debug(`${new Date()} Ensuring newCorpora are ready`, corpora);
  /*
   * Creates the user's new corpus databases
   */
  return Promise.all(corpora.map((potentialnewcorpusconnection) => {
    if (!potentialnewcorpusconnection || !potentialnewcorpusconnection.dbname
       || requestedDBCreation[potentialnewcorpusconnection.dbname]) {
      debug('Not creating this corpus ', potentialnewcorpusconnection);
      return Promise.resolve(potentialnewcorpusconnection);
    }

    if (potentialnewcorpusconnection.dbname.indexOf(`${user.username}-`) !== 0) {
      debug('Not creating a corpus which appears to belong ot another user.', potentialnewcorpusconnection);
      return Promise.resolve(potentialnewcorpusconnection);
    }
    requestedDBCreation[potentialnewcorpusconnection.dbname] = true;

    // TODO wait for this to complete
    corpus.createNewCorpus({
      username: user.username,
      title: potentialnewcorpusconnection.title,
      connection: potentialnewcorpusconnection,
    },
    (err, corpusDetails, info) => {
      console.log('Create new corpus results', err, corpusDetails.description, info);
      // if (err.status === 302) {
      //   for (var connectionIndex = corpora.length - 1; connectionIndex >= 0; connectionIndex--) {
      //     if (info.message === "Your corpus " + corpora[connectionIndex].dbname +
      // " already exists, no need to create it.") {
      //       debug("Removing this from the new connections  has no effect." + info.message);
      //       corpora.splice(connectionIndex, 1);
      //     }
      //   }
      // }
    });

    return Promise.resolve(potentialnewcorpusconnection);
  }));
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
        'x-request-id': req.id || '',
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
        'x-request-id': req.id || '',
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
        err.userFriendlyErrors = ['Username or password is invalid. Please try again.'];
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
        'x-request-id': req.id || '',
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
      if (users.length === 0) {
        const err = new Error(`No matching users for ${optionallyRestrictToIncorrectLoginAttempts}`);
        err.status = 401;
        err.userFriendlyErrors = [`Sorry, there are no users who have failed to login who have the email you provided ${email}. You cannot request a temporary password until you have at least tried to login once with your correct username. If you are not able to guess your username please contact us for assistance.`];
        throw err;
      }
      return ({
        users,
        info: {
          message: `Found ${users.length} users for ${optionallyRestrictToIncorrectLoginAttempts}`,
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

function addCorpusToUser({
  username,
  newConnection,
  userPermissionResult = { after: [] },
} = {}) {
  return findByUsername({ username })
    .then(({ user, info }) => {
      debug('Find by username ', info);

      let shouldEmailWelcomeToCorpusToUser = false;
      user.serverlogs = user.serverlogs || {};
      user.serverlogs.welcomeToCorpusEmails = user.serverlogs.welcomeToCorpusEmails || {};
      if (userPermissionResult.after.length > 0 && !user.serverlogs.welcomeToCorpusEmails[newConnection.dbname]) {
        shouldEmailWelcomeToCorpusToUser = true;
        user.serverlogs.welcomeToCorpusEmails[newConnection.dbname] = [Date.now()];
      }
      /*
       * If corpus is already there
       */
      debug(`${new Date()} Here are the user's known corpora${JSON.stringify(user.corpora)}`);
      let alreadyAdded;
      for (let connectionIndex = user.corpora.length - 1; connectionIndex >= 0; connectionIndex--) {
        if (userPermissionResult.after.length === 0) {
        // removes from all servers, TODO this might be something we should ask the user about.
          if (user.corpora[connectionIndex].dbname === newConnection.dbname) {
            user.corpora.splice(connectionIndex, 1);
          }
        } else {
          if (alreadyAdded) {
            continue;
          }
          if (user.corpora[connectionIndex].dbname === newConnection.dbname) {
            alreadyAdded = true;
          }
        }
      }
      if (userPermissionResult.after.length > 0) {
        if (alreadyAdded) {
          userPermissionResult.status = 200;
          userPermissionResult.message = `User ${user.username} now has ${
            userPermissionResult.after.join(' ')} access to ${
            newConnection.dbname}, the user was already a member of this corpus team.`;
          return Promise.resolve({
            userPermissionResult,
            info: {
              message: userPermissionResult.message,
            },
          });
        }
        /*
         * Add the new db connection to the user, save them and send them an
         * email telling them they they have access
         */
        user.corpora = user.corpora || [];
        user.corpora.unshift(newConnection);
      } else {
        // console.log('corpora before', user);
        user.corpora = user.corpora.filter(({ dbname }) => (dbname !== newConnection.dbname));
        // console.log('corpora after', user.corpora);
        debug('after removed new corpus from user ', newConnection, user.corpora);
      }
      // return done({
      //   error: "todo",
      //   status: 412
      // }, [userPermissionResult, user.corpora], {
      //   message: "TODO. save modifying the list of corpora in the user "
      // });
      return saveUpdateUserToDatabase({ user })
        .then(() => {
          // console.log('user after save', userPermissionResult);
          // If the user was removed we can exit now
          if (userPermissionResult.after.length === 0) {
            userPermissionResult.status = 200;
            userPermissionResult.message = `User ${user.username} was removed from the ${
              newConnection.dbname
            } team.`;
            return {
              userPermissionResult,
              info: {
                message: userPermissionResult.message,
              },
            };
          }
          userPermissionResult.status = 200;
          userPermissionResult.message = `User ${user.username} now has ${
            userPermissionResult.after.join(' ')} access to ${
            newConnection.dbname}`;
          // send the user an email to welcome to this corpus team
          if (shouldEmailWelcomeToCorpusToUser) {
            return emailFunctions.emailWelcomeToCorpus({
              user,
              newConnection,
            });
          }
          return {
            userPermissionResult,
            info: {
              message: userPermissionResult.message,
            },
          };
        })

        .catch((error) => {
          debug('error saving user ', error);
          error.status = error.status || error.statusCode || 505;
          error.userFriendlyErrors = [`User ${user.username} now has ${
            userPermissionResult.after.join(' ')} access to ${
            newConnection.dbname}, but we weren't able to add this corpus to their account. This is most likely a bug, please report it.`];

          throw error;
        });
    })
    .catch((error) => {
      debug('error looking up user ', error);

      error.status = error.status || error.statusCode || 500;
      error.userFriendlyErrors = error.userFriendlyErrors || ['Username doesnt exist on this server. This is a bug.'];
      // Don't tell them its because the userPermissionResult doesn't exist.
      throw error;

    // if (!user) {
    //   // This case is a server error, it should not happen.
    //   userPermissionResult.status = error.status;
    //   userPermissionResult.message = 'Server was unable to process you request. Please report this: 1292';
    //   return done({
    //     status: 500,
    //     error: 'There was no error from couch, but also no user.',
    //   }, false, {
    //     message: userPermissionResult.message,
    //   });
    // }
    });
}
const normalizeRolesToDBname = function normalizeRolesToDBname({ dbname, role }) {
  if (role.indexOf('_') > -1) {
    return role.substring(role.lastSubstring('_'));
  }
  return `${dbname}_${role}`;
};
/*
 * Ensures the requesting user to make the permissions
 * modificaitons. Then adds the role to the user if they exist
 */
function addRoleToUser({
  req = {
    body: {},
    log: {
      error: console.error,
      warn: console.warn,
    },
  },
} = {}) {
  let dbConn = {};
  // If serverCode is present, request is coming from Spreadsheet app
  dbConn = req.body.connection;
  if (!dbConn || !dbConn.dbname || dbConn.dbname.indexOf('-') === -1) {
    debug(dbConn);
    const err = new Error('Client didnt define the dbname to modify.');
    err.status = 412;
    err.userFriendlyErrors = ['This app has made an invalid request. Please notify its developer. missing: corpusidentifier'];
    return Promise.reject(err);
  }
  if (!req || !req.body.username || !req.body.username) {
    const err = new Error('Please provide a username');
    err.status = 412;
    return Promise.reject(err);
  }
  if (!req || !req.body.users || req.body.users.length === 0 || !req.body.users[0].username) {
    const err = new Error('Client didnt define the username to modify.');
    err.status = 412;
    err.userFriendlyErrors = ['This app has made an invalid request. Please notify its developer. missing: user(s) to modify'];
    return Promise.reject(err);
  }
  if ((!req.body.users[0].add || req.body.users[0].add.length < 1)
    && (!req.body.users[0].remove || req.body.users[0].remove.length < 1)) {
    const err = new Error('Client didnt define the roles to add nor remove');
    err.status = 412;
    err.userFriendlyErrors = ['This app has made an invalid request. Please notify its developer. missing: roles to add or remove'];
    return Promise.reject(err);
  }

  return new Promise((resolve, reject) => {
    corpus.isRequestingUserAnAdminOnCorpus(req, req.body.username, dbConn, (isAdminError, result) => {
      if (isAdminError) {
        req.log.error(isAdminError, 'error isRequestingUserAnAdminOnCorpus');
        return reject(isAdminError);
      }
      debug(`${new Date()} User ${req.body.username} is admin and can modify permissions on ${dbConn.dbname}`, result);
      // convert roles into corpus specific roles
      const promises = req.body.users.map((userPermission) => {
        if (userPermission.add && typeof userPermission.add.map === 'function') {
          userPermission.add = userPermission.add
            .map((role) => normalizeRolesToDBname({ dbname: dbConn.dbname, role }));
        } else {
          userPermission.add = [];
        }
        if (userPermission.remove && typeof userPermission.remove.map === 'function') {
          userPermission.remove = userPermission.remove
            .map((role) => normalizeRolesToDBname({ dbname: dbConn.dbname, role }));
        } else {
          userPermission.remove = [];
        }
        return userPermission;
      })
      /*
       * If they are admin, add the role to the user, then add the corpus to user if succesfull
       */
        .map((userPermission) => new Promise((resolveAddRole, rejectAddRole) => {
          corpusmanagement.addRoleToUser(dbConn, userPermission, (addRoleToUserError, userPermissionResult, info) => {
            debug('corpusmanagement.addRoleToUser ', addRoleToUserError, userPermissionResult, info);

            return addCorpusToUser({ username: userPermission.username, userPermissionResult, newConnection: dbConn })
              .then(({ userPermissionResult: userPermissionFinalResult, info: addCorpusToUserInfo }) => {
                debug(' Bringing in mesages and status from successful user result.', addCorpusToUserInfo);
                resolveAddRole(userPermissionFinalResult);
              })
              .catch(rejectAddRole);
          }, (error, userPermissionResult, info) => {
            debug(' Bringing in mesages and status from failing user result.', info);
            rejectAddRole(error);
          });
        }));

      return Promise.all(promises).then((results) => {
        let thereWasAnError = false;
        debug(`${new Date()} recieved promises back ${results.length}`);
        results.forEach((userPermis) => {
          if (userPermis && userPermis.status !== 200 && !thereWasAnError) {
            reject(new Error(`One or more of the add roles requsts failed. ${userPermis.message}`));
            thereWasAnError = true;
          }
        });

        if (!thereWasAnError) {
          resolve(results);
        }
      })
        .catch(reject);
      // .fail(function(error) {
      //       debug(" returning fail.");
      //       error.status = cleanErrorStatus(error.status) || req.body.users[0].status || 500;
      //       req.body.users[0].message = req.body.users[0].message ||
      //  " There was a problem processing your request. Please notify us of this error 320343";
      //       return done(error, req.body.users);
      //     });
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
              return resolve({ user });
            }

            const err = new Error('Username or password is invalid. Please try again.');
            err.status = 401;
            return reject(err);
          })
          .then(reject);
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
    const err = new Error('Username or password is invalid. Please try again.');
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
    .then(({ user }) => {
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
 * accepts an email, finds associated users who have had incorrect login
 *
 *
 * @param email
 */
function forgotPassword({
  email,
} = {}) {
  if (!email) {
    const err = new Error('Please provide an email.');
    err.status = 412;
    return Promise.reject(err);
  }
  return findByEmail({
    email,
    optionallyRestrictToIncorrectLoginAttempts: 'onlyUsersWithIncorrectLogins',
  })
    .then(({ users }) => {
      const sameTempPasswordForAllTheirUsers = emailFunctions.makeRandomPassword();
      const promises = users.map((userToReset) => emailFunctions.emailTemporaryPasswordToTheUserIfTheyHavAnEmail({
        user: userToReset,
        temporaryPassword: sameTempPasswordForAllTheirUsers,
        successMessage: `A temporary password has been sent to your email ${email}`,
      }).then(({ user }) => {
        debug(`${new Date()} Saving new hash to the user ${user.username} after setting it to a temp password.`);
        return saveUpdateUserToDatabase(user);
      }));
      let passwordChangeResults = '';
      const finalForgotPasswordResult = {
        status_codes: '',
        error: {
          status: 200,
          error: '',
        },
        info: {
          message: '',
        },
      };

      return Promise.all(promises).then((results) => {
        debug(`${new Date()} recieved promises back ${results.length}`);
        results.forEach((result) => {
          if (result.state === 'fulfilled') {
            const { value } = result;
            if (value.source && value.source.exception) {
              passwordChangeResults = `${passwordChangeResults} ${value.source.exception}`;
            } else {
              passwordChangeResults = `${passwordChangeResults} Success`;
            }
          } else {
          // not fulfilled,happens rarely
            const { reason } = result;
            passwordChangeResults = `${passwordChangeResults} ${reason}`;
          }
        });
        debug(`${new Date()} passwordChangeResults ${passwordChangeResults}`);
        results.forEach((result) => {
          if (result.error) {
            finalForgotPasswordResult.status_codes = `${finalForgotPasswordResult.status_codes} ${result.error.status}`;
            if (result.error.status > finalForgotPasswordResult.error.status) {
              finalForgotPasswordResult.error.status = result.error.status;
            }
            finalForgotPasswordResult.error.error = `${finalForgotPasswordResult.error.error} ${result.error.error}`;
          }
          finalForgotPasswordResult.info.message = `${finalForgotPasswordResult.info.message} ${result.info.message}`;
        });
        if (passwordChangeResults.indexOf('Success') > -1) {
          // At least one email was sent, this will be considered a success
          // since the user just needs one of the emails to login to his/her username(s)
          return {
            finalForgotPasswordResult,
            info: finalForgotPasswordResult.info,
          };
        }
        // finalForgotPasswordResult.status_codes = finalForgotPasswordResult.status_codes;
        // , finalForgotPasswordResult, finalForgotPasswordResult.info);
        throw finalForgotPasswordResult.error;
      });
    })
    .catch((error) => {
      error.status = error.status || error.statusCode || 500;
      throw error;
    });
}

function handleInvalidPasswordAttempt({ user }) {
  debug(`${new Date()} User found, but they have entered the wrong password ${user.username}`);
  /*
   * Log this unsucessful password attempt
   */
  user.serverlogs = user.serverlogs || {};
  user.serverlogs.incorrectPasswordAttempts = user.serverlogs.incorrectPasswordAttempts || [];
  user.serverlogs.incorrectPasswordAttempts.push(new Date());
  user.serverlogs.incorrectPasswordEmailSentCount = user.serverlogs.incorrectPasswordEmailSentCount || 0;
  const incorrectPasswordAttemptsCount = user.serverlogs.incorrectPasswordAttempts.length;
  const timeToSendAnEmailEveryXattempts = incorrectPasswordAttemptsCount >= 5;
  /* Dont reset the public user or lingllama's passwords */
  if (user.username === 'public' || user.username === 'lingllama') {
    return Promise.resolve({
      user,
    });
  }
  if (!timeToSendAnEmailEveryXattempts) {
    let countDownUserToPasswordReset = '';
    if (incorrectPasswordAttemptsCount > 1) {
      countDownUserToPasswordReset = ` You have ${5 - incorrectPasswordAttemptsCount} more attempts before a temporary password will be emailed to your registration email (if you provided one).`;
    }
    return saveUpdateUserToDatabase({ user })
      .then(() => {
        debug(`${new Date()} Server logs updated in user. countDownUserToPasswordReset`, countDownUserToPasswordReset);
        return {
          user,
          info: {
            message: `Username or password is invalid. Please try again.${countDownUserToPasswordReset}`,
          },
        };
      });
  }

  debug(`${new Date()} User ${user.username} found, but they have entered the wrong password ${incorrectPasswordAttemptsCount} times. `);
  /*
   * This emails the user, if the user has an email, if the
   * email is 'valid' TODO do better email validation. and if
   * the config has a valid user. For the dev and local
   * versions of the app, this wil never be fired because the
   * config doesnt have a valid user. But the production
   * config does, and it is working.
   */
  if (!user.email || user.email.length < 5) {
    debug(`${new Date()}User didn't not provide a valid email, so their temporary password was not sent by email.`);
    return saveUpdateUserToDatabase({ user })
      .then(() => {
        debug(`${new Date()} Email doesnt appear to be vaild. ${user.email}`);
        return {
          info: {
            message: 'You have tried to log in too many times and you dont seem to have a valid email so we cant send you a temporary password.',
          },
        };
      });
  }

  const temporaryPassword = emailFunctions.makeRandomPassword();
  return emailFunctions.emailTemporaryPasswordToTheUserIfTheyHavAnEmail({
    user,
    temporaryPassword,
    successMessage: 'You have tried to log in too many times. We are sending a temporary password to your email.',
  })
    .then(({ user: userFromPasswordEmail, info }) => {
      debug(`${new Date()} Reset User ${user.username} password to a temp password.`);
      return saveUpdateUserToDatabase({ user: userFromPasswordEmail })
        .then(() => ({
          user: userFromPasswordEmail,
          info,
        }));
    }).catch((emailError) => ({
      info: {
        message: `Username or password is invalid. Please try again. You have tried to log in too many times. ${emailError.userFriendlyErrors[0]}`,
      },
    }));
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
  username,
  password,
  syncDetails,
  syncUserDetails,
  req = {
    id: '',
    log: {
      error: console.error,
      warn: console.warn,
    },
  },
} = {}) {
  if (!username) {
    const err = new Error(`Username was not specified. ${username}`);
    err.status = 412;
    err.userFriendlyErrors = ['Please supply a username.'];
    return Promise.reject(err);
  }

  if (!password) {
    const err = new Error(`Password was not specified. ${password}`);
    err.status = 412;
    err.userFriendlyErrors = ['Please supply a password.'];
    return Promise.reject(err);
  }

  const safeUsernameForCouchDB = Connection.validateUsername(username.trim());
  if (username !== safeUsernameForCouchDB.identifier) {
    const err = new Error('username is not safe for db names');
    err.status = 406;
    err.userFriendlyErrors = [`Username or password is invalid. Maybe your username is ${safeUsernameForCouchDB.identifier}?`];
    return Promise.reject(err);
  }
  return findByUsername({ username })
    .then(({ user }) => verifyPassword({ password, user })
      .catch((err) => handleInvalidPasswordAttempt({ user })
        .then(({ info }) => {
          // Don't tell them its because the password is wrong.
          debug(`${new Date()} Returning: Username or password is invalid. Please try again.`);
          err.userFriendlyErrors = [info.message];
          err.status = err.status || 401;
          throw err;
        })))
    .then(({ user }) => {
      debug(`${new Date()} User found, and password verified ${username}`);
      /*
       * Save the users' updated details, and return to caller TODO Add
       * more attributes from the req.body below
       */
      if (syncDetails !== 'true' && syncDetails !== true) {
        return { user };
      }
      debug(`${new Date()} Here is syncUserDetails: ${JSON.stringify(syncUserDetails)}`);
      syncUserDetails.newCorpora = syncUserDetails.newCorpora || syncUserDetails.newCorpusConnections;
      try {
        syncUserDetails = new User(syncUserDetails);
      } catch (e) {
        req.log.error(e, "Couldnt convert the users' sync details into a user.");
      }
      if (!syncUserDetails.newCorpora) {
        return { user };
      }
      debug(`${new Date()} It looks like the user has created some new local offline newCorpora. Attempting to make new corpus on the team server so the user can download them.`);
      return createNewCorpusesIfDontExist({ user, corpora: syncUserDetails.newCorpora })
        .then((corpora) => {
          debug('corpora', corpora);
          user = new User(user);
          // TODO remove newCorpora?
          user.merge('self', syncUserDetails, 'overwrite');
          user = user.toJSON();
          /* Users details which can come from a client side must be added here,
          otherwise they are not saved on sync. */
          // user.corpora = syncUserDetails.corpora;
          // user.corpora = syncUserDetails.corpora;
          // user.email = syncUserDetails.email;
          // user.gravatar = syncUserDetails.gravatar;
          // user.researchInterest = syncUserDetails.researchInterest;
          // user.affiliation = syncUserDetails.affiliation;
          // user.appVersionWhenCreated = syncUserDetails.appVersionWhenCreated;
          // user.authUrl = syncUserDetails.authUrl;
          // user.description = syncUserDetails.description;
          // user.subtitle = syncUserDetails.subtitle;
          // user.dataLists = syncUserDetails.dataLists;
          // user.prefs = syncUserDetails.prefs;
          // user.mostRecentIds = syncUserDetails.mostRecentIds;
          // user.firstname = syncUserDetails.firstname;
          // user.lastname = syncUserDetails.lastname;
          // user.sessionHistory = syncUserDetails.sessionHistory;
          // user.hotkeys = syncUserDetails.hotkeys;
          return { user };
        });
    })
    .then(({ user }) => {
      user.dateModified = new Date();
      user.serverlogs = user.serverlogs || {};
      user.serverlogs.successfulLogins = user.serverlogs.successfulLogins || [];
      user.serverlogs.successfulLogins.push(new Date());
      if (user.serverlogs.incorrectPasswordAttempts && user.serverlogs.incorrectPasswordAttempts.length > 0) {
        user.serverlogs.oldIncorrectPasswordAttempts = user.serverlogs.oldIncorrectPasswordAttempts || [];
        user.serverlogs.oldIncorrectPasswordAttempts = user.serverlogs.oldIncorrectPasswordAttempts
          .concat(user.serverlogs.incorrectPasswordAttempts);
        user.serverlogs.incorrectPasswordAttempts = [];
      }
      return saveUpdateUserToDatabase({ user });
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
