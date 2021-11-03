var debug = require('debug')('test:install');
var expect = require('chai').expect;
var path = require('path');
var replay = require('replay');
var supertest = require('supertest');
var authWebService = process.env.URL || require('./../../auth_service');

var originalLocalhosts = replay._localhosts;
var requestId = 'deprecated-spec';
replay.fixtures = path.join(__dirname, '/../fixtures/replay');

describe('/ deprecated', function () {
  before(function () {
    replay._localhosts = new Set(['127.0.0.1', '::1']);
    debug('before replay localhosts', replay._localhosts);
  });
  after(function () {
    replay._localhosts = originalLocalhosts;
    debug('after replay localhosts', replay._localhosts);
  });

  describe('/register', function () {
    it('should register a new user', function () {
      return supertest(authWebService)
        .post('/register')
        .set('x-request-id', requestId + '-register')
        .send({
          username: 'testingv3_32',
          password: 'test'
        })
        .then(function (res) {
          if (res.body.userFriendlyErrors) {
            expect(res.body.userFriendlyErrors).to.deep.equal([
              'Username testingv3_32 already exists, try a different username.'
            ]);
          } else {
            debug(JSON.stringify(res.body));
            expect(res.body.user.username).to.equal('testingv3_32');
            expect(res.body.user.appbrand).to.equal(undefined);
          }

          return supertest('http://testingv3_32:test@localhost:5984')
            .get('/_session')
            .set('x-request-id', requestId + '-register')
            .set('Accept', 'application/json');
        })
        .then(function (res) {
          debug(JSON.stringify(res.body));
          expect(res.status).to.equal(200, 'should have roles');
          expect(res.body).to.deep.equal({
            ok: true,
            userCtx: {
              name: 'testingv3_32',
              roles: [
                'testingv3_32-firstcorpus_admin',
                'testingv3_32-firstcorpus_writer',
                'testingv3_32-firstcorpus_reader',
                'testingv3_32-firstcorpus_commenter',
                'public-firstcorpus_reader',
                'fielddbuser',
                'user'
              ]
            },
            info: {
              authentication_db: '_users',
              authentication_handlers: ['oauth', 'cookie', 'default'],
              authenticated: 'default'
            }
          }, 'should have roles');

          return supertest('http://testingv3_32:test@localhost:5984')
            .get('/testingv3_32-firstcorpus/_design/lexicon/_view/lexiconNodes')
            // .set('x-request-id', requestId + '-register')
            .set('Accept', 'application/json');
        })
        .then(function (res) {
          if (res.status === 200) {
            debug(JSON.stringify(res.body));
            expect(res.status).to.equal(200, 'should replicate the lexicon');
            expect(res.body).to.deep.equal({
              rows: [{
                key: null,
                value: 6
              }]
            }, 'should replicate the lexicon');
          } else {
            expect(res.status).to.equal(404); // on a freshly created resource
          }
        });
    });

    it('should register wordcloud users if not already registered', function () {
      return supertest(authWebService)
        .post('/register')
        .set('x-request-id', requestId + '-register')
        .send({
          username: 'anonymouswordclouduser1401365327719',
          password: 'testtest',
          email: '',
          firstname: '',
          lastname: '',
          appbrand: 'ilanguagecloud'
        })
        .then(function (res) {
          if (res.body.userFriendlyErrors) {
            expect(res.body.userFriendlyErrors).to.deep.equal([
              'Username anonymouswordclouduser1401365327719 already exists, try a different username.'
            ]);
          } else {
            debug(JSON.stringify(res.body));
            expect(res.body.user.username).to.equal('anonymouswordclouduser1401365327719');
            expect(res.body.user.appbrand).to.equal('ilanguagecloud');
          }
        });
    });

    it('should register phophlo users if not already registered', function () {
      return supertest(authWebService)
        .post('/register')
        .set('x-request-id', requestId + '-register')
        .send({
          username: 'testingphophlo',
          password: 'test',
          email: '',
          firstname: '',
          lastname: '',
          appbrand: 'phophlo'
        })
        .then(function (res) {
          if (res.body.userFriendlyErrors) {
            expect(res.body.userFriendlyErrors).to.deep.equal([
              'Username testingphophlo already exists, try a different username.'
            ]);
          } else {
            debug(JSON.stringify(res.body));
            expect(res.body.user.username).to.equal('testingphophlo');
            expect(res.body.user.appbrand).to.equal('phophlo');
          }
        });
    });

    it('should refuse to register existing names', function () {
      return supertest(authWebService)
        .post('/register')
        .set('x-request-id', requestId + '-register')
        .send({
          username: 'jenkins',
          password: 'phoneme',
          appbrand: 'learnx'
        })
        .then(function (res) {
          if (res.body.userFriendlyErrors) {
            expect(res.body.userFriendlyErrors).to.deep.equal([
              'Username jenkins already exists, try a different username.'
            ]);
          } else {
            debug(JSON.stringify(res.body));
            expect(res.body.user.username).to.equal('jenkins');
            expect(res.body.user.appbrand).to.equal('learnx');
          }
        });
    });

    it('should refuse to register short usernames', function () {
      return supertest(authWebService)
        .post('/register')
        .set('x-request-id', requestId + '-register')
        .send({
          username: 'ba',
          password: 'phoneme'
        })
        .then(function (res) {
          expect(res.body.userFriendlyErrors).to.deep.equal([
            'Please choose a longer username `ba` is too short.'
          ]);
        });
    });
  });

  describe('/login', function () {
    before(function () {
      if (process.env.REPLAY !== 'bloody') {
        this.skip();
      }
      this.timeout(10000);

      return supertest(authWebService)
        .post('/register')
        .set('x-request-id', requestId + '-login')
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
              '2015-05-07T14:51:00.671Z'
            ]
          }
        })
        .then(function (res) {
          debug('register testingdisabledusers', res.body);

          return supertest(authWebService)
            .post('/register')
            .set('x-request-id', requestId + '-login')
            .send({
              username: 'testingprototype',
              password: 'test',
              email: ''
            });
        })
        .then(function (res) {
          debug('register testingprototype', res.body);

          return supertest(authWebService)
            .post('/register')
            .set('x-request-id', requestId + '-login')
            .send({
              username: 'testingspreadsheet',
              password: 'test',
              email: ''
            });
        })
        .then(function (res) {
          debug('register testingspreadsheet', res.body);
          process.env.INSTALABLE = 'true';

          return supertest(authWebService)
            .post('/register')
            .set('x-request-id', requestId + '-login')
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
              lastname: 'Llama'
            });
        })
        .then(function (res) {
          debug('register lingllama', res.body);
        });
    });

    it('should handle invalid username', function () {
      return supertest(authWebService)
        .post('/login')
        .set('x-request-id', requestId + '-login')
        .send({
          username: 'testinglogin',
          password: 'test'
        })
        .then(function (res) {
          expect(res.body.userFriendlyErrors).to.deep.equal([
            'Username or password is invalid. Please try again.'
          ]);
        });
    });

    it('should handle invalid password', function () {
      if (process.env.REPLAY !== 'bloody') {
        this.skip();
      }
      this.retries(8);

      return supertest(authWebService)
        .post('/login')
        .set('x-request-id', requestId + '-login')
        .send({
          username: 'testingprototype',
          password: 'wrongpassword'
        })
        .then(function (res) {
          expect(res.body.userFriendlyErrors).to.deep.equal([
            'You have tried to log in too many times and you dont seem to have a valid email so we cant send you a temporary password.'
          ]);
        });
    });

    it('should handle valid password', function () {
      return supertest(authWebService)
        .post('/login')
        .set('x-request-id', requestId + '-login')
        .send({
          username: 'testingspreadsheet',
          password: 'test'
        })
        .then(function (res) {
          expect(res.body.userFriendlyErrors).to.equal(undefined);
          expect(res.body.user._id).to.equal('testingspreadsheet'); // eslint-disable-line no-underscore-dangle
          expect(res.body.user.username).to.equal('testingspreadsheet');
          if (res.body.user.corpora.length === 1) {
            expect(res.body.user.corpora).length(1);
          } else {
            expect(res.body.user.corpora).length(2);
          }
        });
    });

    it('should tell users why they are disabled', function () {
      return supertest(authWebService)
        .post('/login')
        .set('x-request-id', requestId + '-login')
        .send({
          username: 'testingdisabledusers',
          password: 'test'
        })
        .then(function (res) {
          expect(res.body.userFriendlyErrors).to.deep.equal([
            'This username has been disabled. Please contact us at support@lingsync.org if you would like to reactivate this username. Reasons: This username was reported to us as a suspicously fictitous username.'
          ]);
        });
    });

    it('should suggest a vaid username', function () {
      return supertest(authWebService)
        .post('/login')
        .set('x-request-id', requestId + '-login')
        .send({
          username: 'Jênk iлs',
          password: 'phoneme'
        })
        .then(function (res) {
          expect(res.body.userFriendlyErrors).to.deep.equal([
            'Username or password is invalid. Maybe your username is jenkins?'
          ]);
        });
    });

    it('should support ქართული usernames', function () {
      return supertest(authWebService)
        .post('/login')
        .set('x-request-id', requestId + '-login')
        .send({
          username: 'ნინო ბერიძე',
          password: 'phoneme'
        })
        .then(function (res) {
          expect(res.body.userFriendlyErrors).to.deep.equal([
            'Username or password is invalid. Maybe your username is ?'
          ]);
          // expect(res.body.userFriendlyErrors)
          // .to.deep.equal(['Maybe your username is ninoberidze?']);
        });
    });
  });

  describe('/changepassword', function () {
    it('should accept changepassword', function () {
      if (process.env.REPLAY !== 'bloody') {
        this.skip();
      }
      return supertest(authWebService)
        .post('/changepassword')
        .set('x-request-id', requestId + '-changepassword')
        .send({
          username: 'jenkins',
          password: 'phoneme',
          newpassword: 'phoneme',
          confirmpassword: 'phoneme'
        })
        .then(function (res) {
          expect(res.body.info).to.deep.equal([
            'Your password has succesfully been updated.'
          ]);
        });
    });

    it('should refuse to changepassword if the confirm password doesnt match', function () {
      return supertest(authWebService)
        .post('/changepassword')
        .set('x-request-id', requestId + '-changepassword')
        .send({
          username: 'jenkins',
          password: 'phoneme',
          newpassword: 'phoneme',
          confirmpassword: 'phonem'
        })
        .then(function (res) {
          expect(res.body.userFriendlyErrors).to.deep.equal([
            'New passwords do not match, please try again.'
          ]);
        });
    });

    it('should refuse to changepassword if the new password is missing', function () {
      return supertest(authWebService)
        .post('/changepassword')
        .set('x-request-id', requestId + '-changepassword')
        .send({
          username: 'jenkins',
          password: 'phoneme'
        })
        .then(function (res) {
          expect(res.body.userFriendlyErrors).to.deep.equal([
            'Please provide your new password'
          ]);
        });
    });
  });

  describe('/forgotpassword', function () {
    it('should refuse forgotpassword if the user hasnt tried to login (ie doesnt know their username)', function () {
      return supertest(authWebService)
        .post('/login')
        .set('x-request-id', requestId + '-forgotpassword')
        .send({
          username: 'testinguserwithemail',
          password: 'test'
        })
        .then(function (res) {
          expect(res.body.userFriendlyErrors).to.deep.equal([
            'Username or password is invalid. Please try again.'
          ]);

          return supertest(authWebService)
            .post('/forgotpassword')
            .set('x-request-id', requestId + '-forgotpassword')
            .send({
              email: 'myemail@example.com'
            });
        })
        .then(function (res) {
          debug(JSON.stringify(res.body));
          expect(res.body.userFriendlyErrors).to.deep.equal([
            'Sorry, there are no users who have failed to login who have the email you provided myemail@example.com. You cannot request a temporary password until you have at least tried to login once with your correct username. If you are not able to guess your username please contact us for assistance.'
          ]);
        });
    });

    it('should refuse to send a password reset if neither email nor username was provided', function () {
      return supertest(authWebService)
        .post('/forgotpassword')
        .set('x-request-id', requestId + '-forgotpassword')
        .send({})
        .then(function (res) {
          expect(res.body.userFriendlyErrors).to.deep.equal([
            'Please provide an email.'
          ]);
        });
    });
  });

  describe('/addroletouser', function () {
    before(function () {
      if (process.env.REPLAY !== 'bloody') {
        this.skip();
      }
      this.timeout(10000);

      return supertest(authWebService)
        .post('/register')
        .set('x-request-id', requestId + '-addroletouser')
        .send({
          username: 'testuser1',
          password: 'test'
        })
        .then(function (res) {
          debug('register testuser1', res.body);

          return supertest(authWebService)
            .post('/register')
            .set('x-request-id', requestId + '-addroletouser')
            .send({
              username: 'testuser2',
              password: 'test',
              email: ''
            });
        })
        .then(function (res) {
          debug('register testuser2', res.body);

          return supertest(authWebService)
            .post('/register')
            .set('x-request-id', requestId + '-addroletouser')
            .send({
              username: 'testuser3',
              password: 'test',
              email: ''
            });
        })
        .then(function (res) {
          debug('register testuser3', res.body);

          return supertest(authWebService)
            .post('/register')
            .set('x-request-id', requestId + '-addroletouser')
            .send({
              username: 'testuser4',
              password: 'test',
              email: ''
            });
        })
        .then(function (res) {
          debug('register testuser4', res.body);

          return supertest(authWebService)
            .post('/register')
            .set('x-request-id', requestId + '-addroletouser')
            .send({
              username: 'testuser41',
              password: 'test',
              email: ''
            });
        })
        .then(function (res) {
          debug('register testuser41', res.body);
        });
    });

    it('should refuse to addroletouser if the user doesnt authenticate at the same time', function () {
      return supertest(authWebService)
        .post('/addroletouser')
        .set('x-request-id', requestId + '-addroletouser')
        .send({
          username: 'jenkins'
        })
        .then(function (res) {
          expect(res.body.userFriendlyErrors).to.deep.equal([
            'This app has made an invalid request. Please notify its developer. info: user credentials must be reqested from the user prior to running this request'
          ]);
        });
    });

    it('should refuse to addroletouser if the corpus is missing', function () {
      return supertest(authWebService)
        .post('/addroletouser')
        .set('x-request-id', requestId + '-addroletouser')
        .send({
          username: 'testuser1',
          password: 'test'
        })
        .then(function (res) {
          expect(res.body.userFriendlyErrors).to.deep.equal([
            'This app has made an invalid request. Please notify its developer. info: the corpus to be modified must be included in the request'
          ]);
        });
    });

    it('should refuse to addroletouser if the user(s) to modify are missing', function () {
      return supertest(authWebService)
        .post('/addroletouser')
        .set('x-request-id', requestId + '-addroletouser')
        .send({
          username: 'testuser2',
          password: 'test',
          connection: {
            dbname: 'testuser2-firstcorpus'
          }
        })
        .then(function (res) {
          expect(res.body.userFriendlyErrors).to.deep.equal([
            'This app has made an invalid request. Please notify its developer. info: user(s) to modify must be included in this request'
          ]);
        });
    });

    it('should refuse to addroletouser if the roles to add and/or remove are missing', function () {
      return supertest(authWebService)
        .post('/addroletouser')
        .set('x-request-id', requestId + '-addroletouser')
        .send({
          username: 'testuser3',
          password: 'test',
          connection: {
            dbname: 'testuser3-firstcorpus'
          },
          users: [{
            username: 'testingprototype'
          }]
        })
        .then(function (res) {
          expect(res.body.userFriendlyErrors).to.deep.equal([
            'This app has made an invalid request. Please notify its developer. missing: roles to add or remove'
          ]);
        });
    });

    it('should refuse to add non-existant users to the corpus', function () {
      return supertest(authWebService)
        .post('/addroletouser')
        .set('x-request-id', requestId + '-addroletouser')
        .send({
          username: 'testuser41',
          password: 'test',
          connection: {
            dbname: 'testuser41-firstcorpus'
          },
          users: [{
            username: 'userdoesntexist',
            add: ['reader', 'commenter'],
            remove: ['admin', 'writer']
          }]
        })
        .then(function (res) {
          expect(res.body.userFriendlyErrors).to.deep.equal([
            'You can\'t add userdoesntexist to this corpus, their username was unrecognized. User not found.'
          ]);
        });
    });

    it('should be able to remove all roles from a user', function () {
      if (process.env.REPLAY !== 'bloody') {
        this.skip();
      }
      return supertest(authWebService)
        .post('/addroletouser')
        .set('x-request-id', requestId + '-addroletouser')
        .send({
          username: 'jenkins',
          password: 'phoneme',
          connection: {
            dbname: 'jenkins-firstcorpus'
          },
          users: [{
            username: 'testingprototype',
            remove: ['all']
          }]
        })
        .then(function (res) {
          expect(res.body.info).to.deep.equal([
            'User testingprototype was removed from the jenkins-firstcorpus team.'
          ]);
          return supertest(authWebService)
            .post('/login')
            .set('x-request-id', requestId + '-addroletouser')
            .send({
              username: 'testingprototype',
              password: 'test'
            });
        })
        .then(function (res) {
          var response = JSON.stringify(res.body);
          expect(response).to.contain('testingprototype-firstcorpus');
          expect(response).not.to.contain('jenkins-firstcorpus');
        });
    });

    it('should be able to add and remove roles in the same request', function () {
      if (process.env.REPLAY !== 'bloody') {
        this.skip();
      }
      return supertest(authWebService)
        .post('/addroletouser')
        .set('x-request-id', requestId + '-addroletouser')
        .send({
          username: 'jenkins',
          password: 'phoneme',
          connection: {
            dbname: 'jenkins-firstcorpus'
          },
          users: [{
            username: 'testingprototype',
            add: ['reader', 'commenter'],
            remove: ['admin', 'writer']
          }]
        })
        .then(function (res) {
          expect(res.body.info).to.deep.equal([
            'User testingprototype now has reader commenter access to jenkins-firstcorpus'
          ]);
          return supertest(authWebService)
            .post('/login')
            .set('x-request-id', requestId + '-addroletouser')
            .send({
              username: 'testingprototype',
              password: 'test'
            });
        })
        .then(function (res) {
          var response = JSON.stringify(res.body);
          debug('response', response);
          expect(response).to.contain('testingprototype-firstcorpus');
          expect(response).to.contain('jenkins-firstcorpus');

          return supertest('http://testingprototype:test@localhost:5984')
            .get('/_session')
            .set('x-request-id', requestId + '-addroletouser')
            .send({
              name: 'testingprototype',
              password: 'test'
            })
            .set('Accept', 'application/json');
        })
        .then(function (res) {
          debug(JSON.stringify(res.body));
          expect(res.status).to.equal(200, 'should have roles');
          expect(res.body).to.deep.equal({
            ok: true,
            userCtx: {
              name: 'testingprototype',
              roles: [
                'jenkins-firstcorpus_reader',
                'jenkins-firstcorpus_commenter',
                'testingprototype-firstcorpus_admin',
                'testingprototype-firstcorpus_writer',
                'testingprototype-firstcorpus_reader',
                'testingprototype-firstcorpus_commenter',
                'public-firstcorpus_reader',
                'fielddbuser',
                'user'
              ]
            },
            info: {
              authentication_db: '_users',
              authentication_handlers: ['oauth', 'cookie', 'default'],
              authenticated: 'default'
            }
          }, 'should have roles');
        });
    });

    it('should accept roles to add and remove from one or or more users', function () {
      if (process.env.REPLAY !== 'bloody') {
        this.skip();
      }
      return supertest(authWebService)
        .post('/addroletouser')
        .set('x-request-id', requestId + '-addroletouser')
        .send({
          username: 'jenkins',
          password: 'phoneme',
          connection: {
            dbname: 'jenkins-firstcorpus'
          },
          users: [{
            username: 'testingprototype',
            remove: ['all']
          }]
        })
        .then(function (res) {
          expect(res.body.info).to.deep.equal([
            'User testingprototype was removed from the jenkins-firstcorpus team.'
          ]);

          return supertest(authWebService)
            .post('/addroletouser')
            .set('x-request-id', requestId + '-addroletouser')
            .send({
              username: 'jenkins',
              password: 'phoneme',
              connection: {
                dbname: 'jenkins-firstcorpus'
              },
              users: [{
                username: 'testingspreadsheet',
                remove: ['all']
              }]
            });
        })
        .then(function (res) {
          debug('res.body', res.body);
          expect(res.body.info).to.deep.equal([
            'User testingspreadsheet was removed from the jenkins-firstcorpus team.'
          ]);
          return supertest(authWebService)
            .post('/addroletouser')
            .set('x-request-id', requestId + '-addroletouser')
            .send({
              username: 'jenkins',
              password: 'phoneme',
              connection: {
                dbname: 'jenkins-firstcorpus'
              },
              users: [{
                username: 'testingspreadsheet',
                add: ['reader', 'exporter'],
                remove: ['admin', 'writer']
              }, {
                username: 'testingprototype',
                add: ['writer']
              }]
            });
        })
        .then(function (res) {
          expect(res.body.info).to.deep.equal([
            'User testingspreadsheet now has reader exporter access to jenkins-firstcorpus',
            'User testingprototype now has writer access to jenkins-firstcorpus'
          ]);

          return supertest('http://testingprototype:test@localhost:5984')
            .post('/_session')
            .set('x-request-id', requestId + '-addroletouser')
            .send({
              name: 'testingprototype',
              password: 'test'
            })
            .set('Accept', 'application/json');
        })
        .then(function (res) {
          expect(res.body).to.deep.equal({
            ok: true,
            name: 'testingprototype',
            roles: [
              'jenkins-firstcorpus_writer',
              'testingprototype-firstcorpus_admin',
              'testingprototype-firstcorpus_writer',
              'testingprototype-firstcorpus_reader',
              'testingprototype-firstcorpus_commenter',
              'public-firstcorpus_reader',
              'fielddbuser',
              'user'
            ]
          }, 'should have roles');

          return supertest('http://testingspreadsheet:test@localhost:5984')
            .get('/_session')
            .set('x-request-id', requestId + '-addroletouser')
            .set('Accept', 'application/json');
        })
        .then(function (res) {
          debug(JSON.stringify(res.body));
          expect(res.body).to.deep.equal({
            ok: true,
            userCtx: {
              name: 'testingspreadsheet',
              roles: ['jenkins-firstcorpus_reader',
                'jenkins-firstcorpus_exporter',
                'testingspreadsheet-firstcorpus_admin',
                'testingspreadsheet-firstcorpus_writer',
                'testingspreadsheet-firstcorpus_reader',
                'testingspreadsheet-firstcorpus_commenter',
                'public-firstcorpus_reader',
                'fielddbuser',
                'user'
              ]
            },
            info: {
              authentication_db: '_users',
              authentication_handlers: ['oauth', 'cookie', 'default'],
              authenticated: 'default'
            }
          }, 'should have roles');
        });
    });

    it('should accept addroletouser from the backbone app', function () {
      if (process.env.REPLAY !== 'bloody') {
        this.skip();
      }
      return supertest(authWebService)
        .post('/addroletouser')
        .set('x-request-id', requestId + '-addroletouser')
        .send({
          username: 'jenkins',
          password: 'phoneme',
          connection: {
            dbname: 'jenkins-firstcorpus'
          },
          users: [{
            username: 'testingprototype',
            remove: ['all']
          }]
        })
        .then(function (res) {
          debug('res.body', res.body);
          expect(res.body.info).to.deep.equal([
            'User testingprototype was removed from the jenkins-firstcorpus team.'
          ]);
          return supertest(authWebService)
            .post('/addroletouser')
            .set('x-request-id', requestId + '-addroletouser')
            .send({
              username: 'jenkins',
              password: 'phoneme',
              connection: {
                dbname: 'jenkins-firstcorpus'
              },
              userToAddToRole: 'testingprototype',
              roles: ['reader', 'commenter']
            });
        })
        .then(function (res) {
          expect(res.body.info).to.deep.equal([
            'User testingprototype now has reader commenter access to jenkins-firstcorpus'
          ]);

          return supertest('http://testingprototype:test@localhost:5984')
            .post('/_session')
            .set('x-request-id', requestId + '-addroletouser')
            .send({
              name: 'testingprototype',
              password: 'test'
            })
            .set('Accept', 'application/json');
        })
        .then(function (res) {
          expect(res.body).to.deep.equal({
            ok: true,
            name: 'testingprototype',
            roles: [
              'jenkins-firstcorpus_reader',
              'jenkins-firstcorpus_commenter',
              'testingprototype-firstcorpus_admin',
              'testingprototype-firstcorpus_writer',
              'testingprototype-firstcorpus_reader',
              'testingprototype-firstcorpus_commenter',
              'public-firstcorpus_reader',
              'fielddbuser',
              'user'
            ]
          }, 'should have roles');
        });
    });
  });

  describe('/updateroles', function () {
    it('should accept deprecated updateroles from the spreadsheet app', function () {
      if (process.env.REPLAY !== 'bloody') {
        this.skip();
      }
      return supertest(authWebService)
        .post('/addroletouser')
        .set('x-request-id', requestId + '-updateroles')
        .send({
          username: 'jenkins',
          password: 'phoneme',
          connection: {
            dbname: 'jenkins-firstcorpus'
          },
          users: [{
            username: 'testingspreadsheet',
            remove: ['all']
          }]
        })
        .then(function (res) {
          expect(res.body).to.deep.equal({
            roleadded: true,
            users: [{
              username: 'testingspreadsheet',
              remove: ['jenkins-firstcorpus_all'],
              add: [],
              before: res.body.users[0].before,
              after: [],
              status: 200,
              message: 'User testingspreadsheet was removed from the jenkins-firstcorpus team.'
            }],
            info: ['User testingspreadsheet was removed from the jenkins-firstcorpus team.']
          });

          return supertest(authWebService)
            .post('/updateroles')
            .set('x-request-id', requestId + '-updateroles')
            .send({
              username: 'jenkins',
              password: 'phoneme',
              serverCode: 'localhost',
              userRoleInfo: {
                usernameToModify: 'testingspreadsheet',
                dbname: 'jenkins-firstcorpus',
                admin: false,
                writer: true,
                reader: true,
                commenter: true
              }
            });
        })
        .then(function (res) {
          debug(JSON.stringify(res.body));
          expect(res.body).to.deep.equal({
            roleadded: true,
            users: [{
              username: 'testingspreadsheet',
              remove: [],
              add: ['jenkins-firstcorpus_writer', 'jenkins-firstcorpus_reader', 'jenkins-firstcorpus_commenter'],
              before: [],
              after: ['writer', 'reader', 'commenter'],
              status: 200,
              message: 'User testingspreadsheet now has writer reader commenter access to jenkins-firstcorpus'
            }],
            info: ['User testingspreadsheet now has writer reader commenter access to jenkins-firstcorpus']
          });
        });
    });

    it('should accept new updateroles from the spreadsheet app', function () {
      if (process.env.REPLAY !== 'bloody') {
        this.skip();
      }
      return supertest(authWebService)
        .post('/addroletouser')
        .set('x-request-id', requestId + '-updateroles')
        .send({
          username: 'jenkins',
          password: 'phoneme',
          connection: {
            dbname: 'jenkins-firstcorpus'
          },
          users: [{
            username: 'testingspreadsheet',
            remove: ['all']
          }]
        })
        .then(function (res) {
          expect(res.body).to.deep.equal({
            roleadded: true,
            users: [{
              username: 'testingspreadsheet',
              remove: ['jenkins-firstcorpus_all'],
              add: [],
              before: res.body.users[0].before,
              after: [],
              status: 200,
              message: 'User testingspreadsheet was removed from the jenkins-firstcorpus team.'
            }],
            info: ['User testingspreadsheet was removed from the jenkins-firstcorpus team.']
          });

          return supertest(authWebService)
            .post('/updateroles')
            .set('x-request-id', requestId + '-updateroles')
            .send({
              username: 'jenkins',
              password: 'phoneme',
              serverCode: 'localhost',
              dbname: 'jenkins-firstcorpus',
              users: [{
                username: 'testingspreadsheet',
                add: ['writer', 'commenter', 'reader'],
                remove: ['admin']
              }]
            });
        })
        .then(function (res) {
          debug(JSON.stringify(res.body));
          expect(res.body).to.deep.equal({
            roleadded: true,
            users: [{
              username: 'testingspreadsheet',
              remove: [
                'jenkins-firstcorpus_admin'
              ],
              add: [
                'jenkins-firstcorpus_writer',
                'jenkins-firstcorpus_commenter',
                'jenkins-firstcorpus_reader'
              ],
              before: [],
              after: [
                'writer',
                'commenter',
                'reader'
              ],
              status: 200,
              message: 'User testingspreadsheet now has writer commenter reader access to jenkins-firstcorpus'
            }],
            info: ['User testingspreadsheet now has writer commenter reader access to jenkins-firstcorpus']
          });
        });
    });
  });

  describe('/corpusteam', function () {
    it('should refuse to tell a corpusteam details if the username is not a valid user', function () {
      return supertest(authWebService)
        .post('/corpusteam')
        .set('x-request-id', requestId + '-corpusteam')
        .send({
          username: 'testingspreadshee',
          connection: {
            dbname: 'jenkins-firstcorpus'
          }
        })
        .then(function (res) {
          expect(res.body.userFriendlyErrors).to.deep.equal([
            'Unauthorized, you are not a member of this corpus team.'
          ]);
        });
    });

    it('should accept corpusteam requests from the backbone app', function () {
      return supertest(authWebService)
        .post('/corpusteam')
        .set('x-request-id', requestId + '-corpusteam')
        .send({
          username: 'jenkins',
          password: 'phoneme',
          connection: {
            dbname: 'jenkins-firstcorpus'
          }
        })
        .then(function (res) {
          debug(JSON.stringify(res.body));
          expect(res.body.users.readers).to.deep.equal([{
            username: 'jenkins',
            gravatar: 'ab63a76362c3972ac83d5cb8830fdb51'
          }]);

          expect(res.body.users.writers).to.deep.equal([{
            username: 'jenkins',
            gravatar: 'ab63a76362c3972ac83d5cb8830fdb51'
          }]);

          expect(res.body.users.admins).to.deep.equal([{
            username: 'jenkins',
            gravatar: 'ab63a76362c3972ac83d5cb8830fdb51'
          }]);

          expect(res.body.users.notonteam.length).above(0);
          expect(res.body.users.allusers.length).above(0);
        });
    });

    it('should refuse to tell a corpusteam details if the username is a valid user but not on that team', function () {
      return supertest(authWebService)
        .post('/corpusteam')
        .set('x-request-id', requestId + '-corpusteam')
        .send({
          username: 'testuser2',
          password: 'test',
          connection: {
            dbname: 'testuser4-firstcorpus'
          }
        })
        .then(function (res) {
          debug(JSON.stringify(res.body));
          expect(res.body.userFriendlyErrors).to.deep.equal([
            'Unauthorized, you are not a member of this corpus team.'
          ]);
        });
    });

    it('should accept corpusteam requests from the spreadsheet app', function () {
      return supertest(authWebService)
        .post('/corpusteam')
        .set('x-request-id', requestId + '-corpusteam')
        .send({
          username: 'jenkins',
          password: 'phoneme',
          serverCode: 'localhost',
          dbname: 'jenkins-firstcorpus'
        })
        .then(function (res) {
          debug(JSON.stringify(res.body));

          expect(res.body.users.readers).to.deep.equal([{
            username: 'jenkins',
            gravatar: 'ab63a76362c3972ac83d5cb8830fdb51'
          }]);

          expect(res.body.users.writers).to.deep.equal([{
            username: 'jenkins',
            gravatar: 'ab63a76362c3972ac83d5cb8830fdb51'
          }]);

          expect(res.body.users.admins).to.deep.equal([{
            username: 'jenkins',
            gravatar: 'ab63a76362c3972ac83d5cb8830fdb51'
          }]);

          expect(res.body.users.notonteam.length).above(0);
          expect(res.body.users.allusers.length).above(0);
        });
    });
  });

  describe('/newcorpus', function () {
    before(function () {
      if (process.env.REPLAY !== 'bloody') {
        this.skip();
      }
      this.timeout(10000);

      return supertest(authWebService)
        .post('/register')
        .set('x-request-id', requestId + '-addroletouser')
        .send({
          username: 'testuser5',
          password: 'test'
        })
        .then(function (res) {
          debug('register testuser5', res.body);

          return supertest(authWebService)
            .post('/register')
            .set('x-request-id', requestId + '-addroletouser')
            .send({
              username: 'testuser6',
              password: 'test'
            });
        })
        .then(function (res) {
          debug('register testuser6', res.body);

          return supertest(authWebService)
            .post('/register')
            .set('x-request-id', requestId + '-addroletouser')
            .send({
              username: 'testuser7',
              password: 'test'
            });
        })
        .then(function (res) {
          debug('register testuser7', res.body);
        });
    });

    it('should refuse newcorpus if the title is not specified', function () {
      return supertest(authWebService)
        .post('/newcorpus')
        .set('x-request-id', requestId + '-newcorpus')
        .send({
          username: 'testuser5',
          password: 'test'
        })
        .then(function (res) {
          expect(res.body.userFriendlyErrors).to.deep.equal([
            'This app has made an invalid request. Please notify its developer. missing: newCorpusTitle'
          ]);
        });
    });

    it('should create a corpus', function () {
      return supertest(authWebService)
        .post('/newcorpus')
        .set('x-request-id', requestId + '-newcorpus')
        .send({
          username: 'testuser6',
          password: 'test',
          newCorpusName: 'Testing v3.32.01'
        })
        .then(function (res) {
          debug(JSON.stringify(res.body));
          expect(res.body.corpusadded).to.equal(true);

          return supertest('http://testuser6:test@localhost:5984')
            .get('/testuser6-testing_v3_32_01/_design/lexicon/_view/lexiconNodes')
            // .set('x-request-id', requestId + '-newcorpus')
            .set('Accept', 'application/json');
        })
        .then(function (res) {
          debug(JSON.stringify(res.body));
          if (res.status === 200) {
            expect(res.status).to.equal(200, 'should replicate the lexicon');
            expect(res.body).to.deep.equal({
              rows: [{
                key: null,
                value: 5
              }]
            }, 'should replicate the lexicon');
          } else {
            expect(res.status).to.equal(404); // delay in lexicon creation on new resources
          }

          return supertest(authWebService)
            .post('/newcorpus')
            .set('x-request-id', requestId + '-newcorpus')
            .send({
              username: 'testuser6',
              password: 'test',
              newCorpusName: 'Testing v3.32.01'
            });
        })
        .then(function (res) {
          debug(JSON.stringify(res.body));
          // conflict due to replay
          if (res.status === 409) {
            expect(res.body.userFriendlyErrors).to.deep.equal([
              'Unable to create your corpus. Error saving a user in the database. '
            ]);
          } else {
            expect(res.status).to.equal(412, 'should not complain if the user tries to recreate a corpus');

            expect(res.body.userFriendlyErrors).to.deep.equal([
              'Your corpus testuser6-testing_v3_32_01 already exists, no need to create it.'
            ]);
          }
        });
    });

    it('should create a branded corpus', function () {
      return supertest(authWebService)
        .post('/newcorpus')
        .set('x-request-id', requestId + '-newcorpus')
        .send({
          username: 'testuser7',
          password: 'test',
          appbrand: 'georgiantogether',
          newCorpusName: 'Georgian'
        })
        .then(function (res) {
          debug(JSON.stringify(res.body));
          expect(res.body.corpusadded).to.equal(true);
          expect(res.body.connection.brandLowerCase).to.equal('georgiantogether');
        });
    });
  });

  describe('syncDetails', function () {
    before(function () {
      if (process.env.REPLAY !== 'bloody') {
        this.skip();
      }
      this.timeout(10000);
      return supertest(authWebService)
        .post('/register')
        .set('x-request-id', requestId + '-addroletouser')
        .send({
          username: 'testuser8',
          password: 'test'

        })
        .then(function (res) {
          debug('register testuser8', res.body);
        });
    });
    it('should try to create all corpora listed in the user', function () {
      return supertest(authWebService)
        .post('/login')
        .set('x-request-id', requestId + '-syncDetails')
        .send({
          username: 'testuser8',
          password: 'test',
          syncDetails: true,
          syncUserDetails: {
            newCorpusConnections: [{
              dbname: 'testuser8-firstcorpus'
            }, {}, {
              dbname: 'someoneelsesdb-shouldnt_be_creatable'
            }, {
              dbname: 'testuser8-an_offline_corpus_created_in_the_prototype'
            }, {
              dbname: 'testuser8-firstcorpus'
            }]
          }
        })
        .then(function (res) {
          debug(JSON.stringify(res.body));
          expect(res.body.user.corpora.length).to.equal(1);
          expect(res.body.user.newCorpora.length).to.equal(3);

          return supertest('http://testuser8:test@localhost:5984')
            .get('/someoneelsesdb-shouldnt_be_creatable')
            .set('x-request-id', requestId + '-syncDetails')
            .set('Accept', 'application/json');
        })
        .then(function (res) {
          expect(res.status).to.equal(404);

          return supertest('http://testuser8:test@localhost:5984')
            .get('/testuser8-an_offline_corpus_created_in_the_prototype/_design/deprecated/_view/corpora')
            // .set('x-request-id', requestId + '-syncDetails')
            .set('Accept', 'application/json');
        })
        .then(function (res) {
          if (res.status === 200) {
            expect(res.body.total_rows).to.equal(1);
          } else {
            debug('syncDetails', JSON.stringify(res.body));
            expect(res.status).to.equal(401); // when running on a freshly created resources
          }
        });
    });
  });
});
