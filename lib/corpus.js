const _ = require('lodash');
const { couchKeys } = require('config');
const debug = require('debug')('lib:corpus');
const url = require('url');
const { Corpus } = require('fielddb/api/corpus/Corpus');
const { CorpusMask } = require('fielddb/api/corpus/CorpusMask');
const { DataList } = require('fielddb/api/data_list/DataList');
const { Team } = require('fielddb/api/user/Team');
const { UserMask } = require('fielddb/api/user/UserMask');
const uuid = require('uuid');
const nano = require('nano');

/* variable for permissions */
const commenter = 'commenter';
const collaborator = 'reader';
const contributor = 'writer';
const admin = 'admin';

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
function createPlaceholderDocsForCorpus({
  req = {
    body: {},
    id: '',
    log: {
      error: console.error,
      warn: console.warn,
    },
  },
  user,
  // title,
  // corpusTitle,
  // connection,
  corpusObject,
  // corpusDetails,
}) {
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

  /*
   * Add more attributes from the req.body below
   */
  // Create connection and activityConnection based on server
  let { appbrand } = req.body;
  if (!appbrand && req.body.username) {
    if (req.body.username.indexOf('test') > -1) {
      appbrand = 'beta';
    } else if (req.body.username.indexOf('anonymouskartulispeechrecognition') === 0) {
      appbrand = 'kartulispeechrecognition';
    } else if (req.body.username.search(/anonymous[0-9]/) === 0) {
      appbrand = 'georgiantogether';
    } else if (req.body.username.search(/anonymouswordcloud/) === 0) {
      appbrand = 'wordcloud';
    } else {
      appbrand = 'lingsync';
    }
  }
  debug('createPlaceholderDocsForCorpus appbrand', appbrand);

  // TODO this has to be come asynchonous if this design is a central server who can register users on other servers
  // const connection = new Connection(req.body.connection
  // || req.body.couchConnection) || Connection.defaultConnection(appbrand);
  if (!corpusDetails.connection.dbname || corpusDetails.connection.dbname === `${req.body.username}-firstcorpus`) {
    corpusDetails.connection.dbname = `${req.body.username}-firstcorpus`;
    if (appbrand === 'phophlo') {
      corpusDetails.connection.dbname = `${req.body.username}-phophlo`;
    }
    if (appbrand === 'kartulispeechrecognition') {
      corpusDetails.connection.dbname = `${req.body.username}-kartuli`;
    }
    if (appbrand === 'georgiantogether') {
      corpusDetails.connection.dbname = `${req.body.username}-kartuli`;
    }
    // corpusDetails.connection.dbname = corpusDetails.connection.dbname;
    /* Set gravatar using the user's registered email, or username if none */
    /* Prepare a private corpus doc for the user's first corpus */
  }
  if (!corpusDetails.title) {
    corpusDetails.title = 'Practice Corpus';
    if (appbrand === 'phophlo') {
      corpusDetails.title = 'Phophlo';
    }
    if (appbrand === 'georgiantogether') {
      corpusDetails.title = 'Geogian';
    }
    if (appbrand === 'kartulispeechrecognition') {
      corpusDetails.title = 'Kartuli Speech Recognition';
    }
    corpusDetails.connection.title = corpusDetails.title;
    if (appbrand === 'phophlo') {
      corpusDetails.description = 'This is your Phophlo database, here you can see your imported class lists and participants results. You can share your database with others by adding them to your team as readers, writers, commenters or admins on your database.';
    }
    if (appbrand === 'georgiantogether') {
      corpusDetails.description = 'This is your Georgian database, here you can see the lessons you made for your self. You can share your database with others by adding them to your team as readers, writers, commenters or admins on your database.';
    }
    if (appbrand === 'kartulispeechrecognition') {
      corpusDetails.description = 'This is your personal database, here you can see the sentences you made for your own speech recognition system trained to your voice and vocabulary. You can share your database with others by adding them to your team as readers, writers, commenters or admins on your database.';
    }
  }

  // const bulkDocs = corpus.createPlaceholderDocsForCorpus({
  //   title: corpusTitle,
  //   connection,
  //   dbname: connection.dbname,
  // });
  // const corpusDetails = bulkDocs[2];
  corpusDetails.connection.description = corpusDetails.description;
  corpusDetails.connection.gravatar = corpusDetails.gravatar;
  // const corpora = [corpusDetails.connection.toJSON()];
  // debug("this is what the corpora is going to look like ",corpora);
  /* Prepare mostRecentIds so apps can load a most recent dashboard if applicable */
  const mostRecentIds = {};
  mostRecentIds.connection = corpusDetails.connection.toJSON();
  /* Prepare a public corpus doc for the user's first corpus */
  // const corpusMaskDetails = bulkDocs[1];
  // corpusMaskDetails.connection = corpusDetails.connection.toJSON();
  // corpusMaskDetails.title = 'Private corpus';
  // corpusMaskDetails.description = 'The details of this corpus are not public';
  // corpusMaskDetails.connection.description = corpusMaskDetails.description;
  /* Prepare an empty datalist doc for the user's first corpus */
  // const datalistDetails = bulkDocs[3];
  /* Prepare an empty session doc for the user's first corpus */
  // const sessionDetails = bulkDocs[4];
  /* prepare the user model */
  req.body.nodejs = true;
  // const user = new User(req.body);
  // user.dateCreated = user.dateCreated || Date.now();
  // user.authServerVersionWhenCreated = authServerVersion;
  user.authUrl = corpusDetails.connection.authUrl;
  user.mostRecentIds = mostRecentIds;
  // user.prefs = JSON.parse(JSON.stringify(DEFAULT_USER_PREFERENCES));
  // user.email = user.email ? user.email.toLowerCase().trim() : null;
  // if (!user.gravatar && user.email) {
  //   user.gravatar = md5(user.email);
  // }
  // if (!user.gravatar) {
  //   user.gravatar = md5(user.username);
  // }
  // debug("user values at registration ", user.toJSON());
  // const team = bulkDocs[0];
  team.gravatar = user.gravatar;
  corpusMaskDetails.team = team;
  corpusDetails.team = team;
  const usersPublicSelfForThisCorpus = new UserMask({
    _id: user.username,
    gravatar: user.gravatar,
    username: user.username,
    appbrand,
    collection: 'users',
    firstname: '',
    lastname: '',
    email: '',
    researchInterest: 'No public information available',
    affiliation: 'No public information available',
    description: 'No public information available',
    dateCreated: Date.now(),
  });
  usersPublicSelfForThisCorpus.corpora = [corpusMaskDetails.connection.toJSON()];
  user.userMask = usersPublicSelfForThisCorpus;
  const activityConnection = corpusDetails.connection.toJSON();
  activityConnection.dbname = `${req.body.username}-activity_feed`;
  /*
       * Create the databases for the new user's corpus
       */
  // const userforcouchdb = {
  //   username: user.username,
  //   password,
  //   corpora: [corpusDetails.connection.toJSON()],
  //   activityConnection,
  // };
  const docsNeededForAProperFieldDBDatabase = [
    team.toJSON(),
    usersPublicSelfForThisCorpus.toJSON(),
    corpusMaskDetails.toJSON(),
    corpusDetails.toJSON(),
    datalistDetails.toJSON(),
    sessionDetails.toJSON(),
  ];
  // debug("this is what will be used to create the team", docsNeededForAProperFieldDBDatabase[0]);
  // debug("this is what will be used to create the userMask", docsNeededForAProperFieldDBDatabase[1]);
  // debug("this is what will be used to create the corpusMask", docsNeededForAProperFieldDBDatabase[2]);
  // debug("this is what will be used to create the corpus", [docsNeededForAProperFieldDBDatabase[3]]);
  // debug("this is what will be used to create the corpus confidential",
  // docsNeededForAProperFieldDBDatabase[3].confidential);
  // debug("this is what will be used to create the datalist", docsNeededForAProperFieldDBDatabase[4]);
  // debug("this is what will be used to create the session", docsNeededForAProperFieldDBDatabase[5]);

  return docsNeededForAProperFieldDBDatabase;
}
// Only create users on the same server.
const parsed = url.parse('http://localhost:5984');
const couchConnectUrl = `${parsed.protocol}//${couchKeys.username}:${couchKeys.password}@${parsed.host}`;
debug('Using corpus url: ', couchConnectUrl);

