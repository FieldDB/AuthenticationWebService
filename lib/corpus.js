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

/*
Note: The dbConnection is actually the entire request. TODO this is confusing.
*/
var createNewCorpus = function(dbConnection, callback) {
  dbConnection.couchConnection = this
    .getCouchConnectionFromServerCode(dbConnection.serverCode);
  dbConnection.couchConnection.pouchname = dbConnection.body.username + "-" + dbConnection.body.newCorpusName.trim().toLowerCase().replace(
    /[!@#$^&%*()+=-\[\]\/{}|:<>?,."'`; ]/g, "_");
  console.log(new Date() + " Creating new database " + dbConnection.couchConnection.pouchname);

  var connect = dbConnection.couchConnection.protocol + couch_keys.username + ":" + couch_keys.password + "@" + dbConnection.couchConnection.domain + ":" + dbConnection.couchConnection.port;

  var server = require('nano')(connect);

  server.db.create(dbConnection.couchConnection.pouchname, function(err, body) {
    if (err) {
      console.log(err);
      return callback(true, false, err);
    }
    /*
     * Upon success of db creation, set up the collaborator, contributor
     * and admin roles for this corpus
     */
    addRoleToUserInfo(dbConnection, dbConnection.body.username, [
      dbConnection.couchConnection.pouchname + "_" + admin,
      dbConnection.couchConnection.pouchname + "_" + contributor,
      dbConnection.couchConnection.pouchname + "_" + collaborator,
      dbConnection.couchConnection.pouchname + "_" + commenter
    ]);

    var securityParamsforNewDB = {
      "admins": {
        "names": [dbConnection.body.username],
        "roles": [dbConnection.couchConnection.pouchname + "_" + admin]
      },
      "members": {
        "names": [],
        "roles": [
          dbConnection.couchConnection.pouchname + "_" + collaborator,
          dbConnection.couchConnection.pouchname + "_" + contributor
        ]
      }
    };

    var newDbConnect = connect + "/" + dbConnection.couchConnection.pouchname;

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
    var private_corpus_template = createPrivateCorpusDoc(dbConnection.body.username, dbConnection.body.newCorpusName, dbConnection.couchConnection, dbConnection.couchConnection.pouchname);
    var public_corpus_template = createPublicCorpusDoc(dbConnection.couchConnection, dbConnection.couchConnection.pouchname);
    var datalist_template = createDatalistDoc(dbConnection.couchConnection.pouchname);
    var session_template = createSessionDoc(dbConnection.couchConnection.pouchname);

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
    var newActivityFeedConnect = connect + "/" + dbConnection.couchConnection.pouchname + "-activity_feed";
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
var updateRoles = function(dbConnection, callback) {
  // TODO Add/Remove corpora from zfielddbuserscouch?

  dbConnection.couchConnection = this.getCouchConnectionFromServerCode(dbConnection.body.serverCode);
  dbConnection.couchConnection.pouchname = dbConnection.body.userRoleInfo.pouchname;

  var username = dbConnection.body.userRoleInfo.usernameToModify;

  if (dbConnection.body.userRoleInfo.removeUser && dbConnection.body.userRoleInfo.removeUser == true) {
    console.log("Removing permissions for " + username + " from " + dbConnection.couchConnection.pouchname);
    removeUserFromDb(dbConnection, username);
    return callback(false, username, {});
  }

  var roles = [];
  if (dbConnection.body.userRoleInfo.admin == true) {
    roles.push(dbConnection.couchConnection.pouchname + "_" + admin);
  }
  if (dbConnection.body.userRoleInfo.reader == true) {
    roles.push(dbConnection.couchConnection.pouchname + "_" + collaborator);
  }
  if (dbConnection.body.userRoleInfo.writer == true) {
    roles.push(dbConnection.couchConnection.pouchname + "_" + contributor);
  }

  // Check to see if user exists before adding roles
  var connect = dbConnection.couchConnection.protocol + couch_keys.username + ":" + couch_keys.password + "@" + dbConnection.couchConnection.domain + ":" + dbConnection.couchConnection.port + "/_users";

  var db = require('nano')(connect);
  var userid = 'org.couchdb.user:' + username;

  db.get(userid, function(err, body) {
    if (!err) {
      // User exists on server, so adding new user roles
      addRoleToUserInfo(dbConnection, username, roles);

      // Add user doc in corpus if it does not already exist
      var corpusConnect = dbConnection.couchConnection.protocol + couch_keys.username + ":" + couch_keys.password + "@" + dbConnection.couchConnection.domain + ":" + dbConnection.couchConnection.port + "/" + dbConnection.couchConnection.pouchname;

      var corpusDb = require('nano')(corpusConnect);
      corpusDb.get(username, function(err, body) {
        if (!err) {
          // Do nothing if user already exists
        } else {
          // Add new user to DB
          // Get gravatar hash
          var zUserInfoDbConnect = dbConnection.couchConnection.protocol + couch_keys.username + ":" + couch_keys.password + "@" + dbConnection.couchConnection.domain + ":" + dbConnection.couchConnection.port + "/zfielddbuserscouch";

          var zUserInfoDb = require('nano')(zUserInfoDbConnect);

          zUserInfoDb.get(username, function(err, body) {
            if (!err) {
              var userDoc = {
                "gravatar": body.gravatar,
                "username": username,
                "authUrl": dbConnection.couchConnection.authUrl,
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
};

module.exports.updateRoles = updateRoles;

var addRoleToUserInfo = function(dbConnection, username, roles,
  successcallback, errorcallback) {
  console.log(new Date() + " In addRoleToUser " + util.inspect(roles) + " to " + username + " on " + dbConnection.couchConnection.pouchname);

  var connect = dbConnection.couchConnection.protocol + couch_keys.username + ":" + couch_keys.password + "@" + dbConnection.couchConnection.domain + ":" + dbConnection.couchConnection.port + "/_users";

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

var removeUserFromDb = function(dbConnection, username) {
  var connect = dbConnection.couchConnection.protocol + couch_keys.username + ":" + couch_keys.password + "@" + dbConnection.couchConnection.domain + ":" + dbConnection.couchConnection.port + "/_users";

  var db = require('nano')(connect);
  var userid = 'org.couchdb.user:' + username;

  db.get(userid, function(err, body) {
    if (!err) {
      var i = body.roles.length - 1;
      do {
        if (body.roles[i]
          .indexOf(dbConnection.couchConnection.pouchname) > -1) {
          body.roles.splice(i, i);
        }
        i--;
      } while (i != -1);

      db.insert(body, body._id, function(err, response) {
        if (!err) {
          console.log("Successfully removed " + dbConnection.couchConnection.pouchname + " from org.couchdb.user:" + username);
        }
      });

      // Delete user doc from corpus
      var corpusConnect = dbConnection.couchConnection.protocol + couch_keys.username + ":" + couch_keys.password + "@" + dbConnection.couchConnection.domain + ":" + dbConnection.couchConnection.port + "/" + dbConnection.couchConnection.pouchname;

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

var getCouchConnectionFromServerCode = function(serverCode) {
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
    couchConnection = {
      "protocol": "http://",
      "domain": "localhost",
      "port": "5984",
      "pouchname": "firstcorpus",
      "path": "",
      "authUrl": "https://authdev.lingsync.org",
      "userFriendlyServerName": "LingSync Localhost"
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
  return newPrivateCorpus;
};

module.exports.createPrivateCorpusDoc = createPrivateCorpusDoc;

var createPublicCorpusDoc = function(couchConnection, pouchname) {
  var newPublicCorpus = JSON.parse(JSON.stringify(public_corpus_default_template));
  newPublicCorpus.couchConnection = couchConnection;
  newPublicCorpus.pouchname = pouchname;
  newPublicCorpus.timestamp = Date.now();
  newPublicCorpus._id = "corpus";
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