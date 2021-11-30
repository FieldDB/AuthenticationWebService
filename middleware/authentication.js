const config = require('config');
const debug = require('debug')('middleware:authentication');
const { ExtractJwt } = require('passport-jwt');
const JwtStrategy = require('passport-jwt').Strategy;
const passport = require('passport');

const AsToken = require('../lib/token');
const user = require('../models/user');

const opts = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: AsToken.config.jwt.private,
  issuer: config.url,
  audience: 'anythings.net',
};

passport.use(new JwtStrategy(opts, ((jwtPayload, done) => {
  debug(' ', jwtPayload);

  user.read({
    username: jwtPayload.sub,
  }, (err, userModel) => {
    if (err) {
      return done(err, false);
    }
    if (userModel) {
      return done(null, userModel);
    }

    return done(null, false);
    // or you could create a new account
  });
})));

function jwt(req, res, next) {
  let tokenString;
  if (req && req.headers && req.headers.authorization
    && req.headers.authorization.indexOf('Bearer ') > -1) {
    tokenString = req.headers.authorization;
    debug('used header', req.headers.authorization);
  } else if (req && req.headers && req.headers.cookie
    && req.headers.cookie.indexOf('Authorization=Bearer ') > -1) {
    debug('used cookie', req.headers.cookie);
    tokenString = req.headers.cookie.split(';').filter((cookie) => cookie.indexOf('Authorization') > -1).map((cookie) => cookie.replace('Authorization=', '').trim()).join('');
    debug('used cookie', req.headers.cookie);
  }
  if (tokenString) {
    try {
      const verified = AsToken.verify(tokenString);
      req.user = verified.user;
      res.locals.user = verified.user;
      res.locals.token = tokenString;
      // Oauth2 is trying to use this token
      // delete req.headers.authorization;

      res.set('Authorization', res.locals.token);
    } catch (err) {
      // Often this is because it has expired or it was mutated
      debug(err);
      req.user = AsToken.decode(tokenString).user;
      res.locals.user = req.user;
      res.locals.user.expired = true;
      return next();
    }
  }

  debug('req.user', req.user);
  debug('res.locals', res.locals);
  return next();
}

function requireAuthentication(req, res, next) {
  let err;
  if (!res.locals.user) {
    err = new Error('You must login to access this data');
    err.status = 403;
    return next(err, req, res, next);
  }
  if (res.locals.user.expired) {
    err = new Error('Your session has expired, you must login to access this data');
    err.status = 403;
    return next(err, req, res, next);
  }

  // TOOD can add oauth middleware = oauth.authenticate({ });
  // https://github.com/oauthjs/express-oauth-server/blob/master/index.js#L42

  return next();
}

function redirectAuthenticatedUser(req, res, next) {
  if (res.locals.user && !res.locals.user.expired) {
    debug('redirectAuthenticatedUser user', res.locals.user);
    let redirectUri = req.query.redirect || req.query.redirect_uri || '/v1/users/username';
    redirectUri = redirectUri.replace('username', res.locals.user.username);
    debug('redirectAuthenticatedUser', req.url, redirectUri);
    return res.redirect(redirectUri);
  }

  return next();
}

function requireAuthenticationPassportJWT(req, res, next) {
  debug('requireAuthentication', req.user);
  debug('requireAuthentication', res.locals);
  debug('requireAuthentication', req.headers);

  const middleware = passport.authenticate('jwt', {
    session: false,
  });

  middleware(req, res, next);

  // next();
}

module.exports.jwt = jwt;
// https: //github.com/themikenicholson/passport-jwt/blob/master/test/extrators-test.js#L8
module.exports.extractor = opts.jwtFromRequest;
module.exports.requireAuthentication = requireAuthentication;
module.exports.redirectAuthenticatedUser = redirectAuthenticatedUser;
module.exports.requireAuthenticationPassportJWT = requireAuthenticationPassportJWT;
