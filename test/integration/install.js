var expect = require('chai').expect;
var supertest = require('supertest');
var config = require('config');
var url = require('url');
var path = require('path');
var replay = require('replay');

const originalLocalhosts = replay._localhosts;
console.log('replay localhosts', replay._localhosts)

var destination = "http://admin:none@localhost:5984";
if (!destination) {
  destination = url.parse(config.usersDbConnection.url);
  destination.auth = config.couchKeys.username + ':' + config.couchKeys.password;
  destination = url.format(destination).replace(/\/$/, '');
}
var source = process.env.SOURCE_URL;
console.log('destination', destination);
console.log('source', source);

describe('install', function () {
  before(function() {
    replay._localhosts = new Set();
    console.log('before replay localhosts', replay._localhosts)
  });
  after(function() {
    replay._localhosts = originalLocalhosts;
    console.log('after replay localhosts', replay._localhosts)
  });

  describe('theuserscouch', function () {
    before(function () {
      return supertest(destination)
        .get('/_all_dbs')
        .set('Accept', 'application/json')
        .then(function (res) {
          console.log('res', res.body);
          expect(res.body).includes('_users', JSON.stringify(res.body));
        });
    });

    it('should replicate theuserscouch', function () {
      return supertest(destination)
        .post('/_replicate')
        .set('Accept', 'application/json')
        .send({
          source: source + '/new_theuserscouch',
          target: {
            url: destination + '/theuserscouch'
          },
          create_target: true
        })
        .then(function (res) {
          console.log('res.body theuserscouch', res.body);
          expect(res.body.ok).to.equal(true);

          return supertest(destination)
            .get('/_all_dbs')
            .set('Accept', 'application/json');
        })
        .then(function (res) {
          console.log('res.body after', res.body);
          expect(res.body).includes('theuserscouch');
        });
    });
  });

  describe('new_corpus', function () {
    before(function () {
      return supertest(destination)
        .get('/_all_dbs')
        .set('Accept', 'application/json')
        .then(function (res) {
          expect(res.body).includes('_users', JSON.stringify(res.body));
        });
    });

    it('should replicate new_corpus', function () {
      var dbnameToReplicate = 'new_corpus';

      return supertest(destination)
        .post('/_replicate')
        .set('Accept', 'application/json')
        .send({
          source: source + '/' + dbnameToReplicate,
          target: {
            url: destination + '/' + dbnameToReplicate
          },
          create_target: true
        })
        .then(function (res) {
          console.log('res.body new_corpus', res.body);
          expect(res.body.ok).to.equal(true);

          return supertest(destination)
            .get('/_all_dbs')
            .set('Accept', 'application/json');
        })
        .then(function (res) {
          console.log('res.body new_corpus after', res.body);
          expect(res.body).includes(dbnameToReplicate);
        });
    });
  });

  describe('new_testing_corpus', function () {
    before(function () {
      return supertest(destination)
        .get('/_all_dbs')
        .set('Accept', 'application/json')
        .then(function (res) {
          expect(res.body).includes('_users', JSON.stringify(res.body));
        });
    });

    it('should replicate new_testing_corpus', function () {
      var dbnameToReplicate = 'new_testing_corpus';

      return supertest(destination)
        .post('/_replicate')
        .set('Accept', 'application/json')
        .send({
          source: source + '/' + dbnameToReplicate,
          target: {
            url: destination + '/' + dbnameToReplicate
          },
          create_target: true
        })
        .then(function (res) {
          console.log('res.body new_testing_corpus', res.body);
          expect(res.body.ok).to.equal(true);

          return supertest(destination)
            .get('/_all_dbs')
            .set('Accept', 'application/json');
        })
        .then(function (res) {
          console.log('res.body new_testing_corpus after', res.body);
          expect(res.body).includes(dbnameToReplicate);
        });
    });
  });

  describe('new_corpus_activity_feed', function () {
    before(function () {
      return supertest(destination)
        .get('/_all_dbs')
        .set('Accept', 'application/json')
        .then(function (res) {
          expect(res.body).includes('_users', JSON.stringify(res.body));
        });
    });

    // TODO unable to replicate the activity feeds
    it.skip('should replicate new_corpus_activity_feed', function () {
      var dbnameToReplicate = 'new_corpus_activity_feed';

      return supertest(destination)
        .post('/_replicate')
        .set('Accept', 'application/json')
        .send({
          source: source + '/' + dbnameToReplicate,
          target: {
            url: destination + '/' + dbnameToReplicate
          },
          create_target: true
        })
        .then(function (res) {
          console.log('res.body new_corpus_activity_feed', res.body);
          expect(res.body.ok).to.equal(true);

          return supertest(destination)
            .get('/_all_dbs')
            .set('Accept', 'application/json');
        })
        .then(function (res) {
          console.log('res.body', res.body);
          expect(res.body).includes(dbnameToReplicate);
        });
    });
  });

  describe('new_user_activity_feed', function () {
    before(function () {
      return supertest(destination)
        .get('/_all_dbs')
        .set('Accept', 'application/json')
        .then(function (res) {
          expect(res.body).includes('_users', JSON.stringify(res.body));
        });
    });

    // TODO unable to replicate the activity feeds
    it.skip('should replicate new_user_activity_feed', function () {
      var dbnameToReplicate = 'new_user_activity_feed';

      return supertest(destination)
        .post('/_replicate')
        .set('Accept', 'application/json')
        .send({
          source: source + '/' + dbnameToReplicate,
          target: {
            url: destination + '/' + dbnameToReplicate
          },
          create_target: true
        })
        .then(function (res) {
          console.log('res.body new_user_activity_feed', res.body);
          expect(res.body.ok).to.equal(true);

          return supertest(destination)
            .get('/_all_dbs')
            .set('Accept', 'application/json');
        })
        .then(function (res) {
          console.log('res.body', res.body);
          expect(res.body).includes(dbnameToReplicate);
        });
    });
  });

  describe('new_lexicon', function () {
    before(function () {
      return supertest(destination)
        .get('/_all_dbs')
        .set('Accept', 'application/json')
        .then(function (res) {
          expect(res.body).includes('_users', JSON.stringify(res.body));
        });
    });

    it('should replicate new_lexicon', function () {
      var dbnameToReplicate = 'new_lexicon';

      return supertest(destination)
        .post('/_replicate')
        .set('Accept', 'application/json')
        .send({
          source: source + '/' + dbnameToReplicate,
          target: {
            url: destination + '/' + dbnameToReplicate
          },
          create_target: true
        })
        .then(function (res) {
          console.log('res.body new_lexicon', res.body);
          expect(res.body.ok).to.equal(true);

          return supertest(destination)
            .get('/_all_dbs')
            .set('Accept', 'application/json');
        })
        .then(function (res) {
          console.log('res.body new_lexicon after', res.body);
          expect(res.body).includes(dbnameToReplicate);
        });
    });
  });

  describe('new_lexicon', function () {
    before(function () {
      return supertest(destination)
        .get('/_all_dbs')
        .set('Accept', 'application/json')
        .then(function (res) {
          expect(res.body).includes('_users', JSON.stringify(res.body));
        });
    });

    it('should replicate new_lexicon', function () {
      var dbnameToReplicate = 'new_lexicon';

      return supertest(destination)
        .post('/_replicate')
        .set('Accept', 'application/json')
        .send({
          source: source + '/' + dbnameToReplicate,
          target: {
            url: destination + '/' + dbnameToReplicate
          },
          create_target: true
        })
        .then(function (res) {
          console.log('res.body new_lexicon', res.body);
          expect(res.body.ok).to.equal(true);

          return supertest(destination)
            .get('/_all_dbs')
            .set('Accept', 'application/json');
        })
        .then(function (res) {
          console.log('res.body new_lexicon after ', res.body);
          expect(res.body).includes(dbnameToReplicate);
        });
    });
  });
});
