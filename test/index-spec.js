'use strict';

var AsToken = exports.AsToken || require('./..');

describe('AsToken', function() {
  it('should load', function() {
    expect(AsToken).toBeDefined();
  });

  describe('config', function() {
    it('should have a prefix', function() {
      expect(AsToken.config.jwt).toBeDefined();
      expect(AsToken.config.jwt.prefix).toBeDefined();
    });

    it('should have a public key', function() {
      expect(AsToken.config.jwt.public).toBeDefined();
      expect(AsToken.config.jwt.public.length).toEqual(271);
    });

    it('should not have a private key', function() {
      expect(AsToken.config.jwt.private).toBeUndefined();
    });
  });

  describe('create token', function() {
    it('should have a test public key', function() {
      expect(AsToken.config.test.public).toBeDefined();
      expect(AsToken.config.test.public.length).toEqual(271);
    });

    it('should have a test private key', function() {
      expect(AsToken.config.test.private).toBeDefined();
      expect(AsToken.config.test.private.length).toEqual(886);
    });

    it('should support json', function() {
      var json = {
        username: 'hi',
        server: {
          url: 'http://localhost:3000'
        }
      };

      var token = AsToken.config.jwt.prefix + AsToken.jsonwebtoken.sign(json, AsToken.config.test.private, {
        algorithm: AsToken.config.jwt.algorithm,
        expiresIn: 60 // minutes
      });
      expect(token).toBeDefined();
      expect(token.length).toBeGreaterThan(300);
    });
  });

  describe('verify token', function() {
    var json = {
      username: 'anonymous',
      client_id: 'abc123',
      roles: [
        'anonymous-sand-reader',
        'anonymous-sand-commenter',
        'anonymous-bird-admin',
        'testuser-sand-reader'
      ]
    };

    var bearerToken = 'Bearer ' + AsToken.config.jwt.prefix + AsToken.jsonwebtoken.sign(json, AsToken.config.test.private, {
      algorithm: AsToken.config.jwt.algorithm,
      expiresIn: 2 // minutes
    });
    console.log(bearerToken);

    it('should decode into json', function() {
      var token = bearerToken.replace(new RegExp('Bearer ' + AsToken.config.jwt.prefix), '');

      var decoded = AsToken.jsonwebtoken.decode(token);
      expect(decoded).toEqual({
        username: 'anonymous',
        client_id: 'abc123',
        iat: decoded.iat,
        exp: decoded.exp,
        roles: [
          'anonymous-sand-reader',
          'anonymous-sand-commenter',
          'anonymous-bird-admin',
          'testuser-sand-reader'
        ]
      });

      expect(new Date(decoded.exp).getFullYear()).toEqual(1970);
      expect(new Date(decoded.exp * 1000).getFullYear()).toEqual(new Date().getFullYear());
    });

    it('should verify the token\s content', function() {
      var token = bearerToken.replace(new RegExp('Bearer ' + AsToken.config.jwt.prefix), '');

      var verified = AsToken.jsonwebtoken.verify(token, AsToken.config.test.public, {
        algorithm: AsToken.config.jwt.algorithm
      });

      expect(verified).toBeDefined();
      console.log(verified);
      expect(verified.username).toEqual('anonymous');
    });

    it('should throw if token is expired', function() {
      var expired = 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6ImhpIiwic2Vydm' +
        'VyIjp7InVybCI6Imh0dHA6Ly9sb2NhbGhvc3Q6MzAwMCJ9LCJpYXQiOjE0NjgzMzMyNDgs' +
        'ImV4cCI6MTQ2ODMzMzMwOH0.nwzdDX3VXC2wxgQVir0IbH8V8Kpafdda4fz3mB__0qSt8Y' +
        'jHkwoLgzHsI7g_40dfVkyTj4GPbAqyKMDKhNlWrxZzIdUJnIye9o8tH2NwzxA9n7lB6T2a' +
        'sBE-YauzF5P7Pjdi4NY6zkDMf5AUNzeAy2kpdQUtiG483NeEX5HpOAg'

      try {
        var verified = AsToken.jsonwebtoken.verify(expired, AsToken.config.test.public, {
          algorithm: AsToken.config.jwt.algorithm
        });
      } catch (err) {
        expect(err.message).toEqual('jwt expired');
      }
    });

    it('should throw if token has been mutated', function() {
      var mutated = 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6ImFub255bW9' +
        '1cyIsImNsaWVudF9pZCI6ImFiYzEyMyIsInJvbGVzIjpbImFub255bW91cy1zYW5kLXJlY' +
        'WRlciIsImFub255bW91cy1zYW5kLWNvbW1lbnRlciIsImFub255bW91cy1iaXJkLWFkbWl' +
        'uIiwidGVzdHVzZXItc2FuZC1yZWFkZXIiLCJzb21lb25lZWxzZS1zdHVmZi1oYWNrZXIiX' +
        'SwiaWF0IjoxNDY4MzMzNjM5fQ.ULTf-gp22_GEioTl' +
        'FDWV4WMHwZklb3QFevdjU0L9ZERaPQFPKjpusNcDOtPQZr0BcZXpBfboUpnD2vejgkdp11' +
        'DvKt7Y-QDmSwlajPgkf5m6-Q4HJO3dq5Ul-D8pJM16-u4tOQMH9N5ORs-' +
        'zcDlRDOvOsyUhc2CAtCToblp1vhU';

      try {
        var decoded = AsToken.jsonwebtoken.decode(mutated);
        expect(decoded).toEqual({
          username: 'anonymous',
          client_id: 'abc123',
          iat: decoded.iat,
          roles: [
            'anonymous-sand-reader',
            'anonymous-sand-commenter',
            'anonymous-bird-admin',
            'testuser-sand-reader',
            'someoneelse-stuff-hacker'
          ]
        });

        var verified = AsToken.jsonwebtoken.verify(mutated, AsToken.config.test.public, {
          algorithm: AsToken.config.jwt.algorithm
        });
      } catch (err) {
        expect(err.message).toEqual('invalid signature');
      }
    });


    it('should throw if token is not a token', function() {
      var broken = 'eyJhbp1vhU';

      try {
        var verified = AsToken.jsonwebtoken.verify(broken, AsToken.config.test.public, {
          algorithm: AsToken.config.jwt.algorithm
        });
      } catch (err) {
        expect(err.message).toEqual('jwt malformed');
      }
    });
  });
});
