const _ = require('lodash');
const { couchKeys } = require('config');
const debug = require('debug')('lib:corpus');
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
function createPlaceholderDocsForCorpus(corpusObject) {
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
}
// Only create users on the same server.
const parsed = url.parse('http://localhost:5984');
const couchConnectUrl = `${parsed.protocol}//${couchKeys.username}:${couchKeys.password}@${parsed.host}`;
debug('Using corpus url: ', couchConnectUrl);
function createNewCorpus({
  _id,
  connection,
  dbname,
  id,
  req = {
    id: '',
    log: {
      error: console.error,
      warn: console.warn,
    },
  },
  title,
  username,
  whichUserGroup,
} = {}) {
  const corpusObject = {
    dbname,
    connection,
    id,
    _id,
    title,
  };
  if (corpusObject.dbname) {
    corpusObject.connection.dbname = corpusObject.dbname;
  } else {
    corpusObject.dbname = corpusObject.connection.dbname;
  }
  if (!corpusObject.id && !corpusObject._id) {
    corpusObject.id = uuid.v4();
  }
  debug(`${new Date()} Creating new database ${corpusObject.dbname}`);
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
  const docsNeededForAProperFieldDBCorpus = createPlaceholderDocsForCorpus(corpusObject);

  const server = nano({
    requestDefaults: {
      headers: {
        'x-request-id': req.id || '',
      },
    },
    url: couchConnectUrl,
  });
  const newDatabase = nano({
    requestDefaults: {
      headers: {
        'x-request-id': req.id || '',
      },
    },
    url: `${couchConnectUrl}/${corpusObject.dbname}`,
  });
  return server.db.create(corpusObject.dbname)
    .then((response) => {
      debug(`Created db ${corpusObject.dbname}`, response);
      /**
       * Upon success of db creation, set up the collaborator, contributor
       * and admin roles for this corpus
       */
      return addRoleToUserInfo({
        connection: corpusObject.connection,
        username,
        roles: [
          `${corpusObject.dbname}_${admin}`,
          `${corpusObject.dbname}_${contributor}`,
          `${corpusObject.dbname}_${collaborator}`,
          `${corpusObject.dbname}_${commenter}`,
        ],
        req,
      })
        .then((roleResult) => {
          debug('roleResult', roleResult);
          return newDatabase.insert(securityParamsforNewDB, '_security');
        })
        .catch((couchDBError) => {
          debug(`${new Date()} Did not add user security roles.`, couchDBError);
        })
        .then((couchResponse) => {
          debug(`${new Date()} Added user security roles to new db.`, couchResponse);
          let sourceDB = 'new_corpus';
          if (user.whichUserGroup && user.whichUserGroup == 'betatesters') {
            sourceDB = 'new_testing_corpus';
          }
          return server.db.replicate(sourceDB, corpusObject.dbname);
        })
        .catch((couchDBError) => {
          debug(`${new Date()} Corpus replication failed.`, couchDBError);
        })
      // Replicate template databases to new database
        .then((couchResponse) => {
          debug(`${new Date()} Corpus successfully replicated.`, couchResponse);
          return server.db.replicate('new_lexicon', corpusObject.dbname);
        })
        .catch((couchDBError) => {
          debug(`${new Date()} Lexicon replication failed.`, couchDBError);
        })
        .then((couchResponse) => {
          debug(`${new Date()} Lexicon successfully replicated.`, couchResponse);
          // server.db.replicate('new_export', corpusObject.dbname, function(err, couchResponse) {
          //   if (!err) {
          //     debug(new Date() + " Export successfully replicated.", couchResponse);
          //   } else {
          //     debug(new Date() + " Export replication failed.");
          //   }
          // });
          debug(`${new Date()} Lexicon replication.`);
          return newDatabase.bulk({
            docs: docsNeededForAProperFieldDBCorpus,
          });
        })
        .catch((couchDBError) => {
          req.log.warn(couchDBError, `${new Date()} There was an couchDBErroror in creating the docs for the user's new corpus:`);
          // undoCorpusCreation(user, corpusDetails.corpusObject.connection, docsNeededForAProperFieldDBCorpus);
        })
        .then((couchResponse) => {
          debug(`${new Date()} Created starter docs for ${corpusObject.dbname}`, couchResponse);
          // Replicate activity feed template to new activity feed database
          return server.db.replicate('new_corpus_activity_feed', `${corpusObject.dbname}-activity_feed`, {
            create_target: true,
          });
        })
        .catch((couchDBError) => {
          debug(`${new Date()} Corpus activity feed replication failed.`, couchDBError);
        })
        .then((couchActivityFeedResponse) => {
          debug(`${new Date()} Corpus activity feed successfully replicated.`, couchActivityFeedResponse);
          // Set up security on new corpus activity feed
          const activityDb = nano({
            requestDefaults: {
              headers: {
                'x-request-id': req.id,
              },
            },
            url: `${couchConnectUrl}/${corpusObject.dbname}-activity_feed`,
          });
          return activityDb.insert(securityParamsforNewDB, '_security');
        })
        .catch((couchDBError) => {
          debug(`${new Date()} Did not add user security roles to new activity feed.`, couchDBError);
        })
        .then((couchResponse) => {
          debug(`${new Date()} Added user security roles to new activity feed.`, couchResponse);
          return {
            corpusDetails: docsNeededForAProperFieldDBCorpus[2],
            info: {},
          };
        });
    })
    // TODO Add corpus created activity to activity feeds
    .catch((err) => {
      debug(err);
      // Clean the error of couchdb leaks
      delete err.request;
      delete err.headers;
      err.status = err.status || err.statusCode || 500;
      if (err.status === 412) {
        err.status = 302;
        err.corpusexisted = true;
        err.userFriendlyErrors = [
          `Your corpus ${corpusObject.dbname} already exists, no need to create it.`,
        ];
      } else {
        err.userFriendlyErrors = ['The server was unable to complete this request. Please report this.'];
      }
      throw err;
    });
}
// Update user roles on existing corpus
/*
TODO: Does this function require that the requesting user
actually have the permission (be admin on that corpus) to modify roles? (like in addRoleToUser in userauthentication.js)
*/
function updateRoles(req, done) {
  return done({
    status: 404,
    error: 'Method not supported. Please report this error.',
  }, null, {
    message: 'Method not supported. Please report this error.',
  });
}
function addRoleToUserInfo({
  connection,
  roles,
  username,
  req,
}) {
  debug(`${new Date()} In addRoleToUser ${JSON.stringify(roles)} to ${username} on ${connection.dbname}`);
  const connect = `${couchConnectUrl}/_users`;
  const db = nano({
    requestDefaults: {
      headers: {
        'x-request-id': req.id,
      },
    },
    url: connect,
  });
  const userid = `org.couchdb.user:${username}`;
  return db.get(userid)
    .then((body) => {
      const userold = body;
      debug(`${new Date()} These are the users's roles before adding a role. ${JSON.stringify(userold.roles)}`);
      for (const r in roles) {
        userold.roles.push(roles[r]);
      }
      const uniqueroles = _.uniq(userold.roles);
      userold.roles = uniqueroles;
      return db.insert(userold);
    })
    .then((couchresponsetochangingusersroles) => {
      debug(`${new Date()} User roles updated.`, couchresponsetochangingusersroles);
      return { ok: true };
    })
    .catch((err) => {
      debug(`${new Date()} failed to change ${username} user's roles due to couchdb error `, roles, err);
      return { ok: false };
    });
}
/*
 * Ensures the requesting user to make the permissions
 * modificaitons, can be used for any corpus operations which require admin privildages.
 */
