#!/usr/bin/env node
const config = require('config');
const https = require('https');

let server;
const service = require('../auth_service');

service.set('port', config.httpsOptions.port);

const whenReady = new Promise((resolve) => {
  if (process.env.NODE_ENV === 'production') {
    server = service.listen(config.httpsOptions.port, () => {
      // eslint-disable-next-line no-console
      console.log('Running in production mode behind an Nginx proxy, Listening on http port %d', server.address().port);
      resolve(server);
    });
  } else {
    /**
     * Ask https to turn on the service
     */
    server = https.createServer(config.httpsOptions, service).listen(service.get('port'), () => {
      // eslint-disable-next-line no-console
      console.log(`HTTPS Express server listening on https://localhost:${server.address().port}`);
      resolve(server);
    });
  }
});

module.exports = {
  ready: whenReady,
  server,
  service,
};
