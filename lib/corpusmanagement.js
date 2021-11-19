const { NODE_ENV } = process.env;
const { couchKeys } = require('config');
const { Connection } = require('fielddb/api/corpus/Connection');
const cradle = require('cradle');
const debug = require('debug')('lib:corpus:management');
const _ = require('lodash');
const util = require('util');
const url = require('url');
const nano = require('nano');

debug(`${new Date()} Loading the Corpus Builder Module with app support: `);
debug(Connection.knownConnections);
if (!Connection || !Connection.knownConnections || !Connection.knownConnections.production) {
  throw new Error(`The app config for ${NODE_ENV} is missing app types to support. `);
}
/* variable for permissions */
const commenter = 'commenter';
const collaborator = 'reader';
const contributor = 'writer';
const admin = 'admin';
/*
 * default database connection is a connection on this local machine, however
 * this can create databases on any couchdb as long as it has admin privildges
 */
const useLocalCouchRatherThanRemoteCouch = true;
// Only create users on the same server.
cradle.setup({
  host: 'localhost',
  port: 5984,
  auth: {
    username: couchKeys.username,
    password: couchKeys.password,
  },
});
const parsed = url.parse('http://localhost:5984');
const couchConnectUrl = `${parsed.protocol}//${couchKeys.username}:${couchKeys.password}@${parsed.host}`;
console.log('Using couchKeys url: ', couchKeys);
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
function createDbaddUser(dbConnection, user, successcallback, errorcallback) {
  if (dbConnection.dbname.indexOf(user.username) === -1) {
    dbConnection.dbname = `${user.username}-${dbConnection.dbname}`;
  }
  debug(`${new Date()} Creating a new database/corpus: ${dbConnection.dbname}`);
  /*
   * Create the user, give them the admin role on their corpus, add them to the
   * fielddbuser role so that others can let them see their corpora if they
   * decide to let logged in fielddbusers see their corpus.
   *
   * references:
   * http://blog.mattwoodward.com/2012/03/definitive-guide-to-couchdb.html
   */
  const usersdb = nano({
    requestDefaults: {
      headers: {
        'x-request-id': 'createDbaddUser', // req.id || '',
      },
    },
    url: couchConnectUrl,
  }).db.use('_users');
  const userid = `org.couchdb.user:${user.username}`;
  const userParamsForNewUser = {
    name: user.username,
    password: user.password,
    roles: [`${dbConnection.dbname}_${admin}`,
      `${dbConnection.dbname}_${contributor}`,
      `${dbConnection.dbname}_${collaborator}`,
      `${dbConnection.dbname}_${commenter}`,
      `${'public-firstcorpus' + '_'}${collaborator}`,
      'fielddbuser',
      `${dbConnection.brandLowerCase}user`,
    ],
    type: 'user',
  };
  /*
   * Give the user access to other corpora so they can see what it is like
   * to collaborate
   */
  let whichUserGroup = 'normalusers';
  if (user.username.indexOf('test') > -1 || user.username.indexOf('anonymous') > -1) {
    whichUserGroup = 'betatesters';
  }
  if (whichUserGroup === 'normalusers') {
    const sampleCorpus = 'lingllama-communitycorpus';
    userParamsForNewUser.roles.push(`${sampleCorpus}_${contributor}`);
    userParamsForNewUser.roles.push(`${sampleCorpus}_${collaborator}`);
    userParamsForNewUser.roles.push(`${sampleCorpus}_${commenter}`);
  }
  user.whichUserGroup = whichUserGroup;
  usersdb.insert(userParamsForNewUser, userid, (err, doc) => {
    if (doc === undefined) {
      doc = {
        error: err,
      };
    }
    if (err !== null || !doc.ok) {
      debug(`${new Date()} Here are the errors ${util.inspect(err)} \n Here is the doc we get back ${util.inspect(doc)}`);
      if (typeof errorcallback === 'function') {
        errorcallback();
      }
    } else {
      debug(`${new Date()} user ${userid} created as a CouchDB user on: ${util.inspect(dbConnection)}`);
      /*
       * Prepare the user's activity feed couch
       */
      createDBforUsersActivities(user.activityConnection, user, (couchdbresponse) => {
        debug(`${new Date()} There was success in creating the users activity feed: ${couchdbresponse}`);
        /*
         * Prepare the user's first corpus
         */
        createDBforCorpus(dbConnection, user, (couchdbresponse) => {
          debug(`${new Date()} There was success in creating the users first corpus: ${couchdbresponse}`);
          if (typeof successcallback === 'function') {
            successcallback();
          }
        }, (err) => {
          debug(`${new Date()} There was an error in creating users first corpus: ${err}`);
          if (typeof errorcallback === 'function') {
            errorcallback();
          }
        });
      }, (err) => {
        debug(`${new Date()} There was an error in creating users activity feed: ${err}`);
        if (typeof errorcallback === 'function') {
          errorcallback();
        }
      });
    } // end successful user creation
  });
}
function addRoleToUser(dbConnection, userPermission, successcallback, errorcallback) {
  debug(`${new Date()} In addRoleToUser ${util.inspect(userPermission.add)} to ${userPermission.username} on ${util.inspect(dbConnection)}`);
  if (!userPermission.add) {
    userPermission.add = [];
  }
  if (!userPermission.remove) {
    userPermission.remove = [];
  }
  const usersdb = nano({
    requestDefaults: {
      headers: {
        'x-request-id': 'addRoleToUser', // req.id || '',
      },
    },
    url: couchConnectUrl,
  }).db.use('_users');
  const userid = `org.couchdb.user:${userPermission.username}`;
  usersdb.get(userid, (err, doc) => {
    if (err !== null || !doc._id) {
      err.status = err.status || 404;
      debug(`${new Date()} Here are the errors ${util.inspect(err)} \n Here is the doc we get back ${util.inspect(doc)}`);
      if (typeof errorcallback === 'function') {
        userPermission.status = err.status;
        userPermission.message = 'User not found.';
        return errorcallback(err, userPermission, {
          message: userPermission.message,
        });
      }
      return;
    }
    const userold = doc;
    debug(`${new Date()} These are the users's roles before adding/removing roles.${util.inspect(userold.roles)}`);
    let originalRolesForThisCorpus = userold.roles.map((role) => {
      if (role.indexOf(`${dbConnection.dbname}_`) > -1) {
        return role.replace(`${dbConnection.dbname}_`, '');
      }
      return '';
    }).join(' ').trim();
    if (originalRolesForThisCorpus) {
      originalRolesForThisCorpus = originalRolesForThisCorpus.split(' ');
    } else {
      originalRolesForThisCorpus = [];
    }
    userold.roles = _.uniq(userPermission.add.concat(userold.roles));
    if (userPermission.remove[0] === `${dbConnection.dbname}_all`) {
      debug(`${new Date()} removing all and any access to this corpus from ${userPermission.username}`);
      for (let roleIndex = userold.roles.length - 1; roleIndex >= 0; roleIndex--) {
        const corpusid = userold.roles[roleIndex].substring(0, userold.roles[roleIndex].lastIndexOf('_'));
        if (corpusid === dbConnection.dbname) {
          userold.roles.splice(roleIndex, 1);
        }
      }
    } else {
      userPermission.remove.map((role) => {
        const roleIsPresent = userold.roles.indexOf(role);
        if (roleIsPresent > -1) {
          userold.roles.splice(roleIsPresent, 1);
        }
      });
    }
    let resultingRolesForThisCorpus = userold.roles.map((role) => {
      if (role.indexOf(`${dbConnection.dbname}_`) > -1) {
        return role.replace(`${dbConnection.dbname}_`, '');
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
    debug(`${new Date()} These are the users's roles after adding/removing roles.${util.inspect(userold.roles)}`);
    userPermission.before = originalRolesForThisCorpus;
    userPermission.after = resultingRolesForThisCorpus;
    // return errorcallback({
    //   error: "todo",
    //   status: 412
    // }, userPermission, {
    //   message: "TODO. save userroles "
    // });
    usersdb.insert(userold, (err, doc) => {
      if (doc === undefined) {
        doc = {
          error: err,
          status: 500,
        };
      }
      if (err !== null || !doc.ok) {
        debug(`${new Date()} Here are the errors ${util.inspect(err)} \n Here is the doc we get back ${util.inspect(doc)}`);
        // try one more time.
        usersdb.insert(userold, (err, doc) => {
          if (doc === undefined) {
            doc = {
              error: err,
              status: 500,
            };
          }
          if (err !== null || !doc.ok) {
            debug(`${new Date()} Here are the errors ${util.inspect(err)} \n Here is the doc we get back ${util.inspect(doc)}`);
            if (typeof errorcallback === 'function') {
              if (err.error === 'conflict') {
                err.status = 409;
              }
              err.status = err.status || 500;
              userPermission.status = err.status;
              userPermission.message = `There was a problem giving ${resultingRolesForThisCorpus.join(', ')} access to user ${userPermission.username}.${err.status === 409 ? '' : ' Please notify us of this error.'}`;
              return errorcallback(err, userPermission, {
                message: userPermission.message,
              });
            }
          } else {
            debug(`${new Date()} role ${userPermission.add} created to the CouchDB user ${userPermission.username} on: ${util.inspect(dbConnection)}`);
            if (typeof successcallback === 'function') {
              userPermission.status = 200;
              userPermission.message = `User now has ${resultingRolesForThisCorpus.join(', ')} access to ${dbConnection.dbname}`;
              return successcallback(null,
                userPermission, {
                  message: userPermission.message,
                });
            }
          }
        });
      } else {
        debug(`${new Date()} role ${userPermission.add} created to the CouchDB user ${userPermission.username} on: ${util.inspect(dbConnection)}`);
        if (typeof successcallback === 'function') {
          userPermission.status = 200;
          userPermission.message = `User now has ${resultingRolesForThisCorpus.join(', ')} access to ${dbConnection.dbname}`;
          return successcallback(null,
            userPermission, {
              message: userPermission.message,
            });
        }
      }
    });
  });
  debug('After calling the open to users database');
}
/*
 * This function creates a new corpus database
 *
 * The db is composed of the dbname
 */
function createDBforCorpus(dbConnection, user, success, errorcallback) {
  dbConnection.dbname = dbConnection.dbname;
  debug(`${new Date()} Creating a new database/corpus: ${dbConnection.dbname}`);
  const c = new cradle.Connection();
  const db = c.database(dbConnection.dbname);
  db.exists((err, exists) => {
    if (err) {
      debug(`${new Date()} error`, err);
      if (typeof errorcallback === 'function') {
        errorcallback(err);
      }
    } else if (exists) {
      debug(`${new Date()} The corpus ${dbConnection.dbname} exists, calling the errorcallback.`);
      if (typeof error === 'function') {
        error(dbConnection, 'corpus_existed');
      }
    } else {
      // Create database/corpus
      debug(`${new Date()} Database/corpus ${dbConnection.dbname} does not exist, creating it.`);
      db.create((err, couchdbresponse) => {
        debug(`${new Date()} In the callback of db create for ${dbConnection.dbname}`, couchdbresponse);
        if (err) {
          debug(`${new Date()} Here is the err: ${err}`);
        }
        /*
         * Upon success of db creation, set up the collaborator,
         * contributor and admin roles for this corpus
         *
         * Admins: The admins can perform any operation on the corpus.
         * Members: By adding items to the members the corpus becomes
         * non-public in the sense of couch not allowing access. We can
         * still use FieldDB to perform a fine grained control by
         * creating a special public user which is essentially the
         * checkbox that the user can check to make the corpus private,
         * and adding all fielddbusers to a role fielddbusers which can
         * let the user make the corpus private to the world, but
         * viewable by fielddbusers (to let only signed in users comment
         * on their data etc)
         *
         * If public corpus (by default its private): -signed in
         * fielddbusers can read other user's corpora until the user
         * takes that role off -public user (ie the general public) can
         * see the user's corpora through fielddb, but not directly the
         * couch database. This is how the public checkbox is
         * implemented in fielddb.
         *
         * References: http://127.0.0.1:5984/john7corpus/_security
         */
        addRoleToUser(dbConnection, {
          username: user.username,
          add: [
            `${dbConnection.dbname}_${admin}`,
            `${dbConnection.dbname}_${contributor}`,
            `${dbConnection.dbname}_${collaborator}`,
            `${dbConnection.dbname}_${commenter}`,
          ],
        });
        const securityParamsforNewDB = {
          admins: {
            names: [],
            roles: ['fielddbadmin', `${dbConnection.dbname}_${admin}`],
          },
          members: {
            names: [],
            roles: [`${dbConnection.dbname}_${collaborator}`,
              `${dbConnection.dbname}_${contributor}`,
            ],
          },
        };
        db.save('_security', securityParamsforNewDB,
          (err, doc) => {
            if (doc === undefined) {
              doc = {
                error: err,
              };
            }
            if (err !== null || !doc.ok) {
              debug(`${new Date()} Here are the errors ${util.inspect(err)} \n Here is the doc we get back ${util.inspect(doc)}`);
            } else {
              debug(`${new Date()} Corpus _security created`);
            }
          });
        /*
         * Copy all design docs and the couchapp to the new user's
         * database
         */
        let sourceDB = 'new_corpus';
        if (user.whichUserGroup && user.whichUserGroup == 'betatesters') {
          sourceDB = 'new_testing_corpus';
        }
        c.replicate({
          source: sourceDB,
          target: dbConnection.dbname,
        }, (err, result) => {
          if (err) {
            debug(`${new Date()}unable to replicate the map reduces to the new user's database ${dbConnection.dbname}`, err);
          }
          c.replicate({
            source: 'new_lexicon',
            target: dbConnection.dbname,
          }, (err, result) => {
            debug(`${new Date()}replicated the lexicon for the new user's database ${dbConnection.dbname}`, result);
          });
          // c.replicate({
          //   "source": 'new_export',
          //   "target": dbConnection.dbname
          // }, function(err, result) {
          //   debug(new Date() + "replicated the export for the new user's database "+ dbConnection.dbname, result);
          // });
          /*
           * Prepare corpus activity feed couch
           */
          createDBforCorpusTeamsActivities(dbConnection, user, (couchdbresponse) => {
            debug(`${new Date()} There was success in creating the corpus team's activity feed: ${couchdbresponse}`);
            if (typeof success === 'function') {
              dbConnection.dbname.replace('-activity_feed', '');
              success(dbConnection);
            }
          }, (err) => {
            debug(`${new Date()} There was an error in creating the corpus team's activity feed: ${err}`);
            if (typeof error === 'function') {
              error(dbConnection);
            }
          });
        }); // end create activity feeds
      }); // end replicate defaults
    }
  });
}
/*
 * This function creates a new corpus team activity feed database
 *
 * The db is composed of the dbname
 */
function createDBforCorpusTeamsActivities(dbConnection, user, successcallback, errorcallback) {
  dbConnection.dbname += '-activity_feed';
  debug(`${new Date()} Creating a new database/corpus: ${dbConnection.dbname}`);
  const c = new cradle.Connection();
  const db = c.database(dbConnection.dbname);
  db.exists((err, exists) => {
    if (err) {
      debug(`${new Date()} error`, err);
      if (typeof errorcallback === 'function') {
        errorcallback(err);
      }
    } else if (exists) {
      debug(`${new Date()} The users activity db exists, calling the errorcallback.`);
      if (typeof errorcallback === 'function') {
        errorcallback(dbConnection, 'corpus_existed');
      }
    } else {
      // Create database/corpus
      debug(`${new Date()} Database ${dbConnection.dbname} does not exist, creating it.`);
      db.create((err, couchdbresponse) => {
        debug(`${new Date()} In the callback of db create for ${dbConnection.dbname}`, couchdbresponse);
        if (err !== null) {
          debug(`${new Date()} Here are the errors ${util.inspect(err)}`);
        } else {
          debug(`${new Date()} corpus created`);
        }
        /*
         * Upon success of db creation, set up the collaborator, contributor
         * and admin roles for this corpus teams activity feed, at the
         * moment its readers are the same as the corpus itself, and its
         * admins are only the app.
         *
         * References: http://127.0.0.1:5984/john7corpus/_security
         */
        const securityParamsforNewDB = {
          admins: {
            names: [],
            roles: ['fielddbadmin'],
          },
          members: {
            names: [],
            roles: [
              `${dbConnection.dbname.replace('-activity_feed', '')}_${collaborator}`,
              `${dbConnection.dbname.replace('-activity_feed', '')}_${contributor}`,
              `${dbConnection.dbname.replace('-activity_feed', '')}_${commenter}`,
            ],
          },
        };
        db.save('_security', securityParamsforNewDB, (err, doc) => {
          if (doc === undefined) {
            doc = {
              error: err,
            };
          }
          if (err !== null || !doc.ok) {
            debug(`${new Date()} Here are the errors ${util.inspect(err)} \n Here is the doc we get back ${util.inspect(doc)}`);
          } else {
            debug(`${new Date()} TeamsActivities _security created`);
          }
        });
        /*
         * Replicate the validation design docs and the couch app to the new
         * activity feed
         */
        c.replicate({
          source: 'new_corpus_activity_feed',
          target: dbConnection.dbname,
        }, () => {
          if (typeof successcallback === 'function') {
            successcallback();
          }
        }); // end replicate defaults
      }); // end createdb
    }
  });
}
/*
 * This function creates a new user's activity feed database
 *
 * The db is composed of the dbname
 */
function createDBforUsersActivities(dbConnection, user, successcallback, errorcallback) {
  debug(`${new Date()} Creating a new database/corpus: ${dbConnection.dbname}`);
  const c = new cradle.Connection();
  const db = c.database(dbConnection.dbname);
  db.exists((err, exists) => {
    if (err) {
      debug(`${new Date()} error`, err);
      if (typeof errorcallback === 'function') {
        errorcallback(err);
      }
    } else if (exists) {
      debug(`${new Date()} The users activity db exists, calling the errorcallback.`);
      const errmessage = 'The database already exists, this is problematic.';
      if (typeof errorcallback === 'function') {
        errorcallback(errmessage);
      }
    } else {
      // Create database/corpus
      debug(`${new Date()} Database ${dbConnection.dbname} does not exist, creating it.`);
      db.create((err, couchdbresponse) => {
        debug(`${new Date()} In the callback of db create for ${dbConnection.dbname}`, couchdbresponse);
        if (err) {
          debug(`${new Date()} Here is the err: ${err}`);
        }
        /*
         * Upon success of db creation, set up the collaborator, contributor and
         * admin roles for this corpus
         *
         * Admins: Only the app is the admin Members: Only the user is a member
         *
         * References: http://127.0.0.1:5984/john7corpus/_security
         */
        const securityParamsforNewDB = {
          admins: {
            names: [],
            roles: ['fielddbadmin'],
          },
          members: {
            names: [user.username],
            roles: [],
          },
        };
        db.save('_security', securityParamsforNewDB, (err, doc) => {
          if (doc === undefined) {
            doc = {
              error: err,
            };
          }
          if (err !== null || !doc.ok) {
            debug(`${new Date()} Here are the errors ${util.inspect(err)} \n Here is the doc we get back ${util.inspect(doc)}`);
          } else {
            debug(`${new Date()} UserActivity _security created`);
          }
        });
        /*
         * Replicate the validation design docs and the couch app to the new
         * activity feed
         */
        c.replicate({
          source: 'new_user_activity_feed',
          target: dbConnection.dbname,
        }, () => {
          if (typeof successcallback === 'function') {
            successcallback();
          }
        }); // end replicate defaults
      }); // end createdb
    }
  });
}

function changeUsersPassword(dbConnection, user, newpassword,
  successcallback, errorcallback) {
  const usersdb = nano({
    requestDefaults: {
      headers: {
        'x-request-id': 'changeUsersPassword', // req.id || '',
      },
    },
    url: couchConnectUrl,
  }).db.use('_users');
  // usersdb.auth(couchKeys.username, couchKeys.password)
  // Get the user's current details,
  const userid = `org.couchdb.user:${user.username}`;
  usersdb.get(userid, (err, doc) => {
    const userold = doc;
    if (!userold || !userold._rev) {
      debug(`There was a problem opening the user ${user.username} in the database, their password cannot be updated.`, err);
      err.status = err.status || 500;
      debug(`${new Date()} Here are the errors ${util.inspect(err)} \n Here is the doc we get back ${util.inspect(doc)}`);
      if (typeof errorcallback === 'function') {
        errorcallback(err);
      }
      return;
    }
    debug(`${new Date()} These are the users's details before changing their password.${util.inspect(userold)}`);
    // Delete the user
    usersdb.destroy(userid, userold._rev, (err, couchdbresponse) => {
      debug('removing a user ', err, couchdbresponse);
      // Save the user with a new password
      const userParamsForNewUser = {
        name: user.username,
        password: newpassword,
        roles: userold.roles,
        previous_rev: userold._rev,
        type: 'user',
      };
      usersdb.insert(userParamsForNewUser, userid, (err, doc) => {
        if (doc === undefined) {
          doc = {
            error: err,
          };
        }
        if (err !== null || !doc.ok) {
          err.status = err.status || 500;
          debug(`${new Date()} Here are the errors ${util.inspect(err)} \n Here is the doc we get back ${util.inspect(doc)}`);
          if (typeof errorcallback === 'function') {
            errorcallback(err);
          }
        } else {
          debug(`${new Date()} User's couchdb password changed old revision number: ${userold._rev}`);
          if (typeof successcallback === 'function') {
            successcallback(doc);
          }
        }
      });
    });
  });
}
module.exports = {
  addRoleToUser,
  changeUsersPassword,
  createDbaddUser,
  createDBforCorpus,
  createDBforCorpusTeamsActivities,
  createDBforUsersActivities,
};
