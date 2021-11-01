var expect = require('chai').expect;
var supertest = require('supertest');
var config = require('config');
var url = require('url');

var destination = process.env.URL;
if (!destination) {
  destination = url.parse(config.usersDbConnection.url);
  destination.auth = config.couchKeys.username + ':' + config.couchKeys.password;
  destination = url.format(destination).replace(/\/$/, '');
}
var source = process.env.SOURCE_URL;
console.log('destination', destination);
console.log('source', source);

describe('install', function () {
  describe('theuserscouch', function () {
    before(function () {
      return supertest(destination)
        .get('/_all_dbs')
        .set('Accept', 'application/json')
        .then(function (res) {
          console.log('res', res.body);
          expect(res.body).includes('_users');
        });
    });

    it('should replicate theuserscouch', function () {
      console.log('source', source);
      console.log('destination', destination);
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
          console.log('res.body', res.body);
          expect(res.body.ok).to.equal(true);

          return supertest(destination)
            .get('/_all_dbs')
            .set('Accept', 'application/json');
        })
        .then(function (res) {
          console.log('res.body', res.body);
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
          expect(res.body).includes('_users');
        });
    });

    it('should replicate new_corpus', function () {
      var dbnameToReplicate = 'new_corpus';

      console.log('source', source);
      console.log('destination', destination);
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
          console.log('res.body', res.body);
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

  describe('new_testing_corpus', function () {
    before(function () {
      return supertest(destination)
        .get('/_all_dbs')
        .set('Accept', 'application/json')
        .then(function (res) {
          expect(res.body).includes('_users');
        });
    });

    it('should replicate new_testing_corpus', function () {
      var dbnameToReplicate = 'new_testing_corpus';

      console.log('source', source);
      console.log('destination', destination);
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
          console.log('res.body', res.body);
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

  describe('new_corpus_activity_feed', function () {
    before(function () {
      return supertest(destination)
        .get('/_all_dbs')
        .set('Accept', 'application/json')
        .then(function (res) {
          expect(res.body).includes('_users');
        });
    });

    it('should replicate new_corpus_activity_feed', function () {
      var dbnameToReplicate = 'new_corpus_activity_feed';

      console.log('source', source);
      console.log('destination', destination);
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
          console.log('res.body', res.body);
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
          expect(res.body).includes('_users');
        });
    });

    it('should replicate new_user_activity_feed', function () {
      var dbnameToReplicate = 'new_user_activity_feed';

      console.log('source', source);
      console.log('destination', destination);
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
          console.log('res.body', res.body);
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
          expect(res.body).includes('_users');
        });
    });

    it('should replicate new_lexicon', function () {
      var dbnameToReplicate = 'new_lexicon';

      console.log('source', source);
      console.log('destination', destination);
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
          console.log('res.body', res.body);
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
          expect(res.body).includes('_users');
        });
    });

    it('should replicate new_lexicon', function () {
      var dbnameToReplicate = 'new_lexicon';

      console.log('source', source);
      console.log('destination', destination);
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
          console.log('res.body', res.body);
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
});
