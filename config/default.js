var deploy_target = process.env.NODE_ENV || 'localhost';
// backward compatible
if (deploy_target === 'test') {
  deploy_target = 'beta';
}
var Connection = require('fielddb/api/corpus/Connection').Connection;
Connection.knownConnections.thisserver = Connection.knownConnections[deploy_target];
Connection.knownConnections.testing = Connection.knownConnections.beta;
Connection.knownConnections.dyslexdisorth = Connection.knownConnections.thisserver.clone();
Connection.knownConnections.dyslexdisorth.userFriendlyServerName = 'DyslexDisorth';
Connection.knownConnections.dyslexdisorth.brandLowerCase = 'dyslexdisorth';
Connection.knownConnections.dyslexdisorth.serverLabel = 'dyslexdisorth';
Connection.knownConnections.ilanguagecloud = Connection.knownConnections.thisserver.clone();
Connection.knownConnections.ilanguagecloud.userFriendlyServerName = 'wordcloud.ca';
Connection.knownConnections.ilanguagecloud.brandLowerCase = 'ilanguagecloud';
Connection.knownConnections.ilanguagecloud.serverLabel = 'ilanguagecloud';
Connection.knownConnections.wordcloud = Connection.knownConnections.thisserver.clone();
Connection.knownConnections.wordcloud.userFriendlyServerName = 'wordcloud.ca';
Connection.knownConnections.wordcloud.brandLowerCase = 'wordcloud';
Connection.knownConnections.wordcloud.serverLabel = 'wordcloud';
Connection.knownConnections.kartulispeechrecognition = Connection.knownConnections.thisserver.clone();
Connection.knownConnections.kartulispeechrecognition.userFriendlyServerName = 'http://batumi.github.io';
Connection.knownConnections.kartulispeechrecognition.brandLowerCase = 'kartulispeechrecognition';
Connection.knownConnections.kartulispeechrecognition.serverLabel = 'kartulispeechrecognition';
Connection.knownConnections.georgiantogether = Connection.knownConnections.thisserver.clone();
Connection.knownConnections.georgiantogether.userFriendlyServerName = 'Learn X';
Connection.knownConnections.georgiantogether.brandLowerCase = 'georgiantogether';
Connection.knownConnections.georgiantogether.serverLabel = 'georgiantogether';
module.exports = {
  sessionKey: 'uwotm8',
  httpsOptions: {
    key: 'fielddb_debug.key',
    cert: 'fielddb_debug.crt',
    port: '3183',
    protocol: 'https://'
  },
  usersDbConnection: {
    url: 'http://localhost:5984',
    dbname: 'theuserscouch'
  },
  couchKeys: {
    username: 'admin',
    password: 'none'
  },
  externalOrigin: Connection.knownConnections.thisserver.authUrls[0],
  sampleUsers: {
    public: ['public'],
    fieldlinguist: ['lingllama', 'teammatetiger'],
    gamified: ['alakazou', 'valeriebilleentete']
  },
  mailConnection: {
    host: 'smtp.gmail.com',
    port: 587,
    secure: true, // use TLS
    service: '',
    auth: {
      user: '',
      pass: ''
    }
  },
  newUserMailOptions: function newUserMailOptions() {
    return {
      from: 'none@localhost', // sender address
      to: '', // list of receivers
      subject: 'Welcome to localhost!', // Subject line
      text: 'Your username is: ', // plaintext // body
      html: 'Your username is: '
    };
  },
  welcomeToCorpusTeamMailOptions: function welcomeToCorpusTeamMailOptions() {
    return {
      from: 'none@localhost', // sender address
      to: '', // list of receivers
      subject: '[LingSync.org] Someone has granted you access to their corpus', // Subject line
      text: "The new corpus's identifier is: ", // plaintext // body
      html: "The new corpus's identifier is: "
    };
  },
  suspendedUserMailOptions: function suspendedUserMailOptions() {
    return {
      from: 'none@localhost', // sender address
      to: '', // list of receivers
      subject: 'New Temporary Password', // Subject line
      text: 'Your username is: ', // plaintext // body
      html: 'Your username is: '
    };
  },
  newUserMailOptionsPhophlo: function newUserMailOptionsPhophlo() {
    return {
      from: 'none@localhost', // sender address
      to: '', // list of receivers
      subject: 'Welcome to localhost!', // Subject line
      text: 'Your username is: ', // plaintext // body
      html: 'Your username is: '
    };
  },
  welcomeToCorpusTeamMailOptionsPhophlo: function welcomeToCorpusTeamMailOptionsPhophlo() {
    return {
      from: 'none@localhost', // sender address
      to: '', // list of receivers
      subject: '[LingSync.org] Someone has granted you access to their corpus', // Subject line
      text: "The new corpus's identifier is: ", // plaintext // body
      html: "The new corpus's identifier is: "
    };
  },
  suspendedUserMailOptionsPhophlo: function suspendedUserMailOptionsPhophlo() {
    return {
      from: 'none@localhost', // sender address
      to: '', // list of receivers
      subject: 'New Temporary Password', // Subject line
      text: 'Your username is: ', // plaintext // body
      html: 'Your username is: '
    };
  }
};
