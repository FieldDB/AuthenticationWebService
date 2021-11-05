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
} =
require('../../lib/user');

describe('lib/user', () => {
  describe('addCorpusToUser', () => {
    it('should reject with an error', () => {
      return addCorpusToUser()
        .catch((err) => {
          expect(err.message).to.equal('not implemented');
        });
    });
  });

  describe('addRoleToUser', () => {
    it('should reject with an error', () => {
      return addRoleToUser()
        .catch((err) => {
          expect(err.message).to.equal('not implemented');
        });
    });
  });

  describe('authenticateUser', () => {
    it('should reject with an error', () => {
      return authenticateUser()
        .catch((err) => {
          expect(err.message).to.equal('not implemented');
        });
    });
  });

  describe('createNewCorpusesIfDontExist', () => {
    it('should reject with an error', () => {
      return createNewCorpusesIfDontExist()
        .catch((err) => {
          expect(err.message).to.equal('not implemented');
        });
    });
  });

  describe('fetchCorpusPermissions', () => {
    it('should reject with an error', () => {
      return fetchCorpusPermissions()
        .catch((err) => {
          expect(err.message).to.equal('not implemented');
        });
    });
  });

  describe('findByEmail', () => {
    it('should reject with an error', () => {
      return findByEmail()
        .catch((err) => {
          expect(err.message).to.equal('not implemented');
        });
    });
  });

  describe('findByUsername', () => {
    it('should reject with an error', () => {
      return findByUsername()
        .catch((err) => {
          expect(err.message).to.equal('not implemented');
        });
    });
  });

  describe('forgotPassword', () => {
    it('should reject with an error', () => {
      return forgotPassword()
        .catch((err) => {
          expect(err.message).to.equal('not implemented');
        });
    });
  });

  describe('sampleUsers', () => {
    it('should extract sampleUsers for this server config', () => {
      expect(sampleUsers).length(6);
    });
  });

  describe('saveUpdateUserToDatabase', () => {
    it('should reject with an error', () => {
      return saveUpdateUserToDatabase()
        .catch((err) => {
          expect(err.message).to.equal('not implemented');
        });
    });
  });

  describe('setPassword', () => {
    it('should reject with an error', () => {
      return setPassword()
        .catch((err) => {
          expect(err.message).to.equal('not implemented');
        });
    });
  });

  describe('sortByUsername', () => {
    it('should reject with an error', () => {
      const result = [{
        username: 'b'
      }, {
        username: 'a',
        foo: 'hi',
      }].sort(sortByUsername)
      expect(result[0]).to.deep.equal({
        username: 'a',
        foo: 'hi',
      });
    });
  });

  describe('undoCorpusCreation', () => {
    it('should reject with an error', () => {
      return undoCorpusCreation()
        .catch((err) => {
          expect(err.message).to.equal('not implemented');
        });
    });
  });

  describe('verifyPassword', () => {
    it('should reject with an error', () => {
      return verifyPassword()
        .catch((err) => {
          expect(err.message).to.contain('Cannot read properties of undefined');
        });
    });
  });
});
