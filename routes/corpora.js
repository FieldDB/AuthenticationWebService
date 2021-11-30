const swagger = require('@cesine/swagger-node-express');
const param = require('@cesine/swagger-node-express/Common/node/paramTypes');
const corpusData = require('../lib/corpus');

exports.getCorpora = {
  spec: {
    path: '/corpora/{dbname}',
    description: 'Operations about corpora',
    notes: 'Requests corpora details if authenticated',
    summary: 'Retrieves corpus(s)',
    method: 'GET',
    parameters: [param.path('dbname', 'requested dbname of the corpus', 'string')],
    responseClass: 'User',
    errorResponses: [swagger.errors.invalid('dbname'), swagger.errors.notFound('corpus')],
    nickname: 'getCorpora',
  },
  action: function action(req, res) {
    // If the user has read permissions, get all details
    // If the user doesnt have permissions, get the corpus mask
    res.send({});
  },
};
exports.postCorpora = {
  spec: {
    path: '/corpora/{dbname}',
    description: 'Operations about corpora',
    notes: 'Creates a corpus for a given dbname',
    summary: 'Creates a corpus(s)',
    method: 'POST',
    parameters: [param.path('dbname', 'requested dbname of the corpus', 'string')],
    responseClass: 'User',
    errorResponses: [swagger.errors.invalid('dbname'), swagger.errors.notFound('corpus')],
    nickname: 'postCorpora',
  },
  action: function action(req, res) {
    // If the dbname is in the user's namespace
    // Create the corpus
    const { body } = req;
    if (!body || !body.id) {
      throw swagger.errors.invalid('corpus');
    } else {
      corpusData.addCorpus(body);
      res.send(200);
    }
  },
};
exports.putCorpora = {
  spec: {
    path: '/corpora/{dbname}',
    description: 'Operations about corpora',
    notes: 'Updates corpora details if authenticated',
    summary: 'Updates a corpus detail(s)',
    method: 'PUT',
    parameters: [param.path('dbname', 'requested dbname of the corpus', 'string')],
    responseClass: 'User',
    errorResponses: [swagger.errors.invalid('dbname'), swagger.errors.notFound('corpus')],
    nickname: 'putCorpora',
  },
  action: function action(req, res) {
    // If the user has write permissions
    // Update the corpus
    const { body } = req;
    if (!body || !body.id) {
      throw swagger.errors.invalid('corpus');
    } else {
      corpusData.addCorpus(body);
      res.send(200);
    }
  },
};
exports.deleteCorpora = {
  spec: {
    path: '/corpora/{dbname}',
    description: 'Operations about corpora',
    notes: 'Deletes corpus if authenticated',
    summary: 'Deletes corpus(s)',
    method: 'DELETE',
    parameters: [param.path('dbname', 'requested dbname of the corpus', 'string')],
    responseClass: 'User',
    errorResponses: [swagger.errors.invalid('dbname'), swagger.errors.notFound('corpus')],
    nickname: 'deleteCorpora',
  },
  action: function action(req, res) {
    // If the user has admin permissions
    // Flag the corpus as deleted
    // Remove the corpus from the user's list of corpora and add it to the deleted list
    const id = parseInt(req.params.id, 10);
    corpusData.deleteCorpus(id);
    res.status(204);
  },
};
exports.searchCorpora = {
  spec: {
    path: '/corpora/{dbname}',
    description: 'Operations about corpora',
    notes: 'Search corpus if authenticated',
    summary: 'Searches corpus(s)',
    method: 'SEARCH',
    parameters: [param.path('dbname', 'requested dbname of the corpus', 'string')],
    responseClass: 'User',
    errorResponses: [swagger.errors.invalid('dbname'), swagger.errors.notFound('corpus')],
    nickname: 'searchCorpora',
  },
  action: function action(req, res) {
    // If the user has search permissions
    // Return the search results
    res.send({});
  },
};
