/* Load modules provided by $ npm install, see package.json for details */
var swagger = require('swagger-node-express');
var param = require('../node_modules/swagger-node-express/Common/node/paramTypes.js');
var appVersion = require('../package.json').version;
exports.getUtterances = {
  spec: {
    path: '/corpora/{dbname}/utterances/{filename}',
    description: 'Operations about utterances',
    notes: 'Requests utterances details if authenticated',
    summary: 'Retrieves utterances(s)',
    method: 'GET',
    parameters: [param.path('dbname', 'requested dbname of the corpus', 'string')],
    responseClass: 'Utterance',
    errorResponses: [swagger.errors.invalid('dbname'), swagger.errors.notFound('corpus')],
    nickname: 'getUtterances'
  },
  action: function action(req, res, next) {
    // If the user has read permissions
    // Gets the data
    res.send({});
  }
};
exports.postUtterances = {
  spec: {
    path: '/corpora/{dbname}/utterances/{filename}',
    description: 'Operations about utterances',
    notes: 'Detects utterances for a set of audio/video files',
    summary: 'Detects utterances',
    method: 'POST',
    parameters: [param.path('dbname', 'requested dbname of the corpus', 'string')],
    responseClass: 'Utterance',
    errorResponses: [swagger.errors.invalid('dbname'), swagger.errors.notFound('corpus')],
    nickname: 'postUtterances'
  },
  action: function action(req, res, next) {
    // If the user has write permissions
    // Uploads the data
    res.send({});
  }
};
exports.putUtterances = {
  spec: {
    path: '/corpora/{dbname}/utterances/{filename}',
    description: 'Operations about utterances',
    notes: 'Updates utterances if authenticated',
    summary: 'Updates utterances',
    method: 'PUT',
    parameters: [param.path('dbname', 'requested dbname of the corpus', 'string')],
    responseClass: 'Utterance',
    errorResponses: [swagger.errors.invalid('dbname'), swagger.errors.notFound('corpus')],
    nickname: 'putUtterances'
  },
  action: function action(req, res, next) {
    // If the user has write permissions
    // Updates the data
    res.send({});
  }
};
exports.deleteUtterances = {
  spec: {
    path: '/corpora/{dbname}/utterances/{filename}',
    description: 'Operations about utterances',
    notes: 'Deletes utterances if authenticated',
    summary: 'Deletes utterances',
    method: 'DELETE',
    parameters: [param.path('dbname', 'requested dbname of the corpus', 'string')],
    responseClass: 'Utterance',
    errorResponses: [swagger.errors.invalid('dbname'), swagger.errors.notFound('corpus')],
    nickname: 'deleteUtterances'
  },
  action: function action(req, res, next) {
    // If the user has write permissions
    // Flags the data as deleted
    res.send({});
  }
};
