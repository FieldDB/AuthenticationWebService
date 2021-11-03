var expect = require('chai').expect;
var sinon = require('sinon');

var error = require('./../../middleware/error-handler').errorHandler;

describe('middleware/error-handler', function () {
  var NODE_ENV = process.env.NODE_ENV;
  var err = new Error('oops');
  err.status = 500;

  var req = {
    app: {
      locals: {}
    }
  };
  var res = {};

  afterEach(function () {
    process.env.NODE_ENV = NODE_ENV;
  });

  it('should load', function () {
    expect(error).to.be.a('function');
  });

  describe('api endpoint', function () {
    beforeEach(function () {
      req.url = '/v1/nodata';
      req.headers = {
        'content-type': 'application/json'
      };
      res.json = sinon.spy();
      res.render = sinon.spy();
      res.status = sinon.spy();
      req.log = {
        fields: {}
      };
    });

    describe('in development', function () {
      beforeEach(function () {
        process.env.NODE_ENV = 'development';
      });

      it('should expose stack traces', function () {
        error(err, req, res, function () {});

        sinon.assert.calledWith(res.status, 500);
        // console.log('res.json', res.json.getCall(0).args)
        sinon.assert.calledWith(res.json, {
          message: 'Internal server error',
          stack: err.stack,
          url: undefined,
          details: undefined,
          status: err.status,
          userFriendlyErrors: [ 'Server erred, please report this 816' ]
        });
      });
    });

    describe('in production', function () {
      beforeEach(function () {
        process.env.NODE_ENV = 'production';
      });

      it('should not expose stack traces', function () {
        error(err, req, res, function () {});

        sinon.assert.calledWith(res.status, 500);
        sinon.assert.calledWith(res.json, {
          message: 'Internal server error',
          stack: undefined,
          status: 500,
          userFriendlyErrors: ['Server erred, please report this 816']
        });
      });
    });
  });
});
