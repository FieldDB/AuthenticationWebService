const debug = require('debug')('test:models:user');
const { expect } = require('chai');
const { Sequelize } = require('sequelize');

const User = require('../../models/user');

describe('models/user', () => {
  before(() => User.init());

  describe('serialization', () => {
    it('should convert flat to json', () => {
      const flat = {
        username: 'test-abc',
        givenName: 'abc',
      };

      const json = User.serialization.flatToJson(flat, '');

      expect(json).to.deep.equal({
        name: {
          givenName: 'abc',
          familyName: '',
        },
        id: '',
        revision: '',
        deletedAt: null,
        deletedReason: '',
        description: '',
        email: '',
        hash: '',
        gravatar: '',
        language: '',
        username: 'test-abc',
      });
    });

    it('should convert json to flat', () => {
      const json = {
        username: 'test-abc',
        name: {
          givenName: 'abc',
        },
        extraneous: 'will be removed from flat',
      };

      const flat = User.serialization.jsonToFlat(json, '');

      expect(flat).to.deep.equal({
        givenName: 'abc',
        familyName: '',
        revision: '',
        deletedAt: null,
        deletedReason: '',
        description: '',
        email: '',
        hash: '',
        gravatar: '',
        language: '',
        username: 'test-abc',
      });
    });
  });

  describe('persistance', () => {
    before(() => User.init());

    it('should create a user', (done) => {
      const json = {
        username: `test-${Date.now()}`,
        password: '7hfD!hujoijK',
        name: {
          familyName: 'Test',
        },
      };

      User.create(json, (err, profile) => {
        if (err) {
          return done(err);
        }

        expect(profile.id).length(36);
        expect(profile.createdAt instanceof Date).to.equal(true);
        expect(profile.createdAt).to.equal(profile.updatedAt);

        expect(profile.id).length(36);
        expect(profile.username).to.equal(json.username);
        expect(profile.name.givenName).to.equal('');
        expect(profile.name.familyName).to.equal('Test');
        expect(profile.createdAt).to.not.equal(undefined);
        expect(profile.updatedAt).to.not.equal(undefined);
        expect(profile.revision).to.not.equal(undefined);
        expect(profile.hash).length(60);
        expect(profile.deletedAt).to.equal(null);

        return done();
      });
    });

    it('should require a password', (done) => {
      const json = {
        username: `test-deficient${Date.now()}`,
      };

      User.create(json, (err) => {
        expect(err.message).equal('Please provide a password which is 8 characters or longer');

        return done();
      });
    });

    it('should ignore invalid revisions', (done) => {
      const json = {
        username: `test-deficient${Date.now()}`,
        password: 'a390j3qawoeszidj',
        name: {},
        revision: 'notanexpectedtrevision',
      };

      User.create(json, (err, profile) => {
        if (err) {
          return done(err);
        }

        expect(profile.id).length(36);

        expect(profile.revision).to.not.equal(undefined);
        expect(profile.revision).not.equal('notanexpectedtrevision');

        return done();
      });
    });

    it('should accept a client side user', (done) => {
      const json = {
        id: `aa9e1e0042client984created95uuid${Date.now()}`,
        revision: `3-${Date.now() - 14 * 1000 * 1000}`,
        username: `test-${Date.now()}`,
        password: 'a390j3qawoeszidj',
        name: {
          familyName: 'Test',
        },
        language: 'ko',
        email: 'example@example.com',
        gravatar: 'previouslydeterminedstring',
        description: '<script src="http://haha.com/cleanme"></script>',
        // extra fields will be scrubbed
        extraneous: 'some other stuff from the client side that wont be persisted',
        createdAt: new Date() - 30 * 1000 * 1000,
        updatedAt: new Date() - 14 * 1000 * 1000,
      };

      User.create(json, (err, profile) => {
        if (err) {
          return done(err);
        }

        expect(profile.id).length(45);
        expect(profile.createdAt instanceof Date).to.equal(true);
        expect(profile.createdAt).to.equal(profile.updatedAt);

        const revisionNumber = parseInt(profile.revision.split('-')[0], 10);
        expect(revisionNumber).to.equal(4);

        expect(profile).to.deep.equal({
          id: json.id,
          revision: profile.revision,
          deletedAt: null,
          deletedReason: '',
          username: json.username,
          // content wont be sanitized
          description: '<script src="http://haha.com/cleanme"></script>',
          email: 'example@example.com',
          // wont be over written
          gravatar: 'previouslydeterminedstring',
          name: {
            givenName: '',
            familyName: 'Test',
          },
          language: 'ko',
          hash: profile.hash,
          // dates will be the db dates
          createdAt: profile.createdAt,
          updatedAt: profile.updatedAt,
        });

        return done();
      });
    });

    it('should save a new user', (done) => {
      const json = {
        username: `test-abc${Date.now()}`,
        password: 'a390j3qawoeszidj',
        name: {},
      };

      User.save(json, (err, profile) => {
        if (err) {
          return done(err);
        }

        expect(profile.id).length(36);
        expect(profile.username).to.equal(json.username);
        expect(profile.name.givenName).to.equal('');
        expect(profile.createdAt).to.not.equal(undefined);
        expect(profile.updatedAt).to.not.equal(undefined);
        expect(profile.revision).to.not.equal(undefined);
        expect(profile.deletedAt).to.equal(null);

        return done();
      });
    });

    it('should return null if user not found', (done) => {
      User.read({
        username: 'test-nonexistant-user',
      }, (err, profile) => {
        if (err) {
          return done(err);
        }

        expect(profile).to.equal(null);

        return done();
      });
    });

    describe('existing users', () => {
      beforeEach((done) => {
        User.save({
          username: 'test-efg',
          password: 'a390j3qawoeszidj',
          name: {
            givenName: 'Anony',
            familyName: 'Mouse',
          },
          description: 'Friendly',
          language: 'zh',
        }, () => done());
      });

      it('should read an existing user', (done) => {
        User.read({
          username: 'test-efg',
        }, (err, profile) => {
          if (err) {
            return done(err);
          }

          expect(profile).to.deep.equal({
            name: {
              givenName: 'Anony',
              familyName: 'Mouse',
            },
            id: profile.id,
            revision: profile.revision,
            deletedAt: null,
            deletedReason: '',
            username: 'test-efg',
            description: 'Friendly',
            email: '',
            hash: profile.hash,
            gravatar: profile.gravatar,
            language: 'zh',
            createdAt: profile.createdAt,
            updatedAt: profile.updatedAt,
          });

          return done();
        });
      });

      it('should update a user', (done) => {
        const json = {
          username: 'test-efg',
          password: 'a390j3qawoeszidj',
          name: {
            givenName: 'Albert',
            familyName: '',
          },
          language: 'ko',
        };
        User.save(json, (err, profile) => {
          if (err) {
            return done(err);
          }

          const revisionNumber = parseInt(profile.revision.split('-')[0], 10);
          expect(typeof revisionNumber).to.equal('number');

          expect(profile).to.deep.equal({
            name: {
              givenName: 'Albert',
              // should overwrite values if patch is specified
              familyName: '',
            },
            id: profile.id,
            revision: profile.revision,
            deletedAt: null,
            deletedReason: '',
            username: 'test-efg',
            // should not overwrite previous values if patch is missing
            description: 'Friendly',
            email: '',
            hash: profile.hash,
            gravatar: profile.gravatar,
            language: 'ko',
            createdAt: profile.createdAt,
            updatedAt: profile.updatedAt,
          });

          return done();
        });
      });

      describe('deletion', () => {
        const userToDelete = {
          username: `test-delete${Date.now()}`,
          password: 'a390j3qawoeszidj',
          name: {},
        };

        before((done) => {
          User.create(userToDelete, () => done());
        });

        it('should require a user', (done) => {
          User.flagAsDeleted(null, (err) => {
            expect(err.message).equal('Please provide a username and a deletedReason');

            return done();
          });
        });

        it('should require a username', (done) => {
          User.flagAsDeleted({}, (err) => {
            expect(err.message).equal('Please provide a username and a deletedReason');

            return done();
          });
        });

        it('should require a reason', (done) => {
          User.flagAsDeleted({
            username: `test-deleted${Date.now()}`,
          }, (err) => {
            expect(err.message).equal('Please provide a username and a deletedReason');

            return done();
          });
        });

        it('should warn if the user doesnt exist', (done) => {
          User.flagAsDeleted({
            username: `test-deleted${Date.now()}`,
            deletedReason: 'for testing purposes',
          }, (err) => {
            expect(err.message).equal('Cannot delete user which doesn\'t exist');

            return done();
          });
        });

        it('should flag user as deleted', (done) => {
          User.flagAsDeleted({
            username: userToDelete.username,
            deletedReason: 'for testing purposes',
          }, (err, user) => {
            if (err) {
              return done(err);
            }

            expect(user.deletedReason).equal('for testing purposes');
            expect(user.deletedAt.toDateString()).equal(new Date().toDateString());

            return done();
          });
        });
      });
    });
  });

  describe('password', () => {
    const userWithPassword = {
      username: `test-password${Date.now()}`,
      name: {
        givenName: 'Test',
        familyName: 'Password',
      },
      password: 'zKmmfweLj2!h',
    };

    before((done) => {
      User.init();
      User.create(userWithPassword, (err, profile) => {
        if (profile) {
          expect(userWithPassword.password).to.equal(undefined);
          userWithPassword.hash = profile.hash;
        }
        return done();
      });
    });

    it('should reply with invalid username and password', () => {
      const hashed = User.hashPassword('123ioiw3we_!');

      expect(hashed.hash).length(60);
      expect(hashed.salt).length(29);
    });

    it('should reply with invalid username and password', (done) => {
      User.verifyPassword({
        username: 'test-nonexistant-user',
        password: '123ioiw3we_!',
      }, (err) => {
        expect(err.message).equal('User not found');

        return done();
      });
    });

    it('should reply with invalid username and password', (done) => {
      User.verifyPassword({
        username: userWithPassword.username,
        password: 'anotherpassword',
      }, (err) => {
        expect(err.message).equal('Invalid password');

        return done();
      });
    });

    it('should recognize the password', (done) => {
      User.verifyPassword({
        username: userWithPassword.username,
        password: 'zKmmfweLj2!h',
      }, (err, profile) => {
        if (err) {
          return done(err);
        }

        expect(profile.username).equal(userWithPassword.username);

        return done();
      });
    });

    it('should be able to change a password', (done) => {
      expect(userWithPassword.hash).to.not.equal(undefined);
      User.changePassword({
        username: userWithPassword.username,
        password: 'zKmmfweLj2!h',
        newPassword: 'changedpassword',
      }, (err, updatedProfile) => {
        if (err) {
          return done(err);
        }
        expect(updatedProfile.hash).to.not.equal(userWithPassword.hash);

        return User.changePassword({
          username: userWithPassword.username,
          password: 'changedpassword',
          newPassword: 'zKmmfweLj2!h',
        }, () => done());
      });
    });

    it('should require matching old password to able to change a password', (done) => {
      const info = {
        username: userWithPassword.username,
        password: 'nottherightpassword',
        newPassword: 'attempedpassword',
      };
      User.changePassword(info, (err) => {
        expect(err.message).to.equal('Password doesn\'t match your old password');

        return done();
      });
    });

    it('should bubble bycrpt errors', (done) => {
      const info = {
        username: userWithPassword.username,
        password: 'zKmmfweLj2!h',
        newPassword: 123,
      };
      User.changePassword(info, (err) => {
        debug('err', err);
        expect(err.message).to.equal('Illegal arguments: number, string');

        return done();
      });
    });
  });

  describe('collection', () => {
    beforeEach((done) => {
      User.save({
        username: 'yoan oct',
        password: 'zKmmfweLj2!h',
        name: {},
      }, () => {
        User.save({
          username: 'alex oct',
          password: 'zKmmfweLj2!h',
          name: {},
          email: '',
        }, () => {
          User.save({
            username: 'noemi oct',
            password: 'zKmmfweLj2!h',
            name: {},
            email: 'noemi@example.com',
          }, () => done());
        });
      });
    });

    it('should list a public view of all users', (done) => {
      User.list({
        where: {
          username: {
            [Sequelize.Op.like]: '%oct',
          },
        },
        limit: 1000,
      }, (err, users) => {
        if (err) {
          return done(err);
        }

        expect(users).not.to.deep.equal([]);
        expect(users).length(3);

        return done();
      });
    });

    it('should return empty lists', (done) => {
      User.list({
        where: {
          username: {
            [Sequelize.Op.like]: '%unlikely',
          },
        },
        limit: 1000,
      }, (err, users) => {
        if (err) {
          return done(err);
        }

        expect(users).to.deep.equal([]);
        expect(users).length(0);

        return done();
      });
    });
  });
});
