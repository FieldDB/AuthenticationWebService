var config = require('config');
var debug = require('debug')('lib:about');

var exec = function() {};
var emit = function() {};

module.exports.FieldDB = function FieldDB() {
  this.getApiDocs = function getApiDocs() {
    return {
      apiVersion: '1.72.0',
      swaggerVersion: '1.2',
      basePath: 'https://localhost:3181/v2',
      resourcePath: '/users',
      produces: ['application/json', 'application/xml', 'text/plain', 'text/html', 'application/x-latex', 'application/tar', 'application/zip', 'application/pdf', 'text/srt', 'text/websrt', 'text/x-textgrid', 'text/csv'],
      apis: [],
      authorizations: {
        oauth2: {
          type: 'oauth2',
          scopes: ['PUBLIC'],
          grantTypes: {
            implicit: {
              loginEndpoint: {
                url: 'http://localhost:8002/oauth/dialog'
              },
              tokenName: 'access_code'
            },
            authorization_code: {
              tokenRequestEndpoint: {
                url: 'http://localhost:8002/oauth/requestToken',
                clientIdName: 'client_id',
                clientSecretName: 'client_secret'
              },
              tokenEndpoint: {
                url: 'http://localhost:8002/oauth/token',
                tokenName: 'access_code'
              }
            }
          }
        },
        apiKey: {
          type: 'apiKey',
          keyName: 'api_key',
          passAs: 'header'
        },
        basicAuth: {
          type: 'basicAuth'
        }
      },
      models: {
        User: {
          username: 'User',
          required: ['username', 'password'],
          properties: {
            username: {
              type: 'string',
              required: true,
              description: 'lowercase username, must be file safe limited to a-z0-9'
            },
            name: {
              type: 'string'
            }
          }
        },
        Corpus: {
          corpusidentifier: 'Corpus',
          properties: {
            dbname: {
              type: 'string',
              description: 'username-filesafeversionofcorpustitleinlowercase'
            }
          }
        }
      },
      info: {
        title: 'FieldDB AuthService API',
        description: "This is a public service permitting any client side app (must be known to the system) to contact FieldDB servers on the user's behalf to register, login, create new databases and share databases.  You can find out more about FieldDB \n    on <a target=\"_blank\" href=\"https://github.com/FieldDB/FieldDB/issues/milestones?state=closed\"> our GitHub organization</a>.  For this sample,\n    you can use the api key \"special-key\" to test the authorization filters",
        termsOfServiceUrl: 'https://github.com/FieldDB/FieldDBWebServer/blob/master/public/privacy.html',
        contact: 'issuetracker',
        license: 'Apache 2.0',
        licenseUrl: 'http://www.apache.org/licenses/LICENSE-2.0.html'
      }
    };
  };
  this.getVersion = function getVersion(req, res) {
    res.send('getVersion');
  };
  /*
   ____  _           _     _          _
  |  _ \(_)___  __ _| |__ | | ___  __| |
  | | | | / __|/ _` | '_ \| |/ _ \/ _` |
  | |_| | \__ \ (_| | |_) | |  __/ (_| |
  |____/|_|___/\__,_|_.__/|_|\___|\__,_|
  *                                      */
  this.installFieldDB = function installFieldDB(req, res) {
    if (process.env.INSTALABLE !== 'true') {
      res.send({
        error: 'Method disabled'
      });
      return;
    }
    var installStatus = '';
    var connectionUrl = config.usersDbConnection.protocol + config.couchKeys.username + ':' + config.couchKeys.password + '@' + config.usersDbConnection.domain + ':' + config.usersDbConnection.port;
    var couchServer = require('nano')(connectionUrl);
    var respond = function respond(info, result, error) {
      if (error) {
        res.send(info);
      } else {
        res.send(result);
      }
    };
    var pushTemplateDatabases = function pushTemplateDatabases(err, body) {
      if (err) {
        debug(err);
        return respond({
          info: installStatus
        }, false, err);
      }
      var command = 'sh ../FieldDB/scripts/build_template_databases_using_fielddb.sh ' + connectionUrl;
      debug(command);
      var child = exec(command, function afterExec(err, stdout, stderr) {
        if (err) {
          return respond({
            info: installStatus
          }, false, err);
        }
        debug('stdout', stdout);
        debug('stderr', stderr);
        installStatus += ' ::: build_template_databases_using_fielddb';
        debug('all done ' + installStatus);
        return respond(null, {
          ok: 'sucess',
          info: installStatus,
          stdout: stdout
        }, null);
      });
    };
    var betatesters = function betatesters(doc) {
      if (!doc.roles || doc.roles.length === 0) {
        return;
      }
      var username = doc._id.replace(/org.couchdb.user:/, '');
      if (username.indexOf('test') > -1 || username.indexOf('anonymous') > -1 || username.indexOf('acra') > -1) {
        emit(username, doc.roles);
      } else {
        // this is not a beta tester
      }
    };
    var normalusers = function normalusers(doc) {
      if (!doc.roles || doc.roles.length === 0) {
        return;
      }
      var username = doc._id.replace(/org.couchdb.user:/, '');
      if (username.indexOf('test') > -1 || username.indexOf('anonymous') > -1 || username.indexOf('acra') > -1) {
        // this is a beta tester
      } else {
        emit(username, doc.roles);
      }
    };
    var createUsersViewInFielddbUsersDB = function createUsersViewInFielddbUsersDB(err, body) {
      if (err) {
        debug(err);
        return respond({
          info: installStatus
        }, false, err);
      }
      installStatus += ' ::: _users/_design/users';
      var usersView = {
        _id: '_design/users',
        language: 'javascript',
        views: {
          usermasks: {
            map: 'function(doc) {\n  emit(doc.username, {username: doc.username, gravatar: doc.gravatar, gravatar_email: doc.email});\n}'
          }
        }
      };
      var userWhoHaveTroubleLoggingIn = {
        _id: '_design/users',
        language: 'javascript',
        views: {
          usermasks: {
            map: 'function(doc) {\n if (doc.email && doc.serverlogs && doc.serverlogs.incorrectPasswordAttempts && doc.serverlogs.incorrectPasswordAttempts.length > 0) {\n   emit(doc.email, doc);\n }\n}'
          }
        }
      };
      var usersByEmail = {
        _id: '_design/users',
        language: 'javascript',
        views: {
          usermasks: {
            map: 'function(doc) {\n if (doc.email) {\n    emit(doc.email, doc);\n }\n}'
          }
        }
      };
      couchServer.db.use(config.usersDbConnection.dbname).insert(usersView, '_design/users', pushTemplateDatabases);
      couchServer.db.use(config.usersDbConnection.dbname).insert(userWhoHaveTroubleLoggingIn, '_design/users', pushTemplateDatabases);
      couchServer.db.use(config.usersDbConnection.dbname).insert(usersByEmail, '_design/users', pushTemplateDatabases);
    };
    var createUsersView = function createUsersView(err, body) {
      if (err) {
        debug(err);
        return respond({
          info: installStatus
        }, false, err);
      }
      installStatus += ' ::: new_user_activity_feed';
      var usersView = {
        _id: '_design/users',
        language: 'javascript',
        views: {
          userroles: {
            map: 'function(doc) {\n  var username = doc._id.replace(/org.couchdb.user:/,"");\n  if(doc.password_sha || doc.password_scheme)\n    emit(username,doc.roles);\n}'
          }
        }
      };
      couchServer.db.use('_users').insert(usersView, '_design/users', createUsersViewInFielddbUsersDB);
    };
    var createUserActivityFeed = function createUserActivityFeed(err, body) {
      if (err) {
        debug(err);
        return respond({
          info: installStatus
        }, false, err);
      }
      installStatus += ' ::: new_corpus_activity_feed';
      couchServer.db.create('new_user_activity_feed', createUsersView);
    };
    var createCorpusActivityFeed = function createCorpusActivityFeed(err, body) {
      if (err) {
        debug(err);
        return respond({
          info: installStatus
        }, false, err);
      }
      installStatus += ' ::: new_corpus';
      couchServer.db.create('new_corpus_activity_feed', createUserActivityFeed);
    };
    couchServer.db.create(config.usersDbConnection.dbname, createCorpusActivityFeed);
    // res.send("installFieldDB");
  };
  return this;
};
