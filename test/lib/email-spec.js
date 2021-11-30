const {
  expect,
} = require('chai');

const {
  emailCorusCreationFailure,
  emailWhenServerStarts,
  emailWelcomeToCorpus,
  emailWelcomeToTheUser,
  emailTemporaryPasswordToTheUserIfTheyHavAnEmail,
  makeRandomPassword,
} = require('../../lib/email');

describe('lib/email', () => {
  describe('emailCorusCreationFailure', () => {
    it('should email when restarted', () => emailCorusCreationFailure()
      .then(({ info }) => {
        expect(info.text).to.equal('There was a problem while creating your corpus undefined. The server admins have been notified.');
      }));
  });

  describe('emailWhenServerStarts', () => {
    it('should email when restarted', () => emailWhenServerStarts()
      .then(({ info }) => {
        expect(info.text).to.equal('The FieldDB server has restarted. (It might have crashed)');
      }));
  });

  describe('emailWelcomeToCorpus', () => {
    it('should reject with an error if user is missing', () => emailWelcomeToCorpus()
      .then((result) => {
        expect(result).to.equal('should not get here');
      })
      .catch((err) => {
        expect(err.message).to.equal('Unable to email welcome to the corpus, username is missing');
      }));

    it('should reject with an error if newConnection is missing', () => emailWelcomeToCorpus({
      user: {
        username: 'testuser',
      },
    })
      .then((result) => {
        expect(result).to.equal('should not get here');
      })
      .catch((err) => {
        expect(err.message).to.equal('Unable to email welcome to the corpus, dbname is missing');
      }));

    it('should email the user', () => emailWelcomeToCorpus({
      newConnection: {
        dbname: 'someone-newdb',
      },
      user: {
        username: 'testuser',
      },
    })
      .then(({ info }) => {
        expect(info.text).to.equal('The new corpus\'s identifier is: someone-newdb');
      }));

    it('should email gamify user', () => emailWelcomeToCorpus({
      newConnection: {
        dbname: 'someone-newdb',
      },
      user: {
        appbrand: 'phophlo',
        username: 'testuser',
      },
    })
      .then(({ info }) => {
        expect(info.text).to.equal('The new corpus\'s identifier is: someone-newdb');
      }));

    it('should not email new anonymous user', () => emailWelcomeToCorpus({
      newConnection: {
        dbname: 'someone-newdb',
      },
      user: {
        username: 'anonymous123',
      },
    })
      .then(({ info }) => {
        expect(info.text).to.equal('The new corpus\'s identifier is: someone-newdb');
      }));
  });

  describe('emailWelcomeToTheUser', () => {
    it('should reject with an error if user is missing', () => emailWelcomeToTheUser()
      .then((result) => {
        expect(result).to.equal('should not get here');
      })
      .catch((err) => {
        expect(err.message).to.equal('Unable to email welcome, username is missing');
      }));

    it('should email the user', () => emailWelcomeToTheUser({
      user: {
        username: 'testuser',
      },
    })
      .then(({ info }) => {
        expect(info.text).to.equal('Your username is: testuser');
      }));

    it('should email gamify user', () => emailWelcomeToTheUser({
      user: {
        appbrand: 'phophlo',
        username: 'testuser',
      },
    })
      .then(({ info }) => {
        expect(info.text).to.equal('Your username is: testuser');
      }));

    it('should not email new anonymous user', () => emailWelcomeToTheUser({
      user: {
        username: 'anonymous123',
      },
    })
      .then(({ info }) => {
        expect(info.text).to.equal('Your username is: anonymous123');
      }));
  });

  describe('emailTemporaryPasswordToTheUserIfTheyHavAnEmail', () => {
    it('should reject with an error', () => emailTemporaryPasswordToTheUserIfTheyHavAnEmail()
      .catch((err) => {
        expect(err.message).to.equal('The user didnt provide a valid email.');
      }));

    it('should email the user', () => emailTemporaryPasswordToTheUserIfTheyHavAnEmail({
      user: {
        username: 'testuser',
      },
    })
      .then((result) => {
        expect(result).to.equal('should not get here');
      })
      .catch((err) => {
        expect(err.message).to.equal('The user didnt provide a valid email.');
      }));

    it('should email the user', () => emailTemporaryPasswordToTheUserIfTheyHavAnEmail({
      user: {
        username: 'testuser',
        email: 'testuser@example.org',
      },
    })
      .then((result) => {
        expect(result).to.equal('should not get here');
      })
      .catch((err) => {
        expect(err.message).to.equal('The mail configuration is missing a user, this server cant send email.');
      }));
  });

  describe('makeRandomPassword', () => {
    it('should generate strings of 10 ascii characters', () => {
      const result = makeRandomPassword();
      expect(result).length(10);
    });
  });
});
