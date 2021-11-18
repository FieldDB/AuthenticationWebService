const { expect } = require('chai');
const sinon = require('sinon');

const error = require('../../middleware/error-handler').errorHandler;

describe('middleware/error-handler', () => {
  const { NODE_ENV } = process.env;
  const err = new Error('oops');
  err.status = 500;

  const req = {
    app: {
      locals: {},
    },
  };
  const res = {};

  afterEach(() => {
    process.env.NODE_ENV = NODE_ENV;
  });

  it('should load', () => {
    expect(error).to.be.a('function');
  });

  describe('api endpoint', () => {
    beforeEach(() => {
      req.url = '/v1/nodata';
      req.headers = {
        'content-type': 'application/json',
      };
      res.json = sinon.spy();
      res.render = sinon.spy();
      res.status = sinon.spy();
      req.log = {
        fields: {},
      };
    });

    describe('in development', () => {
      beforeEach(() => {
        process.env.NODE_ENV = 'development';
      });

      it('should expose stack traces', () => {
        error(err, req, res, () => {});

        sinon.assert.calledWith(res.status, 500);
        // console.log('res.json', res.json.getCall(0).args)
        sinon.assert.calledWith(res.json, {
          message: 'Internal server error',
          stack: err.stack,
          url: undefined,
          details: undefined,
          status: err.status,
          userFriendlyErrors: ['Server erred, please report this 816'],
        });
      });
    });

    describe('in production', () => {
      beforeEach(() => {
        process.env.NODE_ENV = 'production';
      });

      it('should not expose stack traces', () => {
        error(err, req, res, () => {});

        sinon.assert.calledWith(res.status, 500);
        sinon.assert.calledWith(res.json, {
          message: 'Internal server error',
          status: 500,
          userFriendlyErrors: ['Server erred, please report this 816'],
        });
      });
    });
  });
});
