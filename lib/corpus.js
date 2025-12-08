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

// Only create users on the same server.
const parsed = url.parse('http://localhost:5984');
const couchConnectUrl = `${parsed.protocol}//${couchKeys.username}:${couchKeys.password}@${parsed.host}`;
debug('Using corpus url: ', couchConnectUrl);

function addRoleToUserInfo({
  connection,
  userPermission: userPermissionOriginal,
  req = {
    body: {},
    id: '',
  },
}) {
  const userPermission = {
    ...userPermissionOriginal,
  };

  debug(`${new Date()} In addRoleToUser ${JSON.stringify(userPermission)} to ${userPermission.username} on ${connection.dbname}`);
  const connect = `${couchConnectUrl}/_users`;
  const db = nano({
    agentOptions: {
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
      debug(`userold ${userPermission.username}`, userold);

      const userRoles = {};

      userold.roles.forEach((dbRole) => {
        const dbname = dbRole.substring(0, dbRole.lastIndexOf('_'));
        const role = dbRole.substring(dbRole.lastIndexOf('_') + 1);
        userRoles[dbname] = userRoles[dbname] || {};
        userRoles[dbname][role] = true;
      });
      userPermission.before = Object.keys(userRoles[connection.dbname] || {});
      debug('  userRoles parsed', userRoles);

      debug(`${new Date()} These are the users's roles before adding/removing roles.${JSON.stringify(userold.roles)}`);

      if (userPermission.add && userPermission.add.length) {
        userPermission.add.forEach((dbRole) => {
          const dbname = dbRole.substring(0, dbRole.lastIndexOf('_'));
          const role = dbRole.substring(dbRole.lastIndexOf('_') + 1);
          userRoles[dbname] = userRoles[dbname] || {};
          userRoles[dbname][role] = true;
        });
      }

      if (userPermission.remove && userPermission.remove.length) {
        userPermission.remove.forEach((dbRole) => {
          const dbname = dbRole.substring(0, dbRole.lastIndexOf('_'));
          const role = dbRole.substring(dbRole.lastIndexOf('_') + 1);
          if (role === 'all') {
            delete userRoles[connection.dbname];
            return;
          }
          if (!userRoles[dbname]) {
            return;
          }
          delete userRoles[dbname][role];
        });
      }

      userPermission.after = Object.keys(userRoles[connection.dbname] || {});

      userold.roles = Object.keys(userRoles).reduce((accumulator, dbname) => {
        const roles = Object.keys(userRoles[dbname]).map((role) => `${dbname ? `${dbname}_` : ''}${role}`);
        debug('roles for this db', dbname, roles);
        return accumulator.concat(roles);
      },
      []).sort();

      debug(`${new Date()} These are the users's roles on ${connection.dbname} after adding/removing roles.${JSON.stringify(userold.roles)}`);

      return db.insert(userold)
        .then(() => (userPermission));
    })
    .then((userPermissionResult) => {
      debug(`${new Date()} User roles updated.`, userPermissionResult);
      return { userPermissionResult };
    })
    .catch((err) => {
      debug({ err, userPermission }, `${new Date()} failed to change ${userPermission.username} user's roles due to couchdb error`);
      throw err;
    });
}

// Add docs to new database
function createPlaceholderDocsForCorpus({
  req = {
    body: {},
    id: '',
  },
  user: userOriginal,
  corpusObject,
}) {
  const user = {
    ...userOriginal,
  };
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

  const corpusDetails = new Corpus(Corpus.prototype.defaults);
  corpusDetails.merge('self', new Corpus(corpusObject), 'overwrite');
  corpusDetails.connection.corpusid = corpusDetails.id;
  corpusDetails.dateCreated = Date.now();

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
  corpusDetails.dbname = corpusDetails.connection.dbname;

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

  const corpusMaskDetails = new CorpusMask({
    connection: corpusDetails.connection,
    corpusid: corpusDetails.id,
    dateCreated: Date.now(),
    dbname: corpusDetails.dbname,
    description: corpusDetails.description,
    gravatar: corpusDetails.gravatar,
  });

  corpusDetails.corpusMask = corpusMaskDetails;
  const datalistDetails = new DataList({
    title: 'Default Datalist - Empty',
    description: 'The app comes with a default datalist which is empty. Once you have data in your corpus, you can create a datalist using search. Imported data will also show up as a datalist. Datalists are lists of data which can be used to create handouts, export to LaTeX, or share with collaborators.',
    dbname: corpusDetails.dbname,
    dateCreated: Date.now(),
  });
  const sessionDetails = corpusDetails.newSession({
    goal: 'Practice collecting linguistic utterances or words',
    dbname: corpusDetails.dbname,
    dateCreated: Date.now(),
  });

  const team = new Team({
    affiliation: 'No public information available',
    dateCreated: Date.now(),
    description: 'No public information available',
    gravatar: user.gravatar,
    researchInterest: 'No public information available',
    username: user.username,
  });
  corpusDetails.team = team;
  corpusMaskDetails.team = team;

  /* Prepare mostRecentIds so apps can load a most recent dashboard if applicable */
  user.mostRecentIds = {
    connection: corpusDetails.connection.toJSON(),
  };
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

  const docsNeededForAProperFieldDBDatabase = [
    team.toJSON(),
    usersPublicSelfForThisCorpus.toJSON(),
    corpusMaskDetails.toJSON(),
    corpusDetails.toJSON(),
    datalistDetails.toJSON(),
    sessionDetails.toJSON(),
  ];
  return docsNeededForAProperFieldDBDatabase;
}

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
      // eslint-disable-next-line no-console
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
  // eslint-disable-next-line no-underscore-dangle
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
    agentOptions: {
      headers: {
        'x-request-id': req.id || '',
      },
    },
    url: couchConnectUrl,
  });
  const newDatabase = nano({
    agentOptions: {
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
            agentOptions: {
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
    .catch((errOriginal) => {
      const err = {
        ...errOriginal,
      };
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

/*
 * Ensures the requesting user to make the permissions
 * modificaitons, can be used for any corpus operations which require admin privildages.
 */
function isRequestingUserAnAdminOnCorpus({
  connection,
  req = {
    body: {},
    id: '',
  },
  username,
}) {
  if (!connection) {
    const err = new Error('Client didn\'t define the database connection.');
    err.status = 412;
    err.userFriendlyErrors = ['This app has made an invalid request. Please notify its developer. missing: serverCode or connection'];
    return Promise.reject(err);
  }
  /*
   * Check to see if the user is an admin on the corpus
   */
  const nanoforpermissions = nano({
    agentOptions: {
      headers: {
        'x-request-id': req.id || '',
      },
    },
    url: couchConnectUrl,
  });
  const usersdb = nanoforpermissions.db.use('_users');
  return usersdb.get(`org.couchdb.user:${username}`)
    .then((result) => {
      const userIsAdminOnTeam = result.roles.includes(`${connection.dbname}_admin`);
      if (userIsAdminOnTeam) {
        return { ok: true };
      }
      debug('isRequestingUserAnAdminOnCorpus userroles', username, connection.dbname, userIsAdminOnTeam, result.roles);
      const err = new Error(`User ${username} found but didnt have permission on ${connection.dbname}`);
      err.status = 401;
      err.userFriendlyErrors = ["You don't have permission to perform this action."];
      throw err;
    })
    .catch((errOriginal) => {
      const err = {
        message: errOriginal.message,
        status: errOriginal.status || errOriginal.statusCode,
        userFriendlyErrors: ['There was a problem deciding if you have permission to do this.'],
        ...errOriginal,
      };
      throw err;
    });
}

module.exports = {
  createPlaceholderDocsForCorpus,
  createNewCorpus,
  addRoleToUserInfo,
  isRequestingUserAnAdminOnCorpus,
};
