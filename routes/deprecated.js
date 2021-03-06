var Connection = require('fielddb/api/corpus/Connection').Connection;
var debug = require('debug')('route:deprecated');
var util = require('util');

var authenticationfunctions = require('./../lib/userauthentication.js');
var corpus = require('./../lib/corpus');

var cleanErrorStatus = function cleanErrorStatus(status) {
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
var addDeprecatedRoutes = function addDeprecatedRoutes(app) {
  /**
   * Responds to requests for login, if sucessful replies with the user's details
   * as json
   */
  app.post('/login', function postLogin(req, res, next) {
    authenticationfunctions.authenticateUser(req.body.username, req.body.password, req, function afterAuthenticateUser(err, user, info) {
      var returndata = {};
      if (err) {
        res.status(cleanErrorStatus(err.statusCode || err.status) || 400);
        returndata.status = cleanErrorStatus(err.statusCode || err.status) || 400;
        req.log.debug(new Date() + ' There was an error in the authenticationfunctions.authenticateUser:\n' + util.inspect(err));
        returndata.userFriendlyErrors = [info.message];
      }
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
        // req.log.debug(new Date() + " Returning the existing user as json:\n" + util.inspect(user));
      }
      req.log.debug(new Date() + ' Returning response:\n' + util.inspect(returndata));
      res.send(returndata);
    });
  });
  app.get('/login', function getLogin(req, res, next) {
    res.send({
      info: 'Service is running normally.'
    });
  });
  /**
   * Takes in the http request and response. Calls the registerNewUser function in
   * the authenticationfunctions library. The registerNewUser function takes in a
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
  app.post('/register', function postRegister(req, res) {
    authenticationfunctions.registerNewUser('local', req, function afterRegisterNewUser(err, user, info) {
      var returndata = {};
      if (err) {
        res.status(cleanErrorStatus(err.statusCode || err.status) || 400);
        returndata.status = cleanErrorStatus(err.statusCode || err.status) || 400;
        req.log.debug(new Date() + ' There was an error in the authenticationfunctions.registerNewUser', err, info);
        returndata.userFriendlyErrors = [info.message];
      }
      if (!user) {
        returndata.userFriendlyErrors = [info.message];
      } else {
        returndata.user = user;
        returndata.info = [info.message];
        req.log.debug(new Date() + ' Returning the newly built user: ' + util.inspect(user));
      }
      res.send(returndata);
    });
  });
  app.get('/register', function getRegister(req, res, next) {
    res.send({});
  });
  /**
   * Takes in the http request and response. Calls the setPassword function in
   * the authenticationfunctions library. The setPassword function takes in an old password,
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
  app.post('/changepassword', function postChangePassword(req, res) {
    var oldpassword = req.body.password;
    var newpassword = req.body.newpassword;
    var confirmpassword = req.body.confirmpassword;
    var username = req.body.username;
    res.status(401);
    if (newpassword !== confirmpassword) {
      res.send({
        status: 406,
        userFriendlyErrors: ['New passwords do not match, please try again.']
      });
      return;
    }
    authenticationfunctions.setPassword(oldpassword, newpassword, username, function afterSetPassword(err, user, info) {
      var returndata = {};
      if (err) {
        res.status(cleanErrorStatus(err.statusCode || err.status) || 400);
        returndata.status = cleanErrorStatus(err.statusCode || err.status) || 400;
        req.log.debug(new Date() + ' There was an error in the authenticationfunctions.setPassword ' + util.inspect(err));
        returndata.userFriendlyErrors = [info.message];
      }
      if (!user) {
        returndata.userFriendlyErrors = [info.message];
      } else {
        returndata.user = user;
        returndata.info = [info.message];
        res.status(200);
        req.log.debug(new Date() + ' Returning success: ' + util.inspect(user));
      }
      res.send(returndata);
    });
  });
  app.get('/changepassword', function getChangePassword(req, res, next) {
    res.send({});
  });
  /**
   * Takes in the http request and response. Calls the setPassword function in
   * the authenticationfunctions library. The setPassword function takes in an old password,
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
  app.post('/forgotpassword', function postForgotPassword(req, res) {
    var email = req.body.email;
    authenticationfunctions.forgotPassword(email, function afterForgotPassword(err, forgotPasswordResults, info) {
      var returndata = {};
      if (err) {
        res.status(cleanErrorStatus(err.statusCode || err.status) || 400);
        returndata.status = cleanErrorStatus(err.statusCode || err.status) || 400;
        req.log.debug(new Date() + ' There was an error in the authenticationfunctions.setPassword ' + util.inspect(err));
        returndata.userFriendlyErrors = [info.message];
      } else {
        returndata.info = [info.message];
        // res.status(200);
        req.log.debug(new Date() + ' Returning forgotpassword success: ' + util.inspect(returndata));
      }
      res.send(returndata);
    });
  });
  app.get('/forgotpassword', function getForgotPassword(req, res, next) {
    res.send({});
  });
  /**
   * Responds to requests for a list of team members on a corpus, if successful replies with a list of
   * usernames as json
   */
  app.post('/corpusteam', function postCorpusTeam(req, res, next) {
    var returndata = {};
    req.body.dbname = req.body.dbname || req.body.pouchname;
    authenticationfunctions.fetchCorpusPermissions(req, function afterFetchCorpusPermissions(err, users, info) {
      if (err) {
        res.status(cleanErrorStatus(err.statusCode || err.status) || 400);
        returndata.status = cleanErrorStatus(err.statusCode || err.status) || 400;
        req.log.debug(new Date() + ' There was an error in the authenticationfunctions.fetchCorpusPermissions:\n' + util.inspect(err));
        returndata.userFriendlyErrors = [info.message];
      }
      if (!users) {
        returndata.userFriendlyErrors = [info.message];
      } else {
        returndata.users = users;
        returndata.info = [info.message];
        // returndata.userFriendlyErrors = ["Faking an error to test"];
      }
      // req.log.debug(new Date() + " Returning response:\n" + util.inspect(returndata));
      req.log.debug(new Date() + ' Returning the list of reader users on this corpus as json:');
      if (returndata && returndata.users) {
        req.log.debug(util.inspect(returndata.users.readers));
      }
      res.send(returndata);
    });
  });
  app.post('/corpusteamwhichrequiresvalidauthentication', function postCorpusTeamWhichRequiresValidAuthentication(req, res, next) {
    var returndata = {};
    authenticationfunctions.authenticateUser(req.body.username, req.body.password, req, function afterAuthenticateUser(err, user, info) {
      if (err) {
        res.status(cleanErrorStatus(err.statusCode || err.status) || 400);
        returndata.status = cleanErrorStatus(err.statusCode || err.status) || 400;
        req.log.debug(new Date() + ' There was an error in the authenticationfunctions.authenticateUser:\n' + util.inspect(err));
        returndata.userFriendlyErrors = [info.message];
        res.send(returndata);
        return;
      }
      authenticationfunctions.fetchCorpusPermissions(req, function afterFetchCorpusPermissions(err, users, info) {
        if (err) {
          res.status(cleanErrorStatus(err.statusCode || err.status) || 400);
          returndata.status = cleanErrorStatus(err.statusCode || err.status) || 400;
          req.log.debug(new Date() + ' There was an error in the authenticationfunctions.fetchCorpusPermissions:\n' + util.inspect(err));
          returndata.userFriendlyErrors = [info.message];
        }
        if (!users) {
          returndata.userFriendlyErrors = [info.message];
        } else {
          returndata.users = users;
          returndata.info = [info.message];
          // returndata.userFriendlyErrors = ["Faking an error to test"];
        }
        // req.log.debug(new Date() + " Returning response:\n" + util.inspect(returndata));
        req.log.debug(new Date() + ' Returning the list of reader users on this corpus as json:');
        if (returndata && returndata.users) {
          req.log.debug(util.inspect(returndata.users.readers));
        }
        res.send(returndata);
      });
    });
  });
  app.get('/corpusteam', function getCorpusTeam(req, res, next) {
    res.send({});
  });
  /**
   * Responds to requests for adding a corpus role/permission to a user, if successful replies with the user's details
   * as json
   */
  var addroletouser = function addroletouser(req, res, next) {
    var returndata = {};
    if (!req.body.username) {
      res.status(412);
      returndata.userFriendlyErrors = ['This app has made an invalid request. Please notify its developer. missing: username of requester'];
      res.send(returndata);
      return;
    }
    if (!req.body.password) {
      res.status(412);
      returndata.userFriendlyErrors = ['This app has made an invalid request. Please notify its developer. info: user credentials must be reqested from the user prior to running this request'];
      res.send(returndata);
      return;
    }
    authenticationfunctions.authenticateUser(req.body.username, req.body.password, req, function afterAuthenticateUser(err, user, info) {
      var returndata = {};
      if (err) {
        res.status(cleanErrorStatus(err.statusCode || err.status) || 400);
        returndata.status = cleanErrorStatus(err.statusCode || err.status) || 400;
        req.log.debug(new Date() + ' There was an error in the authenticationfunctions.authenticateUser:\n' + util.inspect(err));
        returndata.userFriendlyErrors = [info.message];
        res.send(returndata);
        return;
      }
      var users = req.body.users;
      if (!users) {
        // backward compatability for prototype app
        if (req.body.userToAddToRole && req.body.roles) {
          users = [{
            username: req.body.userToAddToRole,
            remove: [],
            add: req.body.roles
          }];
        }
        req.body.users = users;
      }
      var defaultConnection = Connection.defaultConnection(req.body.serverCode);
      var connection = req.body.connection;
      if (!connection) {
        connection = defaultConnection;
        req.body.dbname = req.body.dbname || req.body.pouchname;
        if (req.body.dbname) {
          connection.dbname = req.body.dbname;
        }
      }
      connection.dbname = connection.dbname || connection.pouchname;
      for (var attrib in defaultConnection) {
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
        req.log.debug('Client didnt define the corpus to modify.');
        res.status(412);
        returndata.userFriendlyErrors = ['This app has made an invalid request. Please notify its developer. info: the corpus to be modified must be included in the request'];
        res.send(returndata);
        return;
      }
      if (!req || !req.body.users || req.body.users.length === 0 || !req.body.users[0].username) {
        req.log.debug('Client didnt define the user(s) to modify.');
        res.status(412);
        returndata.userFriendlyErrors = ['This app has made an invalid request. Please notify its developer. info: user(s) to modify must be included in this request'];
        res.send(returndata);
        return;
      }
      // Add a role to the user
      authenticationfunctions.addRoleToUser(req, function afterAddRoleToUser(err, userPermissionSet, optionalInfo) {
        req.log.debug('Getting back the results of authenticationfunctions.addRoleToUser ');
        // req.log.debug(err);
        // req.log.debug(userPermissionSet);
        if (!userPermissionSet) {
          userPermissionSet = {
            username: 'error',
            status: 500,
            message: 'There was a problem processing your request, Please report this 32134.'
          };
          if (optionalInfo && optionalInfo.message) {
            userPermissionSet.message = optionalInfo.message;
          }
          if (err && err.statusCode || err.status) {
            userPermissionSet.status = err.statusCode || err.status;
          }
        }
        if (Object.prototype.toString.call(userPermissionSet) !== '[object Array]') {
          userPermissionSet = [userPermissionSet];
        }
        req.log.debug(userPermissionSet);
        var info = userPermissionSet.map(function collectErrors(userPermission) {
          if (!userPermission) {
            return '';
          }
          if (!userPermission.message) {
            userPermission.message = 'There was a problem processing this user permission, Please report this 3134.';
            req.log.debug(userPermission.message);
            req.log.debug(userPermission);
          } else if (userPermission.message.indexOf('not found') > -1) {
            userPermission.message = "You can't add " + userPermission.username + ' to this corpus, their username was unrecognized. ' + userPermission.message;
          }
          return userPermission.message;
        });
        // req.log.debug(info);
        if (err) {
          res.status(cleanErrorStatus(err.statusCode || err.status) || 500);
          returndata.status = cleanErrorStatus(err.statusCode || err.status) || 500;
          req.log.debug(new Date() + ' There was an error in the authenticationfunctions.addRoleToUser:\n' + util.inspect(err));
          returndata.userFriendlyErrors = info;
        } else {
          returndata.roleadded = true;
          returndata.users = userPermissionSet;
          returndata.info = info;
          // returndata.userFriendlyErrors = ["Faking an error"];
          req.log.debug(new Date() + ' Returning role added okay:\n');
        }
        req.log.debug(new Date() + ' Returning response:\n' + util.inspect(returndata));
        res.send(returndata);
      });
    });
  };
  app.post('/addroletouser', addroletouser);
  app.get('/addroletouser', function getAddroletouser(req, res, next) {
    res.send({});
  });
  /**
   * Responds to requests for adding a corpus to a user, if successful replies with the dbname of the new corpus in a string and a corpusaded = true
   */
  app.post('/newcorpus', function postNewCorpus(req, res, next) {
    authenticationfunctions.authenticateUser(req.body.username, req.body.password, req, function afterAuthenticateUser(err, user, info) {
      var returndata = {};
      if (err) {
        res.status(cleanErrorStatus(err.statusCode || err.status) || 400);
        returndata.status = cleanErrorStatus(err.statusCode || err.status) || 400;
        req.log.debug(new Date() + ' There was an error in the authenticationfunctions.authenticateUser:\n' + util.inspect(err));
        returndata.userFriendlyErrors = ['Unable to create your corpus. ' + info.message];
        res.send(returndata);
        return;
      }
      if (!user) {
        returndata.userFriendlyErrors = [info.message];
        res.send(returndata);
      } else {
        req.body.newCorpusTitle = req.body.newCorpusTitle || req.body.newCorpusName;
        if (!req.body.newCorpusTitle) {
          res.status(412);
          returndata.status = 412;
          returndata.userFriendlyErrors = ['This app has made an invalid request. Please notify its developer. missing: newCorpusTitle'];
          res.send(returndata);
          return;
        }
        req.body.appbrand = req.body.appbrand || req.body.brand || req.body.serverCode || req.body.serverLabel;
        req.log.debug(' Creating a corpus withbranding ' + req.body.appbrand);
        var connection = Connection.defaultConnection(req.body.appbrand);
        connection.title = req.body.newCorpusTitle;
        connection.dbname = req.body.username + '-' + connection.titleAsUrl;
        req.log.debug('Connection', connection);
        // Add a new corpus for the user
        corpus.createNewCorpus({
          username: req.body.username,
          title: req.body.newCorpusTitle,
          connection: connection
        }, function afterCreateNewCorpus(err, corpus, info) {
          if (err) {
            res.status(cleanErrorStatus(err.statusCode || err.status) || 400);
            returndata.status = cleanErrorStatus(err.statusCode || err.status) || 400;
            req.log.debug(new Date() + ' There was an error in corpus.createNewCorpus');
            returndata.userFriendlyErrors = [info.message]; // ["There was an error creating your corpus. " + req.body.newCorpusTitle];
            if (err.statusCode || err.status === 302) {
              returndata.corpusadded = true;
              returndata.corpusexisted = true;
              returndata.connection = connection;
            }
          }
          if (!corpus) {
            returndata.userFriendlyErrors = [info.message]; // ["There was an error creating your corpus. " + req.body.newCorpusTitle];
          } else {
            returndata.corpusadded = true;
            returndata.info = ['Corpus ' + corpus.title + ' created successfully.'];
            returndata.corpus = corpus;
            returndata.connection = connection;
            // returndata.info = [ info.message ];
            req.log.debug(new Date() + ' Returning corpus added okay:\n');
          }
          req.log.debug(new Date() + ' Returning response:\n' + util.inspect(returndata));
          res.send(returndata);
        });
      }
    });
  });
  /**
     * Responds to requests for adding a user in a role to a corpus, if successful replies with corpusadded =true and an info string containgin the roles
     TODO return something useful as json
     */
  app.post('/updateroles', function postUpdateRoles(req, res, next) {
    /* convert spreadhseet data into data which the addroletouser api can read */
    req.body.userRoleInfo = req.body.userRoleInfo || {};
    req.body.userRoleInfo.dbname = req.body.userRoleInfo.dbname || req.body.userRoleInfo.pouchname;
    var roles = [];
    if (!req.body.roles && req.body.userRoleInfo) {
      for (var role in req.body.userRoleInfo) {
        if (req.body.userRoleInfo.hasOwnProperty(role)) {
          if (req.body.userRoleInfo[role] && (role === 'admin' || role === 'writer' || role === 'reader' || role === 'commenter')) {
            roles.push(role);
          }
        }
      }
    }
    req.body.roles = req.body.roles || roles;
    req.log.debug(new Date() + ' updateroles is DEPRECATED, using the addroletouser route to process this request', roles);
    req.body.userToAddToRole = req.body.userToAddToRole || req.body.userRoleInfo.usernameToModify;
    if (req.body.userRoleInfo.dbname) {
      req.body.dbname = req.body.userRoleInfo.dbname;
    }
    req.log.debug(new Date() + ' requester ' + req.body.username + '  userToAddToRole ' + req.body.userToAddToRole + ' on ' + req.body.dbname);
    /* use the old api not the updateroles api */
    addroletouser(req, res, next);
  });
  /**
     * Responds to requests for adding a user in a role to a corpus, if successful replies with corpusadded =true and an info string containgin the roles
     TODO return something useful as json
     */
  app.post('/updaterolesdeprecateddoesnotsupportemailingusers', function postUpdateRolesDeprecatedDoesNotSupportEmailingUsers(req, res, next) {
    authenticationfunctions.authenticateUser(req.body.username, req.body.password, req, function afterAuthenticateUser(err, user, info) {
      var returndata = {
        depcrecated: true
      };
      if (err) {
        res.status(cleanErrorStatus(err.statusCode || err.status) || 400);
        returndata.status = cleanErrorStatus(err.statusCode || err.status) || 400;
        req.log.debug(new Date() + ' There was an error in the authenticationfunctions.authenticateUser:\n' + util.inspect(err));
        returndata.userFriendlyErrors = 'Please supply a username and password to ensure this is you.';
        res.send(returndata);
        return;
      }
      if (!user) {
        returndata.userFriendlyErrors = [info.message];
      } else {
        returndata.corpusadded = true;
        returndata.info = [info.message];
        // Update user roles for corpus
        corpus.updateRoles(req, function afterUpdateRoles(err, roles, info) {
          if (err) {
            res.status(cleanErrorStatus(err.statusCode || err.status) || 400);
            returndata.status = cleanErrorStatus(err.statusCode || err.status) || 400;
            req.log.debug(new Date() + ' There was an error in corpus.updateRoles\n');
            returndata.userFriendlyErrors = [info.message];
          }
          if (!roles) {
            returndata.userFriendlyErrors = ['There was an error updating the user roles.'];
          } else {
            returndata.corpusadded = true;
            returndata.info = ['User roles updated successfully for ' + roles];
            //  returndata.info = [ info.message ];
            req.log.debug(new Date() + ' Returning corpus role added okay:\n');
          }
          req.log.debug(new Date() + ' Returning response:\n' + util.inspect(returndata));
          res.send(returndata);
        });
      }
    });
  });
  // app.get('/', function(req, res, next) {
  //  res.send({
  //      info: "Service is running normally."
  //  });
  // });
  debug('Added depcrecated routes');
};
exports.addDeprecatedRoutes = addDeprecatedRoutes;
