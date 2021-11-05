function emailWhenServerStarts() {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      reject(new Error('not implemented'));
    });
  });
}

function emailWelcomeToTheUser({
  user,
} = {}) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      reject(new Error('not implemented'));
    });
  });
}

/**
function generates a temporary password which is alpha-numeric and 10
 * chars long
 *
 * @returns {String}
 */
function makeRandomPassword() {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 10; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

/**
 * This emails the user, if the user has an email, if the
 * email is 'valid' TODO do better email validation. and if
 * the config has a valid user. For the dev and local
 * versions of the app, this wil never be fired because the
 * config doesnt have a valid user. But the production
 * config does, and it is working.
 *
 * @param  {[type]}   user              [description]
 * @param  {[type]}   temporaryPassword message       [description]
 * @param  {Function} done              [description]
 * @return {[type]}                     [description]
 */
function emailTemporaryPasswordToTheUserIfTheyHavAnEmail({
  user,
  temporaryPassword,
  successMessage,
} = {}) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      reject(new Error('not implemented'));
    });
  });
}

module.exports = {
  emailWhenServerStarts,
  emailWelcomeToTheUser,
  emailTemporaryPasswordToTheUserIfTheyHavAnEmail,
  makeRandomPassword,
};
