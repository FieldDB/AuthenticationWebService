const debug = require('debug')('test:install');
const { expect } = require('chai');
const path = require('path');
const replay = require('replay');
const supertest = require('supertest');
const authWebService = process.env.URL || require('../../auth_service');

const originalLocalhosts = replay._localhosts;
const requestId = 'deprecated-spec';
replay.fixtures = path.join(__dirname, '/../fixtures/replay');

describe('/ deprecated', () => {
  before(() => {
    replay._localhosts = new Set(['127.0.0.1', '::1']);
    debug('before replay localhosts', replay._localhosts);
  });
  after(() => {
    replay._localhosts = originalLocalhosts;
    debug('after replay localhosts', replay._localhosts);
  });

  describe('/register', () => {
    /**
     * re-record instructions
     * - remove body because the body contains date created timestamps
     * - update username to equal the recorded username
     */
    it('should register a new user', () => {
      const username = process.env.REPLAY ? `test${Date.now()}` : 'test1637230388552';
      return supertest(authWebService)
        .post('/register')
        .set('x-request-id', `${requestId}-register-new`)
        .send({
          username,
          password: 'test',
        })
        .then((res) => {
          if (res.body.userFriendlyErrors) {
            // expect(res.body.userFriendlyErrors).to.deep.equal([
            //   `Username ${username} already exists, try a different username.`,
            // ]);
          } else {
            debug(JSON.stringify(res.body));
            expect(res.body.user.username).to.equal(username);
            expect(res.body.user.appbrand).to.equal('');
          }

          return supertest(`http://${username}:test@localhost:5984`)
            .get('/_session')
            .set('x-request-id', `${requestId}-register-new`)
            .set('Accept', 'application/json');
        })
        .then((res) => {
          debug(JSON.stringify(res.body));
          expect(res.status).to.equal(200, 'should have roles');
          expect(res.body).to.deep.equal({
            ok: true,
            userCtx: {
              name: username,
              roles: [
                `${username}-firstcorpus_admin`,
                `${username}-firstcorpus_writer`,
                `${username}-firstcorpus_reader`,
                `${username}-firstcorpus_commenter`,
                'public-firstcorpus_reader',
                'fielddbuser',
                'user',
              ],
            },
            info: {
              authentication_db: '_users',
              authentication_handlers: ['oauth', 'cookie', 'default'],
              authenticated: 'default',
            },
          }, 'should have roles');

          return supertest(`http://${username}:test@localhost:5984`)
            .get(`/${username}-firstcorpus/_design/lexicon/_view/lexiconNodes`)
          // .set('x-request-id', requestId + '-register')
            .set('Accept', 'application/json');
        })
        .then((res) => {
          if (res.status === 200) {
            debug(JSON.stringify(res.body));
            expect(res.status).to.equal(200, 'should replicate the lexicon');
            expect(res.body).to.deep.equal({
              rows: [{
                key: null,
                value: 6,
              }],
            }, 'should replicate the lexicon');
          } else {
            expect(res.status).to.be.oneOf([401, 404]); // delay in lexicon creation on new resources
          }
        });
    });

    it('should register wordcloud users if not already registered', () => supertest(authWebService)
      .post('/register')
      .set('x-request-id', `${requestId}-register-wordcloud`)
      .send({
        username: 'anonymouswordclouduser1401365327719',
        password: 'testtest',
        email: '',
        firstname: '',
        lastname: '',
        appbrand: 'ilanguagecloud',
      })
      .then((res) => {
        if (res.body.userFriendlyErrors) {
          expect(res.body.userFriendlyErrors).to.deep.equal([
            'Username anonymouswordclouduser1401365327719 already exists, try a different username.',
          ], JSON.stringify(res.body));
        } else {
          debug(JSON.stringify(res.body));
          expect(res.body.user.username).to.equal('anonymouswordclouduser1401365327719');
          expect(res.body.user.appbrand).to.equal('ilanguagecloud');
        }
      }));

    it('should register phophlo users if not already registered', () => supertest(authWebService)
      .post('/register')
      .set('x-request-id', `${requestId}-register-phophlo`)
      .send({
        username: 'testingphophlo',
        password: 'test',
        email: '',
        firstname: '',
        lastname: '',
        appbrand: 'phophlo',
      })
      .then((res) => {
        if (res.body.userFriendlyErrors) {
          expect(res.body.userFriendlyErrors).to.deep.equal([
            'Username testingphophlo already exists, try a different username.',
          ]);
        } else {
          debug(JSON.stringify(res.body));
          expect(res.body.user.username).to.equal('testingphophlo');
          expect(res.body.user.appbrand).to.equal('phophlo');
        }
      }));

    it('should refuse to register existing names', () => supertest(authWebService)
      .post('/register')
      .set('x-request-id', `${requestId}-register-existing`)
      .send({
        username: 'jenkins',
        password: 'phoneme',
        appbrand: 'learnx',
      })
      .then((res) => {
        if (res.body.userFriendlyErrors) {
          expect(res.body.userFriendlyErrors).to.deep.equal([
            'Username jenkins already exists, try a different username.',
          ], JSON.stringify(res.body));
        } else {
          debug(JSON.stringify(res.body));
          expect(res.body.user.username).to.equal('jenkins');
          expect(res.body.user.appbrand).to.equal('learnx');
        }
      }));

    it('should refuse to register short usernames', () => supertest(authWebService)
      .post('/register')
      .set('x-request-id', `${requestId}-register-short`)
      .send({
        username: 'ba',
        password: 'phoneme',
      })
      .then((res) => {
        expect(res.body.userFriendlyErrors).to.deep.equal([
          'Please choose a longer username `ba` is too short.',
        ]);
      }));

    it('should refuse to register non ascii usernames', () => supertest(authWebService)
      .post('/register')
      .set('x-request-id', `${requestId}-register-non-ascii`)
      .send({
        username: 'ნინო ბერიძე',
        password: 'phoneme',
      })
      .then((res) => {
        expect(res.body.userFriendlyErrors).to.deep.equal([
          "Please use '' instead (the username you have chosen isn't very safe for urls, which means your corpora would be potentially inaccessible in old browsers)",
        ]);
      }));

    it('should require a username', () => supertest(authWebService)
      .post('/register')
      .set('x-request-id', `${requestId}-register-missing`)
      .send({
        password: 'phoneme',
      })
      .then((res) => {
        expect(res.body.userFriendlyErrors).to.deep.equal([
          'Please provide a username',
        ]);
      }));
  });

  describe('/login', () => {
    before(function () {
      if (process.env.REPLAY !== 'bloody') {
        this.skip();
      }
      this.timeout(10000);

      return supertest(authWebService)
        .post('/register')
        .set('x-request-id', `${requestId}-before-login-disabled`)
        .send({
          username: 'testingdisabledusers',
          password: 'test',
          gravatar: 'b94cf47d619e67349282991c98abded7',
          appVersionWhenCreated: '2.45.05ss',
          authServerVersionWhenCreated: '3.0.19',
          created_at: '2015-05-07T14:49:49.699Z',
          updated_at: '2015-05-07T14:51:00.671Z',
          version: 'v3.2.4',
          serverlogs: {
            disabled: 'This username was reported to us as a suspicously fictitous username.',
            successfulLogins: [
              '2015-05-07T14:49:53.486Z',
              '2015-05-07T14:50:45.677Z',
              '2015-05-07T14:51:00.671Z',
            ],
          },
        })
        .then((res) => {
          debug('register testingdisabledusers', res.body);

          return supertest(authWebService)
            .post('/register')
            .set('x-request-id', `${requestId}-before-login-prototype`)
            .send({
              username: 'testingprototype',
              password: 'test',
              email: '',
            });
        })
        .then((res) => {
          debug('register testingprototype', res.body);

          return supertest(authWebService)
            .post('/register')
            .set('x-request-id', `${requestId}-before-login-spreadsheet`)
            .send({
              username: 'testingspreadsheet',
              password: 'test',
              email: '',
            });
        })
        .then((res) => {
          debug('register testingspreadsheet', res.body);
          process.env.INSTALABLE = 'true';

          return supertest(authWebService)
            .post('/register')
            .set('x-request-id', `${requestId}-before-login-lingllama`)
            .send({
              username: 'lingllama',
              password: 'phoneme',
              email: 'lingllama@example.org',
              gravatar: '54b53868cb4d555b804125f1a3969e87',
              appVersionWhenCreated: '1.28.3',
              authUrl: 'https://localhost:3183',
              created_at: '2012-11-03T21:20:58.597Z',
              updated_at: '2013-03-18T00:49:56.005Z',
              researchInterest: 'Memes',
              affiliation: 'http://lingllama.tumblr.com \n      ',
              description: "Hi! I'm a sample user, anyone can log in as me (my password is phoneme, 'cause I like memes).",
              subtitle: '',
              firstname: 'Ling',
              lastname: 'Llama',
            });
        })
        .then((res) => {
          debug('register lingllama', res.body);
        });
    });

    it('should handle invalid username', () => supertest(authWebService)
      .post('/login')
      .set('x-request-id', `${requestId}-login-invalid`)
      .send({
        username: 'testinglogin',
        password: 'test',
      })
      .then((res) => {
        expect(res.body.userFriendlyErrors).to.deep.equal([
          'Username or password is invalid. Please try again.',
        ]);
      }));

    it('should handle invalid password', function () {
      if (process.env.REPLAY !== 'bloody') {
        this.skip();
      }
      this.retries(8);

      return supertest(authWebService)
        .post('/login')
        .set('x-request-id', `${requestId}-login-wrongpassword`)
        .send({
          username: 'testingprototype',
          password: 'wrongpassword',
        })
        .then((res) => {
          expect(res.body.userFriendlyErrors).to.deep.equal([
            'You have tried to log in too many times and you dont seem to have a valid email so we cant send you a temporary password.',
          ]);
        });
    });

    it('should handle valid password', () => supertest(authWebService)
      .post('/login')
      .set('x-request-id', `${requestId}-login-successfully`)
      .send({
        username: 'testingspreadsheet',
        password: 'test',
      })
      .then((res) => {
        expect(res.body.userFriendlyErrors).to.equal(undefined);
        expect(res.body.user._id).to.equal('testingspreadsheet'); // eslint-disable-line no-underscore-dangle
        expect(res.body.user.username).to.equal('testingspreadsheet');
        if (res.body.user.corpora.length === 1) {
          expect(res.body.user.corpora).length(1);
        } else {
          expect(res.body.user.corpora).length(2);
        }
      }));

    it('should tell users why they are disabled', () => supertest(authWebService)
      .post('/login')
      .set('x-request-id', `${requestId}-login-disabled`)
      .send({
        username: 'testingdisabledusers',
        password: 'test',
      })
      .then((res) => {
        expect(res.body.userFriendlyErrors).to.deep.equal([
          'This username has been disabled. Please contact us at support@lingsync.org if you would like to reactivate this username. Reasons: This username was reported to us as a suspicously fictitous username.',
        ]);
      }));

    it('should suggest a valid username', () => supertest(authWebService)
      .post('/login')
      .set('x-request-id', `${requestId}-login-non-ascii`)
      .send({
        username: 'Jênk iлs',
        password: 'phoneme',
      })
      .then((res) => {
        expect(res.body.userFriendlyErrors).to.deep.equal([
          'Username or password is invalid. Maybe your username is jenkins?',
        ]);
      }));

    it('should support ქართული usernames', () => supertest(authWebService)
      .post('/login')
      .set('x-request-id', `${requestId}-login-kartuli`)
      .send({
        username: 'ნინო ბერიძე',
        password: 'phoneme',
      })
      .then((res) => {
        expect(res.body.userFriendlyErrors).to.deep.equal([
          'Username or password is invalid. Maybe your username is ?',
        ]);
        // expect(res.body.userFriendlyErrors)
        // .to.deep.equal(['Maybe your username is ninoberidze?']);
      }));
  });

  describe('/changepassword', () => {
    it('should accept changepassword', function () {
      if (process.env.REPLAY !== 'bloody') {
        this.skip();
      }
      return supertest(authWebService)
        .post('/changepassword')
        .set('x-request-id', `${requestId}-changepassword`)
        .send({
          username: 'jenkins',
          password: 'phoneme',
          newpassword: 'phoneme',
          confirmpassword: 'phoneme',
        })
        .then((res) => {
          expect(res.body.info).to.deep.equal([
            'Your password has succesfully been updated.',
          ]);
        });
    });

    it('should refuse to changepassword if the confirm password doesnt match', () => supertest(authWebService)
      .post('/changepassword')
      .set('x-request-id', `${requestId}-changepassword-mismatch`)
      .send({
        username: 'jenkins',
        password: 'phoneme',
        newpassword: 'phoneme',
        confirmpassword: 'phonem',
      })
      .then((res) => {
        expect(res.body.userFriendlyErrors).to.deep.equal([
          'New passwords do not match, please try again.',
        ]);
      }));

    it('should refuse to changepassword if the new password is missing', () => supertest(authWebService)
      .post('/changepassword')
      .set('x-request-id', `${requestId}-changepassword-missing`)
      .send({
        username: 'jenkins',
        password: 'phoneme',
      })
      .then((res) => {
        expect(res.body.userFriendlyErrors).to.deep.equal([
          'Please provide your new password',
        ]);
      }));
  });

  describe('/forgotpassword', () => {
    before(function () {
      if (process.env.REPLAY !== 'bloody') {
        this.skip();
      }
      this.timeout(10000);

      return supertest(authWebService)
        .post('/register')
        .set('x-request-id', `${requestId}-before-forgotpassword`)
        .send({
          username: 'testinguserwithemail',
          password: 'test',
          email: 'myemail@example.com',
        })
        .then((res) => {
          debug('register testinguserwithemail', res.body);
        });
    });
    it('should refuse forgotpassword if the user hasnt tried to login (ie doesnt know their username)', () => supertest(authWebService)
      .post('/login')
      .set('x-request-id', `${requestId}-forgotpassword-hasnt-tried`)
      .send({
        username: 'testinguserwhohasnttriedtologin',
        password: 'test',
      })
      .then((res) => {
        expect(res.body.userFriendlyErrors).to.deep.equal([
          'Username or password is invalid. Please try again.',
        ]);

        return supertest(authWebService)
          .post('/forgotpassword')
          .set('x-request-id', `${requestId}-forgotpassword-hasnt-tried`)
          .send({
            email: 'myotheremail@example.com',
          });
      })
      .then((res) => {
        debug(JSON.stringify(res.body));
        expect(res.body.userFriendlyErrors).to.deep.equal([
          'Sorry, there are no users who have failed to login who have the email you provided myotheremail@example.com. You cannot request a temporary password until you have at least tried to login once with your correct username. If you are not able to guess your username please contact us for assistance.',
        ]);
      }));

    it('should support forgotpassword if the user has tried to login with the correct username', () => supertest(authWebService)
      .post('/login')
      .set('x-request-id', `${requestId}-forgotpassword`)
      .send({
        username: 'testinguserwithemail',
        password: 'wrongpassword',
      })
      .then((res) => {
        expect(res.body.userFriendlyErrors).length(1);

        return supertest(authWebService)
          .post('/forgotpassword')
          .set('x-request-id', `${requestId}-forgotpassword-wrongpassword`)
          .send({
            email: 'myemail@example.com',
          });
      })
      .then((res) => {
        expect(res.body).to.deep.equal({
          message: 'Internal server error',
          status: 500,
          userFriendlyErrors: ['The server was unable to send you an email, your password has not been reset. Please report this 2823'],
        });
      }));

    it('should refuse to send a password reset if neither email nor username was provided', () => supertest(authWebService)
      .post('/forgotpassword')
      .set('x-request-id', `${requestId}-forgotpassword-missing`)
      .send({})
      .then((res) => {
        expect(res.body.userFriendlyErrors).to.deep.equal([
          'Please provide an email.',
        ]);
      }));
  });

  describe('/addroletouser', () => {
    before(function () {
      if (process.env.REPLAY !== 'bloody') {
        this.skip();
      }
      this.timeout(10000);

      return supertest(authWebService)
        .post('/register')
        .set('x-request-id', `${requestId}-before-addroletouser`)
        .send({
          username: 'testuser1',
          password: 'test',
        })
        .then((res) => {
          debug('register testuser1', res.body);

          return supertest(authWebService)
            .post('/register')
            .set('x-request-id', `${requestId}-before-addroletouser`)
            .send({
              username: 'testuser2',
              password: 'test',
              email: '',
            });
        })
        .then((res) => {
          debug('register testuser2', res.body);

          return supertest(authWebService)
            .post('/register')
            .set('x-request-id', `${requestId}-before-addroletouser`)
            .send({
              username: 'testuser3',
              password: 'test',
              email: '',
            });
        })
        .then((res) => {
          debug('register testuser3', res.body);

          return supertest(authWebService)
            .post('/register')
            .set('x-request-id', `${requestId}-before-addroletouser`)
            .send({
              username: 'testuser4',
              password: 'test',
              email: '',
            });
        })
        .then(() => supertest(authWebService)
          .post('/register')
          .set('x-request-id', `${requestId}-before-addroletouser`)
          .send({
            username: 'testuser41',
            password: 'test',
            email: '',
          }))
        .then(() => supertest(authWebService)
          .post('/register')
          .set('x-request-id', `${requestId}-before-newcorpus`)
          .send({
            username: 'testuser5',
            password: 'test',
          }))
        .then(() => supertest(authWebService)
          .post('/register')
          .set('x-request-id', `${requestId}-before-newcorpus`)
          .send({
            username: 'testuser6',
            password: 'test',
          }))
        .then(() => supertest(authWebService)
          .post('/register')
          .set('x-request-id', `${requestId}-before-newcorpus`)
          .send({
            username: 'testuser7',
            password: 'test',
          }))
        .then(() => supertest(authWebService)
          .post('/register')
          .set('x-request-id', `${requestId}-before-addroletouser`)
          .send({
            username: 'testuser10',
            password: 'test',
          }))
        .then((res) => {
          debug('register testuser10', res.body);
        });
    });

    it('should refuse to addroletouser if the user doesnt authenticate at the same time', () => supertest(authWebService)
      .post('/addroletouser')
      .set('x-request-id', `${requestId}-addroletouser-missing-password`)
      .send({
        username: 'jenkins',
      })
      .then((res) => {
        expect(res.body.userFriendlyErrors).to.deep.equal([
          'This app has made an invalid request. Please notify its developer. info: user credentials must be reqested from the user prior to running this request',
        ]);
      }));

    it('should refuse to addroletouser if the corpus is missing', () => supertest(authWebService)
      .post('/addroletouser')
      .set('x-request-id', `${requestId}-addroletouser-missing-corpus`)
      .send({
        username: 'testuser1',
        password: 'test',
      })
      .then((res) => {
        expect(res.body.userFriendlyErrors).to.deep.equal([
          'This app has made an invalid request. Please notify its developer. info: the corpus to be modified must be included in the request',
        ]);
      }));

    it('should refuse to addroletouser if the user(s) to modify are missing', () => supertest(authWebService)
      .post('/addroletouser')
      .set('x-request-id', `${requestId}-addroletouser-missing-users`)
      .send({
        username: 'testuser2',
        password: 'test',
        connection: {
          dbname: 'testuser2-firstcorpus',
        },
      })
      .then((res) => {
        expect(res.body.userFriendlyErrors).to.deep.equal([
          'This app has made an invalid request. Please notify its developer. info: user(s) to modify must be included in this request',
        ]);
      }));

    it('should refuse to addroletouser if the roles to add and/or remove are missing', () => supertest(authWebService)
      .post('/addroletouser')
      .set('x-request-id', `${requestId}-addroletouser-missing-roles`)
      .send({
        username: 'testuser3',
        password: 'test',
        connection: {
          dbname: 'testuser3-firstcorpus',
        },
        users: [{
          username: 'testingprototype',
        }],
      })
      .then((res) => {
        expect(res.body.userFriendlyErrors).to.deep.equal([
          'This app has made an invalid request. Please notify its developer. missing: roles to add or remove',
        ]);
      }));

    it('should refuse to add non-existant users to the corpus', () => supertest(authWebService)
      .post('/addroletouser')
      .set('x-request-id', `${requestId}-addroletouser-non-user`)
      .send({
        username: 'testuser41',
        password: 'test',
        connection: {
          dbname: 'testuser41-firstcorpus',
        },
        users: [{
          username: 'userdoesntexist',
          add: ['reader', 'commenter'],
          remove: ['admin', 'writer'],
        }],
      })
      .then((res) => {
        debug('response res.body', res.body);
        expect(res.body.userFriendlyErrors).to.deep.equal([
          'Unable to add userdoesntexist to this corpus. User not found.',
        ]);
        expect(res.status).to.equal(404);
      }));

    it.skip('should refuse to add users to the corpus if the user is not an admin', () => {

    });

    it('should be able to remove all roles from a user', function () {
      if (process.env.REPLAY !== 'bloody') {
        this.skip();
      }
      return supertest(authWebService)
        .post('/addroletouser')
        .set('x-request-id', `${requestId}-prep-addroletouser`)
        .send({
          username: 'jenkins',
          password: 'phoneme',
          connection: {
            dbname: 'jenkins-firstcorpus',
          },
          users: [{
            username: 'testuser6',
            remove: ['all'],
          }],
        })
        .then((res) => {
          expect(res.body.info).to.deep.equal([
            'User testuser6 was removed from the jenkins-firstcorpus team.',
          ], JSON.stringify(res.body));
          return supertest(authWebService)
            .post('/login')
            .set('x-request-id', `${requestId}-addroletouser-confirm`)
            .send({
              username: 'testuser6',
              password: 'test',
            });
        })
        .then((res) => {
          const response = JSON.stringify(res.body);
          expect(response).to.contain('testuser6-firstcorpus');
          expect(response).not.to.contain('jenkins-firstcorpus');
        });
    });

    it('should be able to add and remove roles in the same request', function () {
      if (process.env.REPLAY !== 'bloody') {
        this.skip();
      }
      return supertest(authWebService)
        .post('/addroletouser')
        .set('x-request-id', `${requestId}-prep-addroletouser-remove`)
        .send({
          username: 'jenkins',
          password: 'phoneme',
          connection: {
            dbname: 'jenkins-firstcorpus',
          },
          users: [{
            username: 'testuser5',
            remove: ['all'],
          }],
        })
        .then((res) => {
          expect(res.body.info).to.deep.equal([
            'User testuser5 was removed from the jenkins-firstcorpus team.',
          ], JSON.stringify(res.body));
          return supertest(authWebService)
            .post('/addroletouser')
            .set('x-request-id', `${requestId}-addroletouser-remove`)
            .send({
              username: 'jenkins',
              password: 'phoneme',
              connection: {
                dbname: 'jenkins-firstcorpus',
              },
              users: [{
                username: 'testuser5',
                add: ['reader', 'commenter'],
                remove: ['admin', 'writer'],
              }],
            });
        })
        .then((res) => {
          expect(res.body && res.body.info && res.body.info[0]).to.contain(
            'User testuser5 now has reader commenter access to jenkins-firstcorpus',
            JSON.stringify(res.body),
          );
          return supertest(authWebService)
            .post('/login')
            .set('x-request-id', `${requestId}-addroletouser-remove-confirm`)
            .send({
              username: 'testuser5',
              password: 'test',
            });
        })
        .then((res) => {
          const response = JSON.stringify(res.body);
          debug('response', response);
          expect(response).to.contain('testuser5-firstcorpus');
          expect(response).to.contain('jenkins-firstcorpus');

          return supertest('http://testuser5:test@localhost:5984')
            .get('/_session')
            .set('x-request-id', `${requestId}-addroletouser-session-confirm`)
            .send({
              name: 'testuser5',
              password: 'test',
            })
            .set('Accept', 'application/json');
        })
        .then((res) => {
          debug(JSON.stringify(res.body));
          expect(res.status).to.equal(200, 'should have roles');
          expect(res.body).to.deep.equal({
            ok: true,
            userCtx: {
              name: 'testuser5',
              roles: [
                'jenkins-firstcorpus_reader',
                'jenkins-firstcorpus_commenter',
                'testuser5-firstcorpus_admin',
                'testuser5-firstcorpus_writer',
                'testuser5-firstcorpus_reader',
                'testuser5-firstcorpus_commenter',
                'public-firstcorpus_reader',
                'fielddbuser',
                'user',
              ],
            },
            info: {
              authentication_db: '_users',
              authentication_handlers: ['oauth', 'cookie', 'default'],
              authenticated: 'default',
            },
          }, 'should have roles');
        });
    });

    it('should accept roles to add and remove from one or or more users', function () {
      if (process.env.REPLAY !== 'bloody') {
        this.skip();
      }
      return supertest(authWebService)
        .post('/addroletouser')
        .set('x-request-id', `${requestId}-prep-addroletouser-many`)
        .send({
          username: 'jenkins',
          password: 'phoneme',
          connection: {
            dbname: 'jenkins-firstcorpus',
          },
          users: [{
            username: 'testuser4',
            remove: ['all'],
          }],
        })
        .then((res) => {
          expect(res.body.info).to.deep.equal([
            'User testuser4 was removed from the jenkins-firstcorpus team.',
          ], JSON.stringify(res.body));

          return supertest(authWebService)
            .post('/addroletouser')
            .set('x-request-id', `${requestId}-addroletouser-many`)
            .send({
              username: 'jenkins',
              password: 'phoneme',
              connection: {
                dbname: 'jenkins-firstcorpus',
              },
              users: [{
                username: 'testuser10',
                remove: ['all'],
              }],
            });
        })
        .then((res) => {
          debug('res.body', res.body);
          expect(res.body.info).to.deep.equal([
            'User testuser10 was removed from the jenkins-firstcorpus team.',
          ], JSON.stringify(res.body));
          return supertest(authWebService)
            .post('/addroletouser')
            .set('x-request-id', `${requestId}-after-addroletouser-many`)
            .send({
              username: 'jenkins',
              password: 'phoneme',
              connection: {
                dbname: 'jenkins-firstcorpus',
              },
              users: [{
                username: 'testuser10',
                add: ['reader', 'exporter'],
                remove: ['admin', 'writer'],
              }, {
                username: 'testuser4',
                add: ['writer'],
              }],
            });
        })
        .then((res) => {
          expect(res.body.info).to.deep.equal([
            'User testuser10 now has reader exporter access to jenkins-firstcorpus',
            'User testuser4 now has writer access to jenkins-firstcorpus',
          ], JSON.stringify(res.body));

          return supertest('http://testuser4:test@localhost:5984')
            .post('/_session')
            .set('x-request-id', `${requestId}-addroletouser-session-many`)
            .send({
              name: 'testuser4',
              password: 'test',
            })
            .set('Accept', 'application/json');
        })
        .then((res) => {
          expect(res.body).to.deep.equal({
            ok: true,
            name: 'testuser4',
            roles: [
              'jenkins-firstcorpus_writer',
              'testuser4-firstcorpus_admin',
              'testuser4-firstcorpus_writer',
              'testuser4-firstcorpus_reader',
              'testuser4-firstcorpus_commenter',
              'public-firstcorpus_reader',
              'fielddbuser',
              'user',
            ],
          }, 'should have roles');

          return supertest('http://testuser10:test@localhost:5984')
            .get('/_session')
            .set('x-request-id', `${requestId}-addroletouser-session-many`)
            .set('Accept', 'application/json');
        })
        .then((res) => {
          debug(JSON.stringify(res.body));
          expect(res.body).to.deep.equal({
            ok: true,
            userCtx: {
              name: 'testuser10',
              roles: ['jenkins-firstcorpus_reader',
                'jenkins-firstcorpus_exporter',
                'testuser10-firstcorpus_admin',
                'testuser10-firstcorpus_writer',
                'testuser10-firstcorpus_reader',
                'testuser10-firstcorpus_commenter',
                'public-firstcorpus_reader',
                'fielddbuser',
                'user',
              ],
            },
            info: {
              authentication_db: '_users',
              authentication_handlers: ['oauth', 'cookie', 'default'],
              authenticated: 'default',
            },
          }, 'should have roles');
        });
    });

    it('should accept addroletouser from the backbone app', function () {
      if (process.env.REPLAY !== 'bloody') {
        this.skip();
      }
      return supertest(authWebService)
        .post('/addroletouser')
        .set('x-request-id', `${requestId}-prep-addroletouser-backbone`)
        .send({
          username: 'jenkins',
          password: 'phoneme',
          connection: {
            dbname: 'jenkins-firstcorpus',
          },
          users: [{
            username: 'testuser7',
            remove: ['all'],
          }],
        })
        .then((res) => {
          debug('res.body', res.body);
          expect(res.body.info).to.deep.equal([
            'User testuser7 was removed from the jenkins-firstcorpus team.',
          ], JSON.stringify(res.body));
          return supertest(authWebService)
            .post('/addroletouser')
            .set('x-request-id', `${requestId}-addroletouser-backbone`)
            .send({
              username: 'jenkins',
              password: 'phoneme',
              connection: {
                dbname: 'jenkins-firstcorpus',
              },
              userToAddToRole: 'testuser7',
              roles: ['reader', 'commenter'],
            });
        })
        .then((res) => {
          expect(res.body.info).to.deep.equal([
            'User testuser7 now has reader commenter access to jenkins-firstcorpus',
          ], JSON.stringify(res.body));

          return supertest('http://testuser7:test@localhost:5984')
            .post('/_session')
            .set('x-request-id', `${requestId}-addroletouser-session-backbone`)
            .send({
              name: 'testuser7',
              password: 'test',
            })
            .set('Accept', 'application/json');
        })
        .then((res) => {
          expect(res.body).to.deep.equal({
            ok: true,
            name: 'testuser7',
            roles: res.body.roles,
          }, 'should succeed');

          const roles = res.body.roles.filter((role) => role.includes('jenkins-firstcorpus'));
          expect(roles).to.deep.equal([
            'jenkins-firstcorpus_reader',
            'jenkins-firstcorpus_commenter',
          ], 'should have roles');
        });
    });
  });

  describe('/updateroles', () => {
    it('should accept deprecated updateroles from the spreadsheet app', function () {
      if (process.env.REPLAY !== 'bloody') {
        this.skip();
      }
      return supertest(authWebService)
        .post('/addroletouser')
        .set('x-request-id', `${requestId}-prep-updateroles-spreadsheet`)
        .send({
          username: 'jenkins',
          password: 'phoneme',
          connection: {
            dbname: 'jenkins-firstcorpus',
          },
          users: [{
            username: 'testuser1',
            remove: ['all'],
          }],
        })
        .then((res) => {
          expect(res.body).to.deep.equal({
            roleadded: true,
            users: [{
              username: 'testuser1',
              remove: ['jenkins-firstcorpus_all'],
              add: [],
              before: res.body.users[0].before,
              after: [],
              status: 200,
              message: 'User testuser1 was removed from the jenkins-firstcorpus team.',
            }],
            info: ['User testuser1 was removed from the jenkins-firstcorpus team.'],
          });

          return supertest(authWebService)
            .post('/updateroles')
            .set('x-request-id', `${requestId}-updateroles-spreadsheet`)
            .send({
              username: 'jenkins',
              password: 'phoneme',
              serverCode: 'localhost',
              userRoleInfo: {
                usernameToModify: 'testuser1',
                dbname: 'jenkins-firstcorpus',
                admin: false,
                writer: true,
                reader: true,
                commenter: true,
              },
            });
        })
        .then((res) => {
          debug(JSON.stringify(res.body));
          expect(res.body).to.deep.equal({
            roleadded: true,
            users: [{
              username: 'testuser1',
              remove: [],
              add: ['jenkins-firstcorpus_writer', 'jenkins-firstcorpus_reader', 'jenkins-firstcorpus_commenter'],
              before: [],
              after: ['writer', 'reader', 'commenter'],
              status: 200,
              message: 'User testuser1 now has writer reader commenter access to jenkins-firstcorpus',
            }],
            info: ['User testuser1 now has writer reader commenter access to jenkins-firstcorpus'],
          });
        });
    });

    it('should accept new updateroles from the spreadsheet app', function () {
      if (process.env.REPLAY !== 'bloody') {
        this.skip();
      }
      return supertest(authWebService)
        .post('/addroletouser')
        .set('x-request-id', `${requestId}-prep-updateroles-spreadsheet`)
        .send({
          username: 'jenkins',
          password: 'phoneme',
          connection: {
            dbname: 'jenkins-firstcorpus',
          },
          users: [{
            username: 'testuser2',
            remove: ['all'],
          }],
        })
        .then((res) => {
          expect(res.body).to.deep.equal({
            roleadded: true,
            users: [{
              username: 'testuser2',
              remove: ['jenkins-firstcorpus_all'],
              add: [],
              before: (res.body.users && res.body.users[0]) ? res.body.users[0].before : undefined,
              after: [],
              status: 200,
              message: 'User testuser2 was removed from the jenkins-firstcorpus team.',
            }],
            info: ['User testuser2 was removed from the jenkins-firstcorpus team.'],
          }, JSON.stringify(res.body));

          return supertest(authWebService)
            .post('/updateroles')
            .set('x-request-id', `${requestId}-updateroles-spreadsheet`)
            .send({
              username: 'jenkins',
              password: 'phoneme',
              serverCode: 'localhost',
              dbname: 'jenkins-firstcorpus',
              users: [{
                username: 'testuser2',
                add: ['writer', 'commenter', 'reader'],
                remove: ['admin'],
              }],
            });
        })
        .then((res) => {
          debug(JSON.stringify(res.body));
          expect(res.body).to.deep.equal({
            roleadded: true,
            users: [{
              username: 'testuser2',
              remove: [
                'jenkins-firstcorpus_admin',
              ],
              add: [
                'jenkins-firstcorpus_writer',
                'jenkins-firstcorpus_commenter',
                'jenkins-firstcorpus_reader',
              ],
              before: [],
              after: [
                'writer',
                'commenter',
                'reader',
              ],
              status: 200,
              message: 'User testuser2 now has writer commenter reader access to jenkins-firstcorpus',
            }],
            info: ['User testuser2 now has writer commenter reader access to jenkins-firstcorpus'],
          });
        });
    });
  });

  describe('/corpusteam', () => {
    it('should refuse to tell a corpusteam details if the username is not a valid user', () => supertest(authWebService)
      .post('/corpusteam')
      .set('x-request-id', `${requestId}-corpusteam-not-user`)
      .send({
        username: 'testingspreadshee',
        connection: {
          dbname: 'jenkins-firstcorpus',
        },
      })
      .then((res) => {
        expect(res.body.userFriendlyErrors).to.deep.equal([
          'Unauthorized, you are not a member of this corpus team.',
        ], JSON.stringify(res.body));
      }));

    it('should accept corpusteam requests from the backbone app', () => supertest(authWebService)
      .post('/corpusteam')
      .set('x-request-id', `${requestId}-corpusteam-backbone`)
      .send({
        username: 'jenkins',
        password: 'phoneme',
        connection: {
          dbname: 'jenkins-firstcorpus',
        },
      })
      .then((res) => {
        debug(JSON.stringify(res.body));
        expect(res.body.users.readers).to.deep.equal([{
          username: 'jenkins',
          gravatar: 'ab63a76362c3972ac83d5cb8830fdb51',
        }], JSON.stringify(res.body));

        expect(res.body.users.writers).to.deep.equal([{
          username: 'jenkins',
          gravatar: 'ab63a76362c3972ac83d5cb8830fdb51',
        }], JSON.stringify(res.body));

        expect(res.body.users.admins).to.deep.equal([{
          username: 'jenkins',
          gravatar: 'ab63a76362c3972ac83d5cb8830fdb51',
        }], JSON.stringify(res.body));

        expect(res.body.users.notonteam.length).above(0);
        expect(res.body.users.allusers.length).above(0);
      }));

    it('should refuse to tell a corpusteam details if the username is a valid user but not on that team', () => supertest(authWebService)
      .post('/corpusteam')
      .set('x-request-id', `${requestId}-corpusteam-not-on-team`)
      .send({
        username: 'testuser2',
        password: 'test',
        connection: {
          dbname: 'testuser4-firstcorpus',
        },
      })
      .then((res) => {
        debug(JSON.stringify(res.body));
        expect(res.body.userFriendlyErrors).to.deep.equal([
          'Unauthorized, you are not a member of this corpus team.',
        ]);
      }));

    it('should accept corpusteam requests from the spreadsheet app', () => supertest(authWebService)
      .post('/corpusteam')
      .set('x-request-id', `${requestId}-corpusteam-spreadsheet`)
      .send({
        username: 'jenkins',
        password: 'phoneme',
        serverCode: 'localhost',
        dbname: 'jenkins-firstcorpus',
      })
      .then((res) => {
        debug(JSON.stringify(res.body));

        expect(res.body.users && res.body.users.readers).to.deep.equal([{
          username: 'jenkins',
          gravatar: 'ab63a76362c3972ac83d5cb8830fdb51',
        }], JSON.stringify(res.body));

        expect(res.body.users && res.body.users.writers).to.deep.equal([{
          username: 'jenkins',
          gravatar: 'ab63a76362c3972ac83d5cb8830fdb51',
        }], JSON.stringify(res.body));

        expect(res.body.users && res.body.users.admins).to.deep.equal([{
          username: 'jenkins',
          gravatar: 'ab63a76362c3972ac83d5cb8830fdb51',
        }], JSON.stringify(res.body));

        expect(res.body.users && res.body.users.notonteam.length).above(0);
        expect(res.body.users && res.body.users.allusers.length).above(0);
      }));
  });

  describe('/newcorpus', () => {
    before(function () {
      if (process.env.REPLAY !== 'bloody') {
        this.skip();
      }
      this.timeout(10000);

      return supertest(authWebService)
        .post('/register')
        .set('x-request-id', `${requestId}-before-newcorpus`)
        .send({
          username: 'testuser5',
          password: 'test',
        })
        .then((res) => {
          debug('register testuser5', res.body);

          return supertest(authWebService)
            .post('/register')
            .set('x-request-id', `${requestId}-before-newcorpus`)
            .send({
              username: 'testuser6',
              password: 'test',
            });
        })
        .then((res) => {
          debug('register testuser6', res.body);

          return supertest(authWebService)
            .post('/register')
            .set('x-request-id', `${requestId}-before-newcorpus`)
            .send({
              username: 'testuser7',
              password: 'test',
            });
        })
        .then((res) => {
          debug('register testuser7', res.body);

          return supertest(authWebService)
            .post('/register')
            .set('x-request-id', `${requestId}-before-newcorpus`)
            .send({
              username: 'testuser9',
              password: 'test',
            });
        })
        .then((res) => {
          debug('register testuser9', res.body);
        });
    });

    it('should refuse newcorpus if the title is not specified', () => supertest(authWebService)
      .post('/newcorpus')
      .set('x-request-id', `${requestId}-newcorpus-missing-title`)
      .send({
        username: 'testuser5',
        password: 'test',
      })
      .then((res) => {
        expect(res.body.userFriendlyErrors).to.deep.equal([
          'This app has made an invalid request. Please notify its developer. missing: newCorpusTitle',
        ]);
      }));

    it('should create a corpus', () => {
      const newCorpusUnique = Date.now();
      const expectedDBName = `testuser9-testing_v3_32_01${newCorpusUnique}`;
      return supertest(authWebService)
        .post('/newcorpus')
        .set('x-request-id', `${requestId}-newcorpus`)
        .send({
          username: 'testuser9',
          password: 'test',
          newCorpusName: `Testing v3.32.01${newCorpusUnique}`,
        })
        .then((res) => {
          debug(JSON.stringify(res.body));
          expect(res.body.corpusadded).to.equal(true, JSON.stringify(res.body));
          expect(res.status).to.equal(200);

          return supertest('http://testuser9:test@localhost:5984')
            .get(`/${expectedDBName}/_design/lexicon/_view/lexiconNodes`)
          // .set('x-request-id', requestId + '-newcorpus')
            .set('Accept', 'application/json');
        })
        .then((res) => {
          debug(JSON.stringify(res.body));
          if (res.status === 200) {
            expect(res.status).to.equal(200, 'should replicate the lexicon');
            expect(res.body).to.deep.equal({
              rows: [{
                key: null,
                value: 5,
              }],
            }, 'should replicate the lexicon');
          } else {
            expect(res.status).to.be.oneOf([401, 404]); // delay in lexicon creation on new resources
          }
        });
    });

    it('should not complain if the user tries to recreate a corpus', () => supertest(authWebService)
      .post('/newcorpus')
      .set('x-request-id', `${requestId}-prep-newcorpus-recreatecorpus`)
      .send({
        username: 'testuser6',
        password: 'test',
        newCorpusName: 'Testing v3.32.01',
      })
      .then((res) => {
        expect(res.body.corpusadded).to.equal(true, JSON.stringify(res.body));
        return supertest('http://testuser6:test@localhost:5984')
          .get('/testuser6-testing_v3_32_01/_design/lexicon/_view/lexiconNodes')
          // .set('x-request-id', requestId + '-newcorpus')
          .set('Accept', 'application/json');
      })
      .then((res) => {
        debug(JSON.stringify(res.body));
        if (res.status === 200) {
          expect(res.status).to.equal(200, 'should replicate the lexicon');
          expect(res.body).to.deep.equal({
            rows: [{
              key: null,
              value: res.body.rows[0].value,
            }],
          }, 'should replicate the lexicon');
        } else {
          expect(res.status).to.be.oneOf([401, 404]); // delay in lexicon creation on new resources
        }

        return supertest(authWebService)
          .post('/newcorpus')
          .set('x-request-id', `${requestId}-newcorpus-recreatecorpus`)
          .send({
            username: 'testuser6',
            password: 'test',
            newCorpusName: 'Testing v3.32.01',
          });
      })
      .then((res) => {
        debug(JSON.stringify(res.body));
        // conflict due to replay
        if (res.status === 409) {
          expect(res.body.userFriendlyErrors).to.deep.equal([
            'Unable to create your corpus. Error saving a user in the database. ',
          ]);
        } else {
          expect(res.status).to.equal(302, 'should not complain if the user tries to recreate a corpus');
          expect(res.body.userFriendlyErrors).to.deep.equal([
            'Your corpus testuser6-testing_v3_32_01 already exists, no need to create it.',
          ], JSON.stringify(res.body));
        }
      }));

    it('should create a branded corpus', () => supertest(authWebService)
      .post('/newcorpus')
      .set('x-request-id', `${requestId}-newcorpus-branded`)
      .send({
        username: 'testuser7',
        password: 'test',
        appbrand: 'georgiantogether',
        newCorpusName: 'Georgian',
      })
      .then((res) => {
        expect(res.body.corpusadded).to.equal(true, JSON.stringify(res.body));
        expect(res.body.connection.brandLowerCase).to.equal('georgiantogether');
      }));
  });

  describe('syncDetails', () => {
    before(function () {
      if (process.env.REPLAY !== 'bloody') {
        this.skip();
      }
      this.timeout(10000);
      return supertest(authWebService)
        .post('/register')
        .set('x-request-id', `${requestId}-prep-syncDetails`)
        .send({
          username: 'testuser8',
          password: 'test',

        })
        .then((res) => {
          debug('register testuser8', res.body);
        });
    });
    it('should try to create all corpora listed in the user', () => supertest(authWebService)
      .post('/login')
      .set('x-request-id', `${requestId}-syncDetails`)
      .send({
        username: 'testuser8',
        password: 'test',
        syncDetails: true,
        syncUserDetails: {
          newCorpusConnections: [{
            dbname: 'testuser8-firstcorpus',
          }, {}, {
            dbname: 'someoneelsesdb-shouldnt_be_creatable',
          }, {
            dbname: 'testuser8-an_offline_corpus_created_in_the_prototype',
          }, {
            dbname: 'testuser8-firstcorpus',
          }],
        },
      })
      .then((res) => {
        debug(JSON.stringify(res.body));
        expect(res.body.user.corpora && res.body.user.corpora.length >= 1).to.equal(true, JSON.stringify(res.body.user.corpora));
        expect(res.body.user.newCorpora.length).to.equal(3);

        return supertest('http://testuser8:test@localhost:5984')
          .get('/someoneelsesdb-shouldnt_be_creatable')
          .set('x-request-id', `${requestId}-syncDetails-after`)
          .set('Accept', 'application/json');
      })
      .then((res) => {
        expect(res.status).to.equal(404);

        return supertest('http://testuser8:test@localhost:5984')
          .get('/testuser8-an_offline_corpus_created_in_the_prototype/_design/deprecated/_view/corpora')
          // .set('x-request-id', requestId + '-syncDetails')
          .set('Accept', 'application/json');
      })
      .then((res) => {
        if (res.status === 200) {
          expect(res.body.total_rows).to.equal(1);
        } else {
          debug('syncDetails', JSON.stringify(res.body));
          expect(res.status).to.be.oneOf([401, 404]); // delay in views creation on new resources
        }
      }));
  });
});
