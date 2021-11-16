const debug = require('debug')('test:lib:user');
const { expect } = require('chai');

const {
  addCorpusToUser,
  addRoleToUser,
  authenticateUser,
  createNewCorpusesIfDontExist,
  fetchCorpusPermissions,
  findByEmail,
  findByUsername,
  forgotPassword,
  sampleUsers,
  saveUpdateUserToDatabase,
  setPassword,
  sortByUsername,
  undoCorpusCreation,
  verifyPassword,
} = require('../../lib/user');

describe.only('lib/user', () => {
  describe('addCorpusToUser', () => {
    it('should reject with an error', () => addCorpusToUser()
      .catch((err) => {
        expect(err.message).to.equal('username is required');
        expect(err.status).to.equal(500);
        expect(err.userFriendlyErrors).to.deep.equal(['Username doesnt exist on this server. This is a bug.']);
      }));

    it('should return info about what was changed', () => addCorpusToUser({
      username: 'testuser2',
      newConnection: {
        dbname: 'testuser2-firstcorpus',
      },
    })
      .then(({
        info,
      }) => {
        console.log('info', info);
        expect(info).to.deep.equal({
          message: 'User testuser2 was removed from the testuser2-firstcorpus team.',
        });
      }));
  });

  describe('addRoleToUser', () => {
    it('should reject with an error', () => addRoleToUser()
      .catch((err) => {
        expect(err.message).to.contain('Client didnt define the dbname to modify');
      }));

    it('should return info about what was changed', () => addRoleToUser({
      req: {
        body: {
          username: 'jenkins',
          password: 'phoneme',
          connection: {
            dbname: 'jenkins-firstcorpus',
          },
          users: [{
            username: 'testingprototype',
            add: ['reader', 'commenter'],
            remove: ['admin', 'writer'],
          }],
        },
      },
    })
      .then((result) => {
        console.log('result', result);
        expect(result[0].message).to.equal('User testingprototype now has reader commenter access to jenkins-firstcorpus, the user was already a member of this corpus team.');
      }));
  });

  describe('authenticateUser', () => {
    it('should require a username', () => authenticateUser()
      .catch(({ message, status, userFriendlyErrors }) => {
        expect(message).to.equal('Username was not specified. undefined');
        expect(status).to.equal(412);
        expect(userFriendlyErrors).to.deep.equal(['Please supply a username.']);
      }));

    it('should require a password', () => authenticateUser({
      username: 'lingllama',
    })
      .catch(({ message, status, userFriendlyErrors }) => {
        expect(message).to.equal('Password was not specified. undefined');
        expect(status).to.equal(412);
        expect(userFriendlyErrors).to.deep.equal(['Please supply a password.']);
      }));

    it('should handle invalid password', () => authenticateUser({
      username: 'jenkins',
      password: 'wrongpassword',
    })
      .catch(({ message, status, userFriendlyErrors }) => {
        expect(message).to.equal('Username or password is invalid. Please try again.');
        expect(status).to.equal(401);
        expect(userFriendlyErrors).to.deep.equal([
          'Username or password is invalid. Please try again.',
        ]);
      }));

    it('should handle invalid password who have an email address', () => authenticateUser({
      username: 'testinguserwithemail',
      password: 'wrongpassword',
    })
      .catch((err) => {
        const { message, status, userFriendlyErrors } = err;
        expect(message).to.equal('Username or password is invalid. Please try again.');
        expect(status).to.equal(401);
        expect(userFriendlyErrors).to.deep.equal([
          'Username or password is invalid. Please try again. You have tried to log in too many times. The server was unable to send you an email, your password has not been reset. Please report this 2823',
        ]);
      }));

    it('should detect non ascii usernames', () => authenticateUser({
      username: 'Jen kins',
      password: 'phoneme',
    })
      .catch(({ message, status, userFriendlyErrors }) => {
        expect(message).to.equal('username is not safe for db names');
        expect(status).to.equal(406);
        expect(userFriendlyErrors).to.deep.equal(['Username or password is invalid. Maybe your username is jenkins?']);
      }));

    it('should authenticate', () => authenticateUser({
      username: 'jenkins',
      password: 'phoneme',
    })
      .then((result) => {
        // eslint-disable-next-line no-underscore-dangle
        expect(result.user._rev).not.to.equal(undefined);
        const lastLogin = result.user.serverlogs
          .successfulLogins[result.user.serverlogs.successfulLogins.length - 1];
        const lastLoginMs = new Date(lastLogin).getTime();
        const expectedDate = Date.now();
        debug('lastLogin', lastLogin, lastLoginMs);
        debug('expectedDate', expectedDate, expectedDate - lastLoginMs);
        expect(expectedDate - lastLoginMs).below(100, 'last login should have been logged by this test');
      }));

    it('should sync user details', () => authenticateUser({
      username: 'jenkins',
      password: 'phoneme',
      syncDetails: true,
      syncUserDetails: {
        newCorpora: [{
          dbname: 'testuser-firstcorpus',
        }, {
          dbname: 'testanotheruser-a_corpus',
        }, {
          dbname: 'testuser-two',
        }],
      },
    })
      .then((result) => {
        // eslint-disable-next-line no-underscore-dangle
        expect(result.user._rev).not.to.equal(undefined);
        expect(result.newCorpora).to.equal(undefined);
        expect(result.syncUserDetails).to.equal(undefined);
        const lastLogin = result.user.serverlogs
          .successfulLogins[result.user.serverlogs.successfulLogins.length - 1];
        const lastLoginMs = new Date(lastLogin).getTime();
        const expectedDate = Date.now();
        debug('lastLogin', lastLogin, lastLoginMs);
        debug('expectedDate', expectedDate, expectedDate - lastLoginMs);
        expect(expectedDate - lastLoginMs).below(100, 'last login should have been logged by this test');
      }));
  });

  describe('createNewCorpusesIfDontExist', () => {
    it('should do nothing if there are no corpora', () => createNewCorpusesIfDontExist()
      .then((result) => {
        expect(result).to.deep.equal([]);
      }));

    it('should do nothing if the corpus is likely someone elses corpora', () => createNewCorpusesIfDontExist({
      user: {
        username: 'testuser',
      },
      corpora: [{
        dbname: 'testanotheruser-a_corpus',
      }],
    })
      .then((result) => {
        expect(result).to.deep.equal([{
          dbname: 'testanotheruser-a_corpus',
        }]);
      }));

    it('should create corpora', () => createNewCorpusesIfDontExist({
      user: {
        username: 'testuser',
      },
      corpora: [{
        dbname: 'testuser-firstcorpus',
      }, {
        dbname: 'testanotheruser-a_corpus',
      }, {
        dbname: 'testuser-two',
      }],
    })
      .then((result) => {
        expect(result).to.deep.equal([{
          // TODO this should have details in it after the create
          // but it is currently not blocking
          dbname: 'testuser-firstcorpus',
        }, {
          dbname: 'testanotheruser-a_corpus',
        }, {
          dbname: 'testuser-two',
        }]);
      }));
  });

  describe('fetchCorpusPermissions', () => {
    it('should reject with an error', () => fetchCorpusPermissions()
      .catch((err) => {
        expect(err.message).to.equal('Please provide a username, you must be a member of a corpus in order to find out who else is a member.');
      }));

    it('should fetchCorpusPermissions for test users', () => fetchCorpusPermissions({
      req: {
        body: {
          username: 'testingprototype',
          password: 'test',
          connection: {
            dbname: 'testingprototype-firstcorpus',
          },
        },
      },
    })
      .then((result) => {
        const notonteam = result.rolesAndUsers.notonteam.map(({ username }) => username);
        expect(notonteam).to.include('testingspreadsheet');
        expect(notonteam).not.to.include('lingllama');
        expect(result.rolesAndUsers.commenters).length(1);
        expect(result.rolesAndUsers.readers).length(1);
        expect(result.rolesAndUsers.writers).length(1);
        expect(result.rolesAndUsers.admins).length(1);
        expect(result.info).to.deep.equal({
          message: 'Look up successful.',
        });
      }));

    it('should fetchCorpusPermissions for normal users', () => fetchCorpusPermissions({
      req: {
        body: {
          username: 'jenkins',
          password: 'phoneme',
          connection: {
            dbname: 'jenkins-firstcorpus',
          },
        },
      },
    })
      .then((result) => {
        expect(result.rolesAndUsers.notonteam.map(({ username }) => username)).to.include('lingllama');
        expect(result.rolesAndUsers.commenters).length(1);
        expect(result.rolesAndUsers.readers).length(1);
        expect(result.rolesAndUsers.writers).length(1);
        expect(result.rolesAndUsers.admins).length(1);
        expect(result.info).to.deep.equal({
          message: 'Look up successful.',
        });
      }));
  });

  describe('findByEmail', () => {
    it('should reject with an error', () => findByEmail()
      .catch((err) => {
        expect(err.message).to.equal('Please provide an email');
      }));

    it('should find lingllama', () => findByEmail({
      email: 'lingllama@example.org',
    })
      .then((result) => {
        expect(result.users.map(({ username, email }) => ({ username, email }))).to.deep.equal([{
          username: 'lingllama',
          email: 'lingllama@example.org',
        }]);
        expect(result.info).to.deep.equal({
          message: 'Found 1 users for undefined',
        });
      }));
  });

  describe('findByUsername', () => {
    it('should reject with an error', () => findByUsername()
      .catch((err) => {
        expect(err.message).to.equal('username is required');
      }));

    it('should look up a username', () => findByUsername({
      username: 'lingllama',
    })
      .then(({
        user,
      }) => {
        expect(user.name).to.equal('Ling Llama');
        expect(user.corpuses).to.equal(undefined);
        expect(user.corpora.length).above(0);
      }));

    it('should return not found', () => findByUsername({
      username: 'notauser',
    })
      .catch(({
        message,
        status,
        userFriendlyErrors,
        stack,
      }) => {
        expect({
          message,
          status,
          userFriendlyErrors,
        }).to.deep.equal({
          message: 'User notauser does not exist',
          status: 401,
          userFriendlyErrors: ['Username or password is invalid. Please try again'],
        });

        expect(stack).to.contain('lib/user.js');
      }));

    it('should handle disabled users', () => findByUsername({
      username: 'testingdisabledusers',
    })
      .catch(({
        message,
        status,
        userFriendlyErrors,
        stack,
      }) => {
        expect({
          message,
          status,
          userFriendlyErrors,
        }).to.deep.equal({
          message: 'User testingdisabledusers has been disabled, probably because of a violation of the terms of service. This username was reported to us as a suspicously fictitous username.',
          status: 401,
          userFriendlyErrors: ['This username has been disabled. Please contact us at support@lingsync.org if you would like to reactivate this username. Reasons: This username was reported to us as a suspicously fictitous username.'],
        });

        expect(stack).to.contain('lib/user.js');
      }));
  });

  describe('forgotPassword', () => {
    it('should reject with an error', () => forgotPassword()
      .catch((err) => {
        expect(err.message).to.equal('Please provide an email.');
      }));

    it('should send password reset emails', () => forgotPassword({
      email: 'myemail@example.com',
    })
      .catch((err) => {
        expect(err.message).to.equal('The mail configuration is missing a user, this server cant send email.');
      }));
  });

  describe('sampleUsers', () => {
    it('should extract sampleUsers for this server config', () => {
      expect(sampleUsers).length(6);
    });
  });

  describe('saveUpdateUserToDatabase', () => {
    it('should reject with an error', () => saveUpdateUserToDatabase()
      .catch((err) => {
        expect(err.message).to.contain('Please provide a username 8933');
      }));

    it('should not save changes to sample users', () => {
      const expectedUser = {
        username: 'lingllama',
      };
      return saveUpdateUserToDatabase({
        password: 'phoneme',
        user: expectedUser,
      })
        .then(({ user, info }) => {
          expect(user).to.equal(expectedUser);

          expect(info).to.deep.equal({
            message: 'User is a reserved user and cannot be updated in this manner.',
          });
        });
    });

    it('should handle document update conflicts', () => {
      const expectedUser = {
        username: 'jenkins',
        _id: 'jenkins',
        _rev: '1193-114a11fd4172aab53b8bf8ce06d63513',
      };
      return saveUpdateUserToDatabase({
        password: 'phoneme',
        user: expectedUser,
      })
        .then((result) => {
          expect(result).to.equal('should not get here');
        })
        .catch((err) => {
          expect(err.message).to.equal('Document update conflict.');
          expect(err.userFriendlyErrors).to.deep.equal(['Conflict saving user in the database. Please try again.']);
        });
    });
  });

  describe('setPassword', () => {
    it('should reject with an error', () => setPassword()
      .catch((err) => {
        expect(err.message).to.equal('Please provide a username');
      }));

    it('should change a password both for auth and corpus', () => setPassword({
      newpassword: 'phoneme',
      oldpassword: 'phoneme',
      password: 'phoneme',
      username: 'jenkins',
    })
      .then(({ user, info }) => {
        expect(user.username).to.equal('jenkins');
        // eslint-disable-next-line no-underscore-dangle
        expect(user._id).not.to.equal(undefined);
        // eslint-disable-next-line no-underscore-dangle
        expect(user._rev).not.to.equal(undefined);
        expect(user.hash).not.to.equal(undefined);
        expect(user.salt).to.equal(undefined);

        expect(info).to.deep.equal({
          message: 'Your password has succesfully been updated.',
        });
      }));
  });

  describe('sortByUsername', () => {
    it('should sort by username', () => {
      const result = [{
        username: 'b',
      }, {
        username: 'a',
        foo: 'hi',
      }].sort(sortByUsername);
      expect(result[0]).to.deep.equal({
        username: 'a',
        foo: 'hi',
      });
    });
  });

  describe('undoCorpusCreation', () => {
    it('should not reject', () => undoCorpusCreation()
      .then((result) => {
        expect(result).to.equal(undefined);
      }));

    it('should undoCorpusCreation', () => undoCorpusCreation({
      user: {
        username: 'testingcreatefailure',
      },
      connection: {
        dbname: 'testingcreatefailure-firstcorpus',
      },
      docs: [{
        _id: 'corpus',
        placeholder: 'foo',
      }],
    })
      .then((result) => {
        expect(result).to.equal(undefined);
      }));
  });

  describe('verifyPassword', () => {
    it('should reject with an error', () => verifyPassword()
      .catch((err) => {
        expect(err.message).to.contain('Cannot read properties of undefined');
      }));

    it('should verify a password', () => {
      const user = {
        username: 'lingllama',
        hash: '$2a$10$g1kJ4A8RfYhIqv1G5IsQEen2mZFpSwasG/BcXrKwKrltV3kdz9p7W',
      };

      return verifyPassword({
        user,
        password: 'phoneme',
      })
        .then((result) => {
          expect(result.user).to.equal(user);
        });
    });

    it('should reject if password is invalid', () => {
      const user = {
        username: 'lingllama',
        hash: '$2a$10$g1kJ4A8RfYhIqv1G5IsQEen2mZFpSwasG/BcXrKwKrltV3kdz9p7W',
      };

      return verifyPassword({
        user,
        password: 'wrongpassword',
      })
        .then((result) => {
          expect(result).to.equal('should not get here');
        })
        .catch(({
          message,
          stack,
          status,
        }) => {
          expect({
            message,
            status,
          }).to.contain({
            message: 'Username or password is invalid. Please try again.',
            status: 401,
          });

          expect(stack).to.contain('lib/user.js');
        });
    });
  });
});
