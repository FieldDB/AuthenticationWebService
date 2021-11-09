const bcrypt = require('bcryptjs');
const debug = require('debug')('lib:user');
const config = require('config');
const nano = require('nano');
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
  error,
  username,
  newConnection,
  userPermissionResult = {after: []},
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
          userPermissionResult: userPermissionResult,
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
      console.log('corpora before', user);
      user.corpora = user.corpora.filter(({dbname }) => (dbname !== newConnection.dbname));
      console.log('corpora after', user.corpora);
      debug('after removed new corpus from user ', newConnection, user.corpora);
    }
    // return done({
    //   error: "todo",
    //   status: 412
    // }, [userPermissionResult, user.corpora], {
    //   message: "TODO. save modifying the list of corpora in the user "
    // });
    return saveUpdateUserToDatabase({ user })
    .then(({ user, info }) => {

      // If the user was removed we can exit now
      if (userPermissionResult.after.length === 0) {
        userPermissionResult.status = 200;
        userPermissionResult.message = `User ${user.username} was removed from the ${
          newConnection.dbname
        } team.`;
        return {
          userPermissionResult: userPermissionResult,
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
      if (shouldEmailWelcomeToCorpusToUser && user.email && user.email.length > 5 && config.mailConnection.auth.user !== '') {
        const smtpTransport = nodemailer.createTransport(config.mailConnection);
        let mailOptions = config.welcomeToCorpusTeamMailOptions();
        if (user.appbrand === 'phophlo') {
          mailOptions = config.welcomeToCorpusTeamMailOptionsPhophlo();
        }
        mailOptions.to = `${user.email},${mailOptions.to}`;
        mailOptions.text = mailOptions.text.replace(/insert_corpus_identifier/g, newConnection.dbname);
        mailOptions.html = mailOptions.html.replace(/insert_corpus_identifier/g, newConnection.dbname);
        smtpTransport.sendMail(mailOptions, (error, response) => {
          if (error) {
            debug(`${new Date()} Mail error${JSON.stringify(error)}`);
          } else {
            debug(`${new Date()} Message sent: \n${response.message}`);
            debug(`${new Date()} Sent User ${user.username} a welcome to corpus email at ${user.email}`);
          }
          smtpTransport.close();
          return {
            userPermissionResult: userPermissionResult,
            info: {
              message: userPermissionResult.message,
            },
          };
        });
      } else {
        debug(`${new Date()} Didn't email welcome to corpus to new user ${
          user.username} why: emailpresent: ${user.email
        }, mailconfig: ${config.mailConnection.auth.user !== ''}`);
        return {
          userPermissionResult: userPermissionResult,
          info: {
            message: userPermissionResult.message,
          },
        };
      }
    })

  .catch ((error) => {
        debug('error saving user ', error);
        error.status = error.status || error.statusCode  || 505;
        error.userFriendlyErrors = [ `User ${user.username} now has ${
        userPermissionResult.after.join(' ')} access to ${
          newConnection.dbname}, but we weren't able to add this corpus to their account. This is most likely a bug, please report it.`];

          throw error;
      });
  })
  .catch((error) => {
        debug('error looking up user ', error);

    error.status = error.status || error.statusCode || 500;
    error.userFriendlyErrors = error.userFriendlyErrors || [ 'Username doesnt exist on this server. This is a bug.'] ;
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
    if (!potentialnewcorpusconnection || !potentialnewcorpusconnection.dbname || requestedDBCreation[potentialnewcorpusconnection.dbname]) {
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
      //     if (info.message === "Your corpus " + corpora[connectionIndex].dbname + " already exists, no need to create it.") {
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
              resolve({ user });
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
              passwordChangeResults = `${passwordChangeResults} ` + 'Success';
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
        // At least one email was sent, this will be considered a success since the user just needs one of the emails to login to his/her username(s)
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
  if (!user.email) {
    return saveUpdateUserToDatabase({ user })
      .then(() => {
        debug(`${new Date()} Server logs updated in user.`);
        return {
          user,
          info: {
            message: 'Username or password is invalid. Please try again.',
          },
        };
      });
  }
  if (!timeToSendAnEmailEveryXattempts) {
    let countDownUserToPasswordReset = '';
    if (incorrectPasswordAttemptsCount > 1) {
      countDownUserToPasswordReset = ` You have ${5 - incorrectPasswordAttemptsCount} more attempts before a temporary password will be emailed to your registration email (if you provided one).`;
    }
    return saveUpdateUserToDatabase({ user })
      .then(() => {
        debug(`${new Date()} Server logs updated in user.`);
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
  if (user.email.length < 5) {
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
    .then(({ user, info }) => verifyPassword({ password, user })
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
          user = new User(user);
          // TODO remove newCorpora?
          user.merge('self', syncUserDetails, 'overwrite');
          user = user.toJSON();
          /* Users details which can come from a client side must be added here, otherwise they are not saved on sync. */
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
        user.serverlogs.oldIncorrectPasswordAttempts = user.serverlogs.oldIncorrectPasswordAttempts.concat(user.serverlogs.incorrectPasswordAttempts);
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
