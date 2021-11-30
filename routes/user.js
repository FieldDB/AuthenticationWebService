const debug = require('debug')('route:user');
const swagger = require('@cesine/swagger-node-express');
const param = require('@cesine/swagger-node-express/Common/node/paramTypes');

const User = require('../models/user');
const authenticationMiddleware = require('../middleware/authentication');

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
    nickname: 'getUser',
  },
  action: function getUser(req, res, next) {
    return authenticationMiddleware.requireAuthentication(req, res, (err) => {
      if (err) {
        return next(err);
      }
      const json = {
        username: req.params.username,
      };

      return User.read(json, (readErr, profile) => {
        if (readErr) {
          return next(readErr, req, res, next);
        }
        return res.json(profile);
      });
    });
  },
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
    nickname: 'getCurrentUser',
  },
  action: function getCurrentUser(req, res, next) {
    return authenticationMiddleware.requireAuthentication(req, res, (err) => {
      if (err) {
        return next(err);
      }
      const json = {
        username: res.locals.user.username,
      };

      return User.read(json, (readErr, profile) => {
        if (readErr) {
          return next(readErr, req, res, next);
        }

        if (!profile) {
          const notFound = new Error('Not found');
          notFound.status = 404;
          return next(notFound);
        }
        return res.json({
          ...profile,
          token: res.locals.token,
        });
      });
    });
  },
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
    nickname: 'getList',
  },
  action: function getList(req, res, next) {
    User.list(null, (err, miniProfiles) => {
      if (err) {
        return next(err, req, res, next);
      }
      return res.json(miniProfiles);
    });
  },
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
    nickname: 'postUsers',
  },
  action: function postUsers(req, res) {
    // If it has a password
    // Create the user
    res.send({});
  },
};

exports.putUser = {
  spec: {
    path: '/v1/users/{username}',
    description: 'Operations about users accounts',
    notes: 'Updates users details if authenticated',
    summary: 'Updates user(s)',
    method: 'PUT',
    parameters: [
      param.path('username', 'requested username of the user to be updated', 'string'),
      param.body('body', 'details user to be updated', 'object'),
    ],
    responseClass: 'User',
    errorResponses: [swagger.errors.invalid('username'), swagger.errors.notFound('user')],
    nickname: 'putUser',
  },
  action: function putUser(req, res, next) {
    return authenticationMiddleware.requireAuthentication(req, res, (err) => {
      if (err) {
        return next(err);
      }
      if ((req.body.username && req.params.username !== req.body.username)
        || req.params.username !== res.locals.user.username) {
        debug(req.params, req.body);
        const userMismatchErr = new Error('Username does not match, you can only update your own details');
        userMismatchErr.status = 403;

        return next(userMismatchErr, req, res, next);
      }

      req.body.username = res.locals.user.username;
      return User.save(req.body, (saveErr, profile) => {
        if (saveErr) {
          return next(saveErr, req, res, next);
        }
        return res.json(profile);
      });
    });
  },
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
    nickname: 'deleteUsers',
  },
  action: function deleteUsers(req, res) {
    // Return unimplemented
    res.send({});
  },
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
    nickname: 'getUserGravatars',
  },
  action: function getUserGravatars(req, res) {
    // If it is a user,
    // Get the gravatar
    res.send({});
  },
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
    nickname: 'postUserGravatars',
  },
  action: function postUserGravatars(req, res) {
    // If it is a user,
    // Set the gravatar
    res.send({});
  },
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
    nickname: 'putUserGravatars',
  },
  action: function putUserGravatars(req, res) {
    // If it is a user,
    // Set the gravatar
    res.send({});
  },
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
    nickname: 'deleteUserGravatars',
  },
  action: function deleteUserGravatars(req, res) {
    // If it is a user,
    // Delete the gravatar
    res.send({});
  },
};
