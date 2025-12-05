/* Load modules provided by $ npm install, see package.json for details */
const swagger = require('@cesine/swagger-node-express');
const config = require('config');
const debug = require('debug')('route:routes');

/* Load modules provided by this codebase */
// const userRoutes = require('../lib/users');
const corporaRoutes = require('./corpora');
const { errorHandler } = require('../middleware/error-handler');
const utterancesRoutes = require('./utterances');
const filesRoutes = require('./files');
const dataRoutes = require('./data');
const eLanguagesRoutes = require('./elanguages');
const morphologicalParsesRoutes = require('./morphologicalparses');

const setup = function setup(api, apiVersion) {
  debug('apiVersion', apiVersion);
  swagger.configureSwaggerPaths('', '/api', '');
  swagger.setErrorHandler((req, res, error) => errorHandler(error, req, res));
  swagger.setAppHandler(api);

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
      nickname: 'getHealthcheck',
    },
    action: function getHealthcheck(req, res) {
      res.json({
        ok: true,
      });
    },
  });

  // swagger.addGet(userRoutes.getUser);
  // swagger.addGet(userRoutes.getCurrentUser);
  // swagger.addGet(userRoutes.getList);
  // swagger.addPost(userRoutes.postUsers);
  // swagger.addPut(userRoutes.putUser);
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
