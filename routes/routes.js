/* Load modules provided by $ npm install, see package.json for details */
var swagger = require('@cesine/swagger-node-express');
var config = require('config');
var debug = require('debug')('route:routes');

/* Load modules provided by this codebase */
var userRoutes = require('./user');
var authenticationRoutes = require('./authentication');
var oauthRoutes = require('./oauth2');
var corporaRoutes = require('./corpora');
var errorHandler = require('../middleware/error-handler').errorHandler;
var utterancesRoutes = require('./utterances');
var filesRoutes = require('./files');
var dataRoutes = require('./data');
var eLanguagesRoutes = require('./elanguages');
var morphologicalParsesRoutes = require('./morphologicalparses');

var setup = function setup(api, apiVersion) {
  debug('apiVersion', apiVersion);
  swagger.configureSwaggerPaths('', '/api', '');
  swagger.setErrorHandler(function (req, res, error) {
    return errorHandler(error, req, res);
  });
  swagger.setAppHandler(api);
  /* Prepare models for the API Schema info using the info the routes provide */
  var APIModelShema = {};
  APIModelShema.models = {
    User: userRoutes.UserSchema,
    Connection: userRoutes.ConnectionSchema
  };
  swagger.addModels(APIModelShema);
  /* Declare available APIs */
  swagger.addGet({
    spec: {
      path: '/v1/healthcheck',
      description: 'Operations about healthcheck',
      notes: 'Requests healthcheck',
      summary: 'Retrieves healthcheck',
      method: 'GET',
      parameters: [],
      responseClass: 'User',
      errorResponses: [],
      nickname: 'getHealthcheck'
    },
    action: function getHealthcheck(req, res) {
      res.json({
        ok: true
      });
    }
  });

  swagger.addPost(authenticationRoutes.postLogin);
  swagger.addGet(authenticationRoutes.getLogout);
  swagger.addPost(authenticationRoutes.postRegister);
  swagger.addGet(oauthRoutes.getAuthorize);
  swagger.addPost(oauthRoutes.postToken);
  swagger.addGet(userRoutes.getUser);
  swagger.addGet(userRoutes.getCurrentUser);
  swagger.addGet(userRoutes.getList);
  swagger.addPost(userRoutes.postUsers);
  swagger.addPut(userRoutes.putUser);
  swagger.addDelete(userRoutes.deleteUsers);
  swagger.addGet(corporaRoutes.getCorpora);
  swagger.addPost(corporaRoutes.postCorpora);
  swagger.addPut(corporaRoutes.putCorpora);
  swagger.addDelete(corporaRoutes.deleteCorpora);
  swagger.addSearch(corporaRoutes.searchCorpora);
  // api.delete('/corpus/:corpusid', corporaRoutes.deleteCorpora.action);
  swagger.addGet(dataRoutes.getData);
  swagger.addPost(dataRoutes.postData);
  swagger.addPut(dataRoutes.putData);
  swagger.addDelete(dataRoutes.deleteData);
  swagger.addGet(utterancesRoutes.getUtterances);
  swagger.addPost(utterancesRoutes.postUtterances);
  swagger.addPut(utterancesRoutes.putUtterances);
  swagger.addDelete(utterancesRoutes.deleteUtterances);
  swagger.addGet(filesRoutes.getFiles);
  swagger.addPost(filesRoutes.postFiles);
  swagger.addPut(filesRoutes.putFiles);
  swagger.addDelete(filesRoutes.deleteFiles);
  swagger.addGet(eLanguagesRoutes.getELanguages);
  swagger.addPost(eLanguagesRoutes.postELanguages);
  swagger.addPut(eLanguagesRoutes.putELanguages);
  swagger.addDelete(eLanguagesRoutes.deleteELanguages);
  swagger.addGet(morphologicalParsesRoutes.getMorphologicalParses);
  swagger.addPost(morphologicalParsesRoutes.postMorphologicalParses);
  swagger.addPut(morphologicalParsesRoutes.putMorphologicalParses);
  swagger.addDelete(morphologicalParsesRoutes.deleteMorphologicalParses);
  swagger.configure(config.externalOrigin);// + '/' + apiVersion, apiVersion.replace('v', ''));
};
exports.setup = setup;
