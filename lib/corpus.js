const { couchKeys } = require('config');
const debug = require('debug')('lib:corpus');
const util = require('util');
const url = require('url');
const { Corpus } = require('fielddb/api/corpus/Corpus');
const { CorpusMask } = require('fielddb/api/corpus/CorpusMask');
const { DataList } = require('fielddb/api/data_list/DataList');
const { Team } = require('fielddb/api/user/Team');
const uuid = require('uuid');
const nano = require('nano');
/* variable for permissions */
const commenter = 'commenter';
const collaborator = 'reader';
const contributor = 'writer';
const admin = 'admin';

const requestId = 'lib-corpus';
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
const createPlaceholderDocsForCorpus = function createPlaceholderDocsForCorpus(corpusObject) {
  const corpusDetails = new Corpus(Corpus.prototype.defaults);
  corpusDetails.merge('self', new Corpus(corpusObject), 'overwrite');
  corpusDetails.connection.corpusid = corpusDetails.id;
  corpusDetails.dateCreated = Date.now();
  const corpusMaskDetails = new CorpusMask({
    dbname: corpusObject.dbname,
    connection: corpusDetails.connection,
    corpusid: corpusDetails.id,
    dateCreated: Date.now(),
  });
  corpusDetails.corpusMask = corpusMaskDetails;
  const datalistDetails = new DataList({
    title: 'Default Datalist - Empty',
    description: 'The app comes with a default datalist which is empty. Once you have data in your corpus, you can create a datalist using search. Imported data will also show up as a datalist. Datalists are lists of data which can be used to create handouts, export to LaTeX, or share with collaborators.',
    dbname: corpusObject.dbname,
    dateCreated: Date.now(),
  });
  const sessionDetails = corpusDetails.newSession({
    goal: 'Practice collecting linguistic utterances or words',
    dateCreated: Date.now(),
  });
  const team = new Team({
    username: corpusDetails.dbname.split('-')[0],
    researchInterest: 'No public information available',
    affiliation: 'No public information available',
    description: 'No public information available',
    dateCreated: Date.now(),
  });
  corpusDetails.team = team;
  return [team, corpusMaskDetails, corpusDetails, datalistDetails, sessionDetails];
};
exports.createPlaceholderDocsForCorpus = createPlaceholderDocsForCorpus;
// Only create users on the same server.
const parsed = url.parse('http://localhost:5984');
const couchConnectUrl = `${parsed.protocol}//${couchKeys.username}:${couchKeys.password}@${parsed.host}`;
debug('Using corpus url: ', couchConnectUrl);
const createNewCorpus = function createNewCorpus(corpusObject, done) {
  const { username } = corpusObject;
  delete corpusObject.username;
  if (corpusObject.dbname) {
    corpusObject.connection.dbname = corpusObject.dbname;
  } else {
    corpusObject.dbname = corpusObject.connection.dbname;
  }
  if (!corpusObject.id && !corpusObject._id) {
    corpusObject.id = uuid.v4();
  }
  debug(`${new Date()} Creating new database ${corpusObject.dbname}`);
  const server = nano({
    requestDefaults: {
      headers: {
        'x-request-id': requestId,
      },
    },
    url: couchConnectUrl,
  });
  server.db.create(corpusObject.dbname, (couchDBError, response) => {
    if (couchDBError) {
      debug(couchDBError);
      // Clean the couchDBErroror of couchdb leaks
      delete couchDBError.request;
      delete couchDBError.headers;
      couchDBError.status = couchDBError.statusCode || 500;
      if (couchDBError.status === 412) {
        couchDBError.status = 302;
        return done(couchDBError, false, {
          message: `Your corpus ${corpusObject.dbname} already exists, no need to create it.`,
        });
      }
      return done(couchDBError, false, {
        message: 'The server was unable to complete this request. Please report this.',
      });
    }
    debug(`Created db ${corpusObject.dbname}`, response);
    /*
     * Upon success of db creation, set up the collaborator, contributor
     * and admin roles for this corpus
     */
    addRoleToUserInfo(corpusObject.connection, username, [
      `${corpusObject.dbname}_${admin}`,
      `${corpusObject.dbname}_${contributor}`,
      `${corpusObject.dbname}_${collaborator}`,
      `${corpusObject.dbname}_${commenter}`,
    ]);
    const securityParamsforNewDB = {
      admins: {
        names: [],
        roles: ['fielddbadmin', `${corpusObject.dbname}_${admin}`],
      },
      members: {
        names: [],
        roles: [
          `${corpusObject.dbname}_${collaborator}`,
          `${corpusObject.dbname}_${contributor}`,
          `${corpusObject.dbname}_${commenter}`,
        ],
      },
    };
    const newDatabase = nano({
      requestDefaults: {
        headers: {
          'x-request-id': requestId,
        },
      },
      url: `${couchConnectUrl}/${corpusObject.dbname}`,
    });
    newDatabase.insert(securityParamsforNewDB, '_security', (couchDBError, couchResponse) => {
      if (!couchDBError) {
        debug(`${new Date()} Added user security roles to new db.`, couchResponse);
      } else {
        debug(`${new Date()} Did not add user security roles.`);
        debug(couchDBError);
      }
    });
    // Replicate template databases to new database
    server.db.replicate('new_corpus', corpusObject.dbname, (couchDBError, couchResponse) => {
      if (!couchDBError) {
        debug(`${new Date()} Corpus successfully replicated.`, couchResponse);
      } else {
        debug(`${new Date()} Corpus replication failed.`);
      }
    });
    server.db.replicate('new_lexicon', corpusObject.dbname, (err, couchResponse) => {
      if (!err) {
        debug(`${new Date()} Lexicon successfully replicated.`, couchResponse);
      } else {
        debug(`${new Date()} Lexicon replication failed.`);
      }
    });
    // server.db.replicate('new_export', corpusObject.dbname, function(err, couchResponse) {
    //   if (!err) {
    //     debug(new Date() + " Export successfully replicated.", couchResponse);
    //   } else {
    //     debug(new Date() + " Export replication failed.");
    //   }
    // });
    const docsNeededForAProperFieldDBCorpus = createPlaceholderDocsForCorpus(corpusObject);
    newDatabase.bulk({
      docs: docsNeededForAProperFieldDBCorpus,
    }, (couchDBError, couchResponse) => {
      if (couchDBError) {
        debug(`${new Date()} There was an couchDBErroror in creating the docs for the user\'s new corpus: ${util.inspect(couchDBError)}\n`);
        // undoCorpusCreation(user, corpusDetails.corpusObject.connection, docsNeededForAProperFieldDBCorpus);
      } else {
        debug(`${new Date()} Created starter docs for ${corpusObject.dbname}\n`, couchResponse);
      }
    });
    // Replicate activity feed template to new activity feed database
    server.db.replicate('new_corpus_activity_feed', `${corpusObject.dbname}-activity_feed`, {
      create_target: true,
    }, (couchDBError, couchActivityFeedResponse) => {
      if (!couchDBError) {
        debug(`${new Date()} Corpus activity feed successfully replicated.`, couchActivityFeedResponse);
        // Set up security on new corpus activity feed
        const activityDb = nano({
          requestDefaults: {
            headers: {
              'x-request-id': requestId,
            },
          },
          url: `${couchConnectUrl}/${corpusObject.dbname}-activity_feed`,
        });
        activityDb.insert(securityParamsforNewDB, '_security', (couchDBError, couchResponse) => {
          if (!couchDBError) {
            debug(`${new Date()} Added user security roles to new activity feed.`, couchResponse);
          } else {
            debug(`${new Date()} Did not add user security roles to new activity feed.`);
            debug(couchDBError);
          }
        });
      } else {
        debug(`${new Date()} Corpus activity feed replication failed.`, couchActivityFeedResponse);
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
const updateRoles = function updateRoles(req, done) {
  return done({
    status: 404,
    error: 'Method not supported. Please report this error.',
  }, null, {
    message: 'Method not supported. Please report this error.',
  });
};
module.exports.updateRoles = updateRoles;
var addRoleToUserInfo = function addRoleToUserInfo(connection, username, roles, successdone, errordone) {
  debug(`${new Date()} In addRoleToUser ${util.inspect(roles)} to ${username} on ${connection.dbname}`);
  const connect = `${couchConnectUrl}/_users`;
  const db = nano(connect);
  const userid = `org.couchdb.user:${username}`;
  const _ = require('lodash');
  db.get(userid, (couchDBError, body) => {
    if (!couchDBError) {
      const userold = body;
      debug(`${new Date()} These are the users's roles before adding a role.${util.inspect(userold.roles)}`);
      for (const r in roles) {
        userold.roles.push(roles[r]);
      }
      const uniqueroles = _.uniq(userold.roles);
      userold.roles = uniqueroles;
      db.insert(userold, (couchDBError, couchresponsetochangingusersroles) => {
        if (!couchDBError) {
          debug(`${new Date()} User roles updated.`);
        } else {
          debug(`${new Date()} User roles ${userid}failed to update.`, couchDBError, couchresponsetochangingusersroles);
        }
      });
    } else {
      debug(`${new Date()} failed to change ${username} user's roles due to couchdb error `, roles, couchDBError);
    }
  });
};
/*
 * Ensures the requesting user to make the permissions
 * modificaitons, can be used for any corpus operations which require admin privildages.
 */
const isRequestingUserAnAdminOnCorpus = function isRequestingUserAnAdminOnCorpus(req, requestingUser, dbConn, done) {
  if (!dbConn) {
    return done({
      status: 412,
      error: "Client didn't define the database connection.",
    }, null, {
      message: 'This app has made an invalid request. Please notify its developer. missing: serverCode or connection',
    });
  }
  /*
   * Check to see if the user is an admin on the corpus
   */
  const nanoforpermissions = nano({
    requestDefaults: {
      headers: {
        'x-request-id': requestId,
      },
    },
    url: couchConnectUrl,
  });
  const usersdb = nanoforpermissions.db.use('_users');
  usersdb.get(`org.couchdb.user:${requestingUser}`, (couchDBError, result) => {
    if (couchDBError) {
      // Clean the couchDBErroror of couchdb leaks
      delete couchDBError.request;
      delete couchDBError.headers;
      couchDBError.status = couchDBError.statusCode || 500;
      couchDBError.error = couchDBError.error;
      return done(couchDBError, null, {
        message: 'There was a problem deciding if you have permission to do this.',
      });
    }
    let userIsAdminOnTeam = false;
    if (result) {
      const userroles = result.roles;
      for (let i = 0; i < userroles.length; i++) {
        (function isUserAdmin(index) {
          if (userroles.indexOf(`${dbConn.dbname}_${admin}`) > -1) {
            userIsAdminOnTeam = true;
          }
          if (index === (userroles.length - 1)) {
            if (userIsAdminOnTeam === false) {
              return done({
                status: 401,
                error: `User ${requestingUser} found but didnt have permission on ${dbConn.dbname}`,
              }, null, {
                info: 'User does not have permission to perform this action.',
                message: "You don't have permission to perform this action.",
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
