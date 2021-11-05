const {
  expect,
} = require('chai');

const {
  emailWhenServerStarts,
  emailWelcomeToTheUser,
  emailTemporaryPasswordToTheUserIfTheyHavAnEmail,
  makeRandomPassword,
} =
require('../../lib/email');

describe('lib/email', () => {
  describe('emailWelcomeToTheUser', () => {
    it('should reject with an error', () => {
      return emailWelcomeToTheUser()
        .catch((err) => {
          expect(err.message).to.equal('not implemented');
        });
    });
  });

  describe('emailWelcomeToTheUser', () => {
    it('should reject with an error', () => {
      return emailWelcomeToTheUser()
        .catch((err) => {
          expect(err.message).to.equal('not implemented');
        });
    });
  });

  describe('emailTemporaryPasswordToTheUserIfTheyHavAnEmail', () => {
    it('should reject with an error', () => {
      return emailTemporaryPasswordToTheUserIfTheyHavAnEmail()
        .catch((err) => {
          expect(err.message).to.equal('not implemented');
        });
    });
  });

  describe('makeRandomPassword', () => {
    it('should reject with an error', () => {
      const result = makeRandomPassword()
      expect(result).length(10);
    });
  });
});
