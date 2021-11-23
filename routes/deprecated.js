const { Connection } = require('fielddb/api/corpus/Connection');
const debug = require('debug')('route:deprecated');

const corpus = require('../lib/corpus');
const userFunctions = require('../lib/user');

const cleanErrorStatus = function cleanErrorStatus(status) {
  if (status) {
    return parseInt(status, 10);
  }
  return '';
};
/**
 * These are all the old routes that haphazardly grew over time and make up API version 0.1
 * which we still have to support until all clients have switched to the new routes
 *
 * @param {[type]} app [description]
 */
const addDeprecatedRoutes = function addDeprecatedRoutes(app) {
  /**
   * Responds to requests for login, if sucessful replies with the user's details
   * as json
   */
  app.post('/login', (req, res, next) => {
    userFunctions.authenticateUser({
      username: req.body.username,
      password: req.body.password,
      syncDetails: req.body.syncDetails,
      syncUserDetails: req.body.syncUserDetails,
      req,
    })
      .then(({ user, info }) => {
        const returndata = {};
        if (!user) {
          returndata.userFriendlyErrors = [info.message];
        } else {
          returndata.user = user;
          delete returndata.user.password;
          delete returndata.user.serverlogs;
          returndata.info = [info.message];
          if (req && req.syncDetails) {
            returndata.info.unshift('Preferences saved.');
          }
        // req.log.debug(new Date() + " Returning the existing user as json:\n" + JSON.stringify(user));
        }
        req.log.debug(returndata, `${new Date()} Returning response`);
        res.send(returndata);
      })
      .catch((err) => {
        req.log.debug(err, `${new Date()} There was an error in the userFunctions.authenticateUser`);
        next(err);
      });
  });

  app.get('/login', (req, res) => {
    res.send({
      info: 'Service is running normally.',
    });
  });
  /**
   * Takes in the http request and response. Calls the registerNewUser function in
   * the userFunctions library. The registerNewUser function takes in a
   * method (local/twitter/facebook/etc) the http request, and a function to call
   * after registerNewUer has completed. In this case the function is expected to
   * be called with an err (null if no error), user (null if no user), and an info
   * object containing a message which can be show to the calling application
   * which sent the post request.
   *
   * If there is an error, the info is added to the 'errors' attribute of the
   * returned json.
   *
   * If there is a user, the user is added to the 'user' attribute of the returned
   * json. If there is no user, the info is again added to the 'errors' attribute
   * of the returned json.
   *
   * Finally the returndata json is sent to the calling application via the
   * response.
   */
  app.post('/register', (req, res, next) => userFunctions.registerNewUser({
    req,
  })
    .then(({ user, info } = {}) => {
      const returndata = {};
      returndata.user = user;
      returndata.info = [info.message];
      req.log.debug(user, `${new Date()} Returning the newly built user:`);
      res.send(returndata);
    })
    .catch((err) => {
      // res.status(cleanErrorStatus(err.statusCode || err.status) || 400);
      // returndata.status = cleanErrorStatus(err.statusCode || err.status) || 400;
      req.log.error(err, `${new Date()} There was an error in the userFunctions.registerNewUser`);
      // returndata.userFriendlyErrors = [info.message];
      next(err);
    }));
  app.get('/register', (req, res) => {
    res.send({});
  });
  /**
   * Takes in the http request and response. Calls the setPassword function in
   * the userFunctions library. The setPassword function takes in an old password,
   * new password and a username, and a function to call
   * after setPassword has completed. In this case the done function is expected to
   * be called with an err (null if no error), user (null if no user), and an info
   * object containing a message which can be show to the calling application
   * which sent the post request.
   *
   * If there is an error, the info is added to the 'errors' attribute of the
   * returned json.
   *
   * If there is a user, the user is added to the 'user' attribute of the returned
   * json. If there is no user, the info is again added to the 'errors' attribute
   * of the returned json.
   *
   * Finally the returndata json is sent to the calling application via the
   * response.
   */
  app.post('/changepassword', (req, res, next) => {
    const oldpassword = req.body.password;
    const { newpassword } = req.body;
    const { confirmpassword } = req.body;
    const { username } = req.body;
    // res.status(401);
    if (newpassword !== confirmpassword) {
      const err = new Error('New passwords do not match, please try again.');
      err.status = 406;
      next(err);
      return;
    }
    userFunctions.setPassword({
      oldpassword,
      newpassword,
      username,
      req,
    })
      .then(({ user, info }) => {
        const returndata = {};
        returndata.user = user;
        returndata.info = [info.message];
        res.status(200);
        req.log.debug(user, `${new Date()} Returning success`);
        res.send(returndata);
      })
      .catch((err) => {
        // res.status(cleanErrorStatus(err.statusCode || err.status) || 400);
        // returndata.status = cleanErrorStatus(err.statusCode || err.status) || 400;
        req.log.debug(err, `${new Date()} There was an error in the userFunctions.setPassword`);
        // returndata.userFriendlyErrors = [info.message];
        next(err);
      });
  });
  app.get('/changepassword', (req, res) => {
    res.send({});
  });
  /**
   * Takes in the http request and response. Calls the setPassword function in
   * the userFunctions library. The setPassword function takes in an old password,
   * new password and a username, and a function to call
   * after setPassword has completed. In this case the done function is expected to
   * be called with an err (null if no error), user (null if no user), and an info
   * object containing a message which can be show to the calling application
   * which sent the post request.
   *
   * If there is an error, the info is added to the 'errors' attribute of the
   * returned json.
   *
   * If there is a user, the user is added to the 'user' attribute of the returned
   * json. If there is no user, the info is again added to the 'errors' attribute
   * of the returned json.
   *
   * Finally the returndata json is sent to the calling application via the
   * response.
   */
  app.post('/forgotpassword', (req, res, next) => {
    const { email } = req.body;
    userFunctions.forgotPassword({ email, req })
      .then(({ info }) => {
        const returndata = {};
        returndata.info = [info.message];
        req.log.debug(returndata, `${new Date()} Returning forgotpassword success`);
        res.status(200);
        res.send(returndata);
      })
      .catch((err) => {
        // res.status(cleanErrorStatus(err.statusCode || err.status) || 400);
        // returndata.status = cleanErrorStatus(err.statusCode || err.status) || 400;
        debug(err, `${new Date()} There was an error in the userFunctions.setPassword`);
        // returndata.userFriendlyErrors = [info.message];
        next(err);
      });
  });
  app.get('/forgotpassword', (req, res) => {
    res.send({});
  });
  /**
   * Responds to requests for a list of team members on a corpus, if successful replies with a list of
   * usernames as json
   */
  app.post('/corpusteam', (req, res, next) => {
    const returndata = {};
    req.body.dbname = req.body.dbname || req.body.pouchname;
    userFunctions.fetchCorpusPermissions({
      req,
    }).then(({ rolesAndUsers, info }) => {
      returndata.users = rolesAndUsers;
      returndata.info = [info.message];
      // returndata.userFriendlyErrors = ["Faking an error to test"];
      // req.log.debug(new Date() + " Returning response:\n" + JSON.stringify(returndata));
      req.log.debug(returndata.users.readers, `${new Date()} Returning the list of reader users on this corpus as json:`);
      res.send(returndata);
    })
      .catch((err) => {
      // res.status(cleanErrorStatus(err.statusCode || err.status) || 400);
      // returndata.status = cleanErrorStatus(err.statusCode || err.status) || 400;
        req.log.debug(err, `${new Date()} There was an error in the userFunctions.fetchCorpusPermissions`);
        // returndata.userFriendlyErrors = [info.message];
        next(err);
      });
  });

  app.post('/corpusteamwhichrequiresvalidauthentication', (req, res, next) => {
    const returndata = {};
    userFunctions.authenticateUser({
      username: req.body.username,
      password: req.body.password,
      req,
    }).then(() => userFunctions.fetchCorpusPermissions({
      req,
    }).then(({ users, info: fetchPermsInfo }) => {
      returndata.users = users;
      returndata.info = [fetchPermsInfo.message];
      // returndata.userFriendlyErrors = ["Faking an error to test"];
      // req.log.debug(new Date() + " Returning response:\n" + JSON.stringify(returndata));
      req.log.debug(`${new Date()} Returning the list of reader users on this corpus as json:`);
      if (returndata && returndata.users) {
        req.log.debug(returndata.users.readers, 'readers');
      }
      res.send(returndata);
    }))
      .catch((err) => {
      // res.status(cleanErrorStatus(fetchPermsErr.statusCode || fetchPermsErr.status) || 400);
      // returndata.status = cleanErrorStatus(fetchPermsErr.statusCode || fetchPermsErr.status) || 400;
      // req.log.debug(`${new Date()} There was an err in the
      // userFunctions.fetchCorpusPermissions:\n${JSON.stringify(fetchPermsErr)}`);
      // returndata.userFriendlyErrors = [fetchPermsInfo.message];

        // res.status(cleanErrorStatus(err.statusCode || err.status) || 400);
        // returndata.status = cleanErrorStatus(err.statusCode || err.status) || 400;
        req.log.debug(err, `${new Date()} There was an error in the userFunctions.authenticateUser`);
        // returndata.userFriendlyErrors = [info.message];
        // res.send(returndata);
        next(err);
      });
  });
  app.get('/corpusteam', (req, res) => {
    res.send({});
  });
  /**
   * Responds to requests for adding a corpus role/permission to a user, if successful replies with the user's details
   * as json
   */
  const addroletouser = function addroletouser(req, res, next) {
    if (!req.body.username) {
      const err = new Error('Username is required');
      err.status = 412;
      err.userFriendlyErrors = ['This app has made an invalid request. Please notify its developer. missing: username of requester'];
      next(err);
      return;
    }
    if (!req.body.password) {
      const err = new Error('Password is required');
      err.status = 412;
      err.userFriendlyErrors = ['This app has made an invalid request. Please notify its developer. info: user credentials must be reqested from the user prior to running this request'];
      next(err);
      return;
    }
    userFunctions.authenticateUser({
      username: req.body.username,
      password: req.body.password,
      req,
    }).then(() => {
      let { users } = req.body;
      if (!users) {
        // backward compatability for prototype app
        if (req.body.userToAddToRole && req.body.roles) {
          users = [{
            username: req.body.userToAddToRole,
            remove: [],
            add: req.body.roles,
          }];
        }
        req.body.users = users;
      }
      const defaultConnection = Connection.defaultConnection(req.body.serverCode);
      let { connection } = req.body;
      if (!connection) {
        connection = defaultConnection;
        req.body.dbname = req.body.dbname || req.body.pouchname;
        if (req.body.dbname) {
          connection.dbname = req.body.dbname;
        }
      }
      connection.dbname = connection.dbname || connection.pouchname;
      for (const attrib in defaultConnection) {
        if (defaultConnection.hasOwnProperty(attrib) && !connection[attrib]) {
          connection[attrib] = defaultConnection[attrib];
        }
      }
      if (req.body.dbname && connection.dbname === 'default') {
        connection.dbname = req.body.dbname;
      }
      req.body.connection = connection;
      req.log.debug(req.body.connection);
      if (!req.body.connection || !req.body.connection.dbname || req.body.connection.dbname === 'default') {
        const err = new Error('Client didnt define the corpus to modify.');
        err.status = 412;
        err.userFriendlyErrors = ['This app has made an invalid request. Please notify its developer. info: the corpus to be modified must be included in the request'];
        next(err);
        return;
      }
      if (!req || !req.body.users || req.body.users.length === 0 || !req.body.users[0].username) {
        const err = new Error('Client didnt define the user(s) to modify.');
        err.status = 412;
        err.userFriendlyErrors = ['This app has made an invalid request. Please notify its developer. info: user(s) to modify must be included in this request'];
        next(err);
        return;
      }
      // Add a role to the user
      return userFunctions.addRoleToUser({
        req,
      })
        .catch(next);
    })
      .then((userPermissionSet) => {
        const info = userPermissionSet.map((userPermission) => {
          if (!userPermission) {
            return '';
          }
          if (!userPermission.message) {
            userPermission.message = 'There was a problem processing this user permission, Please report this 3134.';
            req.log.debug(userPermission, userPermission.message);
          }
          return userPermission.message;
        });
        // req.log.debug(info);
        const returndata = {};
        returndata.roleadded = true;
        returndata.users = userPermissionSet;
        returndata.info = info;
        // returndata.userFriendlyErrors = ["Faking an error"];
        req.log.debug(`${new Date()} Returning role added okay:\n`);
        req.log.debug(returndata, `${new Date()} Returning response:`);
        res.send(returndata);
      })
      .catch((err) => {
        req.log.debug(err, 'in the error handle');

        // res.status(cleanErrorStatus(err.statusCode || err.status) || 500);
        // returndata.status = cleanErrorStatus(err.statusCode || err.status) || 500;
        // req.log.debug(`${new Date()} There was an error in the
        // userFunctions.addRoleToUser:\n${JSON.stringify(err)}`);
        // returndata.userFriendlyErrors = info;

        // res.status(cleanErrorStatus(err.statusCode || err.status) || 400);
        // returndata.status = cleanErrorStatus(err.statusCode || err.status) || 400;
        req.log.debug(err, `${new Date()} There was an error in the userFunctions.authenticateUser`);
        // returndata.userFriendlyErrors = [info.message];
        // res.send(returndata);
        next(err);
      });
  };
  app.post('/addroletouser', addroletouser);
  app.get('/addroletouser', (req, res) => {
    res.send({});
  });
  /**
   * Responds to requests for adding a corpus to a user,
   * if successful replies with the dbname of the new corpus
   * in a string and a corpusaded = true
   */
  app.post('/newcorpus', (req, res, next) => {
    const newCorpusTitle = req.body.newCorpusTitle || req.body.newCorpusName;
    const connection = Connection.defaultConnection(req.body.appbrand);
    connection.title = newCorpusTitle;
    connection.dbname = `${req.body.username}-${connection.titleAsUrl}`;
    req.log.debug('Connection', connection);

    userFunctions.authenticateUser({
      username: req.body.username,
      password: req.body.password,
      req,
    }).then(({ user }) => {
      const returndata = {};
      if (!newCorpusTitle) {
        res.status(412);
        returndata.status = 412;
        returndata.userFriendlyErrors = ['This app has made an invalid request. Please notify its developer. missing: newCorpusTitle'];
        res.send(returndata);
        throw new Error('ending the request');
      }
      req.body.appbrand = req.body.appbrand || req.body.brand || req.body.serverCode || req.body.serverLabel;
      req.log.debug(` Creating a corpus withbranding ${req.body.appbrand}`);

      // Add a new corpus for the user
      return corpus.createNewCorpus({
        username: req.body.username,
        title: connection.title,
        connection,
        user,
        req,
      });
    })
      .then(({ corpusDetails, info }) => {
        const returndata = {};

        if (!corpusDetails) {
          returndata.userFriendlyErrors = [info.message];
          // ["There was an error creating your corpus. " + req.body.newCorpusTitle];
        } else {
          returndata.corpusadded = true;
          returndata.info = [`Corpus ${corpusDetails.title} created successfully.`];
          returndata.corpus = corpusDetails;
          returndata.connection = connection;
          // returndata.info = [ info.message ];
          req.log.debug(`${new Date()} Returning corpus added okay:\n`);
        }
        req.log.debug(returndata, `${new Date()} Returning response`);
        res.send(returndata);
      })
      .catch((err) => {
        if (err.message === 'ending the request') {
          return;
        }
        // res.status(cleanErrorStatus(err.statusCode || err.status) || 400);
        //   returndata.status = cleanErrorStatus(err.statusCode || err.status) || 400;
        //   req.log.debug(`${new Date()} There was an error in corpus.createNewCorpus`);
        //   returndata.userFriendlyErrors = [info.message];
        //   // ["There was an error creating your corpus. " + req.body.newCorpusTitle];
        if (err.statusCode || err.status === 302) {
          const returndata = {
            corpusadded: true,
            corpusexisted: true,
            connection,
            userFriendlyErrors: err.userFriendlyErrors,
          };
          res.status(302);
          res.send(returndata);
          return;
        }

        // res.status(cleanErrorStatus(err.statusCode || err.status) || 400);
        // returndata.status = cleanErrorStatus(err.statusCode || err.status) || 400;
        req.log.debug(err, `${new Date()} There was an error in the userFunctions.authenticateUser`);
        // returndata.userFriendlyErrors = [`Unable to create your corpus. ${info.message}`];
        // res.send(returndata);
        next(err);
      });
  });
  /**
   * Responds to requests for adding a user in a role to a corpus,
   * if successful replies with corpusadded =true and an info
   * string containgin the roles
   TODO return something useful as json
   */
  app.post('/updateroles', (req, res, next) => {
    /* convert spreadhseet data into data which the addroletouser api can read */
    req.body.userRoleInfo = req.body.userRoleInfo || {};
    req.body.userRoleInfo.dbname = req.body.userRoleInfo.dbname || req.body.userRoleInfo.pouchname;
    const roles = [];
    if (!req.body.roles && req.body.userRoleInfo) {
      for (const role in req.body.userRoleInfo) {
        if (req.body.userRoleInfo.hasOwnProperty(role)) {
          if (req.body.userRoleInfo[role] && (role === 'admin' || role === 'writer' || role === 'reader' || role === 'commenter')) {
            roles.push(`${req.body.userRoleInfo.dbname}_${role}`);
          }
        }
      }
    }
    req.body.roles = req.body.roles || roles;
    req.log.debug(`${new Date()} updateroles is DEPRECATED, using the addroletouser route to process this request`, roles);
    req.body.userToAddToRole = req.body.userToAddToRole || req.body.userRoleInfo.usernameToModify;
    if (req.body.userRoleInfo.dbname) {
      req.body.dbname = req.body.userRoleInfo.dbname;
    }
    req.log.debug(`${new Date()} requester ${req.body.username}  userToAddToRole ${req.body.userToAddToRole} on ${req.body.dbname}`);
    /* use the old api not the updateroles api */
    addroletouser(req, res, next);
  });
  /**
   * Responds to requests for adding a user in a role to a corpus,
   * if successful replies with corpusadded =true and an info
   * string containgin the roles
   TODO return something useful as json
   */
  app.post('/updaterolesdeprecateddoesnotsupportemailingusers', (req, res, next) => {
    userFunctions.authenticateUser({
      username: req.body.username,
      password: req.body.password,
      req,
    }).then(({ info }) => {
      const returndata = {
        depcrecated: true,
      };
      returndata.corpusadded = true;
      returndata.info = [info.message];
      // Update user roles for corpus
      corpus.updateRoles(req, (err, roles, updateRolesInfo) => {
        if (err) {
          res.status(cleanErrorStatus(err.statusCode || err.status) || 400);
          returndata.status = cleanErrorStatus(err.statusCode || err.status) || 400;
          req.log.debug(`${new Date()} There was an error in corpus.updateRoles\n`);
          returndata.userFriendlyErrors = [updateRolesInfo.message];
        }
        if (!roles) {
          returndata.userFriendlyErrors = ['There was an error updating the user roles.'];
        } else {
          returndata.corpusadded = true;
          returndata.info = [`User roles updated successfully for ${roles}`];
          //  returndata.info = [ info.message ];
          req.log.debug(`${new Date()} Returning corpus role added okay:\n`);
        }
        req.log.debug(returndata, `${new Date()} Returning response`);
        res.send(returndata);
      });
    })
      .catch((err) => {
        // res.status(cleanErrorStatus(err.statusCode || err.status) || 400);
        // returndata.status = cleanErrorStatus(err.statusCode || err.status) || 400;
        req.log.debug(err, `${new Date()} There was an error in the userFunctions.authenticateUser`);
        // returndata.userFriendlyErrors = 'Please supply a username and password to ensure this is you.';
        // res.send(returndata);
        next(err);
      });
    // app.get('/', function(req, res, next) {
    //  res.send({
    //      info: "Service is running normally."
    //  });
    // });
    debug('Added depcrecated routes');
  });
};
exports.addDeprecatedRoutes = addDeprecatedRoutes;
