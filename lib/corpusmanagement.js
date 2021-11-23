const { NODE_ENV } = process.env;
const { couchKeys } = require('config');
const { Connection } = require('fielddb/api/corpus/Connection');
const cradle = require('cradle');
const debug = require('debug')('lib:corpus:management');
const url = require('url');
const nano = require('nano');

debug(`${new Date()} Loading the Corpus Builder Module with app support: `);
debug(Connection.knownConnections);
if (!Connection || !Connection.knownConnections || !Connection.knownConnections.production) {
  throw new Error(`The app config for ${NODE_ENV} is missing app types to support. `);
}
/*
 * default database connection is a connection on this local machine, however
 * this can create databases on any couchdb as long as it has admin privildges
 */
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
// console.log('Using couchKeys url: ', couchKeys);
debug('Using corpus url: ', couchConnectUrl);

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
      debug(err, `${new Date()} Here are the errors \n Here is the doc we get back ${JSON.stringify(doc)}`);
      if (typeof errorcallback === 'function') {
        errorcallback(err);
      }
      return;
    }
    debug(`${new Date()} These are the users's details before changing their password.${JSON.stringify(userold)}`);
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
          debug(err, `${new Date()} Here are the errors \n Here is the doc we get back ${JSON.stringify(doc)}`);
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
  changeUsersPassword,
};
