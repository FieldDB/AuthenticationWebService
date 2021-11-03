var debug = require('debug')('lib:users');
var util = require('util');

module.exports = function Users(args) {
  var authenticationfunctions = args.authentication || {};
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
  this.createUsersApiDocs = {
    path: '/users/{username}',
    operations: [{
      method: 'POST',
      summary: 'Create a user for username',
      notes: 'Returns a user built for username, accepts optional user details to be included in the resulting user.',
      type: 'User',
      nickname: 'postUsers',
      parameters: [{
        name: 'username',
        description: 'Username of user that will be looked up and created if new',
        required: true,
        type: 'string',
        paramType: 'path'
      }],
      responseMessages: [{
        code: 201,
        message: 'User created'
      }, {
        code: 301,
        message: 'User moved permanenty'
      }, {
        code: 400,
        message: 'Invalid user details supplied'
      }, {
        code: 401,
        message: 'Unauthorized'
      }, {
        code: 403,
        message: 'Forbidden'
      }, {
        code: 409,
        message: 'User update conflict'
      }, {
        code: 410,
        message: 'User gone'
      }, {
        code: 500,
        message: 'Internal server error'
      }, {
        code: 502,
        message: 'Bad gateway'
      }, {
        code: 503,
        message: 'User service unavailable'
      }]
    }]
  };
  this.createUsers = function createUsers(req, res) {
    var username = req.params.username || req.body.username;
    if (!username) {
      res.status(400).send({
        error: 'username must be provided'
      });
      return;
    }
    authenticationfunctions.registerNewUser(username, req, function afterRegisterNewUser(err, user, info) {
      var returndata = {};
      if (err) {
        debug(new Date() + ' There was an error in the authenticationfunctions.registerNewUser' + util.inspect(err));
        returndata.userFriendlyErrors = [info.message];
      }
      if (!user) {
        returndata.userFriendlyErrors = [info.message];
      } else {
        returndata.user = user;
        returndata.info = [info.message];
        debug(new Date() + ' Returning the newly built user: ' + util.inspect(user));
      }
      res.send(returndata);
    });
  };
  this.updateUsersApiDocs = {
    path: '/users/{username}',
    operations: [{
      method: 'PUT',
      summary: 'Updates a user for username',
      notes: 'Returns the updated user details.',
      type: 'User',
      nickname: 'updateUserByUsername',
      parameters: [{
        name: 'username',
        description: 'Username of user that will be looked up and updated if present',
        required: true,
        type: 'string',
        paramType: 'path'
      }],
      responseMessages: [{
        code: 301,
        message: 'User moved permanenty'
      }, {
        code: 304,
        message: 'User not modified, identical'
      }, {
        code: 400,
        message: 'Invalid user details supplied'
      }, {
        code: 401,
        message: 'Unauthorized'
      }, {
        code: 403,
        message: 'Forbidden'
      }, {
        code: 404,
        message: 'User not found'
      }, {
        code: 409,
        message: 'User update conflict'
      }, {
        code: 410,
        message: 'User gone'
      }, {
        code: 500,
        message: 'Internal server error'
      }, {
        code: 502,
        message: 'Bad gateway'
      }, {
        code: 503,
        message: 'User service unavailable'
      }]
    }]
  };
  this.updateUsers = function updateUsers(req, res) {
    authenticationfunctions.authenticateUser(req.body.username, req.body.password, req, function afterAuthenticateUser(err, user, info) {
      var returndata = {};
      if (err) {
        debug(new Date() + ' There was an error in the authenticationfunctions.authenticateUser:\n' + util.inspect(err));
        returndata.userFriendlyErrors = [info.message];
      }
      if (!user) {
        returndata.userFriendlyErrors = [info.message];
      } else {
        returndata.user = user;
        delete returndata.user.serverlogs;
        returndata.info = [info.message];
        debug(new Date() + ' Returning the existing user as json:\n' + util.inspect(user));
      }
      debug(new Date() + ' Returning response:\n' + util.inspect(returndata));
      res.send(returndata);
    });
  };
  this.getUsersApiDocs = {
    path: '/users/{username}',
    operations: [{
      method: 'GET',
      summary: 'Get user details for username',
      notes: 'Returns a user',
      type: 'User',
      nickname: 'getUserByUsername',
      parameters: [{
        name: 'username',
        description: 'Username of user that will be looked up and returned if existing',
        required: true,
        type: 'string',
        paramType: 'path'
      }],
      responseMessages: [{
        code: 403,
        message: 'Forbidden'
      }, {
        code: 501,
        message: 'API method will not not implemented'
      }, {
        code: 502,
        message: 'Bad gateway'
      }, {
        code: 503,
        message: 'User Service unavailable'
      }]
    }]
  };
  this.getUsers = function getUsers(req, res) {
    res.status(501).send({
      error: 'Forbidden: API method will not not implemented'
    });
  };
  this.deleteUsersApiDocs = {
    path: '/users/{username}',
    operations: [{
      method: 'DELETE',
      summary: 'Delete user',
      notes: 'Returns a deleted user',
      type: 'User',
      nickname: 'deleteUserByUsername',
      parameters: [{
        name: 'username',
        description: 'Username of user that will be looked up and deleted if existing',
        required: true,
        type: 'string',
        paramType: 'path'
      }],
      responseMessages: [{
        code: 403,
        message: 'Forbidden'
      }, {
        code: 501,
        message: 'API method will not not implemented'
      }, {
        code: 502,
        message: 'Bad gateway'
      }, {
        code: 503,
        message: 'User Service unavailable'
      }]
    }]
  };
  this.deleteUsers = function deleteUsers(req, res) {
    res.status(501).send({
      error: 'Forbidden: API method will not not implemented'
    });
  };
  this.addUserRoles = function addUserRoles(req, res) {
    res.send('addUserRoles');
  };
  this.updateUserRoles = function updateUserRoles(req, res) {
    res.send('updateUserRoles');
  };
  this.getUserRoles = function getUserRoles(req, res) {
    res.send('getUserRoles');
  };
  this.deleteUserRoles = function deleteUserRoles(req, res) {
    res.send('deleteUserRoles');
  };
  this.docs = [this.createUsersApiDocs, this.updateUsersApiDocs, this.getUsersApiDocs, this.deleteUsersApiDocs];
  return this;
};
