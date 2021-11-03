var NODE_ENV = process.env.NODE_ENV;
var couchKeys = require('config').couchKeys;
var debug = require('debug')('lib:corpus');
var util = require('util');
var url = require('url');
var Corpus = require('fielddb/api/corpus/Corpus').Corpus;
var CorpusMask = require('fielddb/api/corpus/CorpusMask').CorpusMask;
var DataList = require('fielddb/api/data_list/DataList').DataList;
var Team = require('fielddb/api/user/Team').Team;
var uuid = require('uuid');
/* variable for permissions */
var commenter = 'commenter';
var collaborator = 'reader';
var contributor = 'writer';
var admin = 'admin';

var requestId = 'lib-corpus';
/*
{ protocol: 'http:',
  slashes: true,
  auth: null,
  host: 'localhost:5984',
  port: '5984',
  hostname: 'localhost',
  hash: null,
  search: null,
  query: null,
  pathname: '/',
  path: '/',
  href: 'http://localhost:5984/' }
 */
// Add docs to new database
var createPlaceholderDocsForCorpus = function createPlaceholderDocsForCorpus(corpusObject) {
  var corpusDetails = new Corpus(Corpus.prototype.defaults);
  corpusDetails.merge('self', new Corpus(corpusObject), 'overwrite');
  corpusDetails.connection.corpusid = corpusDetails.id;
  corpusDetails.dateCreated = Date.now();
  var corpusMaskDetails = new CorpusMask({
    dbname: corpusObject.dbname,
    connection: corpusDetails.connection,
    corpusid: corpusDetails.id,
    dateCreated: Date.now()
  });
  corpusDetails.corpusMask = corpusMaskDetails;
  var datalistDetails = new DataList({
    title: 'Default Datalist - Empty',
    description: 'The app comes with a default datalist which is empty. Once you have data in your corpus, you can create a datalist using search. Imported data will also show up as a datalist. Datalists are lists of data which can be used to create handouts, export to LaTeX, or share with collaborators.',
    dbname: corpusObject.dbname,
    dateCreated: Date.now()
  });
  var sessionDetails = corpusDetails.newSession({
    goal: 'Practice collecting linguistic utterances or words',
    dateCreated: Date.now()
  });
  var team = new Team({
    username: corpusDetails.dbname.split('-')[0],
    researchInterest: 'No public information available',
    affiliation: 'No public information available',
    description: 'No public information available',
    dateCreated: Date.now()
  });
  corpusDetails.team = team;
  return [team, corpusMaskDetails, corpusDetails, datalistDetails, sessionDetails];
};
exports.createPlaceholderDocsForCorpus = createPlaceholderDocsForCorpus;
// Only create users on the same server.
var parsed = url.parse('http://localhost:5984');
var couchConnectUrl = parsed.protocol + '//' + couchKeys.username + ':' + couchKeys.password + '@' + parsed.host;
debug('Using corpus url: ', parsed);
var createNewCorpus = function createNewCorpus(corpusObject, done) {
  var username = corpusObject.username;
  delete corpusObject.username;
  if (corpusObject.dbname) {
    corpusObject.connection.dbname = corpusObject.dbname;
  } else {
    corpusObject.dbname = corpusObject.connection.dbname;
  }
  if (!corpusObject.id && !corpusObject._id) {
    corpusObject.id = uuid.v4();
  }
  debug(new Date() + ' Creating new database ' + corpusObject.dbname);
  var server = require('nano')({
    requestDefaults: {
      headers: {
        'x-request-id': requestId
      }
    },
    url: couchConnectUrl
  });
  server.db.create(corpusObject.dbname, function afterCreate(couchDBError, response) {
    if (couchDBError) {
      debug(couchDBError);
      // Clean the couchDBErroror of couchdb leaks
      delete couchDBError.request;
      delete couchDBError.headers;
      couchDBError.status = couchDBError.statusCode || 500;
      if (couchDBError.status === 412) {
        couchDBError.status = 302;
        return done(couchDBError, false, {
          message: 'Your corpus ' + corpusObject.dbname + ' already exists, no need to create it.'
        });
      }
      return done(couchDBError, false, {
        message: 'The server was unable to complete this request. Please report this.'
      });
    }
    debug('Created db ' + corpusObject.dbname, response);
    /*
     * Upon success of db creation, set up the collaborator, contributor
     * and admin roles for this corpus
     */
    addRoleToUserInfo(corpusObject.connection, username, [
      corpusObject.dbname + '_' + admin,
      corpusObject.dbname + '_' + contributor,
      corpusObject.dbname + '_' + collaborator,
      corpusObject.dbname + '_' + commenter
    ]);
    var securityParamsforNewDB = {
      admins: {
        names: [],
        roles: ['fielddbadmin', corpusObject.dbname + '_' + admin]
      },
      members: {
        names: [],
        roles: [
          corpusObject.dbname + '_' + collaborator,
          corpusObject.dbname + '_' + contributor,
          corpusObject.dbname + '_' + commenter
        ]
      }
    };
    var newDatabase = require('nano')({
      requestDefaults: {
        headers: {
          'x-request-id': requestId
        }
      },
      url: couchConnectUrl + '/' + corpusObject.dbname
    });
    newDatabase.insert(securityParamsforNewDB, '_security', function afterInsert(couchDBError, couchResponse) {
      if (!couchDBError) {
        debug(new Date() + ' Added user security roles to new db.', couchResponse);
      } else {
        debug(new Date() + ' Did not add user security roles.');
        debug(couchDBError);
      }
    });
    // Replicate template databases to new database
    server.db.replicate('new_corpus', corpusObject.dbname, function afterReplicate(couchDBError, couchResponse) {
      if (!couchDBError) {
        debug(new Date() + ' Corpus successfully replicated.', couchResponse);
      } else {
        debug(new Date() + ' Corpus replication failed.');
      }
    });
    server.db.replicate('new_lexicon', corpusObject.dbname, function afterReplicate(err, couchResponse) {
      if (!err) {
        debug(new Date() + ' Lexicon successfully replicated.', couchResponse);
      } else {
        debug(new Date() + ' Lexicon replication failed.');
      }
    });
    // server.db.replicate('new_export', corpusObject.dbname, function(err, couchResponse) {
    //   if (!err) {
    //     debug(new Date() + " Export successfully replicated.", couchResponse);
    //   } else {
    //     debug(new Date() + " Export replication failed.");
    //   }
    // });
    var docsNeededForAProperFieldDBCorpus = createPlaceholderDocsForCorpus(corpusObject);
    newDatabase.bulk({
      docs: docsNeededForAProperFieldDBCorpus
    }, function afterBulk(couchDBError, couchResponse) {
      if (couchDBError) {
        debug(new Date() + " There was an couchDBErroror in creating the docs for the user\'s new corpus: " + util.inspect(couchDBError) + '\n');
        // undoCorpusCreation(user, corpusDetails.corpusObject.connection, docsNeededForAProperFieldDBCorpus);
      } else {
        debug(new Date() + ' Created starter docs for ' + corpusObject.dbname + '\n', couchResponse);
      }
    });
    // Replicate activity feed template to new activity feed database
    server.db.replicate('new_corpus_activity_feed', corpusObject.dbname + '-activity_feed', {
      create_target: true
    }, function afterReplicate(couchDBError, couchActivityFeedResponse) {
      if (!couchDBError) {
        debug(new Date() + ' Corpus activity feed successfully replicated.', couchActivityFeedResponse);
        // Set up security on new corpus activity feed
        var activityDb = require('nano')({
          requestDefaults: {
            headers: {
              'x-request-id': requestId
            }
          },
          url: couchConnectUrl + '/' + corpusObject.dbname + '-activity_feed'
        });
        activityDb.insert(securityParamsforNewDB, '_security', function (couchDBError, couchResponse) {
          if (!couchDBError) {
            debug(new Date() + ' Added user security roles to new activity feed.', couchResponse);
          } else {
            debug(new Date() + ' Did not add user security roles to new activity feed.');
            debug(couchDBError);
          }
        });
      } else {
        debug(new Date() + ' Corpus activity feed replication failed.', couchActivityFeedResponse);
      }
    });
    // TODO Add corpus created activity to activity feeds
    return done(null, docsNeededForAProperFieldDBCorpus[2], {});
  });
};
module.exports.createNewCorpus = createNewCorpus;
// Update user roles on existing corpus
/*
TODO: Does this function require that the requesting user
actually have the permission (be admin on that corpus) to modify roles? (like in addRoleToUser in userauthentication.js)
*/
var updateRoles = function updateRoles(req, done) {
  return done({
    status: 404,
    error: 'Method not supported. Please report this error.'
  }, null, {
    message: 'Method not supported. Please report this error.'
  });
};
module.exports.updateRoles = updateRoles;
var addRoleToUserInfo = function addRoleToUserInfo(connection, username, roles, successdone, errordone) {
  debug(new Date() + ' In addRoleToUser ' + util.inspect(roles) + ' to ' + username + ' on ' + connection.dbname);
  var connect = couchConnectUrl + '/_users';
  var db = require('nano')(connect);
  var userid = 'org.couchdb.user:' + username;
  var _ = require('lodash');
  db.get(userid, function afterGetUser(couchDBError, body) {
    if (!couchDBError) {
      var userold = body;
      debug(new Date() + " These are the users's roles before adding a role." + util.inspect(userold.roles));
      for (var r in roles) {
        userold.roles.push(roles[r]);
      }
      var uniqueroles = _.uniq(userold.roles);
      userold.roles = uniqueroles;
      db.insert(userold, function afterInsert(couchDBError, couchresponsetochangingusersroles) {
        if (!couchDBError) {
          debug(new Date() + ' User roles updated.');
        } else {
          debug(new Date() + ' User roles ' + userid + 'failed to update.', couchDBError, couchresponsetochangingusersroles);
        }
      });
    } else {
      debug(new Date() + ' failed to change ' + username + " user's roles due to couchdb error ", roles, couchDBError);
    }
  });
};
/*
 * Ensures the requesting user to make the permissions
 * modificaitons, can be used for any corpus operations which require admin privildages.
 */
