var util = require('util');
var debug = require('debug');

var build_headers_from_request = function () {};

module.exports = function FieldDB(args) {
  var authenticationfunctions = args.authentication || {};
  var corpus = args.corpus || {};
  /**
	 * Responds to requests for adding a corpus to a user, if successful replies with the dbname of the new corpus in a string and a corpusaded = true
	 */
  this.createFieldDBsApiDocs = {
    path: '/fielddbs/{dbidentifier}',
    operations: [{
      method: 'POST',
      summary: 'Create a database for dbidentifier',
      notes: 'Returns a database built for dbidentifier, accepts optional database details to be included in the resulting database.',
      type: 'User',
      nickname: 'createFieldDBByUsername',
      parameters: [{
        name: 'dbidentifier',
        description: 'Database identifier that will be looked up and created if new',
        required: true,
        type: 'string',
        paramType: 'path'
      }],
      responseMessages: [{
        code: 201,
        message: 'Database created'
      }, {
        code: 301,
        message: 'Database moved permanenty'
      }, {
        code: 304,
        message: 'Database not modified, identical'
      }, {
        code: 400,
        message: 'Invalid database details supplied'
      }, {
        code: 401,
        message: 'Unauthorized'
      }, {
        code: 403,
        message: 'Forbidden'
      }, {
        code: 404,
        message: 'Database not found'
      }, {
        code: 409,
        message: 'Database update conflict'
      }, {
        code: 410,
        message: 'Database gone'
      }, {
        code: 500,
        message: 'Internal server error'
      }, {
        code: 501,
        message: 'API method not implemented'
      }, {
        code: 503,
        message: 'Database service unavailable'
      }]
    }]
  };
  this.createFieldDBs = function createFieldDBs(req, res) {
    authenticationfunctions.authenticateUser(req.body.username, req.body.password, req, function (err, user, info) {
      var returndata = {};
      if (err) {
        debug(new Date() + ' There was an error in the authenticationfunctions.authenticateUser:\n' + util.inspect(err));
        returndata.userFriendlyErrors = [info.message];
      }
      if (!user) {
        returndata.userFriendlyErrors = [info.message];
      } else {
        returndata.corpusadded = true;
        returndata.info = [info.message];
        // Add a new corpus for the user
        corpus.createNewCorpus(req, function (err, corpus, info) {
          if (err) {
            debug(new Date() + ' There was an error in corpus.createNewCorpus');
            returndata.userFriendlyErrors = ['There was an error creating your corpus. ' + req.body.newCorpusName];
            if (err.status_code === 412) {
              err.status = 302;
              returndata.status = 302;
              res.status(302);
            }
          }
          if (!corpus) {
            returndata.userFriendlyErrors = ['There was an error creating your corpus. ' + req.body.newCorpusName];
          } else {
            returndata.corpusadded = true;
            returndata.info = ['Corpus ' + corpus.title + ' created successfully.'];
            returndata.corpus = corpus;
            // returndata.info = [ info.message ];
            debug(new Date() + ' Returning corpus added okay:\n');
          }
          debug(new Date() + ' Returning response:\n' + util.inspect(returndata));
          var corsHeaders = build_headers_from_request(req);
          for (var key in corsHeaders) {
            var value = corsHeaders[key];
            res.setHeader(key, value);
          }
          res.send(returndata);
        });
      }
    });
  };
  this.updateFieldDBs = function updateFieldDBs(req, res, next) {
    res.send('updateFieldDBs');
  };
  this.getFieldDBs = function getFieldDBs(req, res, next) {
    res.send({
      error: 'Unauthorized'
    });
  };
  this.deleteFieldDBs = function deleteFieldDBs(req, res, next) {
    res.send({
      error: 'Unauthorized'
    });
  };
  /**
	 * Responds to requests for adding a corpus role/permission to a user, if successful replies with the user's details
	 * as json
	 */
  this.addFieldDBTeamMembers = function addFieldDBTeamMembers(req, res, next) {
    authenticationfunctions.authenticateUser(req.body.username, req.body.password, req, function (err, user, info) {
      var returndata = {};
      if (err) {
        debug(new Date() + ' There was an error in the authenticationfunctions.authenticateUser:\n' + util.inspect(err));
        returndata.userFriendlyErrors = [info.message];
      }
      if (!user) {
        returndata.userFriendlyErrors = [info.message];
      } else {
        returndata.roleadded = true;
        returndata.info = [info.message];
        // Add a role to the user
        authenticationfunctions.addRoleToUser(req, function (err, roles, info) {
          if (err) {
            debug(new Date() + ' There was an error in the authenticationfunctions.addRoleToUser:\n' + util.inspect(err));
            returndata.userFriendlyErrors = [info.message];
          }
          if (!roles) {
            returndata.userFriendlyErrors = [info.message];
          } else {
            returndata.roleadded = true;
            returndata.info = [info.message];
            // returndata.userFriendlyErrors = ["Faking an error"];
            debug(new Date() + ' Returning role added okay:\n');
          }
          debug(new Date() + ' Returning response:\n' + util.inspect(returndata));
          res.send(returndata);
        });
      }
    });
  };
  /**
 * Responds to requests for adding a user in a role to a corpus, if successful replies with corpusadded =true and an info string containgin the roles
 TODO return something useful as json
 */
  this.updateFieldDBTeamMembers = function updateFieldDBTeamMembers(req, res, next) {
    authenticationfunctions.authenticateUser(req.body.username, req.body.password, req, function (err, user, info) {
      var returndata = {};
      if (err) {
        debug(new Date() + ' There was an error in the authenticationfunctions.authenticateUser:\n' + util.inspect(err));
        returndata.userFriendlyErrors = [info.message];
      }
      if (!user) {
        returndata.userFriendlyErrors = [info.message];
      } else {
        returndata.corpusadded = true;
        returndata.info = [info.message];
        // Update user roles for corpus
        corpus.updateRoles(req, function (err, roles, info) {
          if (err) {
            debug(new Date() + ' There was an error in corpus.updateRoles\n');
            returndata.userFriendlyErrors = [info.message];
          }
          if (!roles) {
            returndata.userFriendlyErrors = ['There was an error updating the user roles.'];
          } else {
            returndata.corpusadded = true;
            returndata.info = ['User roles updated successfully for ' + roles];
            //  returndata.info = [ info.message ];
            debug(new Date() + ' Returning corpus role added okay:\n');
          }
          debug(new Date() + ' Returning response:\n' + util.inspect(returndata));
          res.send(returndata);
        });
      }
    });
  };
  /**
	 * Responds to requests for a list of team members on a corpus, if successful replies with a list of
	 * usernames as json
	 */
  this.getFieldDBTeamMembers = function getFieldDBTeamMembers(req, res, next) {
    var returndata = {};
    authenticationfunctions.fetchCorpusPermissions(req, function (err, users, info) {
      if (err) {
        debug(new Date() + ' There was an error in the authenticationfunctions.fetchCorpusPermissions:\n' + util.inspect(err));
        returndata.userFriendlyErrors = [info.message];
      }
      if (!users) {
        returndata.userFriendlyErrors = [info.message];
      } else {
        returndata.users = users;
        returndata.info = [info.message];
        // returndata.userFriendlyErrors = ["Faking an error to test"];
      }
      debug(new Date() + ' Returning response:\n' + util.inspect(returndata));
      debug(new Date() + ' Returning the list of users on this corpus as json:\n' + util.inspect(returndata.users));
      res.send(returndata);
    });
  };
  this.deleteFieldDBTeamMembers = function deleteFieldDBTeamMembers(req, res, next) {
    res.send('deleteFieldDBTeamMembers');
  };
  this.docs = [];
  this.docs.push(this.createFieldDBsApiDocs);
  return this;
};
