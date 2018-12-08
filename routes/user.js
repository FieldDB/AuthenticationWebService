var swagger = require('swagger-node-express');
var param = require('swagger-node-express/Common/node/paramTypes.js');
var appVersion = require('../package.json').version;

var User = require('./../models/user');
var authenticationMiddleware = require('./../middleware/authentication');

// Initialize the model to ensure the table exists
User.init();

exports.getUser = {
  spec: {
    path: '/v1/users/{username}',
    description: 'Operations about users accounts',
    notes: 'Requests users details if authenticated',
    summary: 'Retrieves user(s)',
    method: 'GET',
    parameters: [param.path('username', 'requested username of the user', 'string')],
    responseClass: 'User',
    errorResponses: [swagger.errors.invalid('username'), swagger.errors.notFound('user')],
    nickname: 'getUser'
  },
  action: function getUser(req, res, next) {
    // TODO authenticationMiddleware.requireAuthentication
    var json = {
      username: req.params.username
    };

    User.read(json, function (err, profile) {
      if (err) {
        return next(err, req, res, next);
      }
      res.json(profile);
    });
  }
};

exports.getCurrentUser = {
  spec: {
    path: '/v1/user',
    description: 'Operations about users accounts',
    notes: 'Requests users details if authenticated',
    summary: 'Retrieves user(s)',
    method: 'GET',
    parameters: [],
    responseClass: 'User',
    errorResponses: [swagger.errors.invalid('username'), swagger.errors.notFound('user')],
    nickname: 'getCurrentUser'
  },
  action: function getCurrentUser(req, res, next) {
    // TODO authenticationMiddleware.requireAuthentication
    var json = {
      username: req.app.locals.user.username
    };

    User.read(json, function (err, profile) {
      if (err) {
        return next(err, req, res, next);
      }
      profile.token = req.app.locals.token;
      res.json(profile);
    });
  }
};

/**
 * Get a list of users
 * @param  {Request} req
 * @param  {Response} res
 * @param  {Function} next
 */
exports.getList = {
  spec: {
    path: '/v1/users',
    description: 'Operations about users accounts',
    notes: 'Requests list of users',
    summary: 'Retrieves users',
    method: 'GET',
    parameters: [],
    responseClass: 'User',
    errorResponses: [swagger.errors.notFound('user')],
    nickname: 'getList'
  },
  action: function getList(req, res, next) {
    User.list(null, function (err, miniProfiles) {
      if (err) {
        return next(err, req, res, next);
      }
      res.json(miniProfiles);
    });
  }
};

exports.postUsers = {
  spec: {
    path: '/v1/users/{username}',
    description: 'Operations about users accounts',
    notes: 'Registers a user for a given username',
    summary: 'Register user(s)',
    method: 'POST',
    parameters: [param.path('username', 'requested username of the user to be created', 'string')],
    responseClass: 'User',
    errorResponses: [swagger.errors.invalid('username'), swagger.errors.notFound('user')],
    nickname: 'postUsers'
  },
  action: function postUsers(req, res, next) {
    // If it has a password
    // Create the user
    res.send({});
  }
};

exports.putUser = {
  spec: {
    path: '/v1/users/{username}',
    description: 'Operations about users accounts',
    notes: 'Updates users details if authenticated',
    summary: 'Updates user(s)',
    method: 'PUT',
    parameters: [param.path('username', 'requested username of the user to be updated', 'string')],
    responseClass: 'User',
    errorResponses: [swagger.errors.invalid('username'), swagger.errors.notFound('user')],
    nickname: 'putUser'
  },
  action: function putUser(req, res, next) {
    // TODO authenticationMiddleware.requireAuthentication
    if ((req.body.username && req.params.username !== req.body.username)
      || req.params.username !== req.app.locals.user.username) {
      debug(req.params, req.body);
      var err = new Error('Username does not match, you can only update your own details');
      err.status = 403;

      return next(err, req, res, next);
    }

    req.body.username = req.app.locals.user.username;
    User.save(req.body, function (err, profile) {
      if (err) {
        return next(err, req, res, next);
      }
      res.json(profile);
    });
  }
};
exports.deleteUsers = {
  spec: {
    path: '/v1/users/{username}',
    description: 'Operations about users accounts',
    notes: 'Deletes user acount if authenticated',
    summary: 'Deletes user(s)',
    method: 'DELETE',
    parameters: [param.path('username', 'requested username of the user to be deleted', 'string')],
    responseClass: 'User',
    errorResponses: [swagger.errors.invalid('username'), swagger.errors.notFound('user')],
    nickname: 'deleteUsers'
  },
  action: function deleteUsers(req, res, next) {
    // Return unimplemented
    res.send({});
  }
};
exports.getUserGravatars = {
  spec: {
    path: '/v1/users/{username}/gravatar',
    description: 'Operations about users gravatars',
    notes: 'Requests users gravatar image if authenticated',
    summary: 'Retrieves users gravatar',
    method: 'GET',
    parameters: [param.path('username', 'requested username of the users gravatar', 'string')],
    responseClass: 'UserGravatar',
    errorResponses: [swagger.errors.invalid('username'), swagger.errors.notFound('user')],
    nickname: 'getUserGravatars'
  },
  action: function getUserGravatars(req, res, next) {
    // If it is a user,
    // Get the gravatar
    res.send({});
  }
};
exports.postUserGravatars = {
  spec: {
    path: '/v1/users/{username}/gravatar',
    description: 'Operations about users gravatars',
    notes: 'Saves a users gravatar for a given username',
    summary: 'Save users gravatar',
    method: 'POST',
    parameters: [param.path('username', 'requested username of the users gravatar to be created', 'string')],
    responseClass: 'UserGravatar',
    errorResponses: [swagger.errors.invalid('username'), swagger.errors.notFound('user')],
    nickname: 'postUserGravatars'
  },
  action: function postUserGravatars(req, res, next) {
    // If it is a user,
    // Set the gravatar
    res.send({});
  }
};
exports.putUserGravatars = {
  spec: {
    path: '/v1/users/{username}/gravatar',
    description: 'Operations about users gravatars',
    notes: 'Updates users gravatars details if authenticated',
    summary: 'Updates users gravatar',
    method: 'PUT',
    parameters: [param.path('username', 'requested username of the users gravatar to be updated', 'string')],
    responseClass: 'UserGravatar',
    errorResponses: [swagger.errors.invalid('username'), swagger.errors.notFound('user')],
    nickname: 'putUserGravatars'
  },
  action: function putUserGravatars(req, res, next) {
    // If it is a user,
    // Set the gravatar
    res.send({});
  }
};
exports.deleteUserGravatars = {
  spec: {
    path: '/v1/users/{username}/gravatar',
    description: 'Operations about users gravatars',
    notes: 'Deletes users gravatar acount if authenticated',
    summary: 'Deletes users gravatar',
    method: 'DELETE',
    parameters: [param.path('username', 'requested username of the users gravatar to be deleted', 'string')],
    responseClass: 'UserGravatar',
    errorResponses: [swagger.errors.invalid('username'), swagger.errors.notFound('user')],
    nickname: 'deleteUserGravatars'
  },
  action: function deleteUserGravatars(req, res, next) {
    // If it is a user,
    // Delete the gravatar
    res.send({});
  }
};