function isRequestingUserAnAdminOnCorpus({
  dbConn,
  req,
  username,
}) {
  if (!dbConn) {
    const err = new Error('Client didn\'t define the database connection.');
    err.status = 412;
    err.userFriendlyErrors = ['This app has made an invalid request. Please notify its developer. missing: serverCode or connection'];
    return Promise.reject(err);
  }
  /*
   * Check to see if the user is an admin on the corpus
   */
  const nanoforpermissions = nano({
    requestDefaults: {
      headers: {
        'x-request-id': req.id || '',
      },
    },
    url: couchConnectUrl,
  });
  const usersdb = nanoforpermissions.db.use('_users');
  return usersdb.get(`org.couchdb.user:${username}`)
    .then((result) => {
      let userIsAdminOnTeam = false;
      const userroles = result.roles;
      for (let i = 0; i < userroles.length; i++) {
        (function isUserAdmin(index) {
          if (userroles.indexOf(`${dbConn.dbname}_${admin}`) > -1) {
            userIsAdminOnTeam = true;
          }
          if (index === (userroles.length - 1)) {
            if (userIsAdminOnTeam === false) {
              const err = new Error(`User ${username} found but didnt have permission on ${dbConn.dbname}`);
              err.status = 401;
              err.userFriendlyErrors = ["You don't have permission to perform this action."];
              throw err;
            }
            return { ok: true };
          }
        }(i));
      }
    })
    .catch((err) => {
    // Clean the error of couchdb leaks
      delete err.request;
      delete err.headers;
      err.status = err.statusCode;
      err.userFriendlyErrors = ['There was a problem deciding if you have permission to do this.'];
      return err;
    });
}

module.exports = {
  createPlaceholderDocsForCorpus,
  createNewCorpus,
  updateRoles,
  addRoleToUserInfo,
  isRequestingUserAnAdminOnCorpus,
};
