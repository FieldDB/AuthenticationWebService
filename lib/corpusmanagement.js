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
};
