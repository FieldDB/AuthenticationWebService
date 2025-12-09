const config = require('config');
const debug = require('debug')('test:install');
const { expect } = require('chai');
const replay = require('replay');
const supertest = require('supertest');
const url = require('url');

// eslint-disable-next-line no-underscore-dangle
const originalLocalhosts = replay._localhosts;
// eslint-disable-next-line no-underscore-dangle
debug('replay localhosts', replay._localhosts);

let destination = 'https://admin:none@localhost:6984';
if (!destination) {
  destination = url.parse(config.usersDbConnection.url);
  destination.auth = `${config.couchKeys.username}:${config.couchKeys.password}`;
  destination = url.format(destination).replace(/\/$/, '');
}
const source = process.env.SOURCE_URL;
const REPLAY = process.env.REPLAY || '';
debug('destination', destination);
debug('source', source);
let adminSessionCookie;
let couchDBInfo;
const usersDBname = config.usersDbConnection.dbname;

describe('install', () => {
  before(function () {
    // couchdb can be slow to be fully setup so retry a few times
    this.retries(3);
    if (REPLAY === 'bloody' && source.includes('example.org')) {
      throw new Error('SOURCE_URL is not set to a valid test CouchDB instance. Please export SOURCE_URL=http://public:none@thecouchinstance.org');
    }

    if (REPLAY === 'bloody' && destination.includes('sync.org')) {
      throw new Error('The destination is not set to a valid test CouchDB instance. Please edit config.local to use a db such as http://public:none@localhost:5984');
    }
    // eslint-disable-next-line no-underscore-dangle
    replay._localhosts = new Set();
    // eslint-disable-next-line no-underscore-dangle
    debug('before replay localhosts', replay._localhosts);

    return supertest(destination)
      .post('/_session')
      .set('Accept', 'application/json')
      .send({
        name: 'admin',
        password: 'none',
      })
      .then((res) => {
        expect(res.status).to.equal(200, JSON.stringify(res.body));

        const setCookie = res.headers['set-cookie'].length === 1 ? res.headers['set-cookie'][0] : res.headers['set-cookie'];
        [adminSessionCookie] = setCookie.split(';');
        debug('adminSessionCookie', adminSessionCookie);

        return supertest(destination)
          .get('/')
          .set('Accept', 'application/json');
      })
      .then((res) => {
        expect(res.status).to.equal(200);
        debug('couchdb version', res.body);
        couchDBInfo = res.body;
        expect(couchDBInfo.version).to.equal('3.5.1', JSON.stringify(couchDBInfo));
      });
  });
  after(() => {
    // eslint-disable-next-line no-underscore-dangle
    replay._localhosts = originalLocalhosts;
    // eslint-disable-next-line no-underscore-dangle
    debug('after replay localhosts', replay._localhosts);
  });

  describe('_users views', () => {
    before(() => supertest(destination)
      .get('/_all_dbs')
      .set('cookie', adminSessionCookie)
      .set('Accept', 'application/json')
      .then((res) => {
        debug('res', res.body);
        expect(res.body).includes('_users', JSON.stringify(res.body));
      })
      .catch(() => supertest(destination)
        .put('/_users')
        .set('cookie', adminSessionCookie)
        .set('Accept', 'application/json')
        .send({})));

    it('should create the _users views', () => supertest(destination)
      .post('/_users')
      .set('cookie', adminSessionCookie)
      .set('Accept', 'application/json')
      .send({
        _id: '_design/users',
        language: 'javascript',
        views: {
          userroles: {
            map: 'function(doc) {\n  var username = doc._id.replace(/org.couchdb.user:/,"");\n  if((doc.password_sha || doc.password_scheme) && username.indexOf("test") == -1 && username.indexOf("anonymous") == -1  && username.indexOf("acra") == -1)\n    emit(username,doc.roles);\n}',
          },
          normalusers: {
            map: 'function(doc) {\n      if (!doc.roles || doc.roles.length === 0) {\n        return;\n      }\n      var username = doc._id.replace(/org.couchdb.user:/, "");\n      if (username.indexOf("test") > -1 || username.indexOf("anonymous") > -1 || username === "acra" || username === "acra_reporter") {\n        // this is not a beta tester\n      } else {\n        emit(username, doc.roles);\n      }\n    }',
          },
          betatesters: {
            map: 'function(doc) {\n      if (!doc.roles || doc.roles.length === 0) {\n        return;\n      }\n      var username = doc._id.replace(/org.couchdb.user:/, "");\n      if (username.indexOf("test") > -1 || username.indexOf("anonymous") > -1 || username === "acra" || username === "acra_reporter") {\n        emit(username, doc.roles);\n      } else {\n        // this is not a beta tester\n      }\n    }',
          },
        },
      })
      .then((res) => {
        if (res.body.error !== 'conflict') {
          expect(res.body.ok).to.equal(true, JSON.stringify(res.body));
        }

        return supertest(destination)
          .get('/_users/_design/users/_view/normalusers')
          .set('Accept', 'application/json');
      })
      .then((res) => {
        debug('res.body normalusers', JSON.stringify(res.body));
        expect(res.body.rows).not.equal(undefined);
        expect(res.body.total_rows).not.equal(undefined);
      }));
  });

  describe('theuserscouch', () => {
    it('should replicate theuserscouch', () => supertest(destination)
      .post('/_replicate')
      .set('cookie', adminSessionCookie)
      .set('Accept', 'application/json')
      .send({
        source: `${source}/new_theuserscouch`,
        target: {
          url: `${destination}/${usersDBname}`,
        },
        create_target: true,
      })
      .then((res) => {
        debug('res.body theuserscouch', res.body);
        expect(res.body.ok).to.equal(true, JSON.stringify(res.body));

        return supertest(destination)
          .get('/_all_dbs')
          .set('Accept', 'application/json');
      })
      .then((res) => {
        debug('res.body after', res.body);
        expect(res.body).includes(usersDBname);
      }));
  });

  describe('new_corpus', () => {
    it('should replicate new_corpus', () => {
      const dbnameToReplicate = 'new_corpus';

      return supertest(destination)
        .post('/_replicate')
        .set('cookie', adminSessionCookie)
        .set('Accept', 'application/json')
        .send({
          source: `${source}/${dbnameToReplicate}`,
          target: {
            url: `${destination}/${dbnameToReplicate}`,
          },
          create_target: true,
        })
        .then((res) => {
          debug('res.body new_corpus', res.body);
          expect(res.body.ok).to.equal(true);

          return supertest(destination)
            .get('/_all_dbs')
            .set('Accept', 'application/json');
        })
        .then((res) => {
          debug('res.body new_corpus after', res.body);
          expect(res.body).includes(dbnameToReplicate);
        });
    });
  });

  describe('new_testing_corpus', () => {
    it('should replicate new_testing_corpus', () => {
      const dbnameToReplicate = 'new_testing_corpus';

      return supertest(destination)
        .post('/_replicate')
        .set('cookie', adminSessionCookie)
        .set('Accept', 'application/json')
        .send({
          source: `${source}/${dbnameToReplicate}`,
          target: {
            url: `${destination}/${dbnameToReplicate}`,
          },
          create_target: true,
        })
        .then((res) => {
          debug('res.body new_testing_corpus', res.body);
          expect(res.body.ok).to.equal(true, JSON.stringify(res.body));

          return supertest(destination)
            .get('/_all_dbs')
            .set('Accept', 'application/json');
        })
        .then((res) => {
          debug('res.body new_testing_corpus after', res.body);
          expect(res.body).includes(dbnameToReplicate);

          return supertest(destination)
            .get(`/${dbnameToReplicate}/_design/data/_view/by_type?group=true`)
            .set('Accept', 'application/json');
        })
        .then((res) => {
          debug('res.body new_testing_corpus design doc for data', res.body);
          expect(res.body).to.deep.equal({
            rows: [],
          }, JSON.stringify(res.body));
        });
    });
  });

  describe('new_corpus_activity_feed', () => {
    // TODO add admin role to the admin user
    // unable to replicate the activity feeds
    // due to permissions so instead
    // replicating a db that contains both validate docs
    it('should replicate new_corpus_activity_feed', () => {
      const dbnameToReplicate = 'new_corpus_activity_feed';

      return supertest(destination)
        .post('/_replicate')
        .set('cookie', adminSessionCookie)
        .set('Accept', 'application/json')
        .send({
          source: `${source}/new_activity_feed`,
          target: {
            url: `${destination}/${dbnameToReplicate}`,
          },
          create_target: true,
        })
        .then((res) => {
          debug('res.body new_activity_feed', res.body);
          expect(res.body.ok).to.equal(true);

          return supertest(destination)
            .get(`/${dbnameToReplicate}/_design/blockNonContribAdminWrites`)
            .set('Accept', 'application/json');
        })
        .then((res) => {
          debug('res.body', res.body);
          const doc = res.body;
          if (!doc.corpus_validate_doc_update) {
            expect(doc.user_validate_doc_update).to.equal(undefined);
            return res;
          }

          // Convert to the new_corpus_activity_feed validate_doc_update
          expect(doc.corpus_validate_doc_update).not.to.equal(undefined);
          doc.validate_doc_update = doc.corpus_validate_doc_update;
          delete doc.user_validate_doc_update;
          delete doc.corpus_validate_doc_update;

          return supertest(destination)
            .put(`/${dbnameToReplicate}/_design/blockNonContribAdminWrites`)
            .set('Accept', 'application/json')
            // https://stackoverflow.com/questions/49720537/referer-header-required-error-in-couchdb-when-trying-to-use-find
            .set('Referer', '')
            .set('X-Forwarded-Host', '')
            .send(doc);
        })
        .then((res) => {
          // eslint-disable-next-line no-underscore-dangle
          if (res.body._id) {
            expect(res.status).to.equal(200);
          } else {
            debug('res.status', res.status);
            debug('res.body', res.body);
            debug('res.headers', res.headers);
            expect(res.status).to.equal(201);
            expect(res.body.id).to.equal('_design/blockNonContribAdminWrites');
          }
        });
    });
  });

  describe('new_user_activity_feed', () => {
    // unable to replicate the activity feeds
    // due to permissions so instead
    // replicating a db that contains both validate docs
    it('should replicate new_user_activity_feed', () => {
      const dbnameToReplicate = 'new_user_activity_feed';

      return supertest(destination)
        .post('/_replicate')
        .set('cookie', adminSessionCookie)
        .set('Accept', 'application/json')
        .send({
          source: `${source}/new_activity_feed`,
          target: {
            url: `${destination}/${dbnameToReplicate}`,
          },
          create_target: true,
        })
        .then((res) => {
          debug('res.body new_activity_feed', res.body);
          expect(res.body.ok).to.equal(true);

          return supertest(destination)
            .get(`/${dbnameToReplicate}/_design/blockNonContribAdminWrites`)
            .set('Accept', 'application/json');
        })
        .then((res) => {
          debug('res.body', res.body);
          const doc = res.body;
          if (!doc.user_validate_doc_update) {
            expect(doc.corpus_validate_doc_update).to.equal(undefined);
            return res;
          }

          // Convert to the new_user_activity_feed validate_doc_update
          expect(doc.user_validate_doc_update).not.to.equal(undefined);
          doc.validate_doc_update = doc.user_validate_doc_update;
          delete doc.user_validate_doc_update;
          delete doc.corpus_validate_doc_update;

          return supertest(destination)
            .put(`/${dbnameToReplicate}/_design/blockNonContribAdminWrites`)
            .set('Accept', 'application/json')
            .set('Referer', '')
            .set('X-Forwarded-Host', '')
            .send(doc);
        })
        .then((res) => {
          // eslint-disable-next-line no-underscore-dangle
          if (res.body._id) {
            expect(res.status).to.equal(200);
          } else {
            debug('res.status', res.status);
            debug('res.body', res.body);
            debug('res.headers', res.headers);
            expect(res.status).to.equal(201);
            expect(res.body.id).to.equal('_design/blockNonContribAdminWrites');
          }
        });
    });
  });

  describe('new_gamify_corpus', () => {
    it('should replicate new_gamify_corpus', () => {
      const dbnameToReplicate = 'new_gamify_corpus';

      return supertest(destination)
        .post('/_replicate')
        .set('cookie', adminSessionCookie)
        .set('Accept', 'application/json')
        .send({
          source: `${source}/${dbnameToReplicate}`,
          target: {
            url: `${destination}/${dbnameToReplicate}`,
          },
          create_target: true,
        })
        .then((res) => {
          debug('res.body new_gamify_corpus', res.body);
          expect(res.body.ok).to.equal(true);

          return supertest(destination)
            .get('/_all_dbs')
            .set('Accept', 'application/json');
        })
        .then((res) => {
          debug('res.body new_gamify_corpus after', res.body);
          expect(res.body).includes(dbnameToReplicate);
        });
    });
  });

  describe('new_learnx_corpus', () => {
    it('should replicate new_learnx_corpus', () => {
      const dbnameToReplicate = 'new_learnx_corpus';

      return supertest(destination)
        .post('/_replicate')
        .set('cookie', adminSessionCookie)
        .set('Accept', 'application/json')
        .send({
          source: `${source}/${dbnameToReplicate}`,
          target: {
            url: `${destination}/${dbnameToReplicate}`,
          },
          create_target: true,
        })
        .then((res) => {
          debug('res.body new_learnx_corpus', res.body);
          expect(res.body.ok).to.equal(true);

          return supertest(destination)
            .get('/_all_dbs')
            .set('Accept', 'application/json');
        })
        .then((res) => {
          debug('res.body new_learnx_corpus after', res.body);
          expect(res.body).includes(dbnameToReplicate);
        });
    });
  });

  describe('new_wordcloud_corpus', () => {
    it('should replicate new_wordcloud_corpus', () => {
      const dbnameToReplicate = 'new_wordcloud_corpus';

      return supertest(destination)
        .post('/_replicate')
        .set('cookie', adminSessionCookie)
        .set('Accept', 'application/json')
        .send({
          source: `${source}/${dbnameToReplicate}`,
          target: {
            url: `${destination}/${dbnameToReplicate}`,
          },
          create_target: true,
        })
        .then((res) => {
          debug('res.body new_wordcloud_corpus', res.body);
          expect(res.body.ok).to.equal(true);

          return supertest(destination)
            .get('/_all_dbs')
            .set('Accept', 'application/json');
        })
        .then((res) => {
          debug('res.body new_wordcloud_corpus after', res.body);
          expect(res.body).includes(dbnameToReplicate);
        });
    });
  });

  describe('new_lexicon', () => {
    it('should replicate new_lexicon', () => {
      const dbnameToReplicate = 'new_lexicon';

      return supertest(destination)
        .post('/_replicate')
        .set('cookie', adminSessionCookie)
        .set('Accept', 'application/json')
        .send({
          source: `${source}/${dbnameToReplicate}`,
          target: {
            url: `${destination}/${dbnameToReplicate}`,
          },
          create_target: true,
        })
        .then((res) => {
          debug('res.body new_lexicon', res.body);
          expect(res.body.ok).to.equal(true, JSON.stringify(res.body));

          return supertest(destination)
            .get(`/${dbnameToReplicate}/_design/lexicon/_view/lexiconNodes?group=true`)
            .set('Accept', 'application/json');
        })
        .then((res) => {
          debug('res.body new_lexicon after ', res.body);
          expect(res.body).to.deep.equal({
            rows: [],
          }, JSON.stringify(res.body));
        });
    });
  });

  describe('new_export', () => {
    it('should replicate new_export', () => {
      const dbnameToReplicate = 'new_export';

      return supertest(destination)
        .post('/_replicate')
        .set('Accept', 'application/json')
        .send({
          source: `${source}/${dbnameToReplicate}`,
          target: {
            url: `${destination}/${dbnameToReplicate}`,
          },
          create_target: true,
        })
        .then((res) => {
          debug('res.body new_export', res.body);
          expect(res.body.ok).to.equal(true);

          return supertest(destination)
            .get('/_all_dbs')
            .set('Accept', 'application/json');
        })
        .then((res) => {
          debug('res.body new_export after ', res.body);
          expect(res.body).includes(dbnameToReplicate);
        });
    });
  });

  describe('online prototype', () => {
    /**
     * note: unable to login and use the prototype because it is not using https in the docker container
     * and the app expects and requires https
     */
    it('should replicate prototype', () => {
      const dbnameToReplicate = 'prototype';

      return supertest(destination)
        .post('/_replicate')
        .set('cookie', adminSessionCookie)
        .set('Accept', 'application/json')
        .send({
          source: `${source}/${dbnameToReplicate}`,
          target: {
            url: `${destination}/${dbnameToReplicate}`,
          },
          create_target: true,
        })
        .then((res) => {
          expect(res.body.ok).to.equal(true);

          return supertest(destination)
            .get(`/${dbnameToReplicate}/_design/prototype`)
            .set('Accept', 'application/json');
        })
        .then((res) => {
          debug('res.body prototype after ', res.body);
          expect(res.body.couchapp && res.body.couchapp.name).to.contain('Prototype (has the most features of the apps)', JSON.stringify(res.body));

          return supertest(destination)
            .get(`/${dbnameToReplicate}/_design/prototype/user.html`);
        })
        .then((res) => {
          debug('res.body prototype after ', res.body);
          expect(res.status).to.equal(200);
        });
    });
  });
});
