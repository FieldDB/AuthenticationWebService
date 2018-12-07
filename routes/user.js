var swagger = require('swagger-node-express');
var param = require('swagger-node-express/Common/node/paramTypes.js');
var appVersion = require('../package.json').version;
exports.getUsers = {
  spec: {
    path: '/users/{username}',
    description: 'Operations about users accounts',
    notes: 'Requests users details if authenticated',
    summary: 'Retrieves user(s)',
    method: 'GET',
    parameters: [param.path('username', 'requested username of the user', 'string')],
    responseClass: 'User',
    errorResponses: [swagger.errors.invalid('username'), swagger.errors.notFound('user')],
    nickname: 'getUsers'
  },
  action: function action(req, res, next) {
    // If it is the user, get all details
    // If it is not the user, get the user mask
    res.send({});
  }
};
exports.postUsers = {
  spec: {
    path: '/users/{username}',
    description: 'Operations about users accounts',
    notes: 'Registers a user for a given username',
    summary: 'Register user(s)',
    method: 'POST',
    parameters: [param.path('username', 'requested username of the user to be created', 'string')],
    responseClass: 'User',
    errorResponses: [swagger.errors.invalid('username'), swagger.errors.notFound('user')],
    nickname: 'postUsers'
  },
  action: function action(req, res, next) {
    // If it has a password
    // Create the user
    res.send({});
  }
};
exports.putUsers = {
  spec: {
    path: '/users/{username}',
    description: 'Operations about users accounts',
    notes: 'Updates users details if authenticated',
    summary: 'Updates user(s)',
    method: 'PUT',
    parameters: [param.path('username', 'requested username of the user to be updated', 'string')],
    responseClass: 'User',
    errorResponses: [swagger.errors.invalid('username'), swagger.errors.notFound('user')],
    nickname: 'putUsers'
  },
  action: function action(req, res, next) {
    // If it has the password
    // Update the user
    res.send({});
  }
};
exports.deleteUsers = {
  spec: {
    path: '/users/{username}',
    description: 'Operations about users accounts',
    notes: 'Deletes user acount if authenticated',
    summary: 'Deletes user(s)',
    method: 'DELETE',
    parameters: [param.path('username', 'requested username of the user to be deleted', 'string')],
    responseClass: 'User',
    errorResponses: [swagger.errors.invalid('username'), swagger.errors.notFound('user')],
    nickname: 'deleteUsers'
  },
  action: function action(req, res, next) {
    // Return unimplemented
    res.send({});
  }
};
exports.getUserGravatars = {
  spec: {
    path: '/users/{username}/gravatar',
    description: 'Operations about users gravatars',
    notes: 'Requests users gravatar image if authenticated',
    summary: 'Retrieves users gravatar',
    method: 'GET',
    parameters: [param.path('username', 'requested username of the users gravatar', 'string')],
    responseClass: 'UserGravatar',
    errorResponses: [swagger.errors.invalid('username'), swagger.errors.notFound('user')],
    nickname: 'getUserGravatars'
  },
  action: function action(req, res, next) {
    // If it is a user,
    // Get the gravatar
    res.send({});
  }
};
exports.postUserGravatars = {
  spec: {
    path: '/users/{username}/gravatar',
    description: 'Operations about users gravatars',
    notes: 'Saves a users gravatar for a given username',
    summary: 'Save users gravatar',
    method: 'POST',
    parameters: [param.path('username', 'requested username of the users gravatar to be created', 'string')],
    responseClass: 'UserGravatar',
    errorResponses: [swagger.errors.invalid('username'), swagger.errors.notFound('user')],
    nickname: 'postUserGravatars'
  },
  action: function action(req, res, next) {
    // If it is a user,
    // Set the gravatar
    res.send({});
  }
};
exports.putUserGravatars = {
  spec: {
    path: '/users/{username}/gravatar',
    description: 'Operations about users gravatars',
    notes: 'Updates users gravatars details if authenticated',
    summary: 'Updates users gravatar',
    method: 'PUT',
    parameters: [param.path('username', 'requested username of the users gravatar to be updated', 'string')],
    responseClass: 'UserGravatar',
    errorResponses: [swagger.errors.invalid('username'), swagger.errors.notFound('user')],
    nickname: 'putUserGravatars'
  },
  action: function action(req, res, next) {
    // If it is a user,
    // Set the gravatar
    res.send({});
  }
};
exports.deleteUserGravatars = {
  spec: {
    path: '/users/{username}/gravatar',
    description: 'Operations about users gravatars',
    notes: 'Deletes users gravatar acount if authenticated',
    summary: 'Deletes users gravatar',
    method: 'DELETE',
    parameters: [param.path('username', 'requested username of the users gravatar to be deleted', 'string')],
    responseClass: 'UserGravatar',
    errorResponses: [swagger.errors.invalid('username'), swagger.errors.notFound('user')],
    nickname: 'deleteUserGravatars'
  },
  action: function action(req, res, next) {
    // If it is a user,
    // Delete the gravatar
    res.send({});
  }
};
