const {
  expect,
} = require('chai');

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
        expect(err.message).to.equal('not implemented');
      }));
  });

  describe('addRoleToUser', () => {
    it('should reject with an error', () => addRoleToUser()
      .catch((err) => {
        expect(err.message).to.equal('not implemented');
      }));
  });

  describe('authenticateUser', () => {
    it('should reject with an error', () => authenticateUser()
      .catch((err) => {
        expect(err.message).to.equal('not implemented');
      }));
  });

  describe('createNewCorpusesIfDontExist', () => {
    it('should reject with an error', () => createNewCorpusesIfDontExist()
      .catch((err) => {
        expect(err.message).to.equal('not implemented');
      }));
  });

  describe('fetchCorpusPermissions', () => {
    it('should reject with an error', () => fetchCorpusPermissions()
      .catch((err) => {
        expect(err.message).to.equal('not implemented');
      }));
  });

  describe('findByEmail', () => {
    it('should reject with an error', () => findByEmail()
      .catch((err) => {
        expect(err.message).to.equal('not implemented');
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
        expect(err.message).to.equal('not implemented');
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
          console.log('err.userFriendlyErrors', err.userFriendlyErrors);

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
    it('should reject with an error', () => {
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
    it('should reject with an error', () => undoCorpusCreation()
      .catch((err) => {
        expect(err.message).to.equal('not implemented');
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
          expect(result).to.equal(user);
        });
    });

    it('should reject with an error', () => {
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