var isRequestingUserAnAdminOnCorpus = function isRequestingUserAnAdminOnCorpus(req, requestingUser, dbConn, done) {
  if (!dbConn) {
    return done({
      status: 412,
      error: "Client didn't define the database connection."
    }, null, {
      message: 'This app has made an invalid request. Please notify its developer. missing: serverCode or connection'
    });
  }
  /*
   * Check to see if the user is an admin on the corpus
   */
  var nanoforpermissions = require('nano')({
    requestDefaults: {
      headers: {
        'x-request-id': requestId
      }
    },
    url: couchConnectUrl
  });
  var usersdb = nanoforpermissions.db.use('_users');
  usersdb.get('org.couchdb.user:' + requestingUser, function (couchDBError, result) {
    if (couchDBError) {
      // Clean the couchDBErroror of couchdb leaks
      delete couchDBError.request;
      delete couchDBError.headers;
      couchDBError.status = couchDBError.statusCode || 401;
      couchDBError.error = couchDBError.error || 'User ' + requestingUser + " couldn't be found on this server";
      return done(couchDBError, null, {
        message: 'There was a problem deciding if you have permission to do this.'
      });
    }
    var userIsAdminOnTeam = false;
    if (result) {
      var userroles = result.roles;
      for (var i = 0; i < userroles.length; i++) {
        (function isUserAdmin(index) {
          if (userroles.indexOf(dbConn.dbname + '_' + admin) > -1) {
            userIsAdminOnTeam = true;
          }
          if (index === (userroles.length - 1)) {
            if (userIsAdminOnTeam === false) {
              return done({
                status: 401,
                error: 'User ' + requestingUser + ' found but didnt have permission on ' + dbConn.dbname
              }, null, {
                info: 'User does not have permission to perform this action.',
                message: "You don't have permission to perform this action."
              });
            }
            return done(null, requestingUser, null);
          }
        }(i));
      }
    }
  });
};
module.exports.isRequestingUserAnAdminOnCorpus = isRequestingUserAnAdminOnCorpus;
