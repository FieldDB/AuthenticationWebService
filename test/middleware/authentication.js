const { expect } = require('chai');
const AsToken = require('../../lib/token');

const authentication = require('../../middleware/authentication');

describe('middleware/authentication', () => {
  it('should load', () => {
    expect(authentication).to.be.a('object');
    expect(authentication.jwt).to.be.a('function');
    expect(authentication.requireAuthentication).to.be.a('function');
  });

  describe('jwt', () => {
    it('should decode user from the token', (done) => {
      const token = AsToken.sign({
        user: {
          id: '123',
          something: 'else',
        },
        client: {
          id: 'test-client',
          here: 'too',
        },
      }, 60 * 24);

      const bearerToken = `Bearer ${token}`;
      const req = {
        headers: {
          authorization: bearerToken,
        },
      };

      const res = {
        headers: {},
        locals: {},
        set(header, value) {
          this.headers[header.toLowerCase()] = value;
        },
      };

      authentication.jwt(req, res, (arg1, arg2, arg3, arg4) => {
        expect(arg4).to.equal(undefined);

        expect(req.user).to.deep.equal(res.locals.user);
        expect(req.user).to.deep.equal({
          id: '123',
          something: 'else',
        });

        expect(res.headers.authorization).equal(bearerToken);
        done();
      });
    });

    it('should decode expired users', (done) => {
      const token = 'Bearer v1/eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJhY2Nlc3NUb2tlbiI6ImFkNWEyZDQwLTA1MGUtMTFlOS1hYThhLTNmMzE5MThkMjM3YiIsImNsaWVudCI6eyJjbGllbnRfaWQiOiJ0ZXN0LWNsaWVudCJ9LCJ1c2VyIjp7Im5hbWUiOnsiZ2l2ZW5OYW1lIjoiQW5vbnkiLCJmYW1pbHlOYW1lIjoiTW91c2UifSwiaWQiOiI2ZTYwMTdiMC00MjM1LTExZTYtYWZiNS04ZDc4YTM1YjJmNzkiLCJyZXZpc2lvbiI6IjE5LTE0Njc2NzEwOTY2NzMiLCJ1c2VybmFtZSI6InRlc3QtYW5vbnltb3VzZSIsImVtYWlsIjoiIiwiZ3JhdmF0YXIiOiIxYjYwYjVlMjA0NmEyMWFhNDU2ZDk0ODBiYTBkYThkMSIsImRlc2NyaXB0aW9uIjoiRnJpZW5kbHkiLCJsYW5ndWFnZSI6InpoIiwiY3JlYXRlZEF0IjoiMjAxNi0wNi0yMlQyMjoxOTo1My4zODdaIiwidXBkYXRlZEF0IjoiMjAxNi0wNi0yMlQyMjoyNDo1Ni42NzNaIn0sImlhdCI6MTU0NTM4OTYyMCwiZXhwIjoxNTQ1MzkxMDYwfQ.R-x8mWE9--i4JovTrYDCX5bUzeHlg2weDs_cxMlElX4htnat5BSDSA-tdqNEdCnZRYJG4NY00mzhbn01gfRWFXbMxBnSJvnH3VkxlBvlzXlxpzl90UEHtCeNg0M4lNpypFwMU7bhU3LhQBYdToNJatsF8FAQn6oRstJiC4rtCl0';
      const req = {
        headers: {
          authorization: token,
        },
      };

      const res = {
        headers: {},
        locals: {},
        set(header, value) {
          this.headers[header.toLowerCase()] = value;
        },
      };

      authentication.jwt(req, res, (arg1, arg2, arg3, arg4) => {
        expect(arg4).to.equal(undefined);

        expect(req.user).to.deep.equal(res.locals.user);
        expect(req.user).to.deep.equal({
          name: {
            givenName: 'Anony',
            familyName: 'Mouse',
          },
          id: '6e6017b0-4235-11e6-afb5-8d78a35b2f79',
          revision: req.user.revision,
          // deletedAt: null,
          // deletedReason: '',
          username: 'test-anonymouse',
          email: '',
          gravatar: req.user.gravatar,
          description: 'Friendly',
          language: 'zh',
          // hash: req.user.hash,
          createdAt: req.user.createdAt,
          updatedAt: req.user.updatedAt,
          expired: true,
          // iat: req.user.iat
        });

        expect(res.headers.authorization).equal(undefined);

        done();
      });
    });
  });
});
