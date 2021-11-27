const bcrypt = require('bcryptjs');
const config = require('config');
const debug = require('debug')('lib:email');
const nodemailer = require('nodemailer');

const corpusmanagement = require('./corpusmanagement');

function emailWhenServerStarts() {
  const smtpTransport = nodemailer.createTransport(config.mailConnection);
  const mailOptions = config.newUserMailOptions();
  mailOptions.subject = 'FieldDB server restarted';
  mailOptions.text = 'The FieldDB server has restarted. (It might have crashed)';
  mailOptions.html = 'The FieldDB server has restarted. (It might have crashed)';
  if (mailOptions.to === '') {
    debug(`${new Date()} Didn't email the devs: The FieldDB server has restarted. (It might have crashed)`);
    return Promise.resolve({
      info: {
        text: mailOptions.text,
      },
    });
  }
  return smtpTransport.sendMail(mailOptions)
    .then((response) => {
      debug(`${new Date()} Server (re)started, message sent: \n${response.message}`);
      smtpTransport.close(); // shut down the connection pool, no more messages
      return {
        info: {
          text: mailOptions.text,
        },
      };
    })
    .catch((error) => {
      debug(`${new Date()} Server (re)started Mail error${JSON.stringify(error)}`);
      return {
        error,
        info: {
          text: mailOptions.text,
        },
      };
    });
}

function emailWelcomeToTheUser({
  user,
} = {}) {
  if (!user || !user.username) {
    return Promise.reject(new Error('Unable to email welcome, username is missing'));
  }
  /* all is well, the corpus was created. welcome the user */
  const email = user.email ? user.email : 'bounce@lingsync.org';
  // Send email https://github.com/andris9/Nodemailer
  const smtpTransport = nodemailer.createTransport(config.mailConnection);
  let mailOptions = config.newUserMailOptions();
  if (user.appbrand === 'phophlo') {
    mailOptions = config.newUserMailOptionsPhophlo();
  }
  mailOptions.to = `${email},${mailOptions.to}`;
  mailOptions.text = mailOptions.text.replace(/insert_username/g, user.username);
  mailOptions.html = mailOptions.html.replace(/insert_username/g, user.username);
  if (user.username && user.username.indexOf('anonymous') > -1) {
    debug(`${new Date()} Didn't email welcome to new anonymous user ${user.username}`);
    return Promise.resolve({
      info: {
        text: mailOptions.text,
        userFriendlyErrors: [`Didn't email welcome to new anonymous user ${user.username}`],
      },
    });
  }
  if (!email || email.length <= 5 || config.mailConnection.auth.user === '') {
    debug(`${new Date()} Didn't email welcome to new user${user.username} why: emailpresent: ${email}, valid user email: ${email.length > 5}, mailconfig: ${config.mailConnection.auth.user !== ''}`);
    return Promise.resolve({
      info: {
        text: mailOptions.text,
      },
    });
  }

  return smtpTransport.sendMail(mailOptions)
    .then((response) => {
      debug(`${new Date()} Message sent: \n${response.message}`);
      debug(`${new Date()} Sent User ${user.username} a welcome email at ${email}`);
      smtpTransport.close(); // shut down the connection pool
      return Promise.resolve({
        text: mailOptions.text,
      });
    })
    .catch((error) => {
      debug(`${new Date()} Mail error ${JSON.stringify(error)}`);
      return Promise.resolve({
        error,
        info: {
          text: mailOptions.text,
        },
      });
    });
}

