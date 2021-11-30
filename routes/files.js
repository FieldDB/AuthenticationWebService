/* Load modules provided by $ npm install, see package.json for details */
const swagger = require('@cesine/swagger-node-express');
const param = require('../node_modules/@cesine/swagger-node-express/Common/node/paramTypes');

exports.getFiles = {
  spec: {
    path: '/corpora/{dbname}/files/{filename}',
    description: 'Operations about files',
    notes: 'Requests files details if authenticated',
    summary: 'Retrieves files(s)',
    method: 'GET',
    parameters: [param.path('dbname', 'requested dbname of the corpus', 'string')],
    responseClass: 'Utterance',
    errorResponses: [swagger.errors.invalid('dbname'), swagger.errors.notFound('corpus')],
    nickname: 'getFiles',
  },
  action: function action(req, res) {
    res.send({});
  },
};
exports.postFiles = {
  spec: {
    path: '/corpora/{dbname}/files/{filename}',
    description: 'Operations about files',
    notes: 'Uploads files for a set of audio/video files',
    summary: 'Uploads files',
    method: 'POST',
    parameters: [param.path('dbname', 'requested dbname of the corpus', 'string')],
    responseClass: 'Utterance',
    errorResponses: [swagger.errors.invalid('dbname'), swagger.errors.notFound('corpus')],
    nickname: 'postFiles',
  },
  action: function action(req, res) {
    res.send({});
  },
};
exports.putFiles = {
  spec: {
    path: '/corpora/{dbname}/files/{filename}',
    description: 'Operations about files',
    notes: 'Updates files if authenticated',
    summary: 'Updates files',
    method: 'PUT',
    parameters: [param.path('dbname', 'requested dbname of the corpus', 'string')],
    responseClass: 'Utterance',
    errorResponses: [swagger.errors.invalid('dbname'), swagger.errors.notFound('corpus')],
    nickname: 'putFiles',
  },
  action: function action(req, res) {
    res.send({});
  },
};
exports.deleteFiles = {
  spec: {
    path: '/corpora/{dbname}/files/{filename}',
    description: 'Operations about files',
    notes: 'Deletes files if authenticated',
    summary: 'Deletes files',
    method: 'DELETE',
    parameters: [param.path('dbname', 'requested dbname of the corpus', 'string')],
    responseClass: 'Utterance',
    errorResponses: [swagger.errors.invalid('dbname'), swagger.errors.notFound('corpus')],
    nickname: 'deleteFiles',
  },
  action: function action(req, res) {
    res.send({});
  },
};
