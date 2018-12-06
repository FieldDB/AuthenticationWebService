/* Load modules provided by $ npm install, see package.json for details */
var swagger = require('swagger-node-express');
var param = require('../node_modules/swagger-node-express/Common/node/paramTypes.js');
var appVersion = require('../package.json').version;
exports.getELanguages = {
  spec: {
    path: '/elanguages/{iso_code}',
    description: 'Operations about elanguages',
    notes: 'Requests elanguages details if authenticated',
    summary: 'Retrieves elanguage(s)',
    method: 'GET',
    parameters: [param.path('iso_code', 'requested iso_code of the elanguage', 'string')],
    responseClass: 'User',
    errorResponses: [swagger.errors.invalid('iso_code'), swagger.errors.notFound('elanguage')],
    nickname: 'getELanguages'
  },
  action: function (req, res, next) {
    res.send({});
  }
};
exports.postELanguages = {
  spec: {
    path: '/elanguages/{iso_code}',
    description: 'Operations about elanguages',
    notes: 'Creates a elanguage for a given iso_code',
    summary: 'Creates a elanguage(s)',
    method: 'POST',
    parameters: [param.path('iso_code', 'requested iso_code of the elanguage', 'string')],
    responseClass: 'User',
    errorResponses: [swagger.errors.invalid('iso_code'), swagger.errors.notFound('elanguage')],
    nickname: 'postELanguages'
  },
  action: function (req, res, next) {
    res.send({});
  }
};
exports.putELanguages = {
  spec: {
    path: '/elanguages/{iso_code}',
    description: 'Operations about elanguages',
    notes: 'Updates elanguages details if authenticated',
    summary: 'Updates elanguage detail(s)',
    method: 'PUT',
    parameters: [param.path('iso_code', 'requested iso_code of the elanguage', 'string')],
    responseClass: 'User',
    errorResponses: [swagger.errors.invalid('iso_code'), swagger.errors.notFound('elanguage')],
    nickname: 'putELanguages'
  },
  action: function (req, res, next) {
    res.send({});
  }
};
exports.deleteELanguages = {
  spec: {
    path: '/elanguages/{iso_code}',
    description: 'Operations about elanguages',
    notes: 'Deletes elanguage if authenticated',
    summary: 'Deletes elanguage(s)',
    method: 'DELETE',
    parameters: [param.path('iso_code', 'requested iso_code of the elanguage', 'string')],
    responseClass: 'User',
    errorResponses: [swagger.errors.invalid('iso_code'), swagger.errors.notFound('elanguage')],
    nickname: 'deleteELanguages'
  },
  action: function (req, res, next) {
    res.send({});
  }
};
exports.searchELanguages = {
  spec: {
    path: '/elanguages/{iso_code}',
    description: 'Operations about elanguages',
    notes: 'Search elanguage if authenticated',
    summary: 'Deletes elanguage(s)',
    method: 'SEARCH',
    parameters: [param.path('iso_code', 'requested iso_code of the elanguage', 'string')],
    responseClass: 'User',
    errorResponses: [swagger.errors.invalid('iso_code'), swagger.errors.notFound('elanguage')],
    nickname: 'searchELanguages'
  },
  action: function (req, res, next) {
    res.send({});
  }
};