/*
 * This function creates a new db/corpus using parameters in the dbConnection
 * object, which user it is for, as well as callbacks for success or error. It
 * also builds out the default security settings (ie access control lists, roles
 * and role based permissions for the user's corpus implemented as security
 * settings on the created couchdb
 *
 * The corpus is composed of the dbname, prefixed with the user's username
 */
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
  user,
} = {}) {
  debug('createNewCorpus', connection);
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
        `${corpusObject.dbname}_${commenter}`, // TODO this used to be missing on the first corpus
      ],
    },
  };
  const docsNeededForAProperFieldDBCorpus = createPlaceholderDocsForCorpus({ corpusObject, user, req });
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
        userPermission: {
          username: user.username,
          add: [
            `${corpusObject.connection.dbname}_${admin}`,
            `${corpusObject.connection.dbname}_${contributor}`,
            `${corpusObject.connection.dbname}_${collaborator}`,
            `${corpusObject.connection.dbname}_${commenter}`,
          ],
        },
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
          if (user.whichUserGroup && user.whichUserGroup === 'betatesters') {
            sourceDB = 'new_testing_corpus';
          }
          debug('usig sourceDB', sourceDB);
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
      debug('createNewCorpus', err);
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
  // roles,
  userPermission,
  // username,
  req = {
    body: {},
    id: '',
    log: {
      error: console.error,
    },
  },
}) {
  debug(`${new Date()} In addRoleToUser ${JSON.stringify(userPermission)} to ${userPermission.username} on ${connection.dbname}`);
  const connect = `${couchConnectUrl}/_users`;
  const db = nano({
    requestDefaults: {
      headers: {
        'x-request-id': req.id,
      },
    },
    url: connect,
  });
  const userid = `org.couchdb.user:${userPermission.username}`;
  return db.get(userid)
    .then((body) => {
      const userold = body;
      debug(`${new Date()} These are the users's roles before adding/removing roles.${JSON.stringify(userold.roles)}`);
      let originalRolesForThisCorpus = userold.roles.map((role) => {
        if (role.indexOf(`${connection.dbname}_`) > -1) {
          return role.replace(`${connection.dbname}_`, '');
        }
        return '';
      }).join(' ').trim();
      if (originalRolesForThisCorpus) {
        originalRolesForThisCorpus = originalRolesForThisCorpus.split(' ');
      } else {
        originalRolesForThisCorpus = [];
      }
      userold.roles = _.uniq(userold.roles.concat(userPermission.add || [])).sort((a, b) => (a - b));
      if (userPermission.remove && userPermission.remove[0] === `${connection.dbname}_all`) {
        debug(`${new Date()} removing all and any access to this corpus from ${userPermission.username}`);
        for (let roleIndex = userold.roles.length - 1; roleIndex >= 0; roleIndex--) {
          const corpusid = userold.roles[roleIndex].substring(0, userold.roles[roleIndex].lastIndexOf('_'));
          if (corpusid === connection.dbname) {
            userold.roles.splice(roleIndex, 1);
          }
        }
      } else {
        userPermission.remove = userPermission.remove ? userPermission.remove.map((role) => {
          const roleIsPresent = userold.roles.indexOf(role);
          if (roleIsPresent > -1) {
            userold.roles.splice(roleIsPresent, 1);
          }
          return role;
        }) : [];
      }
      let resultingRolesForThisCorpus = userold.roles.map((role) => {
        if (role.indexOf(`${connection.dbname}_`) > -1) {
          return role.replace(`${connection.dbname}_`, '');
        }
        return '';
      }).join(' ').trim();
      if (resultingRolesForThisCorpus) {
        resultingRolesForThisCorpus = resultingRolesForThisCorpus.split(' ');
      } else {
        resultingRolesForThisCorpus = [];
      }
      // if (resultingRolesForThisCorpus.length === 0) {
      //   resultingRolesForThisCorpus = ["none"];
      // }
      debug(`${new Date()} These are the users's roles after adding/removing roles.${JSON.stringify(userold.roles)}`);
      userPermission.before = originalRolesForThisCorpus;
      userPermission.after = resultingRolesForThisCorpus;

      return db.insert(userold)
        .then(() => (userPermission));
    })
    .then((userPermissionResult) => {
      debug(`${new Date()} User roles updated.`, userPermissionResult);
      return { userPermissionResult };
    })
    .catch((err) => {
      req.log.error({ err, userPermission }, `${new Date()} failed to change ${userPermission.username} user's roles due to couchdb error`);
      throw err;
    });
}
/*
 * Ensures the requesting user to make the permissions
 * modificaitons, can be used for any corpus operations which require admin privildages.
 */
function isRequestingUserAnAdminOnCorpus({
  dbConn,
  req = {
    body: {},
    id: '',
  },
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
