const { NODE_ENV } = process.env;
const { couchKeys } = require('config');
const { Connection } = require('fielddb/api/corpus/Connection');
const debug = require('debug')('lib:corpus:management');
const url = require('url');
const nano = require('nano');

debug(`${new Date()} Loading the Corpus Builder Module with app support: `);
debug(Connection.knownConnections);
if (!Connection || !Connection.knownConnections || !Connection.knownConnections.production) {
  throw new Error(`The app config for ${NODE_ENV} is missing app types to support. `);
}

const parsed = url.parse('http://localhost:5984');
const couchConnectUrl = `${parsed.protocol}//${couchKeys.username}:${couchKeys.password}@${parsed.host}`;
// console.log('Using couchKeys url: ', couchKeys);
debug('Using corpus url: ', couchConnectUrl);

function changeUsersPassword({
  user,
  newpassword,
}) {
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
  return usersdb.get(userid)
    .then((originalCouchDBUser) => {
      debug(`${new Date()} These are the users's details before changing their password.${JSON.stringify(originalCouchDBUser)}`);
      // Delete the user
      return usersdb.destroy(userid, originalCouchDBUser._rev)
        .then((couchdbresponse) => {
          debug('removing a user ', couchdbresponse);
          // Save the user with a new password
          const updatedCouchDBUser = {
            // ...originalCouchDBUser,

            name: user.username,
            password: newpassword,
            roles: originalCouchDBUser.roles,
            previous_rev: originalCouchDBUser._rev,
            type: 'user',
          };

          return usersdb.insert(updatedCouchDBUser, userid);
        })
        .then((doc) => {
          debug(`${new Date()} User's couchdb password changed old revision number: ${originalCouchDBUser._rev}`);
          return doc;
        });
    // .catch((err) => {
    //   err.status = err.status || err.statusCode|| 500;
    //   debug(err, `${new Date()} Here are the errors`);
    //   throw err;
    // });
    })
    .catch((err) => {
      debug(`There was a problem opening the user ${user.username} in the database, their password cannot be updated.`, err);
      err.status = err.status || err.statusCode || 500;
      debug(err, `${new Date()} Here are the errors `);
      throw err;
    });
}
module.exports = {
  changeUsersPassword,
};
