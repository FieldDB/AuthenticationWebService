const {
  expect,
} = require('chai');

const {
  emailWhenServerStarts,
  emailWelcomeToTheUser,
  emailTemporaryPasswordToTheUserIfTheyHavAnEmail,
  makeRandomPassword,
} = require('../../lib/email');

describe('lib/email', () => {
  describe('emailWhenServerStarts', () => {
    it('should reject with an error', () => emailWhenServerStarts()
      .catch((err) => {
        expect(err.message).to.equal('not implemented');
      }));
  });

  describe('emailWelcomeToTheUser', () => {
    it('should reject with an error', () => emailWelcomeToTheUser()
      .catch((err) => {
        expect(err.message).to.equal('not implemented');
      }));
  });

  describe('emailTemporaryPasswordToTheUserIfTheyHavAnEmail', () => {
    it('should reject with an error', () => emailTemporaryPasswordToTheUserIfTheyHavAnEmail()
      .catch((err) => {
        expect(err.message).to.equal('The user didnt provide a valid email.');
      }));
  });

  describe('makeRandomPassword', () => {
    it('should reject with an error', () => {
      const result = makeRandomPassword();
      expect(result).length(10);
    });
  });
});
