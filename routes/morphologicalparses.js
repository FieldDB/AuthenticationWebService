/* Load modules provided by $ npm install, see package.json for details */
const swagger = require('@cesine/swagger-node-express');
const param = require('../node_modules/@cesine/swagger-node-express/Common/node/paramTypes');

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
    nickname: 'getMorphologicalParses',
  },
  action: function action(req, res) {
    res.send({});
  },
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
    nickname: 'postMorphologicalParses',
  },
  action: function action(req, res) {
    res.send({});
  },
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
    nickname: 'putMorphologicalParses',
  },
  action: function action(req, res) {
    res.send({});
  },
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
    nickname: 'deleteMorphologicalParses',
  },
  action: function action(req, res) {
    res.send({});
  },
};
