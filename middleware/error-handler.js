const debug = require('debug')('middleware:error');

const { BUNYAN_LOG_LEVEL } = process.env;

function cleanErrorStatus(status) {
  if (status && status < 600) {
    return status;
  }
  return '';
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  let data;
  const { NODE_ENV } = process.env;
  debug(`errorHandler ${NODE_ENV} ${req.url}`, err);

  if (res.headersSent) {
    // eslint-disable-next-line no-console
    console.warn('This request has already been replied to', err);
    return;
  }

  if (['development', 'test', 'local'].indexOf(NODE_ENV) > -1) {
    // expose stack traces
    data = {
      message: err.message,
      stack: err.stack,
      url: err.url,
      details: err.details,
      userFriendlyErrors: err.userFriendlyErrors,
    };
    if (data.details && data.details.url) {
      delete data.details.url;
    }
  } else {
    // production error handler
    debug('using production error handler', NODE_ENV);
    data = {
      message: err.message,
    };
  }
  data.status = cleanErrorStatus(err.statusCode || err.status) || 500;

  if (err.code === 'ECONNREFUSED') {
    data.userFriendlyErrors = ['Server erred, please report this 6339'];
  } else if (err.name === 'unauthorized_request') {
    data.status = 401;
    data.userFriendlyErrors = err.userFriendlyErrors || [data.message];
  } else if (err.code === 'ETIMEDOUT') {
    data.status = 500;
    data.userFriendlyErrors = ['Server timed out, please try again later'];
  } else if (data.status === 502) {
    data.userFriendlyErrors = ['Server erred, please report this 36339'];
  } else if (data.status === 401) {
    data.userFriendlyErrors = err.userFriendlyErrors || ['Server erred, please report this 7234'];
  } else if (data.status === 404) {
    data.userFriendlyErrors = err.userFriendlyErrors || [data.message];
  } else if (data.status === 403) {
    data.userFriendlyErrors = err.userFriendlyErrors || [data.message];
  } else if (data.status === 406) {
    data.userFriendlyErrors = err.userFriendlyErrors || [data.message];
  } else if (data.status === 409) {
    data.userFriendlyErrors = err.userFriendlyErrors || [data.message];
  } else if (data.status === 412) {
    data.userFriendlyErrors = err.userFriendlyErrors || [data.message];
  } else if (err.message === 'Code is not authorized') {
    data.status = 403;
    data.userFriendlyErrors = err.userFriendlyErrors || [data.message];
  } else if (err.message === 'Missing parameter: `state`') {
    data.userFriendlyErrors = err.userFriendlyErrors || [data.message];
  } else if (err.message === 'Client id or Client Secret is invalid') {
    data.status = 403;
    data.userFriendlyErrors = err.userFriendlyErrors || [data.message];
  } else if (err.code === 'ENOTFOUND' && err.syscall === 'getaddrinfo') {
    data.status = 500;
    data.userFriendlyErrors = ['Server connection timed out, please try again later'];
  } else if (err.code === 'EPROTO') {
    data.userFriendlyErrors = ['Server erred, please report this 9234'];
  } else if (err.code === 'DEPTH_ZERO_SELF_SIGNED_CERT') {
    // see also https://github.com/request/request/issues/418
    data.userFriendlyErrors = ['Server erred, please report this 23829'];
  } else if (err.status && err.userFriendlyErrors && err.userFriendlyErrors[0] && err.userFriendlyErrors[0].includes('Please report this')) {
    data.userFriendlyErrors = err.userFriendlyErrors;
  } else if (err.userFriendlyErrors) {
    data.userFriendlyErrors = err.userFriendlyErrors;
  } else {
    data.userFriendlyErrors = ['Server erred, please report this 816'];
  }

  res.status(data.status);

  if (data.status >= 500) {
    // data.stack = data.stack ? data.stack.toString() : undefined;
    data.message = 'Internal server error';
    if (BUNYAN_LOG_LEVEL !== 'FATAL') {
      req.log.error(err, `${new Date()} There was an unexpected error ${process.env.NODE_ENV} ${req.url}`);
    }
  } else {
    data.message = err.message;
  }
  req.log.fields.err = {
    stack: err.stack, message: err.message,
  };

  if (req.headers['x-requested-with'] === 'XMLHttpRequest' || /application\/json/.test(req.headers['content-type'])) {
    res.json(data);
    return;
  }

  res.json({
    status: data.status,
    userFriendlyErrors: data.userFriendlyErrors,
  });
}

exports.errorHandler = errorHandler;
