/* Load modules provided by $ npm install, see package.json for details */
var swagger = require('swagger-node-express');
var param = require('../node_modules/swagger-node-express/Common/node/paramTypes.js');
var appVersion = require('../package.json').version;
exports.getMorphologicalParses = {
  spec: {
    path: '/elanguages/{iso_code}/parses/{utterance}',
    description: 'Operations about morphological parses',
    notes: 'Requests morphological parses if authenticated',
    summary: 'Retrieves morphological parses(s)',
    method: 'GET',
    parameters: [param.path('iso_code', 'requested iso_code of the corpus', 'string')],
    responseClass: 'Utterance',
    errorResponses: [swagger.errors.invalid('iso_code'), swagger.errors.notFound('corpus')],
    nickname: 'getMorphologicalParses'
  },
  action: function (req, res, next) {
    res.send({});
  }
};
exports.postMorphologicalParses = {
  spec: {
    path: '/elanguages/{iso_code}/parses/{utterance}',
    description: 'Operations about morphological parses',
    notes: 'Declares morphological parses for an utterance if authenticated',
    summary: 'Declares morphological parses',
    method: 'POST',
    parameters: [param.path('iso_code', 'requested iso_code of the corpus', 'string')],
    responseClass: 'Utterance',
    errorResponses: [swagger.errors.invalid('iso_code'), swagger.errors.notFound('corpus')],
    nickname: 'postMorphologicalParses'
  },
  action: function (req, res, next) {
    res.send({});
  }
};
exports.putMorphologicalParses = {
  spec: {
    path: '/elanguages/{iso_code}/parses/{utterance}',
    description: 'Operations about morphological parses',
    notes: 'Updates morphological parses for an utterance if authenticated',
    summary: 'Updates morphological parses',
    method: 'PUT',
    parameters: [param.path('iso_code', 'requested iso_code of the corpus', 'string')],
    responseClass: 'Utterance',
    errorResponses: [swagger.errors.invalid('iso_code'), swagger.errors.notFound('corpus')],
    nickname: 'putMorphologicalParses'
  },
  action: function (req, res, next) {
    res.send({});
  }
};
exports.deleteMorphologicalParses = {
  spec: {
    path: '/elanguages/{iso_code}/parses/{utterance}',
    description: 'Operations about morphological parses',
    notes: 'Deletes morphological parses if authenticated',
    summary: 'Deletes morphological parses',
    method: 'DELETE',
    parameters: [param.path('iso_code', 'requested iso_code of the corpus', 'string')],
    responseClass: 'Utterance',
    errorResponses: [swagger.errors.invalid('iso_code'), swagger.errors.notFound('corpus')],
    nickname: 'deleteMorphologicalParses'
  },
  action: function (req, res, next) {
    res.send({});
  }
};
