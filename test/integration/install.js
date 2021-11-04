const config = require('config');
const debug = require('debug')('test:install');
const { expect } = require('chai');
const replay = require('replay');
const supertest = require('supertest');
const url = require('url');

const originalLocalhosts = replay._localhosts;
debug('replay localhosts', replay._localhosts);

let destination = 'http://admin:none@localhost:5984';
if (!destination) {
  destination = url.parse(config.usersDbConnection.url);
  destination.auth = `${config.couchKeys.username}:${config.couchKeys.password}`;
  destination = url.format(destination).replace(/\/$/, '');
}
const source = process.env.SOURCE_URL;
debug('destination', destination);
debug('source', source);

describe('install', () => {
  before(() => {
    replay._localhosts = new Set();
    debug('before replay localhosts', replay._localhosts);
  });
  after(() => {
    replay._localhosts = originalLocalhosts;
    debug('after replay localhosts', replay._localhosts);
  });

  describe('_users views', () => {
    it('should create the _users views', () => supertest(destination)
      .post('/_users')
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
          expect(res.body.ok).to.equal(true);
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
    before(() => supertest(destination)
      .get('/_all_dbs')
      .set('Accept', 'application/json')
      .then((res) => {
        debug('res', res.body);
        expect(res.body).includes('_users', JSON.stringify(res.body));
      }));

    it('should replicate theuserscouch', () => supertest(destination)
      .post('/_replicate')
      .set('Accept', 'application/json')
      .send({
        source: `${source}/new_theuserscouch`,
        target: {
          url: `${destination}/theuserscouch`,
        },
        create_target: true,
      })
      .then((res) => {
        debug('res.body theuserscouch', res.body);
        expect(res.body.ok).to.equal(true);

        return supertest(destination)
          .get('/_all_dbs')
          .set('Accept', 'application/json');
      })
      .then((res) => {
        debug('res.body after', res.body);
        expect(res.body).includes('theuserscouch');
      }));
  });

  describe('new_corpus', () => {
    before(() => supertest(destination)
      .get('/_all_dbs')
      .set('Accept', 'application/json')
      .then((res) => {
        expect(res.body).includes('_users', JSON.stringify(res.body));
      }));

    it('should replicate new_corpus', () => {
      const dbnameToReplicate = 'new_corpus';

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
    before(() => supertest(destination)
      .get('/_all_dbs')
      .set('Accept', 'application/json')
      .then((res) => {
        expect(res.body).includes('_users', JSON.stringify(res.body));
      }));

    it('should replicate new_testing_corpus', () => {
      const dbnameToReplicate = 'new_testing_corpus';

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
          debug('res.body new_testing_corpus', res.body);
          expect(res.body.ok).to.equal(true);

          return supertest(destination)
            .get('/_all_dbs')
            .set('Accept', 'application/json');
        })
        .then((res) => {
          debug('res.body new_testing_corpus after', res.body);
          expect(res.body).includes(dbnameToReplicate);
        });
    });
  });

  describe('new_corpus_activity_feed', () => {
    before(() => supertest(destination)
      .get('/_all_dbs')
      .set('Accept', 'application/json')
      .then((res) => {
        expect(res.body).includes('_users', JSON.stringify(res.body));
      }));

    // TODO unable to replicate the activity feeds
    it.skip('should replicate new_corpus_activity_feed', () => {
      const dbnameToReplicate = 'new_corpus_activity_feed';

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
          debug('res.body new_corpus_activity_feed', res.body);
          expect(res.body.ok).to.equal(true);

          return supertest(destination)
            .get('/_all_dbs')
            .set('Accept', 'application/json');
        })
        .then((res) => {
          debug('res.body', res.body);
          expect(res.body).includes(dbnameToReplicate);
        });
    });
  });

  describe('new_user_activity_feed', () => {
    before(() => supertest(destination)
      .get('/_all_dbs')
      .set('Accept', 'application/json')
      .then((res) => {
        expect(res.body).includes('_users', JSON.stringify(res.body));
      }));

    // TODO unable to replicate the activity feeds
    it.skip('should replicate new_user_activity_feed', () => {
      const dbnameToReplicate = 'new_user_activity_feed';

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
          debug('res.body new_user_activity_feed', res.body);
          expect(res.body.ok).to.equal(true);

          return supertest(destination)
            .get('/_all_dbs')
            .set('Accept', 'application/json');
        })
        .then((res) => {
          debug('res.body', res.body);
          expect(res.body).includes(dbnameToReplicate);
        });
    });
  });

  describe('new_lexicon', () => {
    before(() => supertest(destination)
      .get('/_all_dbs')
      .set('Accept', 'application/json')
      .then((res) => {
        expect(res.body).includes('_users', JSON.stringify(res.body));
      }));

    it('should replicate new_lexicon', () => {
      const dbnameToReplicate = 'new_lexicon';

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
          debug('res.body new_lexicon', res.body);
          expect(res.body.ok).to.equal(true);

          return supertest(destination)
            .get('/_all_dbs')
            .set('Accept', 'application/json');
        })
        .then((res) => {
          debug('res.body new_lexicon after', res.body);
          expect(res.body).includes(dbnameToReplicate);
        });
    });
  });

  describe('new_lexicon', () => {
    before(() => supertest(destination)
      .get('/_all_dbs')
      .set('Accept', 'application/json')
      .then((res) => {
        expect(res.body).includes('_users', JSON.stringify(res.body));
      }));

    it('should replicate new_lexicon', () => {
      const dbnameToReplicate = 'new_lexicon';

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
          debug('res.body new_lexicon', res.body);
          expect(res.body.ok).to.equal(true);

          return supertest(destination)
            .get('/_all_dbs')
            .set('Accept', 'application/json');
        })
        .then((res) => {
          debug('res.body new_lexicon after ', res.body);
          expect(res.body).includes(dbnameToReplicate);
        });
    });
  });
});
