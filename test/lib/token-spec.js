const debug = require('debug')('test:lib:token');
const { expect } = require('chai');

const AsToken = require('../../lib/token');

describe('AsToken', () => {
  it('should load', () => {
    expect(typeof AsToken).to.deep.equal('object');
  });

  describe('config', () => {
    it('should have a prefix', () => {
      expect(typeof AsToken.config.jwt).to.deep.equal('object');
      expect(typeof AsToken.config.jwt.prefix).to.deep.equal('string');
    });

    it('should have a public key', () => {
      expect(typeof AsToken.config.jwt.public).to.deep.equal('string');
      expect(AsToken.config.jwt.public.length).to.deep.equal(271);
    });

    it('should have a private key', () => {
      expect(AsToken.config.jwt.private).to.not.equal(undefined);
    });
  });

  describe('create token', () => {
    it('should have a test public key', () => {
      expect(typeof AsToken.config.test.public).to.deep.equal('string');
      expect(AsToken.config.test.public.length).to.deep.equal(271);
    });

    it('should have a test private key', () => {
      expect(typeof AsToken.config.test.private).to.deep.equal('string');
      expect(AsToken.config.test.private.length).to.deep.equal(887);
    });

    it('should support json', () => {
      const json = {
        username: 'hi',
        server: {
          url: 'http://localhost:3000',
        },
      };
      AsToken.config.jwt.private = AsToken.config.test.private;
      const token = AsToken.sign(json);
      expect(typeof token).to.deep.equal('string');
      expect(token).to.contain(AsToken.config.jwt.prefix);
      expect(token.length).above(300);
    });
  });

  describe('verify token', () => {
    // beforeEach(function() {
    //   AsToken.config.jwt.private = AsToken.config.test.private;
    // });

    // afterEach(function() {
    //   delete AsToken.config.jwt.private;
    // });

    const json = {
      username: 'anonymous',
      client_id: 'abc123',
      roles: [
        'anonymous-sand-reader',
        'anonymous-sand-commenter',
        'anonymous-bird-admin',
        'testuser-sand-reader',
      ],
    };

    it('should verify the token and return contents', () => {
      const bearerToken = `Bearer ${AsToken.sign(json)}`;
      debug(bearerToken);

      const decoded = AsToken.verify(bearerToken);
      expect(decoded).to.deep.equal({
        username: 'anonymous',
        client_id: 'abc123',
        iat: decoded.iat,
        exp: decoded.exp,
        roles: [
          'anonymous-sand-reader',
          'anonymous-sand-commenter',
          'anonymous-bird-admin',
          'testuser-sand-reader',
        ],
      });

      expect(new Date(decoded.exp).getFullYear()).to.deep.equal(1970);
      expect(new Date(decoded.exp * 1000).getFullYear()).to.deep.equal(new Date().getFullYear());
    });

    it('should throw if token is expired', () => {
      const expired = 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6ImhpIiwic2Vydm'
        + 'VyIjp7InVybCI6Imh0dHA6Ly9sb2NhbGhvc3Q6MzAwMCJ9LCJpYXQiOjE0NjgzMzMyNDgs'
        + 'ImV4cCI6MTQ2ODMzMzMwOH0.nwzdDX3VXC2wxgQVir0IbH8V8Kpafdda4fz3mB__0qSt8Y'
        + 'jHkwoLgzHsI7g_40dfVkyTj4GPbAqyKMDKhNlWrxZzIdUJnIye9o8tH2NwzxA9n7lB6T2a'
        + 'sBE-YauzF5P7Pjdi4NY6zkDMf5AUNzeAy2kpdQUtiG483NeEX5HpOAg';

      try {
        const verified = AsToken.verify(expired);
        throw verified;
      } catch (err) {
        expect(err.message).to.deep.equal('jwt expired');
      }
    });

    it('should throw if token has been mutated', () => {
      const mutated = 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6ImFub255bW9'
        + '1cyIsImNsaWVudF9pZCI6ImFiYzEyMyIsInJvbGVzIjpbImFub255bW91cy1zYW5kLXJlY'
        + 'WRlciIsImFub255bW91cy1zYW5kLWNvbW1lbnRlciIsImFub255bW91cy1iaXJkLWFkbWl'
        + 'uIiwidGVzdHVzZXItc2FuZC1yZWFkZXIiLCJzb21lb25lZWxzZS1zdHVmZi1oYWNrZXIiX'
        + 'SwiaWF0IjoxNDY4MzMzNjM5fQ.ULTf-gp22_GEioTl'
        + 'FDWV4WMHwZklb3QFevdjU0L9ZERaPQFPKjpusNcDOtPQZr0BcZXpBfboUpnD2vejgkdp11'
        + 'DvKt7Y-QDmSwlajPgkf5m6-Q4HJO3dq5Ul-D8pJM16-u4tOQMH9N5ORs-'
        + 'zcDlRDOvOsyUhc2CAtCToblp1vhU';

      try {
        const decoded = AsToken.decode(mutated);
        expect(decoded).to.deep.equal({
          username: 'anonymous',
          client_id: 'abc123',
          iat: decoded.iat,
          roles: [
            'anonymous-sand-reader',
            'anonymous-sand-commenter',
            'anonymous-bird-admin',
            'testuser-sand-reader',
            'someoneelse-stuff-hacker',
          ],
        });

        const verified = AsToken.verify(mutated);
        expect(verified).to.equal('Should not get here');
      } catch (err) {
        expect(err.message).to.deep.equal('invalid signature');
      }
    });

    it('should throw if token is not a token', () => {
      const broken = 'eyJhbp1vhU';

      try {
        const verified = AsToken.verify(broken);
        throw verified;
      } catch (err) {
        expect(err.message).to.deep.equal('jwt malformed');
      }
    });
  });
});
