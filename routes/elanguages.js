/* Load modules provided by $ npm install, see package.json for details */
const swagger = require('@cesine/swagger-node-express');
const param = require('../node_modules/@cesine/swagger-node-express/Common/node/paramTypes.js');

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
    nickname: 'getELanguages',
  },
  action: function action(req, res) {
    res.send({});
  },
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
    nickname: 'postELanguages',
  },
  action: function action(req, res) {
    res.send({});
  },
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
    nickname: 'putELanguages',
  },
  action: function action(req, res) {
    res.send({});
  },
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
    nickname: 'deleteELanguages',
  },
  action: function action(req, res) {
    res.send({});
  },
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
    nickname: 'searchELanguages',
  },
  action: function action(req, res) {
    res.send({});
  },
};
