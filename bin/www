#!/usr/bin/env node
var config = require('config');
var https = require('https');
var url = require('url');

var server;
var service = require('../auth_service');
service.set('port', config.httpsOptions.port);

var whenReady = new Promise(function(resolve) {
  if (process.env.NODE_ENV === 'production') {
    server = service.listen(config.httpsOptions.port, function() {
      console.log('Running in production mode behind an Nginx proxy, Listening on http port %d', server.address().port);
      resolve(server);
    });
  } else {
    /**
     * Ask https to turn on the service
     */
    server = https.createServer(config.httpsOptions, service).listen(service.get('port'), function() {
      console.log('HTTPS Express server listening on https://localhost:' + server.address().port);
      resolve(server);
    });
  }
});

module.exports = {
  ready: whenReady,
  server: server,
  service: service,
};
