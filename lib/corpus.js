var couch_keys = require("./couchkeys_local");
var util = require('util'),
  private_corpus_default_template = require('../templates/private_corpus_template'),
  public_corpus_default_template = require('../templates/public_corpus_template'),
  datalist_default_template = require('../templates/datalist_template'),
  session_default_template = require('../templates/session_template'),
  uuid = require('uuid');

/* variable for permissions */
var commenter = "commenter";
var collaborator = "reader";
var contributor = "writer";
var admin = "admin";


var createNewCorpus = function(req, callback) {
  /* TODO not sure if where the serverCode is coming from, it theoretically should be in the body... */
  var serverLabel = req.body.serverCode || req.serverCode;
  if (!serverLabel) {
    serverLabel = req.body.serverLabel;
  }
  var username = req.body.username;
  var couchConnection = this.getCouchConnectionFromServerCode(serverLabel);
  couchConnection.pouchname = username + "-" + req.body.newCorpusName.trim().toLowerCase().replace(
    /[!@#$^&%*()+=-\[\]\/{}|:<>?,."'`; ]/g, "_");
  console.log(new Date() + " Creating new database " + couchConnection.pouchname);

  var connect = couchConnection.protocol + couch_keys.username + ":" + couch_keys.password + "@" + couchConnection.domain + ":" + couchConnection.port;

  var server = require('nano')(connect);

  server.db.create(couchConnection.pouchname, function(err, body) {
    if (err) {
      console.log(err);
      return callback(true, false, err);
    }
    /*
     * Upon success of db creation, set up the collaborator, contributor
     * and admin roles for this corpus
     */
    addRoleToUserInfo(couchConnection, username, [
      couchConnection.pouchname + "_" + admin,
      couchConnection.pouchname + "_" + contributor,
      couchConnection.pouchname + "_" + collaborator,
      couchConnection.pouchname + "_" + commenter
    ]);

    var securityParamsforNewDB = {
      "admins": {
        "names": [username],
        "roles": [couchConnection.pouchname + "_" + admin]
      },
      "members": {
        "names": [],
        "roles": [
          couchConnection.pouchname + "_" + collaborator,
          couchConnection.pouchname + "_" + contributor,
          couchConnection.pouchname + "_" + commenter
        ]
      }
    };

    var newDbConnect = connect + "/" + couchConnection.pouchname;

    var db = require('nano')(newDbConnect);

    db.insert(securityParamsforNewDB, "_security", function(err, body) {
      if (!err) {
        console.log(new Date() + " Added user security roles to new db.");
      } else {
        console.log(new Date() + " Did not add user security roles.");
        console.log(err);
      }
    });

    // Replicate template databases to new database
    server.db.replicate('new_corpus', newDbConnect, function(err, body) {
      if (!err) {
        console.log(new Date() + " Corpus successfully replicated.");
      } else {
        console.log(new Date() + " Corpus replication failed.");
      }
    });

    // Add empty docs to new database
    var private_corpus_template = createPrivateCorpusDoc(username, req.body.newCorpusName, couchConnection, couchConnection.pouchname);
    var public_corpus_template = createPublicCorpusDoc(couchConnection, couchConnection.pouchname);
    var datalist_template = createDatalistDoc(couchConnection.pouchname);
    var session_template = createSessionDoc(couchConnection.pouchname);

    var docsNeededForAProperFieldDBCorpus = [public_corpus_template, private_corpus_template, datalist_template, session_template];

    db.bulk({
      "docs": docsNeededForAProperFieldDBCorpus
    }, function(err, body) {
      if (err) {
        console.log(new Date() + " There was an error in creating the docs for the user\'s new corpus: " + util.inspect(err) + "\n");
        // undoCorpusCreation(user, private_corpus_template.couchConnection, docsNeededForAProperFieldDBCorpus);
      } else {
        console.log(new Date() + " Created corpus for " + private_corpus_template.pouchname + "\n");
      }
    });

    // Replicate activity feed template to new activity feed database
    var newActivityFeedConnect = connect + "/" + couchConnection.pouchname + "-activity_feed";
    server.db.replicate('new_corpus_activity_feed', newActivityFeedConnect, {
      create_target: true
    }, function(err, body) {
      if (!err) {
        console.log(new Date() + " Corpus activity feed successfully replicated.");
        // Set up security on new corpus activity feed
        var activityDb = require('nano')(newActivityFeedConnect);

        activityDb.insert(securityParamsforNewDB, "_security", function(err, body) {
          if (!err) {
            console.log(new Date() + " Added user security roles to new activity feed.");
          } else {
            console.log(new Date() + " Did not add user security roles to new activity feed.");
            console.log(err);
          }
        });

      } else {
        console.log(new Date() + " Corpus activity feed replication failed.");
      }
    });
    // TODO Add corpus created activity to activity feeds
    return callback(false, private_corpus_template, {});
  });
};

module.exports.createNewCorpus = createNewCorpus;

// Update user roles on existing corpus
/* 
TODO: Does this function require that the requesting user 
actually have the permission (be admin on that corpus) to modify roles? (like in addRoleToUser in userauthentication.js)

*/
var updateRoles = function(req, callback) {
  // return callback({"error": "Method not supported. Please report this error."}, username, {});
  /* the rest of the function has not been reviewed, for now turning it off so we can deploy the spreadsheet app for fieldmethods course prep */

  // TODO Add/Remove corpora from zfielddbuserscouch?

  /* TODO not sure where the serverCode is coming from, it theoretically should be in the body not in the req... */
  var serverLabel = req.body.serverCode || req.serverCode;
  if (!serverLabel) {
    serverLabel = req.body.serverLabel;
  }
  var couchConnection = this.getCouchConnectionFromServerCode(serverLabel);
  couchConnection.pouchname = req.body.userRoleInfo.pouchname;

  var username = req.body.userRoleInfo.usernameToModify;

  // Check to make sure requesting user is admin; if not, abort
  var requestingUser = req.body.username;
  isRequestingUserAnAdminOnCorpus(req, requestingUser, couchConnection, function(error, result, messages) {
    if (error) {
      console.log("ERROR HERE!");
      console.log(error);
      return callback(true, username, {
        "message": "You do not have permission to update user roles for this corpus. You must be an admin."
      });
    } else {
      console.log(new Date() + " User " + requestingUser + " is admin and can modify permissions on " + couchConnection.pouchname);

      if (req.body.userRoleInfo.removeUser && req.body.userRoleInfo.removeUser == true) {
        console.log("Removing permissions for " + username + " from " + couchConnection.pouchname);
        removeUserFromDb(couchConnection, username);
        return callback(false, username, {});
      }

      var roles = [];
      if (req.body.userRoleInfo.admin == true) {
        roles.push(couchConnection.pouchname + "_" + admin);
      }
      if (req.body.userRoleInfo.reader == true) {
        roles.push(couchConnection.pouchname + "_" + collaborator);
      }
      if (req.body.userRoleInfo.writer == true) {
        roles.push(couchConnection.pouchname + "_" + contributor);
      }

      // Check to see if user exists before adding roles
      var connect = couchConnection.protocol + couch_keys.username + ":" + couch_keys.password + "@" + couchConnection.domain + ":" + couchConnection.port + "/_users";

      var db = require('nano')(connect);
      var userid = 'org.couchdb.user:' + username;

      db.get(userid, function(err, body) {
        if (!err) {
          // User exists on server, so adding new user roles
          addRoleToUserInfo(couchConnection, username, roles);

          // Add user doc in corpus if it does not already exist
          var corpusConnect = couchConnection.protocol + couch_keys.username + ":" + couch_keys.password + "@" + couchConnection.domain + ":" + couchConnection.port + "/" + couchConnection.pouchname;

          var corpusDb = require('nano')(corpusConnect);
          corpusDb.get(username, function(err, body) {
            if (!err) {
              // Do nothing if user already exists
            } else {
              // Add new user to DB
              // Get gravatar hash
              var zUserInfoDbConnect = couchConnection.protocol + couch_keys.username + ":" + couch_keys.password + "@" + couchConnection.domain + ":" + couchConnection.port + "/zfielddbuserscouch";

              var zUserInfoDb = require('nano')(zUserInfoDbConnect);

              zUserInfoDb.get(username, function(err, body) {
                if (!err) {
                  var userDoc = {
                    "gravatar": body.gravatar,
                    "username": username,
                    "authUrl": couchConnection.authUrl,
                    "id": username,
                    "collection": "users"
                  };

                  // Save new user record to corpus
                  corpusDb.insert(userDoc, username, function(err, body) {
                    if (!err) {
                      console.log("Successfully added new user doc to corpus.");
                    } else {
                      console.log(err);
                    }
                  });
                } else {
                  console.log(err);
                }
              });
            }
          });

          return callback(false, username, {});
        } else {
          return callback(true, username, {});
        }
      });
    }
  });
};

module.exports.updateRoles = updateRoles;

var addRoleToUserInfo = function(couchConnection, username, roles,
  successcallback, errorcallback) {
  console.log(new Date() + " In addRoleToUser " + util.inspect(roles) + " to " + username + " on " + couchConnection.pouchname);

  var connect = couchConnection.protocol + couch_keys.username + ":" + couch_keys.password + "@" + couchConnection.domain + ":" + couchConnection.port + "/_users";

  var db = require('nano')(connect);
  var userid = 'org.couchdb.user:' + username,
    _ = require('underscore');

  db.get(userid, function(err, body) {
    if (!err) {
      var userold = body;
      console.log(new Date() + " These are the users's roles before adding a role." + util.inspect(userold.roles));

      for (var r in roles) {
        userold.roles.push(roles[r]);
      }
      var uniqueroles = _.unique(userold.roles);
      userold.roles = uniqueroles;

      db.insert(userold, function(err, body) {
        if (!err) {
          console.log(new Date() + " User roles updated.");
        } else {
          console.log(new Date() + " User roles failed to update.");
        }
      });
    } else {
      console.log(err);
    }
  });
};

var removeUserFromDb = function(couchConnection, username) {
  var connect = couchConnection.protocol + couch_keys.username + ":" + couch_keys.password + "@" + couchConnection.domain + ":" + couchConnection.port + "/_users";

  var db = require('nano')(connect);
  var userid = 'org.couchdb.user:' + username;

  db.get(userid, function(err, body) {
    if (!err) {
      var i = body.roles.length - 1;
      do {
        if (body.roles[i].indexOf(couchConnection.pouchname) > -1) {
          body.roles.splice(i, i);
        }
        i--;
      } while (i != -1);

      db.insert(body, body._id, function(err, response) {
        if (!err) {
          console.log("Successfully removed " + couchConnection.pouchname + " from org.couchdb.user:" + username);
        }
      });

      // Delete user doc from corpus
      var corpusConnect = couchConnection.protocol + couch_keys.username + ":" + couch_keys.password + "@" + couchConnection.domain + ":" + couchConnection.port + "/" + couchConnection.pouchname;

      var corpusDb = require('nano')(corpusConnect);
      corpusDb.get(username, function(err, body) {
        if (!err) {
          corpusDb.destroy(username, body._rev, function(err, body) {
            if (!err) {
              console.log("Successfully removed user doc from corpus.");
            }
          });
        }
      });

    }
  });
};

/*
 * Ensures the requesting user to make the permissions
 * modificaitons, can be used for any corpus operations which require admin privildages.
 */
var isRequestingUserAnAdminOnCorpus = function(req, requestingUser, dbConn, done) {
  if (!dbConn) {
    return done({
      error: "Client didn't define the database connection."
    }, null, {
      message: "There was a problem deciding if you have permission to do this."
    });
  }

  /*
   * Check to see if the user is an admin on the corpus
   */
  if (dbConn.domain.indexOf("iriscouch") > -1) {
    dbConn.port = "6984";
  }
  var nanoforpermissions = require('nano')(dbConn.protocol + couch_keys.username + ':' + couch_keys.password + '@' + dbConn.domain + ':' + dbConn.port + dbConn.path);
  var usersdb = nanoforpermissions.db.use("_users");
  usersdb.get("org.couchdb.user:" + requestingUser, function(error, result) {
    if (error) {
      return done({
        error: "User " + requestingUser + " couldn't be found on this server"
      }, null, {
        message: "There was a problem deciding if you have permission to do this."
      });

    } else {
      var userIsAdminOnTeam = false;

      if (result) {
        var userroles = result.roles;
        userroles.forEach(function(role) {
          if (role.indexOf(dbConn.pouchname + "_" + admin) > -1) {
            userIsAdminOnTeam = true;
            return done(null, requestingUser, null);
          }
        });
      }
      /* Catch all */
      if (userIsAdminOnTeam == false) {
        return done({
          error: "User was found but didnt have permission."
        }, null, {
          info: "User does not have permission to perform this action."
        });
      }
    }
  });
};

module.exports.isRequestingUserAnAdminOnCorpus = isRequestingUserAnAdminOnCorpus;


var getCouchConnectionFromServerCode = function(serverCode) {
  serverCode = serverCode.toLowerCase();
  var couchConnection = {};
  if (serverCode == "localhost") {
    couchConnection = {
      "protocol": "http://",
      "domain": "localhost",
      "port": "5984",
      "pouchname": "firstcorpus",
      "path": "",
      "authUrl": "https://authdev.lingsync.org",
      "userFriendlyServerName": "LingSync Localhost"
    };
  } else if (serverCode == "testing") {
    couchConnection = {
      "protocol": "https://",
      "domain": "corpusdev.lingsync.org",
      "port": "443",
      "pouchname": "default",
      "path": "",
      "authUrl": "https://authdev.lingsync.org",
      "userFriendlyServerName": "LingSync Beta"
    };
  } else if (serverCode == "beta") {
    couchConnection = {
      "protocol": "https://",
      "domain": "corpusdev.lingsync.org",
      "port": "443",
      "pouchname": "default",
      "path": "",
      "authUrl": "https://authdev.lingsync.org",
      "userFriendlyServerName": "LingSync Beta"
    };
  } else if (serverCode == "production") {
    couchConnection = {
      "protocol": "https://",
      "domain": "corpus.lingsync.org",
      "port": "443",
      "pouchname": "default",
      "path": "",
      "authUrl": "https://auth.lingsync.org",
      "userFriendlyServerName": "LingSync.org"
    };
  } else if (serverCode == "mcgill") {
    couchConnection = {
      "protocol": "https://",
      "domain": "corpusdev.lingsync.org",
      "port": "443",
      "pouchname": "default",
      "path": "",
      "authUrl": "https://authdev.lingsync.org",
      "userFriendlyServerName": "McGill ProsodyLab"
    };
  } else {
    //TODO dont error silently and return a default, return an error so the user can choose a known server?
    couchConnection = {
      "protocol": "https://",
      "domain": "corpusdev.lingsync.org",
      "port": "443",
      "pouchname": "default",
      "path": "",
      "authUrl": "https://authdev.lingsync.org",
      "userFriendlyServerName": "LingSync Beta"
    };
  }
  return couchConnection;
};

module.exports.getCouchConnectionFromServerCode = getCouchConnectionFromServerCode;

/* Prepare a corpus doc for the user's new corpus */
var createPrivateCorpusDoc = function(username, corpusTitle, couchConnection, pouchname) {
  var newPrivateCorpus = JSON.parse(JSON.stringify(private_corpus_default_template));
  newPrivateCorpus.title = corpusTitle;
  newPrivateCorpus.titleAsUrl = newPrivateCorpus.title.toLowerCase().replace(" ", "_");
  newPrivateCorpus.couchConnection = couchConnection;
  newPrivateCorpus.pouchname = pouchname;
  newPrivateCorpus.dateOfLastDatumModifiedToCheckForOldSession = JSON.parse(JSON.stringify(new Date()));
  newPrivateCorpus.confidential.secretkey = uuid.v4();
  newPrivateCorpus.timestamp = Date.now();
  newPrivateCorpus.sessionFields = JSON.parse(JSON.stringify(session_default_template)).sessionFields;
  for (var field in newPrivateCorpus.sessionFields) {
    newPrivateCorpus.sessionFields[field].value = "";
    newPrivateCorpus.sessionFields[field].mask = "";
  }
  return newPrivateCorpus;
};

module.exports.createPrivateCorpusDoc = createPrivateCorpusDoc;

var createPublicCorpusDoc = function(couchConnection, pouchname) {
  var newPublicCorpus = JSON.parse(JSON.stringify(public_corpus_default_template));
  newPublicCorpus.couchConnection = couchConnection;
  newPublicCorpus.pouchname = pouchname;
  newPublicCorpus.timestamp = Date.now();
  return newPublicCorpus;
};

module.exports.createPublicCorpusDoc = createPublicCorpusDoc;

/* Prepare an empty datalist doc for the user's new corpus */
var createDatalistDoc = function(pouchname) {
  var newDatalist = JSON.parse(JSON.stringify(datalist_default_template));
  newDatalist.pouchname = pouchname;
  newDatalist.dateCreated = JSON.parse(JSON.stringify(new Date()));
  newDatalist.dateModified = JSON.parse(JSON.stringify(new Date()));
  newDatalist.timestamp = Date.now();
  return newDatalist;
};

module.exports.createDatalistDoc = createDatalistDoc;

/* Prepare an empty session doc for the user's new corpus */
var createSessionDoc = function(pouchname) {
  var newSession = JSON.parse(JSON.stringify(session_default_template));
  newSession.pouchname = pouchname;
  newSession.dateCreated = JSON.parse(JSON.stringify(new Date()));
  newSession.dateModified = JSON.parse(JSON.stringify(new Date()));
  newSession.timestamp = Date.now();
  return newSession;
};

module.exports.createSessionDoc = createSessionDoc;