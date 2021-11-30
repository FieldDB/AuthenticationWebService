const fs = require('fs');
const path = require('path');
// install jsonwebtoken if this is used
// eslint-disable-next-line  import/no-extraneous-dependencies
const jsonwebtoken = require('jsonwebtoken');

const publicKey = require('../config/jwt_debug.pub');
// Include a smaple debugging key for tests
const testPrivateKey = fs.readFileSync(path.join(__dirname, '/../config/jwt_debug.pem'), 'utf8');
const testPublicKey = require('../config/jwt_debug.pub');

const AsToken = {
  config: {
    jwt: {
      algorithm: 'RS256',
      prefix: 'v1/',
      public: publicKey,
      private: testPrivateKey,
    },
    test: {
      private: testPrivateKey,
      public: testPublicKey,
    },
  },
  jsonwebtoken,
  sign: function sign(json, expiresIn) {
    if (!json) {
      throw new Error('Cannot sign empty value');
    }

    return this.config.jwt.prefix + jsonwebtoken.sign(json, this.config.jwt.private, {
      algorithm: this.config.jwt.algorithm,
      expiresIn: expiresIn === undefined ? 60 : expiresIn, // minutes
    });
  },
  verify: function verify(tokenString) {
    const token = tokenString
      .replace(/bearer +/i, '')
      .replace(this.config.jwt.prefix, '');

    return jsonwebtoken.verify(token, this.config.test.public, {
      algorithm: this.config.jwt.algorithm,
    });
  },
  decode: function decode(tokenString) {
    const token = tokenString
      .replace(/bearer +/i, '')
      .replace(this.config.jwt.prefix, '');

    return jsonwebtoken.decode(token, this.config.test.public, {
      algorithm: this.config.jwt.algorithm,
    });
  },
};

module.exports = AsToken;