function emailWelcomeToCorpus({
  user,
  newConnection,
} = {}) {
  if (!user || !user.username) {
    return Promise.reject(new Error('Unable to email welcome to the corpus, username is missing'));
  }
  if (!newConnection || !newConnection.dbname) {
    return Promise.reject(new Error('Unable to email welcome to the corpus, dbname is missing'));
  }
  const smtpTransport = nodemailer.createTransport(config.mailConnection);
  let mailOptions = config.welcomeToCorpusTeamMailOptions();
  if (user.appbrand === 'phophlo') {
    mailOptions = config.welcomeToCorpusTeamMailOptionsPhophlo();
  }
  mailOptions.to = `${user.email},${mailOptions.to}`;
  mailOptions.text = mailOptions.text.replace(/insert_corpus_identifier/g, newConnection.dbname);
  mailOptions.html = mailOptions.html.replace(/insert_corpus_identifier/g, newConnection.dbname);

  // exit late to maximize what we can verify when the mail config is missing credentials
  if (!user.email || !user.email.length > 5 || config.mailConnection.auth.user === '') {
    debug(`${new Date()} Didn't email welcome to corpus to new user ${
      user.username} why: emailpresent: ${user.email
    }, mailconfig: ${config.mailConnection.auth.user !== ''}`);
    return Promise.resolve({
      info: {
        message: 'Email not sent',
        text: mailOptions.text,
      },
    });
  }
  return smtpTransport.sendMail(mailOptions)
    .then((response) => {
      debug(`${new Date()} Message sent: \n${response.message}`);
      debug(`${new Date()} Sent User ${user.username} a welcome to corpus email at ${user.email}`);
      smtpTransport.close();
      return {
        info: {
          message: 'Email sent',
        },
      };
    })
    .catch((error) => {
      debug(`${new Date()} Mail error${JSON.stringify(error)}`);
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
  // eslint-disable-next-line no-plusplus
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
  user = { email: '' },
  temporaryPassword,
  successMessage,
} = {}) {
  const newpassword = temporaryPassword || makeRandomPassword();
  const smtpTransport = nodemailer.createTransport(config.mailConnection);
  let mailOptions = config.suspendedUserMailOptions();
  if (user.appbrand === 'phophlo') {
    mailOptions = config.suspendedUserMailOptionsPhophlo();
  }
  mailOptions.to = `${user.email},${mailOptions.to}`;
  mailOptions.text = mailOptions.text.replace(/insert_temporary_password/g, newpassword);
  mailOptions.html = mailOptions.html.replace(/insert_temporary_password/g, newpassword);

  // exit late to maximize what we can verify when the mail config is missing credentials
  if (!user.email || user.email.length < 5) {
    const err = new Error('The user didnt provide a valid email.');
    err.status = 412;
    err.userFriendlyErrors = ["You didnt provide an email when you registered, so we can't send you a temporary password. If you can't remember your password, you might need to contact us to ask us to reset your password."];
    return Promise.reject(err);
  }
  if (config.mailConnection.auth.user === '') {
    const err = new Error('The mail configuration is missing a user, this server cant send email.');
    err.userFriendlyErrors = ['The server was unable to send you an email, your password has not been reset. Please report this 2823'];
    return Promise.reject(err);
  }
  return smtpTransport.sendMail(mailOptions)
    .then((response) => {
      debug(`${new Date()} Temporary pasword sent: \n${response.message}`);

      smtpTransport.close();
      // save new password to couch _users too
      return corpusmanagement.changeUsersPassword({
        user,
        newpassword,
      });
    })
    .then((res) => {
      debug(`${new Date()} There was success in creating changing the couchdb password: ${JSON.stringify(res)}\n`);
      debug(`${new Date()} this is the user after changing their couch password ${JSON.stringify(user)}`);
      const salt = bcrypt.genSaltSync(10);
      const userToSave = {
        ...user,
      };
      userToSave.hash = bcrypt.hashSync(newpassword, salt);
      userToSave.serverlogs.oldIncorrectPasswordAttempts = userToSave.serverlogs.oldIncorrectPasswordAttempts || [];
      userToSave.serverlogs.incorrectPasswordAttempts = userToSave.serverlogs.incorrectPasswordAttempts || [];
      userToSave.serverlogs.oldIncorrectPasswordAttempts = userToSave.serverlogs.oldIncorrectPasswordAttempts
        .concat(userToSave.serverlogs.incorrectPasswordAttempts);
      userToSave.serverlogs.incorrectPasswordAttempts = [];

      return {
        user: userToSave,
        info: {
          message: successMessage,
        },
      };
    // })
      // .catch((err) => {
      //   debug(`${new Date()} There was an error in creating changing the couchdb password ${JSON.stringify(err)}\n`);
      //   err.error = err.error || 'Couchdb errored when trying to save the user.';
      //   err.status = err.status || err.statusCode || 500;
      //   err.userFriendlyErrors = ['The server was unable to change your password,
      // your password has not been reset. Please report this 2893'];
      //   throw err;
      // });
    })
    .catch((error) => {
      debug(`${new Date()} Mail error${JSON.stringify(error)}`);
      // error.error = error.error || error.code || 'Mail server failed to send an email';
      const err = {
        message: error.message,
        status: error.status || error.statusCode,
        userFriendlyErrors: ['The server was unable to send you an email, your password has not been reset. Please report this 2898'],
        ...error,
      };
      throw err;
    });
}

function emailCorusCreationFailure({
  connection = {},
  user = { email: '' },
} = {}) {
  let { email } = user;
  if (!email) {
    email = 'bounce@lingsync.org';
  }

  const smtpTransport = nodemailer.createTransport(config.mailConnection);
  let mailOptions = config.newUserMailOptions();
  if (user.appbrand === 'phophlo') {
    mailOptions = config.newUserMailOptionsPhophlo();
  }
  mailOptions.to = `${email},${mailOptions.to}`;
  mailOptions.text = `There was a problem while creating your corpus ${connection.dbname}. The server admins have been notified.`;
  mailOptions.html = `There was a problem while creating your corpus ${connection.dbname}. The server admins have been notified.`;

  // exit late to maximize what we can verify when the mail config is missing credentials
  if (config.mailConnection.auth.user === '') {
    debug(`${new Date()} Didnt email welcome to new user${user.username} why: emailpresent: ${email}, valid user email: ${email.length > 5}, mailconfig: ${config.mailConnection.auth.user !== ''}`);
    return Promise.resolve({
      info: {
        text: mailOptions.text,
      },
    });
  }
  return smtpTransport.sendMail(mailOptions)
    .then((response) => {
      debug(`${new Date()} Message sent: \n${response.message}`);
      debug(`${new Date()} Sent User ${user.username} a welcome email at ${email}`);
      smtpTransport.close();
    })
    .catch((error) => {
      debug(`${new Date()} Mail error${JSON.stringify(error)}`);
    });
}

module.exports = {
  emailCorusCreationFailure,
  emailWhenServerStarts,
  emailWelcomeToTheUser,
  emailWelcomeToCorpus,
  emailTemporaryPasswordToTheUserIfTheyHavAnEmail,
  makeRandomPassword,
};
