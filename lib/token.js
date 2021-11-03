var fs = require('fs');
var jsonwebtoken = require('jsonwebtoken');

var publicKey = require('../config/jwt_debug.pub');
// Include a smaple debugging key for tests
var testPrivateKey = fs.readFileSync(__dirname + '/../config/jwt_debug.pem', 'utf8');
var testPublicKey = require('../config/jwt_debug.pub');

var AsToken = {
  config: {
    jwt: {
      algorithm: 'RS256',
      prefix: 'v1/',
      public: publicKey,
      private: testPrivateKey
    },
    test: {
      private: testPrivateKey,
      public: testPublicKey
    }
  },
  jsonwebtoken: jsonwebtoken,
  sign: function (json, expiresIn) {
    if (!json) {
      throw new Error('Cannot sign empty value');
    }

    return this.config.jwt.prefix + jsonwebtoken.sign(json, this.config.jwt.private, {
      algorithm: this.config.jwt.algorithm,
      expiresIn: expiresIn === undefined ? 60 : expiresIn // minutes
    });
  },
  verify: function (token) {
    token = token.replace(/bearer +/i, '');
    token = token.replace(this.config.jwt.prefix, '');

    return jsonwebtoken.verify(token, this.config.test.public, {
      algorithm: this.config.jwt.algorithm
    });
  },
  decode: function (token) {
    token = token.replace(/bearer +/i, '');
    token = token.replace(this.config.jwt.prefix, '');

    return jsonwebtoken.decode(token, this.config.test.public, {
      algorithm: this.config.jwt.algorithm
    });
  }
};

module.exports = AsToken;
